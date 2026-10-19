# Design reference: Finder on macOS 27

Researched on 2026-10-13. Each statement is marked by how well it is supported. Nothing here is copied artwork; it describes layout and behavior.

## Confirmed by Apple

Sources: [apple.com/os/macos](https://www.apple.com/os/macos/), [Apple Support 127257](https://support.apple.com/en-us/127257), Human Interface Guidelines ([Materials](https://developer.apple.com/design/human-interface-guidelines/materials), [Toolbars](https://developer.apple.com/design/human-interface-guidelines/toolbars), [Sidebars](https://developer.apple.com/design/human-interface-guidelines/sidebars), [Column views](https://developer.apple.com/design/human-interface-guidelines/column-views)).

- macOS 27 is named Golden Gate. Apple: "Updates to Liquid Glass ensure exceptional readability with more uniform refraction and improved contrast. Uniform toolbars, edge-to-edge sidebars, and updated window shapes and menu bar icons deliver a more refined design. And a new slider lets you easily customize how Liquid Glass looks, from ultraclear to fully tinted."
- **Liquid Glass** is a layer for controls and navigation that sits above the content layer. Apple says not to use it in the content layer.
  - The *regular* variant blurs and adjusts the luminosity of what is behind it. It is meant for text-heavy parts such as sidebars and popovers.
  - The *clear* variant is for media backgrounds and needs a dark dimming layer of 35% over bright content.
  - Both change with Reduce Transparency and Increase Contrast.
  - Scroll edge effects blur and fade content where it passes under a bar.
- **Toolbars:** controls are grouped into sections, item corner radii are concentric with the bar, custom toolbar backgrounds are discouraged, and items move to an overflow menu when the window is narrow.
- **Sidebars:** icons use the accent colour, at most two levels of hierarchy, groups have disclosure controls, and the sidebar can be hidden.
- **Finder views:** icon, list, column and gallery. Column view ends with a preview of the selected item with its created date, modified date, kind and size. Columns can be resized.

## Reported by press, not stated by Apple

Sources: [MacRumors](https://www.macrumors.com/2026/06/09/macos-golden-gate-liquid-glass/), [Macworld](https://www.macworld.com/article/3139330/macos-27-mac-features-siri-apple-intelligence-release-date-compatibility.html), [9to5Mac](https://9to5mac.com/2026/06/09/macos-27-golden-gate-includes-these-changes-that-tahoe-critics-will-appreciate/), June 2026.

- Sidebars no longer float and have no shadow. Sidebar icons are coloured again.
- All windows share one corner radius, less rounded than in macOS 26.
- Glass has a darker edge and a brighter specular highlight (MacRumors attributes this to Apple). The active window has a stronger shadow.
- Menus show fewer icons.

## Not verified

No Apple source gives these, and no WWDC26 design session page was found. The current values in `src/glass/tokens.css` are estimates and are replaced when reference screenshots arrive.

| Detail | Current estimate |
|---|---|
| Window corner radius | 16 px |
| Toolbar height, control height | 52 px, 36 px |
| Sidebar width | 220 px |
| Sidebar row height, font size | 28 px, 13 px |
| Window controls: size, spacing, position | 12 px circles, 8 px apart, 20 px from the top-left |
| Icon view grid | 104 px cells, 64 px icons |
| Selection and accent colours | a fixed blue (`--accent`); the page cannot read the system accent colour reliably |
| Corner shape (circular or continuous) | circular |
| Order of the toolbar items in Finder 27 | back/forward, title, views, sort, share, tags, action, search |
| Path bar, status bar, Quick Look, Get Info, context menus | not built yet (milestone 2) |

## Where the brief and macOS 27 differ

The project brief asks for a floating glass sidebar. Apple's own text for macOS 27 says sidebars are edge-to-edge. OpenFinder follows macOS 27: the sidebar runs the full height of the window with no gap or shadow.

## Reference screenshots still needed

From a Mac running macOS 27 (Cmd+Shift+4, then Space, captures one window):

1. A Finder window in each of the four views, in light and in dark mode.
2. A close-up of the sidebar.
3. A close-up of the toolbar, once idle and once with the search field focused.
4. The context menu of a file and of a folder.
5. Get Info and Quick Look.
6. A window with View > Show Path Bar and Show Status Bar switched on.

## How OpenFinder builds the glass

- CSS `backdrop-filter` with blur and saturation, plus an SVG displacement filter that bends the backdrop at the edges. Chromium is the only engine that accepts an SVG filter there, which fits the Chromium-only target.
- Glass is used on the sidebar, toolbar groups, menus and panels. File content is never glass.
- The "Glass" slider in the action menu mirrors the macOS 27 setting from clear to tinted.
- `prefers-reduced-transparency` and `prefers-contrast: more` replace glass with solid surfaces. `prefers-reduced-motion` removes the animations.
