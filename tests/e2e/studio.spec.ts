import { expect, test, type Page } from '@playwright/test';

async function waitStudio(page: Page) {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'PhilWeb Studio' })).toBeVisible();
  await expect(page.locator('#quick-save')).toBeVisible();
}

test('GitHub Pages style root launches the editor', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const apiHits: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes('/studio/api/')) apiHits.push(request.url());
  });
  await waitStudio(page);
  await expect(page.getByText('基本信息')).toBeVisible();
  expect(apiHits).toEqual([]);
  expect(errors).toEqual([]);
});

test('first visit loads the starter and live-previews a name change', async ({ page }) => {
  await waitStudio(page);
  await page.getByRole('button', { name: '首页内容' }).click();
  const name = page.locator('#h-name input, #h-name + input, label#h-name input, #h-name input');
  const input = page.locator('#h-name').locator('input');
  await expect(input).toBeVisible();
  await input.fill('验收用户');
  const frame = page.frameLocator('#pv');
  await expect(frame.getByText('验收用户').first()).toBeVisible({ timeout: 8000 });
});

test('save button stays visible while scrolling and Ctrl+S works', async ({ page }) => {
  await waitStudio(page);
  await page.getByRole('button', { name: '首页内容' }).click();
  await page.locator('.panel').evaluate((el) => { el.scrollTop = el.scrollHeight; });
  await expect(page.locator('#quick-save')).toBeVisible();
  const box = await page.locator('#quick-save').boundingBox();
  expect(box).toBeTruthy();
  await page.locator('#h-name input').fill('保存用户');
  await page.keyboard.press('Control+s');
  await expect(page.locator('.save-status')).toContainText(/已保存|保存中/);
});

test('refresh keeps edits and desktop/mobile preview still works', async ({ page }) => {
  await waitStudio(page);
  await page.getByRole('button', { name: '首页内容' }).click();
  await page.locator('#h-name input').fill('刷新用户');
  await page.locator('#quick-save').click();
  await page.waitForTimeout(600);
  await page.reload();
  await waitStudio(page);
  await page.getByRole('button', { name: '首页内容' }).click();
  await expect(page.locator('#h-name input')).toHaveValue('刷新用户');
  await page.getByRole('button', { name: '手机' }).click();
  await expect(page.locator('#pv-wrap')).toHaveClass(/mobile/);
  await page.getByRole('button', { name: '电脑' }).click();
});

test('edit mode switch does not reload iframe', async ({ page }) => {
  await waitStudio(page);
  const iframe = page.locator('#pv');
  const src1 = await iframe.getAttribute('src');
  await page.getByRole('button', { name: '正常预览' }).click();
  await page.getByRole('button', { name: '点哪改哪' }).click();
  const src2 = await iframe.getAttribute('src');
  expect(src1).toBe(src2);
});

test('identity list supports add and icon pick', async ({ page }) => {
  await waitStudio(page);
  await page.getByRole('button', { name: '首页内容' }).click();
  await page.getByRole('button', { name: '添加一个身份' }).click();
  expect(await page.locator('.identity-item').count()).toBeGreaterThan(0);
  await expect(page.locator('.identity-item').last().locator('select')).toBeVisible();
});

test('background pattern change is applied to preview', async ({ page }) => {
  await waitStudio(page);
  await page.getByRole('button', { name: '外观风格' }).click();
  await page.locator('#t-background-pattern').selectOption('dots');
  await expect(page.frameLocator('#pv').locator('html')).toHaveAttribute('data-site-background-pattern', 'dots', { timeout: 8000 });
});

test('click-to-edit jumps to the name field', async ({ page }) => {
  await waitStudio(page);
  await page.getByRole('button', { name: '点哪改哪' }).click();
  await page.frameLocator('#pv').locator('h2[data-edit="home.name"]').click({ force: true, timeout: 8000 });
  await expect(page.locator('#h-name input')).toBeVisible();
  await expect(page.locator('#h-name')).toBeVisible();
});

test('export website zip and project backup', async ({ page }) => {
  await waitStudio(page);
  const [website] = await Promise.all([
    page.waitForEvent('download', { timeout: 30000 }),
    page.getByRole('button', { name: '检查并导出网站' }).first().click(),
  ]);
  expect(website.suggestedFilename()).toMatch(/\.zip$/);
  await page.getByRole('button', { name: '帮助与导出' }).click();
  const [backup] = await Promise.all([
    page.waitForEvent('download', { timeout: 30000 }),
    page.getByRole('button', { name: '导出工程备份' }).click(),
  ]);
  expect(backup.suggestedFilename()).toMatch(/philweb-project-v1\.zip/);
});
