import { QuizQuestionType, SaveQuizQuestion } from 'src/app/interface';

/**
 * Turns a teacher's Word document (or text pasted from Word) into draft quiz
 * questions. Nothing here talks to the API: the result is loaded into the
 * normal editor, reviewed by the teacher and saved through the usual
 * validated endpoint.
 */

/** One paragraph of the source. `list` is the Word list level, null for a plain paragraph. */
export interface ImportBlock {
  text: string;
  bold: boolean;
  list: { id: string; level: number } | null;
}

export interface ImportIssue {
  level: 'error' | 'warning';
  /** 1-based index among the imported questions, when the issue belongs to one. */
  question?: number;
  message: string;
}

export interface QuizImportResult {
  questions: SaveQuizQuestion[];
  /** Text before the first question: usually the test title, instructions or a listening link. */
  preamble: string[];
  issues: ImportIssue[];
}

export const MAX_IMPORT_BYTES = 10 * 1024 * 1024;
const MAX_XML_BYTES = 20 * 1024 * 1024;
const LIMITS = { questions: 200, options: 20, content: 4000, option: 2000, points: 1000 };

// ── Plain text ───────────────────────────────────────────────────────────────

export function textToBlocks(text: string): ImportBlock[] {
  return text.replace(/\r\n?/g, '\n').split('\n').map(line => ({ text: line, bold: false, list: null }));
}

// ── .docx (a zip of XML parts) ───────────────────────────────────────────────

const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const REL = 'http://schemas.openxmlformats.org/package/2006/relationships';

export async function readDocxBlocks(data: ArrayBuffer): Promise<ImportBlock[]> {
  const bytes = new Uint8Array(data);
  const entries = readZipDirectory(bytes);
  const documentEntry = entries.get('word/document.xml');
  if (!documentEntry) throw new Error('File không phải tài liệu Word .docx hợp lệ.');
  const documentXml = await readZipEntry(bytes, documentEntry);
  const relsEntry = entries.get('word/_rels/document.xml.rels');
  const links = relsEntry ? parseRelationships(await readZipEntry(bytes, relsEntry)) : new Map<string, string>();
  return documentXmlToBlocks(documentXml, links);
}

interface ZipEntry { method: number; compressedSize: number; size: number; offset: number; }

function readZipDirectory(bytes: Uint8Array): Map<string, ZipEntry> {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let end = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65_557); i--) {
    if (view.getUint32(i, true) === 0x06054b50) { end = i; break; }
  }
  if (end < 0) throw new Error('File không phải tài liệu Word .docx hợp lệ.');
  const count = view.getUint16(end + 10, true);
  let pointer = view.getUint32(end + 16, true);
  const entries = new Map<string, ZipEntry>();
  const decoder = new TextDecoder();
  for (let i = 0; i < count; i++) {
    if (pointer + 46 > bytes.length || view.getUint32(pointer, true) !== 0x02014b50) {
      throw new Error('File Word bị hỏng hoặc không đọc được.');
    }
    const nameLength = view.getUint16(pointer + 28, true);
    const name = decoder.decode(bytes.subarray(pointer + 46, pointer + 46 + nameLength));
    entries.set(name, {
      method: view.getUint16(pointer + 10, true),
      compressedSize: view.getUint32(pointer + 20, true),
      size: view.getUint32(pointer + 24, true),
      offset: view.getUint32(pointer + 42, true),
    });
    pointer += 46 + nameLength + view.getUint16(pointer + 30, true) + view.getUint16(pointer + 32, true);
  }
  return entries;
}

async function readZipEntry(bytes: Uint8Array, entry: ZipEntry): Promise<string> {
  if (entry.size > MAX_XML_BYTES) throw new Error('Nội dung file Word quá lớn.');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (entry.offset + 30 > bytes.length || view.getUint32(entry.offset, true) !== 0x04034b50) {
    throw new Error('File Word bị hỏng hoặc không đọc được.');
  }
  const start = entry.offset + 30 + view.getUint16(entry.offset + 26, true) + view.getUint16(entry.offset + 28, true);
  const raw = bytes.subarray(start, start + entry.compressedSize);
  if (entry.method === 0) return new TextDecoder().decode(raw);
  if (entry.method !== 8) throw new Error('File Word dùng kiểu nén không được hỗ trợ.');

  const stream = new Blob([raw as Uint8Array<ArrayBuffer>]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.length;
    if (total > MAX_XML_BYTES) { await reader.cancel(); throw new Error('Nội dung file Word quá lớn.'); }
    chunks.push(value);
  }
  const output = new Uint8Array(total);
  let position = 0;
  for (const chunk of chunks) { output.set(chunk, position); position += chunk.length; }
  return new TextDecoder().decode(output);
}

function parseRelationships(xml: string): Map<string, string> {
  const links = new Map<string, string>();
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  for (const rel of Array.from(doc.getElementsByTagNameNS(REL, 'Relationship'))) {
    if (rel.getAttribute('TargetMode') === 'External' && rel.getAttribute('Id')) {
      links.set(rel.getAttribute('Id')!, rel.getAttribute('Target') ?? '');
    }
  }
  return links;
}

export function documentXmlToBlocks(xml: string, links = new Map<string, string>()): ImportBlock[] {
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  if (doc.getElementsByTagName('parsererror').length) throw new Error('File Word bị hỏng hoặc không đọc được.');
  const body = doc.getElementsByTagNameNS(W, 'body')[0];
  if (!body) return [];
  const blocks: ImportBlock[] = [];
  for (const paragraph of Array.from(body.getElementsByTagNameNS(W, 'p'))) {
    // Text boxes nest paragraphs inside a run; those are read as their own paragraph.
    blocks.push(readParagraph(paragraph, links));
  }
  return blocks;
}

function readParagraph(paragraph: Element, links: Map<string, string>): ImportBlock {
  let text = '';
  let boldChars = 0;
  let plainChars = 0;
  const fieldLinks: string[] = [];

  const visit = (node: Element): void => {
    for (const child of Array.from(node.children)) {
      if (child.namespaceURI !== W) continue;
      switch (child.localName) {
        case 'r': {
          const runBold = isBold(child);
          for (const part of Array.from(child.children)) {
            if (part.namespaceURI !== W) continue;
            let value = '';
            if (part.localName === 't') value = part.textContent ?? '';
            else if (part.localName === 'tab') value = '\t';
            else if (part.localName === 'br' || part.localName === 'cr') value = '\n';
            else if (part.localName === 'instrText') {
              const match = /HYPERLINK\s+"([^"]+)"/.exec(part.textContent ?? '');
              if (match) fieldLinks.push(match[1]);
            }
            if (!value) continue;
            text += value;
            const visible = value.replace(/\s/g, '').length;
            if (runBold) boldChars += visible; else plainChars += visible;
          }
          break;
        }
        case 'hyperlink': {
          const target = links.get(child.getAttributeNS(R, 'id') ?? '') ?? null;
          const before = text.length;
          visit(child);
          const label = text.slice(before).trim();
          if (target && /^https?:\/\//i.test(target) && label !== target) text += ` (${target})`;
          break;
        }
        // Content wrappers: tracked insertions, smart tags, content controls, simple fields.
        case 'ins': case 'smartTag': case 'sdt': case 'sdtContent': case 'fldSimple': case 'customXml':
          visit(child);
          break;
        // Deleted text, paragraph properties and nested text boxes are not part of the paragraph's text.
        default:
          break;
      }
    }
  };
  visit(paragraph);

  for (const link of fieldLinks) {
    if (/^https?:\/\//i.test(link) && !text.includes(link)) text += ` (${link})`;
  }

  const numPr = directChild(directChild(paragraph, 'pPr'), 'numPr');
  const list = numPr ? {
    id: directChild(numPr, 'numId')?.getAttributeNS(W, 'val') ?? '',
    level: Number(directChild(numPr, 'ilvl')?.getAttributeNS(W, 'val') ?? 0) || 0,
  } : null;
  return { text, bold: boldChars > 0 && plainChars === 0, list: list && list.id !== '0' ? list : null };
}

function isBold(run: Element): boolean {
  const flag = directChild(directChild(run, 'rPr'), 'b');
  if (!flag) return false;
  const value = flag.getAttributeNS(W, 'val');
  return value == null || !['0', 'false', 'off'].includes(value);
}

function directChild(node: Element | null | undefined, name: string): Element | null {
  if (!node) return null;
  for (const child of Array.from(node.children)) {
    if (child.namespaceURI === W && child.localName === name) return child;
  }
  return null;
}

// ── Recognising questions ────────────────────────────────────────────────────

const QUESTION_RE = /^(?:câu|cau|question)\s*(\d{1,3})\b\s*[:.)\-–—]?\s*(.*)$/iu;
const NUMBERED_RE = /^(\d{1,3})\s*[.)]\s+(.*)$/u;
const OPTION_RE = /^(\*\s*)?([a-h])\s*[.)]\s*(.*)$/iu;
const ANSWER_RE = /^(?:đáp\s*án(?:\s*đúng)?|dap\s*an|answer|key|réponse|corrigé)\s*[:：]\s*(.*)$/iu;
const EXPLANATION_RE = /^(?:giải\s*thích|lời\s*giải|explanation|explication)\s*[:：]\s*(.*)$/iu;
const RUBRIC_RE = /^(?:tiêu\s*chí(?:\s*chấm)?|hướng\s*dẫn\s*chấm|rubric|barème)\s*[:：]\s*(.*)$/iu;
const SECTION_RE = /^(?:phần|part|partie|section)\s*(?:\d+|[ivx]+)\b/iu;
const POINTS_RE = /[([]\s*(\d+(?:[.,]\d+)?)\s*(?:điểm|đ|pts?|points?)\s*[)\]]/iu;
const MULTIPLE_RE = /[([]\s*(?:nhiều\s*đáp\s*án|chọn\s*nhiều|multiple)\s*[)\]]/iu;
const ESSAY_RE = /[([]\s*(?:tự\s*luận|bài\s*viết|essay)\s*[)\]]/iu;
const CORRECT_SUFFIX_RE = /\s*(?:\*|\((?:đúng|correct)\))\s*$/iu;

type Mode = 'preamble' | 'content' | 'option' | 'explanation' | 'rubric' | 'section';

interface Draft {
  number: number;
  content: string[];
  points: number;
  pointsText?: string;
  forced?: QuizQuestionType;
  options: { text: string; marked: boolean; bold: boolean }[];
  answer?: string;
  explanation: string[];
  rubric: string[];
}

export function parseQuizBlocks(blocks: ImportBlock[]): QuizImportResult {
  const lines = blocks
    .map(block => ({ ...block, text: block.text.replace(/ /g, ' ').replace(/[ \t]+/g, ' ').trim() }))
    .filter(block => block.text);
  const issues: ImportIssue[] = [];
  const preamble: string[] = [];
  const questions: SaveQuizQuestion[] = [];
  const pending: string[] = [];
  let draft: Draft | null = null;
  // Declared with `as` so narrowing does not ignore the assignments made in begin()/addOption().
  let mode = 'preamble' as Mode;

  // With no typed "Câu 1" / "1." headers the questions must be a Word numbered list:
  // the first list in the document is the question list, deeper or other lists are options.
  const usesCau = lines.some(line => QUESTION_RE.test(line.text));
  const typedHeaders = usesCau || lines.some(line => NUMBERED_RE.test(line.text));
  const questionList = typedHeaders ? null : lines.find(line => line.list)?.list ?? null;

  const begin = (header: string) => {
    finish();
    draft = { number: questions.length + 1, content: [...pending], points: 1, options: [], explanation: [], rubric: [] };
    pending.length = 0;
    let text = header;
    const points = POINTS_RE.exec(text);
    if (points) { draft.pointsText = points[1]; text = text.replace(POINTS_RE, ' '); }
    if (MULTIPLE_RE.test(text)) { draft.forced = 'MultipleChoice'; text = text.replace(MULTIPLE_RE, ' '); }
    if (ESSAY_RE.test(text)) { draft.forced = 'Essay'; text = text.replace(ESSAY_RE, ' '); }
    text = text.replace(/\s{2,}/g, ' ').replace(/^[\s:.\-–—]+/, '').trim();
    if (text) draft.content.push(text);
    mode = 'content';
  };

  const addOption = (text: string, bold: boolean, starred: boolean) => {
    const marked = starred || CORRECT_SUFFIX_RE.test(text);
    draft!.options.push({ text: text.replace(CORRECT_SUFFIX_RE, '').trim(), marked, bold });
    mode = 'option';
  };

  const finish = () => {
    const current = draft as Draft | null;
    if (!current) return;
    draft = null;
    const n = current.number;
    const add = (level: ImportIssue['level'], message: string) => issues.push({ level, question: n, message });

    let points = 1;
    if (current.pointsText != null) {
      points = Number(current.pointsText.replace(',', '.'));
      if (!(points > 0 && points <= LIMITS.points)) { add('error', `Điểm "${current.pointsText}" không hợp lệ; đã đặt 1 điểm.`); points = 1; }
    }
    const essay = current.forced === 'Essay' || (!current.options.length && current.forced !== 'MultipleChoice');
    // Lettered lines under a prompt marked as essay (a. …, b. …) belong to the prompt.
    const folded = current.forced === 'Essay'
      ? current.options.map((option, index) => `${String.fromCharCode(97 + index)}. ${option.text}`) : [];
    const content = [...current.content, ...folded].join('\n').trim();
    if (!content) add('error', 'Chưa có nội dung câu hỏi.');
    else if (content.length > LIMITS.content) add('error', `Nội dung dài hơn ${LIMITS.content} ký tự.`);

    let options = current.options;
    let type: QuizQuestionType;
    let rubric = current.rubric.join('\n').trim();
    if (essay) {
      options = [];
      type = 'Essay';
      if (current.answer) rubric = [`Đáp án gợi ý: ${current.answer}`, rubric].filter(Boolean).join('\n');
    } else {
      let correct: boolean[];
      if (current.answer != null) {
        const letters = current.answer.split(/[\s,;/&+]+/u)
          .filter(token => token && !['và', 'and', 'et'].includes(token.toLowerCase()));
        const indexes = letters.map(letter => /^[a-h]$/i.test(letter) ? letter.toUpperCase().charCodeAt(0) - 65 : -1);
        if (!letters.length || indexes.some(index => index < 0 || index >= options.length)) {
          add('error', `Dòng "Đáp án: ${current.answer}" không khớp với các lựa chọn A–${String.fromCharCode(64 + Math.max(options.length, 1))}.`);
        }
        correct = options.map((_, index) => indexes.includes(index));
      } else if (options.some(option => option.marked)) {
        correct = options.map(option => option.marked);
      } else if (options.some(option => option.bold) && !options.every(option => option.bold)) {
        correct = options.map(option => option.bold);
      } else {
        correct = options.map(() => false);
      }
      const correctCount = correct.filter(Boolean).length;
      type = current.forced === 'MultipleChoice' || correctCount > 1 ? 'MultipleChoice' : 'SingleChoice';
      if (options.length < 2) add('error', 'Câu trắc nghiệm cần ít nhất 2 lựa chọn.');
      if (options.length > LIMITS.options) add('error', `Câu trắc nghiệm có nhiều hơn ${LIMITS.options} lựa chọn.`);
      if (options.some(option => !option.text)) add('error', 'Có lựa chọn để trống.');
      if (options.some(option => option.text.length > LIMITS.option)) add('error', `Có lựa chọn dài hơn ${LIMITS.option} ký tự.`);
      if (!correctCount) add('error', 'Chưa đánh dấu đáp án đúng.');
      options = options.map((option, index) => ({ ...option, marked: correct[index] }));
    }
    const explanation = current.explanation.join('\n').trim();
    if (type === 'Essay' && explanation) rubric = [rubric, explanation].filter(Boolean).join('\n');
    if (rubric.length > LIMITS.content || explanation.length > LIMITS.content) add('error', `Lời giải hoặc tiêu chí chấm dài hơn ${LIMITS.content} ký tự.`);

    questions.push({
      type, content, points,
      explanation: type === 'Essay' ? '' : explanation,
      rubric: type === 'Essay' ? rubric : '',
      options: options.map(option => ({ text: option.text, isCorrect: option.marked })),
    });
  };

  for (const line of lines) {
    const text = line.text;
    const current = draft as Draft | null;
    const header = QUESTION_RE.exec(text);
    const numbered = NUMBERED_RE.exec(text);
    const option = OPTION_RE.exec(text);

    if (header) { begin(header[2]); continue; }
    // "1." opens a question only in documents without "Câu N" headers, and only
    // when it is the next number, so numbered instructions stay in their prompt.
    if (!usesCau && numbered && Number(numbered[1]) === questions.length + (current ? 2 : 1)) { begin(numbered[2]); continue; }

    if (current) {
      const expected = String.fromCharCode(97 + current.options.length);
      if (option && option[2].toLowerCase() === expected && (mode === 'content' || mode === 'option')) {
        addOption(option[3], line.bold, !!option[1]);
        continue;
      }
      const answer = ANSWER_RE.exec(text);
      if (answer) { current.answer = answer[1].trim(); mode = 'option'; continue; }
      const explanation = EXPLANATION_RE.exec(text);
      if (explanation) { if (explanation[1]) current.explanation.push(explanation[1]); mode = 'explanation'; continue; }
      const rubric = RUBRIC_RE.exec(text);
      if (rubric) { if (rubric[1]) current.rubric.push(rubric[1]); mode = 'rubric'; continue; }
    }

    if (line.list && !typedHeaders && questionList &&
        line.list.id === questionList.id && line.list.level === questionList.level) {
      begin(text);
      continue;
    }
    if (line.list && current && (mode === 'content' || mode === 'option')) {
      addOption(text, line.bold, false);
      continue;
    }
    if (current && SECTION_RE.test(text)) { finish(); mode = 'section'; pending.push(text); continue; }

    switch (mode) {
      case 'preamble': preamble.push(text); break;
      case 'section': pending.push(text); break;
      case 'content': current!.content.push(text); break;
      case 'explanation': current!.explanation.push(text); break;
      case 'rubric': current!.rubric.push(text); break;
      case 'option':
        issues.push({ level: 'warning', question: current!.number, message: `Bỏ qua dòng không đúng mẫu sau các lựa chọn: "${shorten(text)}"` });
        break;
    }
  }
  finish();
  if (pending.length) issues.push({ level: 'warning', message: `Bỏ qua phần cuối không có câu hỏi: "${shorten(pending.join(' '))}"` });
  if (!questions.length) {
    issues.push({ level: 'error', message: 'Không tìm thấy câu hỏi nào. Mỗi câu cần bắt đầu bằng "Câu 1:", "Câu 2:"… hoặc "1.", "2."…' });
  } else if (questions.length > LIMITS.questions) {
    issues.push({ level: 'error', message: `Một đề chỉ có tối đa ${LIMITS.questions} câu; file có ${questions.length} câu.` });
  }
  return { questions, preamble, issues };
}

function shorten(text: string): string {
  return text.length > 80 ? `${text.slice(0, 77)}…` : text;
}
