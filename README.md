<div align="center">

<img src="public/favicon.svg" alt="" width="96">

# OpenFinder

**A local-first file manager that runs in your browser, with a Finder-style Liquid Glass interface.**

[Quick start](#quick-start) · [Status](#status) · [Limits](#known-limits) · [Development](#development) · [Credits](#credits)

![License: GPL-3.0-or-later](https://img.shields.io/badge/license-GPL--3.0--or--later-blue)
![Runs in Chromium browsers](https://img.shields.io/badge/browsers-Chromium-4285f4)
![No server, no account](https://img.shields.io/badge/uploads-none-brightgreen)

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/screenshot-dark.png">
  <img src="docs/screenshot-light.png" alt="The OpenFinder window: a glass sidebar with Favorites, Locations and Tags, a glass toolbar, and folders shown as icons" width="860">
</picture>

</div>

OpenFinder is an independent project and is not affiliated with or endorsed by Apple.

## Quick start

```sh
npm install
npm run build
npm start        # then open http://localhost:4627 in Chrome, Edge, Brave, Opera or Arc
```

On a Mac you can double-click `start.command` instead; it does the three steps and opens the browser.

Click **Allow File Access…**, pick a folder, and start working. There is no account, no database and no config file, and your files never leave your computer.

## Status

OpenFinder is built in milestones. Milestone 1 is done.

| Milestone | Contents | State |
|---|---|---|
| 1 | Window, glass sidebar and toolbar, folder access, Sandbox, light and dark mode | Done |
| 2 | Icon, List, Column and Gallery views, Quick Look, previews, Get Info, tags, file operations, shortcuts | Next |
| 3 | Search with filters, saved searches, full-text index | Planned |
| 4 | Create, browse and edit archives | Planned |
| 5 | Convert documents, videos and photos | Planned |
| 6 | Share collections, download from a URL | Planned |
| 7 | Installable app, offline use, polish | Planned |

## Known limits

- **Chromium browsers only.** Firefox and Safari do not offer the folder access OpenFinder needs.
- **Brave** ships with local folder access switched off. Enable `brave://flags/#file-system-access-api` and relaunch. Until then the Sandbox works.
- **Browsers refuse the Home, Desktop, Documents and Downloads folders themselves.** Pick a folder inside one of them.
- **Permission is asked again after a browser restart.** One click on the folder brings it back.
- **The Sandbox** is private storage inside the browser, not a folder on your disk. Clearing the site's data in the browser deletes it.
- **Recents** is not in the sidebar yet. It needs the file index and arrives with milestone 3.

## Development

```sh
npm run dev        # dev server on http://localhost:4627
npm test           # unit tests
npm run e2e        # builds, then runs the browser tests in Chromium
npm run licenses   # fails when a dependency is missing from THIRD_PARTY_NOTICES.md
```

The design research is in [docs/DESIGN-REFERENCE.md](docs/DESIGN-REFERENCE.md), the reasons behind choices in [docs/DECISIONS.md](docs/DECISIONS.md), and the license audit in [docs/LICENSE-AUDIT.md](docs/LICENSE-AUDIT.md).

## Credits

Copyright © 2026 Lucas Van De Weerd. OpenFinder is free software under the [GNU General Public License, version 3 or later](LICENSE).

- The glass edge refraction is adapted from [liquid-glass-studio](https://github.com/iyinchao/liquid-glass-studio) by Charles Yin (MIT).
- Feature ideas come from [FileBrowser Quantum](https://github.com/gtsteffaniak/filebrowser) (Apache-2.0). No code was used.
- Icons are from [Lucide](https://lucide.dev) (ISC). The fallback font is [Inter](https://rsms.me/inter/) (OFL-1.1).

Every reused project and its full license text is listed in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) and in the app under Actions > About OpenFinder.
