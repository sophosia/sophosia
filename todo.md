- To enforce data consistent, we use markdown link of format [label](path/to/file.md#^block-id) in ob
  1. turn of wikilinks
  2. use absolute path in vault
- [x] component test
- [x] clean up code
- [x] make comment and rectangular annotation movable
  - it seems to be an issue of webview ... ondrag event never fired
- [ ] unit test
  - [x] mock indexeddb
  - vitest not working since window.**TAURI_IPC** is not a function
  - cypress not working since window.**TAURI_IPC** is not a function
  - mocha not working and don't know why even I use jsdom to add window object
  - webdriverio not working since it doesn't work like what tutorial said
  - [ ] folder
  - [ ] note
  - [ ] graph
  - [ ] project
