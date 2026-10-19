# Decisions

Newest at the bottom. Each entry says what was decided, by whom, and why.

## 2026-10-13: Step 0

| Decision | By | Why |
|---|---|---|
| Vite + TypeScript + Preact, static output | Author | Least code for an app with this many panels and views; the output can be hosted anywhere. |
| License GPL-3.0-or-later | Author | ffmpeg's core is GPL-2.0-or-later, libheif is LGPL-3.0, pdf.js is Apache-2.0. GPL 3 is the one version compatible with all of them. See [LICENSE-AUDIT.md](LICENSE-AUDIT.md). |
| Sharing: encrypted bundle, peer-to-peer link + QR, and a self-hostable relay | Author | All three were chosen. Milestone 6. |
| Optional local helper for URL downloads, off by default | Author | Browsers block downloads from sites without CORS headers. |
| Same Finder-style look on every operating system | Author | One design to build and test. Ctrl replaces Cmd off the Mac. |
| Edge-to-edge sidebar, not floating | Claude | Apple's macOS 27 text says so; it overrides the brief's "floating" until screenshots show otherwise. |

## 2026-10-13: Milestone 1

| Decision | Why |
|---|---|
| Glass is CSS `backdrop-filter` plus an SVG displacement map, not WebGL | A shader cannot read the live page behind a toolbar. The refraction formula of liquid-glass-studio is reused, its renderer is not. |
| Two browser gates: `navigator.userAgentData` for "is this Chromium", `showDirectoryPicker` for "can it open local folders" | Brave is Chromium but ships with the File System Access API off. Those users get the Sandbox location and a note about `brave://flags/#file-system-access-api` (flag name confirmed in the Brave binary on 2026-10-13). |
| A "Sandbox" location backed by the browser's private storage (OPFS) | Works without any permission, gives Brave users something to try, and lets Playwright test the app, because a test cannot click the native folder picker. |
| Folders are requested with read and write access at once | Milestone 2 writes (rename, move, trash). One permission prompt now avoids a second one later. |
| Menus use the native Popover API and CSS anchor positioning; the About panel is a native `<dialog>` | Chromium has them built in, so no menu or dialog library is needed. |
| The license scan is a small script on top of `npm ls`, not the `license-checker` package | `npm ls --long` already reports every shipped dependency with its license. One dependency fewer. The script also writes the dependency section of `THIRD_PARTY_NOTICES.md` and the credits list of the About panel, so the three cannot drift apart. |
| The Content-Security-Policy is a `<meta>` tag added at build time | Static hosts such as GitHub Pages cannot send headers. The dev server needs inline styles, so the tag is left out there. |
| The red and yellow window controls are decoration; the green one switches between a floating window and one that fills the tab | A page cannot close or minimise its tab. Controls that do nothing are hidden from assistive technology. |
| Recents is left out of Favorites until milestone 3 | A list of recent files needs the index that milestone 3 builds. |
| Floating glass uses a 5 px blur and a displacement scale of 80 | Measured in Chromium: with an 18 px blur the edge bending changed no pixel at all. The sidebar keeps a heavy blur and no bending, as text sits on it. |
| View modes other than Icons, sort, share, tags and search are visible in the toolbar but disabled | They belong to milestones 2, 3 and 6. Showing them now fixes the toolbar layout. |

## Platform limits

- Chromium does not grant the Home, Desktop, Documents or Downloads folder itself, only folders inside them. `~/Library` is fully blocked. Favorites therefore point at any granted folder or subfolder.
- There is no system Trash, no creation date, no "open with" and no extended attributes for a web page. See the README for what OpenFinder does instead.
- Cmd+1 to 4 and Cmd+[ / Cmd+] belong to the browser in a normal tab. To be tested by hand in milestone 2, in a tab and in the installed app window.
