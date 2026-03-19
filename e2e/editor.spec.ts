import { expect, test, type Page } from '@playwright/test'

async function ensureNodePanelVisible(page: Page) {
  if ((page.viewportSize()?.width ?? 0) >= 768) {
    return 'desktop' as const
  }

  const expandButton = page.getByTitle('展开面板')
  if (await expandButton.isVisible()) {
    await expandButton.click()
    return 'mobile' as const
  }

  return 'desktop' as const
}

function getNodePanel(page: Page, mode: 'desktop' | 'mobile') {
  const containerTestId =
    mode === 'mobile' ? 'mobile-node-panel-container' : 'desktop-node-panel-container'

  return page.getByTestId(containerTestId).getByTestId('node-panel')
}

test.describe('节点编辑器', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('点击开始创建后应该进入节点工作台并显示节点分组', async ({ page }) => {
    test.skip((page.viewportSize()?.width ?? 0) < 768, '移动端节点抽屉交互单独验证')

    await page.getByRole('button', { name: '开始创建' }).click()
    const panelMode = await ensureNodePanelVisible(page)
    const nodePanel = getNodePanel(page, panelMode)

    await expect(nodePanel.getByRole('heading', { name: '高频推荐' })).toBeVisible()
    await expect(nodePanel.getByRole('heading', { name: '基础命令' })).toBeVisible()
    await expect(nodePanel.getByRole('heading', { name: '方块与世界' })).toBeVisible()
    await expect(nodePanel.getByRole('heading', { name: '条件与执行' })).toBeVisible()
    await expect(nodePanel.getByRole('heading', { name: '常量与输入' })).toBeVisible()

    await expect(nodePanel.getByText(/^Give$/)).toBeVisible()
    await expect(nodePanel.getByText(/^Summon$/)).toBeVisible()
    await expect(nodePanel.getByText(/^Teleport$/)).toBeVisible()
    await expect(nodePanel.getByText(/^Setblock$/)).toBeVisible()
    await expect(nodePanel.getByText(/^Fill$/)).toBeVisible()
    await expect(nodePanel.getByText(/^Effect$/)).toBeVisible()
    await expect(nodePanel.getByText(/^Execute$/)).toBeVisible()
  })

  test('搜索应该同时兼容命令 ID、标签和说明', async ({ page }) => {
    test.skip((page.viewportSize()?.width ?? 0) < 768, '移动端节点抽屉交互单独验证')

    await page.getByRole('button', { name: '开始创建' }).click()
    const panelMode = await ensureNodePanelVisible(page)
    const nodePanel = getNodePanel(page, panelMode)
    const searchInput = nodePanel.getByTestId('node-search-input')

    await searchInput.fill('give')
    await expect(nodePanel.getByText(/^Give$/)).toBeVisible()

    await searchInput.fill('召唤')
    await expect(nodePanel.getByText(/^Summon$/)).toBeVisible()

    await searchInput.fill('方块')
    await expect(nodePanel.getByText(/^Setblock$/)).toBeVisible()
  })

  test('最近使用入口应该回到经典命令编辑器', async ({ page }) => {
    test.skip((page.viewportSize()?.width ?? 0) < 768, '移动端经典编辑器入口单独验证')

    await page.getByRole('button', { name: '开始创建' }).click()
    await page.getByRole('button', { name: /返回首页/ }).click()
    await page.getByText('/give @p diamond 64').click()

    await expect(page.getByText('命令类型', { exact: true })).toBeVisible()
    await expect(page.getByRole('combobox')).toBeVisible()
    await expect(page.getByText('请先选择命令类型')).toBeVisible()
  })

  test('选中节点后参数面板应显示常用参数、高级参数和输入来源', async ({ page }) => {
    test.skip((page.viewportSize()?.width ?? 0) < 768, '移动端参数面板暂不纳入主线回归')

    await page.getByRole('button', { name: '开始创建' }).click()
    const panelMode = await ensureNodePanelVisible(page)
    const nodePanel = getNodePanel(page, panelMode)

    await nodePanel.getByText(/^Give$/).first().dblclick()
    await page.getByTestId('flow-node-give').click()

    const configPanel = page
      .getByTestId('desktop-node-config-container')
      .getByTestId('node-config-panel')
    await expect(configPanel).toBeVisible()
    await expect(configPanel.getByTestId('config-common-section')).toBeVisible()
    await expect(configPanel.getByTestId('config-advanced-section')).toBeVisible()
    await expect(configPanel.getByTestId('config-source-section')).toBeVisible()
    await expect(configPanel.getByTestId('config-field-target')).toBeVisible()
    await expect(configPanel.getByTestId('config-field-item')).toBeVisible()
  })

  test('资源字段应显示候选资源，并支持点击回填', async ({ page }) => {
    test.skip((page.viewportSize()?.width ?? 0) < 768, '移动端资源选择暂不纳入主线回归')

    await page.getByRole('button', { name: '开始创建' }).click()
    const panelMode = await ensureNodePanelVisible(page)
    const nodePanel = getNodePanel(page, panelMode)

    await nodePanel.getByText(/^Give$/).first().dblclick()
    await page.getByTestId('flow-node-give').click()

    const configPanel = page
      .getByTestId('desktop-node-config-container')
      .getByTestId('node-config-panel')
    const itemField = configPanel.getByTestId('config-field-item')

    await expect(itemField.getByTestId('resource-suggestions-item')).toBeVisible()
    await itemField.getByTestId('resource-option-item-minecraft-diamond').click()
    await expect(itemField.locator('input')).toHaveValue('minecraft:diamond')
  })

  test('问题列表应展示工作流检查结果，并支持点击后定位节点', async ({ page }) => {
    test.skip((page.viewportSize()?.width ?? 0) < 768, '移动端问题列表暂不纳入主线回归')

    await page.getByRole('button', { name: '开始创建' }).click()
    const panelMode = await ensureNodePanelVisible(page)
    const nodePanel = getNodePanel(page, panelMode)

    await nodePanel.getByText(/^Give$/).first().dblclick()

    const issuePanel = page.getByTestId('workflow-issue-panel')
    await expect(issuePanel).toBeVisible()
    const firstIssue = issuePanel.locator('button').first()
    await expect(firstIssue).toBeVisible()

    await firstIssue.click()

    const configPanel = page
      .getByTestId('desktop-node-config-container')
      .getByTestId('node-config-panel')
    await expect(configPanel).toBeVisible()
    await expect(configPanel.getByText('Give')).toBeVisible()
  })
})
