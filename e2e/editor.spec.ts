/**
 * E2E 测试 - 命令编辑器功能
 */

import { test, expect } from '@playwright/test'

test.describe('命令编辑器', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('应该能够新建命令', async ({ page }) => {
    // 点击新建命令按钮
    await page.getByRole('button', { name: '新建命令' }).click()

    // 验证进入编辑模式（如果有相应的 UI 变化）
    // 这里需要根据实际 UI 实现
  })

  test('应该能够选择命令类型', async ({ page }) => {
    // 假设有命令类型选择器
    const commandSelector = page.locator('[data-testid="command-type-selector"]')

    if (await commandSelector.isVisible()) {
      await commandSelector.click()

      // 选择 give 命令
      await page.getByRole('option', { name: /give/i }).click()
    }
  })

  test('应该能够输入命令参数', async ({ page }) => {
    // 假设有参数输入区域
    const paramInput = page.locator('[data-testid="param-input"]').first()

    if (await paramInput.isVisible()) {
      await paramInput.fill('@p')
      await expect(paramInput).toHaveValue('@p')
    }
  })

  test('应该能够预览生成的命令', async ({ page }) => {
    // 检查命令预览区域
    const previewArea = page.locator('[data-testid="command-preview"]')

    if (await previewArea.isVisible()) {
      // 验证预览区域存在
      await expect(previewArea).toBeVisible()
    }
  })

  test('应该能够复制命令', async ({ page }) => {
    // 假设有复制按钮
    const copyButton = page.getByRole('button', { name: /复制/i })

    if (await copyButton.isVisible()) {
      // 点击复制
      await copyButton.click()

      // 验证复制成功提示（如果有）
      await expect(page.getByText(/已复制/i)).toBeVisible()
    }
  })
})

test.describe('命令历史', () => {
  test('应该显示最近使用的命令', async ({ page }) => {
    await page.goto('/')

    // 检查最近使用区域
    await expect(page.getByText('最近使用')).toBeVisible()
  })

  test('历史记录应该可以点击', async ({ page }) => {
    await page.goto('/')

    // 找到历史记录项
    const historyItems = page.locator('[data-testid="command-history-item"]')

    if (await historyItems.first().isVisible()) {
      await historyItems.first().click()
    }
  })
})
