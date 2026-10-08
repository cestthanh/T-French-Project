import { of } from 'rxjs';
import { AuthService } from 'src/app/services/authService';
import { ClassService } from 'src/app/services/classService';
import { QuizService } from 'src/app/services/quizService';
import { ToastService } from 'src/app/services/share/toastService';
import { linkParts } from './linkify.pipe';
import { QuizPage } from './quiz';
import { parseQuizBlocks, readDocxBlocks, textToBlocks } from './quiz-import';

const parseText = (text: string) => parseQuizBlocks(textToBlocks(text));

describe('Quiz import from Word text', () => {
  it('reads choice, multiple-choice and essay questions with their answers, points and notes', () => {
    const result = parseText([
      'Bài kiểm tra A1',
      'Nghe tại https://drive.google.com/drive/folders/abc',
      '',
      'Câu 1: Comment dit-on « xin chào » ? (1,5 điểm)',
      'A. Merci',
      '*B. Bonjour',
      'C. Au revoir',
      'Giải thích: Lời chào.',
      'Câu 2 (2 điểm): Chọn màu',
      'A) rouge',
      'B) maison',
      'C) bleu',
      'Đáp án: A và C',
      'Câu 3 [tự luận]: Présentez-vous :',
      'a. nom',
      'b. âge',
      'Tiêu chí: Đủ ý.',
    ].join('\n'));

    expect(result.issues).toEqual([]);
    expect(result.preamble).toEqual(['Bài kiểm tra A1', 'Nghe tại https://drive.google.com/drive/folders/abc']);
    expect(result.questions.length).toBe(3);
    const [single, multiple, essay] = result.questions;
    expect(single).toEqual({
      type: 'SingleChoice', content: 'Comment dit-on « xin chào » ?', points: 1.5,
      explanation: 'Lời chào.', rubric: '',
      options: [{ text: 'Merci', isCorrect: false }, { text: 'Bonjour', isCorrect: true }, { text: 'Au revoir', isCorrect: false }],
    });
    expect(multiple.type).toBe('MultipleChoice');
    expect(multiple.points).toBe(2);
    expect(multiple.options.map(o => o.isCorrect)).toEqual([true, false, true]);
    expect(essay.type).toBe('Essay');
    expect(essay.options).toEqual([]);
    expect(essay.content).toBe('Présentez-vous :\na. nom\nb. âge');
    expect(essay.rubric).toBe('Đủ ý.');
  });

  it('keeps a single correct answer as multiple choice when the teacher asks for it', () => {
    const [question] = parseText('Câu 1 [nhiều đáp án]: Chọn\nA. x\n*B. y').questions;
    expect(question.type).toBe('MultipleChoice');
    expect(question.content).toBe('Chọn');
  });

  it('attaches a section heading and its listening link to the first question of the section', () => {
    const result = parseText([
      'Câu 1: Một', 'A. x', '*B. y',
      'Phần 2 — Nghe hiểu', 'Link: https://drive.google.com/file/d/xyz/view',
      'Câu 2: Où est Marie ?', '*A. gare', 'B. marché',
    ].join('\n'));
    expect(result.issues).toEqual([]);
    expect(result.questions[1].content).toBe('Phần 2 — Nghe hiểu\nLink: https://drive.google.com/file/d/xyz/view\nOù est Marie ?');
  });

  it('uses "1." headers only when there are no "Câu" headers, and only in sequence', () => {
    const numbered = parseText('1. Premier\n*A. x\nB. y\n2. Écrivez :\n1. une phrase\n3. Dernier');
    expect(numbered.questions.map(q => q.content)).toEqual(['Premier', 'Écrivez :\n1. une phrase', 'Dernier']);

    const cau = parseText('Hướng dẫn:\n1. Không dùng tài liệu\nCâu 1: Viết');
    expect(cau.preamble).toEqual(['Hướng dẫn:', '1. Không dùng tài liệu']);
    expect(cau.questions.length).toBe(1);
  });

  it('reports what the editor or API would reject instead of guessing', () => {
    const result = parseText([
      'Câu 1: Không có đáp án đúng', 'A. x', 'B. y',
      'Câu 2: Một lựa chọn', '*A. x',
      'Câu 3: Sai chữ', 'A. x', 'B. y', 'Đáp án: D',
      'Câu 4: (0 điểm) Điểm sai', 'A. x', '*B. y', 'Dòng lạc',
    ].join('\n'));
    const messages = result.issues.map(i => `${i.question}:${i.level}:${i.message}`);
    expect(messages).toContain('1:error:Chưa đánh dấu đáp án đúng.');
    expect(messages).toContain('2:error:Câu trắc nghiệm cần ít nhất 2 lựa chọn.');
    expect(messages.some(m => m.startsWith('3:error:Dòng "Đáp án: D"'))).toBeTrue();
    expect(messages.some(m => m.startsWith('4:error:Điểm "0"'))).toBeTrue();
    expect(messages.some(m => m.startsWith('4:warning:Bỏ qua dòng'))).toBeTrue();
    expect(result.questions[3].points).toBe(1);
  });

  it('explains the expected format when nothing looks like a question', () => {
    const result = parseText('Chỉ là một đoạn văn.');
    expect(result.questions).toEqual([]);
    expect(result.issues[0].level).toBe('error');
  });
});

describe('Quiz import from .docx', () => {
  const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
  const R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
  const para = (body: string, list?: [number, number]) =>
    `<w:p>${list ? `<w:pPr><w:numPr><w:ilvl w:val="${list[1]}"/><w:numId w:val="${list[0]}"/></w:numPr></w:pPr>` : ''}${body}</w:p>`;
  const run = (text: string, bold = false) => `<w:r>${bold ? '<w:rPr><w:b/></w:rPr>' : ''}<w:t xml:space="preserve">${text}</w:t></w:r>`;

  async function docx(paragraphs: string[], rels = ''): Promise<ArrayBuffer> {
    const files: [string, string][] = [
      ['word/document.xml', `<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="${W}" xmlns:r="${R}"><w:body>${paragraphs.join('')}</w:body></w:document>`],
      ['word/_rels/document.xml.rels', `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${rels}</Relationships>`],
    ];
    return zip(await Promise.all(files.map(async ([name, text]) => ({ name, data: await deflate(new TextEncoder().encode(text)) }))));
  }

  async function deflate(data: Uint8Array): Promise<Uint8Array> {
    const stream = new Blob([data as Uint8Array<ArrayBuffer>]).stream().pipeThrough(new CompressionStream('deflate-raw'));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  }

  /** Minimal zip writer (deflate, CRC left at 0 since the reader does not check it). */
  function zip(entries: { name: string; data: Uint8Array }[]): ArrayBuffer {
    const encoder = new TextEncoder();
    const chunks: Uint8Array[] = [];
    const central: Uint8Array[] = [];
    let offset = 0;
    for (const entry of entries) {
      const name = encoder.encode(entry.name);
      const local = new DataView(new ArrayBuffer(30));
      local.setUint32(0, 0x04034b50, true); local.setUint16(8, 8, true);
      local.setUint32(18, entry.data.length, true); local.setUint16(26, name.length, true);
      const header = new DataView(new ArrayBuffer(46));
      header.setUint32(0, 0x02014b50, true); header.setUint16(10, 8, true);
      header.setUint32(20, entry.data.length, true); header.setUint16(28, name.length, true);
      header.setUint32(42, offset, true);
      chunks.push(new Uint8Array(local.buffer), name, entry.data);
      central.push(new Uint8Array(header.buffer), name);
      offset += 30 + name.length + entry.data.length;
    }
    const size = central.reduce((sum, c) => sum + c.length, 0);
    const end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, 0x06054b50, true); end.setUint16(8, entries.length, true); end.setUint16(10, entries.length, true);
    end.setUint32(12, size, true); end.setUint32(16, offset, true);
    const all = [...chunks, ...central, new Uint8Array(end.buffer)];
    const output = new Uint8Array(all.reduce((sum, c) => sum + c.length, 0));
    let position = 0;
    for (const chunk of all) { output.set(chunk, position); position += chunk.length; }
    return output.buffer;
  }

  it('reads bold answers, hyperlinks and Word auto-lettered options', async () => {
    const data = await docx([
      para(run('Câu 1: Écoutez ') + `<w:hyperlink r:id="rId9">${run('le fichier')}</w:hyperlink>` + run(' puis répondez.')),
      para(run('À la gare'), [3, 0]),
      para(run('Au ') + run('marché', true), [3, 0]),
      para(run('À l’école'), [3, 0]),
      para(run('Câu 2: Chọn')),
      para(run('A. x')),
      para(run('B. y', true)),
      para('<w:del><w:r><w:delText>đã xóa</w:delText></w:r></w:del>' + run('C. z')),
    ], `<Relationship Id="rId9" Type="${R}/hyperlink" Target="https://drive.google.com/file/d/abc/view" TargetMode="External"/>`);

    const result = parseQuizBlocks(await readDocxBlocks(data));
    expect(result.issues).toEqual([{ level: 'error', question: 1, message: 'Chưa đánh dấu đáp án đúng.' }]);
    expect(result.questions[0].content).toBe('Écoutez le fichier (https://drive.google.com/file/d/abc/view) puis répondez.');
    // A partly bold option is not treated as the marked answer.
    expect(result.questions[0].options.map(o => o.text)).toEqual(['À la gare', 'Au marché', 'À l’école']);
    expect(result.questions[1].options.map(o => o.isCorrect)).toEqual([false, true, false]);
    expect(result.questions[1].options[2].text).toBe('z');
    expect(result.questions[0].options.some(o => o.isCorrect)).toBeFalse();
  });

  it('rejects files that are not Word documents', async () => {
    await expectAsync(readDocxBlocks(new TextEncoder().encode('not a zip').buffer as ArrayBuffer))
      .toBeRejectedWithError(/không phải tài liệu Word/);
  });
});

describe('linkParts', () => {
  it('turns http(s) links into parts and leaves trailing punctuation as text', () => {
    expect(linkParts('Nghe: https://drive.google.com/x/view. Hết')).toEqual([
      { text: 'Nghe: ' }, { text: 'https://drive.google.com/x/view', href: 'https://drive.google.com/x/view' }, { text: '. Hết' },
    ]);
    expect(linkParts('(https://a.test/b)')[1].href).toBe('https://a.test/b');
    expect(linkParts('javascript:alert(1) ftp://x')).toEqual([{ text: 'javascript:alert(1) ftp://x' }]);
  });
});

describe('QuizPage import', () => {
  let page: QuizPage;

  beforeEach(() => {
    const service = jasmine.createSpyObj<QuizService>('QuizService', ['getManaged']);
    service.getManaged.and.returnValue(of([]));
    const classes = jasmine.createSpyObj<ClassService>('ClassService', ['getManaged']);
    classes.getManaged.and.returnValue(of([]));
    page = new QuizPage(
      { currentUser: { role: 'Teacher' } } as unknown as AuthService,
      service, classes, jasmine.createSpyObj<ToastService>('ToastService', ['error', 'success']),
    );
    page.ngOnInit();
  });

  afterEach(() => page.ngOnDestroy());

  it('appends imported questions, fills an empty title/description and numbers notes as in the editor', () => {
    page.addQuestion('Essay');
    page.quizDraft.questions[0].content = 'Có sẵn';
    page.importText = 'Đề A1\nFile nghe: https://drive.google.com/x\nCâu 1: Hai\nA. x\nB. y';
    page.readPastedText();
    page.applyImport(false);
    expect(page.quizDraft.questions.map(q => q.content)).toEqual(['Có sẵn', 'Hai']);
    expect(page.quizDraft.title).toBe('Đề A1');
    expect(page.quizDraft.description).toBe('File nghe: https://drive.google.com/x');
    expect(page.importNotes).toEqual(['Câu 2: Chưa đánh dấu đáp án đúng.']);
    expect(page.importOpen).toBeFalse();
    expect(page.draftDirty).toBeTrue();
  });

  it('replaces existing questions only after confirmation and keeps a typed title', () => {
    page.quizDraft.title = 'Tên của tôi';
    page.addQuestion('Essay');
    page.importText = 'Tiêu đề trong file\nCâu 1: Mới';
    page.readPastedText();
    spyOn(window, 'confirm').and.returnValues(false, true);
    page.applyImport(true);
    expect(page.quizDraft.questions.length).toBe(1);
    expect(page.quizDraft.questions[0].content).toBe('');
    page.applyImport(true);
    expect(page.quizDraft.questions.map(q => q.content)).toEqual(['Mới']);
    expect(page.quizDraft.title).toBe('Tên của tôi');
    expect(page.quizDraft.description).toBe('Tiêu đề trong file');
  });
});
