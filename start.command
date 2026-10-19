#!/bin/sh
# Double-click in Finder (macOS) to build OpenFinder when needed and open it in the browser.
# index.html cannot be opened directly: a page at a file:// address may not load its own scripts.
cd "$(dirname "$0")" || exit 1

if ! command -v node >/dev/null; then
  echo "Node.js is not installed. Get it from https://nodejs.org and start this again."
  exit 1
fi

[ -d node_modules ] || npm install || exit 1

# rebuild when there is no build yet, or when a source file is newer than the build
if [ ! -f dist/index.html ] ||
  [ -n "$(find src public index.html vite.config.ts package.json -newer dist/index.html -print -quit)" ]; then
  npm run build || exit 1
fi

exec node bin/openfinder.mjs --open
