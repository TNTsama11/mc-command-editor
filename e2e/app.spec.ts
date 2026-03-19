import { test, expect } from '@playwright/test'

test.describe('MC Command Editor', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('应该显示首页核心文案', async ({ page }) => {
    await expect(page).toHaveTitle(/MC Command Editor/)
    await expect(page.getByRole('heading', { name: 'MC 命令可视化编辑器' })).toBeVisible()
    await expect(page.getByRole('button', { name: '开始创建' })).toBeVisible()
    await expect(page.getByRole('heading', { name: '当前支持的节点类型' })).toBeVisible()
  })

  test('点击打开项目应进入项目设置面板', async ({ page }) => {
    await page.getByRole('button', { name: '打开项目' }).click()

    await expect(page.getByRole('heading', { name: '项目设置' })).toBeVisible()
    await expect(page.getByRole('heading', { name: '项目列表' })).toBeVisible()
  })

  test('开始创建后应自动拥有一个当前项目', async ({ page }) => {
    await page.getByRole('button', { name: '开始创建' }).click()
    await page.getByRole('button', { name: '设置' }).click()

    await expect(page.getByRole('heading', { name: '项目设置' })).toBeVisible()
    await expect(page.getByText('当前还没有打开项目。')).toHaveCount(0)
    await expect(page.getByLabel('项目名称')).toBeVisible()
  })
})

test.describe('PWA 功能', () => {
  test('应该注册 Service Worker', async ({ page }) => {
    await page.goto('/')

    const swRegistered = await page.evaluate(() => {
      return new Promise((resolve) => {
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.ready.then(() => resolve(true))
          setTimeout(() => resolve(false), 5000)
        } else {
          resolve(false)
        }
      })
    })

    expect(swRegistered).toBe(true)
  })

  test('应该有有效的 manifest.json', async ({ page, request }) => {
    await page.goto('/')

    const manifest = await request.get('/manifest.json')
    expect(manifest.ok()).toBeTruthy()

    const manifestData = await manifest.json()

    expect(manifestData.name).toBe('MC Command Editor')
    expect(manifestData.short_name).toBe('MCEditor')
    expect(manifestData.start_url).toBe('/')
    expect(manifestData.display).toBe('standalone')
    expect(Array.isArray(manifestData.icons)).toBe(true)
    expect(manifestData.icons.length).toBeGreaterThan(0)
  })
})

test.describe('响应式设计', () => {
  test('移动端应该正确显示首页标题', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/')

    await expect(page.getByRole('heading', { name: 'MC 命令可视化编辑器' })).toBeVisible()
  })

  test('平板端应该正确显示首页标题', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 })
    await page.goto('/')

    await expect(page.getByRole('heading', { name: 'MC 命令可视化编辑器' })).toBeVisible()
  })

  test('桌面端应该正确显示首页标题', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.goto('/')

    await expect(page.getByRole('heading', { name: 'MC 命令可视化编辑器' })).toBeVisible()
  })
})

test.describe('无障碍', () => {
  test('首页应该保留标题层级', async ({ page }) => {
    await page.goto('/')

    const h1Count = await page.locator('h1').count()
    expect(h1Count).toBeGreaterThanOrEqual(1)
  })

  test('按钮应该保留可访问名称或提示', async ({ page }) => {
    await page.goto('/')

    await expect(page.getByRole('button', { name: '开始创建' })).toBeVisible()
    await expect(page.locator('button[title=\"搜索命令\"]')).toBeVisible()
  })

  test('设置按钮应打开项目设置面板', async ({ page }) => {
    await page.goto('/')

    await page.getByRole('button', { name: '设置' }).click()

    await expect(page.getByRole('heading', { name: '项目设置' })).toBeVisible()
    await expect(page.getByText('目标版本')).toBeVisible()
  })
})
