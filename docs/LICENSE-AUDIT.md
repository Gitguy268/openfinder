# License audit

Checked on 2026-10-13. OpenFinder is released under **GPL-3.0-or-later** (decided by the author on 2026-10-13, see [DECISIONS.md](DECISIONS.md)).

## Reference projects

| Project | License | How it was checked | Use in OpenFinder |
|---|---|---|---|
| [nothingtosurprise/filebrowser](https://github.com/nothingtosurprise/filebrowser), a fork of [gtsteffaniak/filebrowser](https://github.com/gtsteffaniak/filebrowser) ("FileBrowser Quantum") | Apache-2.0 | `LICENSE` file in both repositories, GitHub API `spdx_id` | Feature inspiration only: share expiry, size filters in search, thumbnails. It is a Go server with a Vue front end, so none of its code fits an app without a server. **No code copied.** |
| [iyinchao/liquid-glass-studio](https://github.com/iyinchao/liquid-glass-studio) | MIT, © 2024 Charles Yin | `LICENSE` file, GitHub API `spdx_id` | The edge-refraction formula from `src/shaders/fragment-main.glsl` is adapted in `src/glass/displacement.ts`, with a header comment and link. |

Notes on liquid-glass-studio:

- Its renderer is WebGL and refracts a texture it owns. A shader cannot read the live page behind a toolbar, so the renderer itself is not used. OpenFinder turns the same refraction profile into an SVG displacement map for CSS `backdrop-filter`.
- The repository credits a smooth-merge function to Inigo Quilez. Snippets published on Shadertoy can carry a non-commercial license, so that function is **not** used. The rounded-rectangle distance function in OpenFinder is written from the standard formula.
- Only the files named above were read in full. Any further function is checked for its origin before it is adapted.

## Not used

| Candidate | Reason |
|---|---|
| `7z-wasm`, `node-unrar-js` | Carry the unRAR restriction, which is not compatible with the GPL. |
| `heic2any` | Declares MIT but bundles libheif, which is LGPL. `libheif-js` states its license correctly and is used instead. |
| `p2r3/convert` (GPL-2.0) | GPL-2.0 code cannot be combined with the Apache-2.0 dependencies. |

## Why GPL-3.0-or-later

- `@ffmpeg/core` and `@ffmpeg/core-mt` are GPL-2.0-or-later.
- `libheif-js` is LGPL-3.0.
- `pdfjs-dist` and `@jsquash/*` are Apache-2.0.

Apache-2.0 and LGPL-3.0 are compatible with GPL 3 but not with GPL 2. GPL 3 is the one version every component accepts.

## Planned dependencies

Licenses as reported by `npm view` on 2026-10-13. A dependency moves into `THIRD_PARTY_NOTICES.md` when it is installed; `npm run licenses` fails if one is missing there.

| Purpose | Package | License | Milestone |
|---|---|---|---|
| UI | preact, @preact/signals | MIT | 1 (installed) |
| Icons | lucide | ISC | 1 (installed) |
| Font fallback | @fontsource-variable/inter | OFL-1.1 | 1 (installed) |
| Search index | minisearch | MIT | 3 |
| ZIP, GZ, TAR | fflate | MIT | 4 |
| Reading 7z, RAR, TAR | libarchive.js | MIT (libarchive: BSD) | 4 |
| PDF | pdfjs-dist, pdf-lib, pdfmake, html-to-pdfmake | Apache-2.0, MIT, MIT, MIT | 2, 5 |
| Markdown, code, HTML safety | marked, highlight.js, dompurify | MIT, BSD-3-Clause, MPL-2.0 OR Apache-2.0 | 2 |
| Office | mammoth, docx, SheetJS CE, papaparse | BSD-2-Clause, MIT, Apache-2.0, MIT | 2, 5 |
| Video | mediabunny, @ffmpeg/ffmpeg, @ffmpeg/core(-mt) | MPL-2.0, MIT, GPL-2.0-or-later | 5 |
| HEIC | libheif-js | LGPL-3.0 | 2 |
| AVIF, JPEG, WebP encoding | @jsquash/avif, jpeg, webp | Apache-2.0 | 5 |
| RAW photos | libraw-wasm | see below | 2 |
| Metadata | exifr, music-metadata | MIT | 2, 3 |
| Sharing | trystero, qrcode-generator | MIT | 6 |

Open points:

- **SheetJS:** the `xlsx` package on npm (0.18.5) is out of date and has known vulnerabilities. The pinned tarball from cdn.sheetjs.com is installed instead.
- **libraw-wasm:** npm reports ISC, but the package ships no LICENSE file and bundles LibRaw, which upstream is LGPL-2.1 OR CDDL-1.0. It is treated as LGPL-2.1 and confirmed in milestone 2. If it cannot be cleared, RAW files show their embedded JPEG preview only.
- **trystero:** to verify in milestone 6 whether it can use a self-hosted signalling endpoint. If not, it is dropped for one signalling layer of our own.

## Source offer

When OpenFinder ships compiled WebAssembly for ffmpeg, libheif or LibRaw, `THIRD_PARTY_NOTICES.md` and the About panel link to the exact upstream source and build scripts at the pinned version, and each release attaches those source archives.

## Assets and trademarks

- No Apple artwork, no Apple logo, no Finder icon, no SF Pro, no SF Symbols.
- Folder icons, file icons, the app icon and the wallpaper are original drawings made for OpenFinder.
- The font stack uses the system font where present and Inter (OFL-1.1) elsewhere.
- The About panel states: "OpenFinder is an independent project and is not affiliated with or endorsed by Apple."
