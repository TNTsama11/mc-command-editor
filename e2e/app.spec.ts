/**
 * E2E 测试 - 应用基础功能
 */

import { test, expect, Page } from '@playwright/test'

test.describe('MC Command Editor', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('应该正确加载首页', async ({ page }) => {
    // 检查页面标题
    await expect(page).toHaveTitle(/MC Command Editor/)

    // 检查主标题
    await expect(page.getByRole('heading', { name: 'MC Command Editor' })).toBeVisible()

    // 检查描述
    await expect(page.getByText('Minecraft 命令可视化编辑器')).toBeVisible()
  })

  test('应该显示功能卡片', async ({ page }) => {
    // 检查命令编辑功能卡片
    await expect(page.getByText('命令编辑')).toBeVisible()
    await expect(page.getByText('可视化编辑 Minecraft 命令')).toBeVisible()

    // 检查命令方块链功能卡片
    await expect(page.getByText('命令方块链')).toBeVisible()

    // 检查数据包生成功能卡片
    await expect(page.getByText('数据包生成')).toBeVisible()
  })

  test('应该能够切换深色模式', async ({ page }) => {
    // 找到主题切换按钮
    const themeToggle = page.getByRole('button', { name: /sun|moon/i })
    await expect(themeToggle).toBeVisible()

    // 点击切换
    await themeToggle.click()

    // 验证深色模式已启用（检查 class）
    const htmlElement = page.locator('html')
    await expect(htmlElement).toHaveClass(/dark/)
  })

  test('应该显示快速开始区域', async ({ page }) => {
    // 检查快速开始标题
    await expect(page.getByText('快速开始')).toBeVisible()

    // 检查按钮
    await expect(page.getByRole('button', { name: '新建命令' })).toBeVisible()
    await expect(page.getByRole('button', { name: '打开项目' })).toBeVisible()
    await expect(page.getByRole('button', { name: '从命令导入' })).toBeVisible()
  })

  test('应该显示命令预览区域', async ({ page }) => {
    await expect(page.getByText('命令预览')).toBeVisible()
    await expect(page.getByText('实时预览生成的命令')).toBeVisible()
  })
})

test.describe('PWA 功能', () => {
  test('应该注册 Service Worker', async ({ page }) => {
    await page.goto('/')

    // 等待 Service Worker 注册
    const swRegistered = await page.evaluate(() => {
      return new Promise((resolve) => {
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.ready.then(() => resolve(true))
          // 超时处理
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

    // 获取 manifest
    const manifest = await request.get('/manifest.json')
    expect(manifest.ok()).toBeTruthy()

    const manifestData = await manifest.json()

    // 验证必要字段
    expect(manifestData.name).toBe('MC Command Editor')
    expect(manifestData.short_name).toBe('MCEditor')
    expect(manifestData.start_url).toBe('/')
    expect(manifestData.display).toBe('standalone')
    expect(Array.isArray(manifestData.icons)).toBe(true)
    expect(manifestData.icons.length).toBeGreaterThan(0)
  })
})

test.describe('响应式设计', () => {
  test('移动端应该正确显示', async ({ page }) => {
    // 设置移动端视口
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/')

    // 检查主要内容仍然可见
    await expect(page.getByRole('heading', { name: 'MC Command Editor' })).toBeVisible()

    // 检查功能卡片堆叠显示
    const featureCards = page.locator('.grid')
    await expect(featureCards).toBeVisible()
  })

  test('平板端应该正确显示', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 })
    await page.goto('/')

    // 检查布局
    await expect(page.getByRole('heading', { name: 'MC Command Editor' })).toBeVisible()
  })

  test('桌面端应该正确显示', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.goto('/')

    // 检查布局
    await expect(page.getByRole('heading', { name: 'MC Command Editor' })).toBeVisible()
  })
})

test.describe('无障碍性', () => {
  test('应该有正确的 heading 层级', async ({ page }) => {
    await page.goto('/')

    // 获取所有 headings
    const headings = await page.locator('h1, h2, h3, h4, h5, h6').all()

    // 验证至少有一个 h1
    const h1Count = await page.locator('h1').count()
    expect(h1Count).toBeGreaterThanOrEqual(1)
  })

  test('按钮应该有可访问的名称', async ({ page }) => {
    await page.goto('/')

    // 获取所有按钮
    const buttons = await page.locator('button').all()

    for (const button of buttons) {
      // 每个按钮应该有 accessible name
      const name = await button.evaluate((el) => {
        return el.getAttribute('aria-label') || el.textContent || el.getAttribute('title')
      })
      expect(name).toBeTruthy()
    }
  })
})
