import { expect, test, type Page } from '@playwright/test'

const title = (page: Page) => page.getByRole('heading', { level: 1 })
const sidebar = (page: Page) => page.getByRole('navigation', { name: 'Sidebar' })

// The native folder picker cannot be driven by a test, so it hands back a folder in the sandbox instead.
const fakePicker = (page: Page) =>
  page.addInitScript(() => {
    window.showDirectoryPicker = async () => (await navigator.storage.getDirectory()).getDirectoryHandle('Projects', { create: true })
  })

test('starts in the sandbox and moves with open, back and forward', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('console', (message) => message.type() === 'error' && errors.push(message.text()))

  await page.goto('/')
  await expect(title(page)).toHaveText('Sandbox')
  await page.getByRole('option', { name: 'Documents' }).dblclick()
  await expect(title(page)).toHaveText('Documents')
  await expect(page.getByText('This folder is empty.')).toBeVisible()
  await page.getByRole('button', { name: 'Back' }).click()
  await expect(title(page)).toHaveText('Sandbox')
  await page.getByRole('button', { name: 'Forward' }).click()
  await expect(title(page)).toHaveText('Documents')
  // also proves the Content-Security-Policy of the build blocks nothing the app needs
  expect(errors).toEqual([])
})

test('a granted folder is listed under Locations and is still there after a reload', async ({ page }) => {
  await fakePicker(page)
  await page.goto('/')
  await page.getByRole('button', { name: 'Allow File Access…' }).click()
  await expect(title(page)).toHaveText('Projects')
  await page.reload()
  await expect(title(page)).toHaveText('Projects')
  await sidebar(page).getByRole('button', { name: 'Remove Projects from the sidebar' }).click()
  await expect(title(page)).toHaveText('Sandbox')
  await expect(sidebar(page).getByRole('button', { name: 'Projects', exact: true })).toHaveCount(0)
})

test('the current folder can be added to and removed from Favorites', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('option', { name: 'Pictures' }).dblclick()
  await page.getByRole('button', { name: 'Actions' }).click()
  await page.getByRole('button', { name: 'Add to Favorites' }).click()
  await sidebar(page).getByRole('button', { name: 'Sandbox' }).click()
  await sidebar(page).getByRole('button', { name: 'Pictures', exact: true }).click()
  await expect(title(page)).toHaveText('Pictures')
  await sidebar(page).getByRole('button', { name: 'Remove Pictures from the sidebar' }).click()
  await expect(sidebar(page).getByText('Drag a folder here')).toBeVisible()
})

test('a folder dragged onto Favorites is added there', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('option', { name: 'Documents' }).dragTo(sidebar(page).getByText('Drag a folder here'))
  await expect(sidebar(page).getByRole('button', { name: 'Documents', exact: true })).toBeVisible()
})

test('a folder whose permission has lapsed asks for it again', async ({ page }) => {
  await fakePicker(page)
  // what a real folder does after a browser restart: permission is "prompt" until the user allows it
  await page.addInitScript(() => {
    let granted = false
    FileSystemHandle.prototype.queryPermission = async () => (granted ? 'granted' : 'prompt')
    FileSystemHandle.prototype.requestPermission = async () => ((granted = true), 'granted')
  })
  await page.goto('/')
  await page.getByRole('button', { name: 'Allow File Access…' }).click()
  await page.getByRole('button', { name: 'Allow Access to “Projects”' }).click()
  await expect(page.getByText('This folder is empty.')).toBeVisible()
})

test('glass becomes solid when the system asks for less transparency', async ({ page }) => {
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-transparency', value: 'reduce' }] })
  await page.goto('/')
  await expect(sidebar(page)).toHaveCSS('backdrop-filter', 'none')
  await expect(page.locator('.group').first()).toHaveCSS('backdrop-filter', 'none')
})

test('glass bends the backdrop at its edges', async ({ page }) => {
  await page.goto('/')
  // enough folder icons that some lie under the edges of the menu
  await page.evaluate(async () => {
    const root = await navigator.storage.getDirectory()
    for (let i = 10; i < 70; i++) await root.getDirectoryHandle(`Folder ${i}`, { create: true })
  })
  await page.reload()
  await page.getByRole('option', { name: 'Folder 10' }).waitFor()
  await page.locator('.content').evaluate((content) => (content.scrollTop = 40))
  await page.getByRole('button', { name: 'Actions' }).click()
  const menu = page.locator('#action-menu')
  const shot = async () => (await menu.screenshot({ animations: 'disabled' })).toString('base64')
  const bent = await shot()
  await page.evaluate(() => document.querySelectorAll('feDisplacementMap').forEach((filter) => filter.setAttribute('scale', '0')))
  const flat = await shot()
  // count pixels that clearly changed, so anti-aliasing noise does not pass the test
  const changed = await page.evaluate(async (shots: string[]) => {
    const [a, b] = await Promise.all(
      shots.map(async (png) => {
        const bitmap = await createImageBitmap(new Blob([Uint8Array.from(atob(png), (c) => c.charCodeAt(0))], { type: 'image/png' }))
        const context = new OffscreenCanvas(bitmap.width, bitmap.height).getContext('2d')!
        context.drawImage(bitmap, 0, 0)
        return context.getImageData(0, 0, bitmap.width, bitmap.height).data
      }),
    )
    let count = 0
    for (let i = 0; i < a.length; i += 4) if (Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]) > 12) count++
    return count
  }, [bent, flat])
  expect(changed).toBeGreaterThan(200)
})

test('opened as a file instead of from a web address, the page says how to start it', async ({ page }) => {
  await page.goto(new URL('../../dist/index.html', import.meta.url).href)
  await expect(page.getByRole('heading', { name: 'OpenFinder could not start' })).toBeVisible()
  await expect(page.getByText('start.command')).toBeVisible()
})

test('the About panel credits reused work and states that Apple is not involved', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Actions' }).click()
  await page.getByRole('button', { name: 'About OpenFinder' }).click()
  const about = page.getByRole('dialog')
  await expect(about).toContainText('OpenFinder is an independent project and is not affiliated with or endorsed by Apple.')
  await expect(about.getByRole('link', { name: 'liquid-glass-studio' })).toBeVisible()
  await expect(about.getByRole('link', { name: 'preact', exact: true })).toBeVisible()
  expect((await page.request.get('/THIRD_PARTY_NOTICES.md')).ok()).toBe(true)
  expect((await page.request.get('/LICENSE.txt')).ok()).toBe(true)
})

test('a browser that is not Chromium gets the friendly screen', async ({ page }) => {
  await page.addInitScript(() => delete (Navigator.prototype as { userAgentData?: unknown }).userAgentData)
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Please use a Chromium browser' })).toBeVisible()
})

test('Chromium with local folders switched off (Brave) still works and explains the flag', async ({ page }) => {
  await page.addInitScript(() => delete window.showDirectoryPicker)
  await page.goto('/')
  await expect(title(page)).toHaveText('Sandbox')
  await page.getByRole('button', { name: 'Add Folder…' }).first().click()
  await expect(page.getByRole('dialog')).toContainText('brave://flags/#file-system-access-api')
})

test('screenshots for the milestone demo', async ({ page }) => {
  await fakePicker(page)
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto('/')
  await page.getByRole('button', { name: 'Allow File Access…' }).click()
  await sidebar(page).getByRole('button', { name: 'Sandbox' }).click()
  await page.getByRole('option', { name: 'Documents' }).waitFor()
  for (const colorScheme of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme })
    await page.screenshot({ path: `test-results/shell-${colorScheme}.png` })
  }
  await page.getByRole('button', { name: 'Actions' }).click()
  await page.getByRole('button', { name: 'About OpenFinder' }).click()
  await page.screenshot({ path: 'test-results/about-dark.png', animations: 'disabled' })
})
