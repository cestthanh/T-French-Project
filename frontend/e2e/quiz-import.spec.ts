import { test, expect, Page, Browser } from '@playwright/test';
import path from 'node:path';

const localTime = (date: Date) => new Date(date.getTime() + 7 * 3600000).toISOString().slice(0, 19);
const sample = path.join(__dirname, '../src/assets/templates/mau-de-kiem-tra.docx');

async function actor(browser: Browser) {
  const context = await browser.newContext({ timezoneId: 'Asia/Bangkok', baseURL: process.env.TFRENCH_E2E_URL || 'http://127.0.0.1:8089' });
  return context.newPage();
}
async function login(page: Page, email: string, password: string) {
  page.on('dialog', dialog => dialog.accept());
  await page.goto('/auth/login');
  await page.locator('#login-email').fill(email);
  await page.locator('#login-password').fill(password);
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard(?:\/admin)?$/);
}

test('Teacher imports the sample Word test; learner sees its Google Drive listening links', async ({ browser, request }) => {
  expect((await request.get('/assets/templates/mau-de-kiem-tra.docx')).ok()).toBeTruthy();
  const teacher = await actor(browser);
  const student = await actor(browser);
  const email = `quiz-import-${Date.now()}@example.test`;
  const registration = await request.post('/api/auth/register', { data: { fullName: 'Quiz import learner', email, password: 'Testing@123' } });
  expect(registration.ok()).toBeTruthy();
  const learnerHeaders = { Authorization: `Bearer ${(await registration.json()).token}` };
  const course = await (await request.get('/api/courses/1')).json();
  const cohort = course.classes[0];
  expect((await request.post('/api/courses/1/enroll', { headers: learnerHeaders, data: { classId: cohort.id } })).ok()).toBeTruthy();
  try {
    await login(teacher, 'teacher@tfrench.vn', 'Teacher@123');
    await teacher.goto('/dashboard/quizzes');
    const editor = teacher.locator('aside');
    const title = `Imported quiz ${Date.now()}`;
    await editor.locator('input').first().fill(title);
    await editor.locator('select').selectOption({ label: `${course.title} — ${cohort.name}` });
    await editor.locator('input[type=datetime-local]').nth(0).fill(localTime(new Date(Date.now() - 60_000)));
    await editor.locator('input[type=datetime-local]').nth(1).fill(localTime(new Date(Date.now() + 3_600_000)));

    await editor.getByRole('button', { name: 'Nhập từ file Word' }).click();
    await editor.getByTestId('quiz-import-file').setInputFiles(sample);
    const result = editor.getByTestId('quiz-import-result');
    await expect(result).toContainText('4 câu · 2 một đáp án · 1 nhiều đáp án · 1 tự luận · 9 điểm');
    await expect(result.getByText(/^Lỗi/)).toHaveCount(0);
    await result.getByRole('button', { name: 'Thêm 4 câu vào đề', exact: true }).click();
    await expect(editor.locator('article')).toHaveCount(4);
    await expect(editor.locator('input[type=radio]:checked')).toHaveCount(2);

    await editor.getByRole('button', { name: 'Lưu bản nháp', exact: true }).click();
    const card = teacher.locator('article').filter({ has: teacher.getByRole('heading', { name: title, exact: true }) });
    await expect(card).toContainText('4 câu · 9 điểm');
    await card.getByRole('button', { name: 'Công bố', exact: true }).click();
    await expect(card.getByText('Đã publish', { exact: true })).toBeVisible();

    await login(student, email, 'Testing@123');
    await student.goto('/dashboard/quizzes');
    const learnerCard = student.locator('article').filter({ has: student.getByRole('heading', { name: title, exact: true }) });
    await expect(learnerCard.getByRole('link', { name: 'https://drive.google.com/drive/folders/THAY-BANG-ID-THU-MUC' })).toBeVisible();
    await learnerCard.getByRole('button', { name: 'Bắt đầu làm bài', exact: true }).click();
    const listening = student.getByRole('link', { name: 'https://drive.google.com/file/d/THAY-BANG-ID-FILE/view' });
    await expect(listening).toHaveAttribute('target', '_blank');
    await expect(listening).toHaveAttribute('rel', 'noopener noreferrer');
    await expect(student.getByText('Où est Marie ?')).toBeVisible();
    await expect(student.locator('input[type=checkbox]')).toHaveCount(4);
    await expect(student.locator('textarea')).toHaveCount(1);
  } finally { await teacher.context().close(); await student.context().close(); }
});
