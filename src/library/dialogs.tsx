import { createRef } from 'preact'
import { version } from '../../package.json'
import credits from '../generated/credits.json'
import { chooseFolder, provider } from '../state'

const about = createRef<HTMLDialogElement>()
const accessHelp = createRef<HTMLDialogElement>()

export const showAbout = () => about.current!.showModal()

/** Asks for a folder, or explains how to switch folder access on where the browser has it off. */
export const addFolder = () => (provider.value.can('choose') ? chooseFolder() : accessHelp.current!.showModal())

// Work reused outside of npm. Keep in step with THIRD_PARTY_NOTICES.md.
const reused = [
  { name: 'Xiao', by: 'Lucas Van De Weerd', license: 'MPL-2.0', url: 'https://github.com/Gitguy268/xiao', use: 'design tokens and the Library protocol' },
  { name: 'Junicode', by: 'Peter S. Baker', license: 'OFL-1.1', url: 'https://github.com/psb1558/Junicode-font', use: 'italic headings' },
  { name: 'Vite', by: 'VoidZero Inc. and contributors', license: 'MIT', url: 'https://vite.dev', use: 'build tool, module-loading helper' },
  { name: 'FileBrowser Quantum', by: 'Graham Steffaniak', license: 'Apache-2.0', url: 'https://github.com/gtsteffaniak/filebrowser', use: 'inspiration, no code used' },
]

// Keep in step with the keydown handlers in App.tsx, Toolbar.tsx and Results.tsx.
const keys = [
  ['/', 'search (also ⌘F or Ctrl+F)'],
  ['⇧⌘F or Ctrl+Shift+F', 'search the whole Library, from anywhere in it'],
  ['↑ ↓', 'choose a result; ↓ from the search box goes to the results'],
  ['Space', 'show or hide the preview'],
  ['Enter', 'open'],
  ['F2', 'rename'],
  ['Delete', 'move to the Trash, where that is available'],
  ['Shift+F10', 'more actions'],
  ['Backspace', 'up one folder, when the search box is empty'],
  ['Esc', 'clear the search, close a menu or dialog'],
]

export function Dialogs() {
  return (
    <>
      <dialog ref={about} class="panel" aria-labelledby="about-title" closedby="any">
        <img src="./favicon.svg" alt="" width="56" height="56" />
        <h2 id="about-title">OpenFinder</h2>
        <p class="dim">Version {version} · Copyright © 2026 Lucas Van De Weerd</p>
        <p>A local-first file library. Your files stay on your computer.{provider.value.name === 'xiao' && ' Inside Xiao it is the Library.'}</p>
        <p>OpenFinder is an independent project and is not affiliated with or endorsed by Apple.</p>
        <p>
          Free software under the <a href="./LICENSE.txt">GNU General Public License, version 3 or later</a>.
        </p>
        <h3>Keys</h3>
        <ul class="credits">
          {keys.map(([k, what]) => (
            <li key={k}>
              <kbd>{k}</kbd> {what}
            </li>
          ))}
        </ul>
        <h3>Credits</h3>
        <ul class="credits">
          {reused.map((c) => (
            <li key={c.name}>
              <a href={c.url}>{c.name}</a> by {c.by} <span class="dim">({c.license}, {c.use})</span>
            </li>
          ))}
          {credits.map((c) => (
            <li key={c.name}>
              <a href={c.url}>{c.name}</a> {c.version} <span class="dim">({c.license})</span>
            </li>
          ))}
        </ul>
        <p>
          <a href="./THIRD_PARTY_NOTICES.md">Full license texts</a>
        </p>
        <button class="push" onClick={() => about.current!.close()}>
          Done
        </button>
      </dialog>

      <dialog ref={accessHelp} class="panel" aria-labelledby="access-title" closedby="any">
        <h2 id="access-title">Local folders are switched off in this browser</h2>
        <p>OpenFinder opens folders with the File System Access API, which this browser does not offer or has turned off. Brave turns it off by default; Firefox and Safari do not have it.</p>
        <p>
          In Brave: open <code>brave://flags/#file-system-access-api</code>, set it to Enabled and relaunch. Then choose Add Folder again.
        </p>
        <p>Until then you can use the Sandbox, which is private storage inside this browser. In Xiao, OpenFinder is the Library and opens any folder you choose.</p>
        <button class="push" onClick={() => accessHelp.current!.close()}>
          OK
        </button>
      </dialog>
    </>
  )
}
