import { createRef } from 'preact'
import { version } from '../../package.json'
import credits from '../generated/credits.json'
import { canPickFolders, pickFolder } from '../state'

const about = createRef<HTMLDialogElement>()
const accessHelp = createRef<HTMLDialogElement>()

export const showAbout = () => about.current!.showModal()

/** Opens the folder picker, or explains how to switch it on where the browser has it off. */
export const addFolder = () => (canPickFolders ? pickFolder() : accessHelp.current!.showModal())

// Projects whose code or ideas are reused outside of npm. Keep in step with THIRD_PARTY_NOTICES.md.
const reused = [
  { name: 'liquid-glass-studio', by: 'Charles Yin', license: 'MIT', url: 'https://github.com/iyinchao/liquid-glass-studio', use: 'edge refraction formula' },
  { name: 'Vite', by: 'VoidZero Inc. and contributors', license: 'MIT', url: 'https://vite.dev', use: 'build tool, module-loading helper' },
  { name: 'FileBrowser Quantum', by: 'Graham Steffaniak', license: 'Apache-2.0', url: 'https://github.com/gtsteffaniak/filebrowser', use: 'inspiration, no code used' },
]

export function Dialogs() {
  return (
    <>
      <dialog ref={about} class="panel glass-flat" aria-labelledby="about-title" closedby="any">
        <img src="./favicon.svg" alt="" width="64" height="64" />
        <h2 id="about-title">OpenFinder</h2>
        <p class="dim">Version {version} · Copyright © 2026 Lucas Van De Weerd</p>
        <p>A local-first file manager that runs in your browser. Your files stay on your computer.</p>
        <p>OpenFinder is an independent project and is not affiliated with or endorsed by Apple.</p>
        <p>
          Free software under the <a href="./LICENSE.txt">GNU General Public License, version 3 or later</a>.
        </p>
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

      <dialog ref={accessHelp} class="panel glass-flat" aria-labelledby="access-title" closedby="any">
        <h2 id="access-title">Local folders are switched off in this browser</h2>
        <p>
          OpenFinder opens folders with the File System Access API. This browser has it turned off. Brave does this by default.
        </p>
        <p>
          In Brave: open <code>brave://flags/#file-system-access-api</code>, set it to Enabled and relaunch. Then choose Add Folder again.
        </p>
        <p>Until then you can use the Sandbox, which is private storage inside this browser.</p>
        <button class="push" onClick={() => accessHelp.current!.close()}>
          OK
        </button>
      </dialog>
    </>
  )
}
