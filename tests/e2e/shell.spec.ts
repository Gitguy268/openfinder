import { expect, test, type Page } from '@playwright/test'

const title = (page: Page) => page.getByRole('heading', { level: 1 })
const sidebar = (page: Page) => page.getByRole('navigation', { name: 'Sidebar' })
const search = (page: Page) => page.getByRole('searchbox')
const openSandbox = (page: Page) => sidebar(page).getByRole('button', { name: 'Sandbox' }).click()

// The native folder picker cannot be driven by a test, so it hands back a folder in the sandbox instead.
const fakePicker = (page: Page) =>
  page.addInitScript(() => {
    window.showDirectoryPicker = async () => (await navigator.storage.getDirectory()).getDirectoryHandle('Projects', { create: true })
  })

const watchErrors = (page: Page) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('console', (message) => message.type() === 'error' && errors.push(message.text()))
  return errors
}

test('starts on All, and moves through folders with open, back and forward', async ({ page }) => {
  const errors = watchErrors(page)
  await page.goto('/')
  await expect(title(page)).toHaveText('All')
  await page.getByRole('option', { name: 'Sandbox' }).dblclick()
  await expect(title(page)).toHaveText('Sandbox')
  await page.getByRole('option', { name: 'Documents' }).dblclick()
  await expect(title(page)).toHaveText('Documents')
  await expect(page.getByText('This folder is empty.')).toBeVisible()
  await page.getByRole('button', { name: 'Back' }).click()
  await expect(title(page)).toHaveText('Sandbox')
  await page.getByRole('button', { name: 'Forward' }).click()
  await expect(title(page)).toHaveText('Documents')
  await page.getByRole('navigation', { name: 'Location' }).getByRole('button', { name: 'Sandbox' }).click()
  await expect(title(page)).toHaveText('Sandbox')
  // also proves the Content-Security-Policy of the build blocks nothing the app needs
  expect(errors).toEqual([])
})

test('a granted folder is listed under Folders and is still there after a reload', async ({ page }) => {
  await fakePicker(page)
  await page.goto('/')
  await page.getByRole('button', { name: 'Allow File Access…' }).click()
  await expect(title(page)).toHaveText('Projects')
  await page.reload()
  await expect(title(page)).toHaveText('Projects')
  await sidebar(page).getByRole('button', { name: 'Remove Projects from the sidebar' }).click()
  await expect(title(page)).toHaveText('All')
  await expect(sidebar(page).getByRole('button', { name: 'Projects', exact: true })).toHaveCount(0)
})

test('the current folder can be pinned and unpinned', async ({ page }) => {
  await page.goto('/')
  await openSandbox(page)
  await page.getByRole('option', { name: 'Pictures' }).dblclick()
  await page.getByRole('button', { name: 'Actions' }).click()
  await page.getByRole('button', { name: 'Pin This Folder' }).click()
  await openSandbox(page)
  await sidebar(page).getByRole('button', { name: 'Pictures', exact: true }).click()
  await expect(title(page)).toHaveText('Pictures')
  await sidebar(page).getByRole('button', { name: 'Unpin Pictures' }).click()
  await expect(sidebar(page).getByText('Drag a folder here to pin it')).toBeVisible()
})

test('a folder dragged onto Folders is pinned there', async ({ page }) => {
  await page.goto('/')
  await openSandbox(page)
  await page.getByRole('option', { name: 'Documents' }).dragTo(sidebar(page).getByRole('list', { name: 'Folders' }))
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

test('search finds files by name, says what it searched, and reads filters', async ({ page }) => {
  await page.goto('/')
  await openSandbox(page)
  await expect(search(page)).toHaveAttribute('placeholder', 'Search “Sandbox”')
  await search(page).fill('welcome')
  await expect(page.getByRole('option', { name: 'Welcome to OpenFinder.txt' })).toBeVisible()
  await expect(page.getByText('1 item found')).toBeVisible()
  await search(page).fill('type:pdf welcome')
  await expect(page.getByText('Nothing matches “type:pdf welcome” in Sandbox.')).toBeVisible()
  await search(page).fill('before:someday welcome')
  await expect(page.getByRole('status')).toContainText('before:someday is not a date')
  await page.getByRole('button', { name: 'Clear the search' }).click().catch(() => {})
  await search(page).fill('')
  await expect(page.getByRole('option', { name: 'Documents' })).toBeVisible()
})

test('the keyboard moves, opens, previews and goes back up', async ({ page }) => {
  await page.goto('/')
  await openSandbox(page)
  await expect(page.getByRole('option', { name: 'Documents' })).toBeVisible()
  await page.keyboard.press('/')
  await expect(search(page)).toBeFocused()
  await page.keyboard.press('ArrowDown') // from the search box: the first result is selected and the list has the focus
  const results = page.getByRole('listbox')
  await expect(results).toBeFocused()
  await expect(page.getByRole('option', { name: 'Documents' })).toHaveAttribute('aria-selected', 'true')
  await page.keyboard.press('End')
  await expect(page.getByRole('option', { name: 'Welcome to OpenFinder.txt' })).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByRole('complementary', { name: 'Preview' })).toContainText('private storage inside this browser')
  await page.keyboard.press('Space')
  await expect(page.getByRole('complementary', { name: 'Preview' })).toHaveCount(0)
  await page.keyboard.press('Home')
  await page.keyboard.press('Enter')
  await expect(title(page)).toHaveText('Documents')
  await page.getByRole('listbox').focus()
  await page.keyboard.press('Backspace')
  await expect(title(page)).toHaveText('Sandbox')
  await page.keyboard.press('ControlOrMeta+Shift+F') // from inside a folder: search everything
  await expect(search(page)).toBeFocused()
  await expect(search(page)).toHaveAttribute('placeholder', 'Search all folders')
})

test('a page or SVG is previewed as text, never run', async ({ page }) => {
  await page.goto('/')
  await page.evaluate(async () => {
    const root = await navigator.storage.getDirectory()
    for (const [name, text] of [
      ['trap.html', '<script>window.ran = true</script><h1>hi</h1>'],
      ['trap.svg', '<svg xmlns="http://www.w3.org/2000/svg" onload="window.ran = true"></svg>'],
    ]) {
      const w = await (await root.getFileHandle(name, { create: true })).createWritable()
      await w.write(text)
      await w.close()
    }
  })
  await openSandbox(page)
  for (const name of ['trap.html', 'trap.svg']) {
    await page.getByRole('option', { name }).click()
    await expect(page.getByRole('complementary', { name: 'Preview' }).locator('pre')).toContainText('window.ran = true')
  }
  expect(await page.evaluate(() => (window as unknown as { ran?: boolean }).ran)).toBeUndefined()
  await expect(page.locator('iframe, object, embed')).toHaveCount(0)
})

test('it wears Xiao’s design: paper, ink, Bricolage, Junicode, and no glass', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(238, 238, 231)')
  await expect(page.locator('body')).toHaveCSS('font-family', /Bricolage/)
  await expect(title(page)).toHaveCSS('font-family', /Junicode/)
  await expect(title(page)).toHaveCSS('font-style', 'italic')
  await page.emulateMedia({ colorScheme: 'dark' })
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(27, 27, 27)')
  const glass = await page.evaluate(() => [...document.querySelectorAll('*')].filter((e) => getComputedStyle(e).backdropFilter !== 'none').length)
  expect(glass).toBe(0)
  await page.getByRole('button', { name: 'Actions' }).click()
  await page.getByRole('radio', { name: 'Light' }).check()
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(238, 238, 231)')
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
  await expect(about.getByRole('link', { name: 'Xiao' })).toBeVisible()
  await expect(about.getByRole('link', { name: 'Junicode' })).toBeVisible()
  await expect(about.getByRole('link', { name: 'preact', exact: true })).toBeVisible()
  expect((await page.request.get('/THIRD_PARTY_NOTICES.md')).ok()).toBe(true)
  expect((await page.request.get('/LICENSE.txt')).ok()).toBe(true)
})

test('a browser without folder access (Brave, Firefox) still works and explains why', async ({ page }) => {
  await page.addInitScript(() => {
    delete window.showDirectoryPicker
    delete (Navigator.prototype as { userAgentData?: unknown }).userAgentData
  })
  await page.goto('/')
  await expect(title(page)).toHaveText('All')
  await openSandbox(page)
  await expect(title(page)).toHaveText('Sandbox')
  await sidebar(page).getByRole('button', { name: 'Add Folder…' }).click()
  await expect(page.getByRole('dialog')).toContainText('brave://flags/#file-system-access-api')
})

test('inside Xiao it talks only through window.xiao.request and shows the Library', async ({ page }) => {
  // a stand-in for Xiao's bridge: answers the protocol from a tiny in-page table
  await page.addInitScript(() => {
    const files = [{ name: 'Invoice.pdf', kind: 'file', size: 2048, modified: Date.now(), revision: '2048-1' }]
    const seen: string[] = []
    ;(window as unknown as { seen: string[] }).seen = seen
    window.xiao = {
      async request(r: { requestId: string; method: string; payload: Record<string, unknown> }) {
        seen.push(r.method)
        const data: Record<string, unknown> = {
          capabilities: { protocol: 1, methods: ['roots.list', 'roots.choose', 'items.list', 'search.query', 'preview.open'], views: ['all', 'downloads', 'files'], theme: 'auto' },
          'roots.list': [{ id: 'r1', kind: 'folder', name: 'Taxes', place: '~/Documents/Taxes', canWrite: true, available: true }],
          'items.list': { items: files, total: 1, next: null },
          'search.query': { items: [{ ...files[0], root: 'r1', path: ['Invoice.pdf'], reason: 'name', source: 'files' }], total: 1, next: null, warnings: [] },
          'preview.open': { kind: 'none', note: 'PDFs open in Xiao’s viewer.' },
        }
        if (!(r.method in data)) return { requestId: r.requestId, ok: false, code: 'UNSUPPORTED', message: 'no', retryable: false }
        return { requestId: r.requestId, ok: true, revision: 0, data: data[r.method] }
      },
    } as unknown as Window['xiao']
  })
  const errors = watchErrors(page)
  await page.goto('/')
  await expect(sidebar(page).getByRole('button', { name: 'Downloads' })).toBeVisible()
  await expect(sidebar(page).getByRole('button', { name: 'Taxes' })).toBeVisible()
  await expect(sidebar(page).getByRole('button', { name: 'Sandbox' })).toHaveCount(0)
  await expect(page.getByText('Chromium')).toHaveCount(0)
  await expect(search(page)).toHaveAttribute('placeholder', 'Search the Library')
  await search(page).fill('invoice')
  await expect(page.getByRole('option', { name: 'Invoice.pdf' })).toBeVisible()
  await sidebar(page).getByRole('button', { name: 'Taxes' }).click()
  await page.getByRole('option', { name: 'Invoice.pdf' }).click()
  await expect(page.getByRole('complementary', { name: 'Preview' })).toContainText('PDFs open in Xiao’s viewer.')
  expect(await page.evaluate(() => (window as unknown as { seen: string[] }).seen)).not.toContain('items.open')
  expect(errors).toEqual([])
})

test('screenshots for the README', async ({ page }) => {
  await fakePicker(page)
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto('/')
  await page.getByRole('button', { name: 'Allow File Access…' }).click()
  await openSandbox(page)
  await page.getByRole('option', { name: 'Welcome to OpenFinder.txt' }).click()
  for (const colorScheme of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme })
    await page.screenshot({ path: `test-results/library-${colorScheme}.png` })
  }
})

test('every control has a name a screen reader can say', async ({ page }) => {
  await page.goto('/')
  await openSandbox(page)
  await expect(page.getByRole('option', { name: 'Documents' })).toBeVisible()
  const unnamed = () =>
    page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>('button, input, select, textarea, [role="option"], [role="menuitem"]')]
        .filter((el) => el.checkVisibility())
        .filter((el) => {
          const labelled = el.getAttribute('aria-label') || el.getAttribute('aria-labelledby') || el.getAttribute('title') || el.getAttribute('placeholder')
          const labelFor = el.id && document.querySelector(`label[for="${el.id}"]`)
          return !(labelled || labelFor || el.closest('label') || el.textContent?.trim())
        })
        .map((el) => el.outerHTML.slice(0, 120)),
    )
  expect(await unnamed()).toEqual([])
  await page.getByRole('option', { name: 'Documents' }).click({ button: 'right' })
  await expect(page.getByRole('menu')).toBeVisible()
  expect(await unnamed()).toEqual([])
})
