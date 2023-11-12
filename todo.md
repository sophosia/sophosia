- [x] forward/backward link
  - [x] make them working
  - [x] HoverPane
- [x] use indexdb to store all links
  - [x] graphview
  - [x] save link when editing note
  - [x] scan through all documents to update links when app starts
    - [x] in config folder, the file must have the last scan time
    - [x] using the last scan time and meta function from tauri's fs extra to determine wheter or not to rescan a file
    - [x] scan file and updateLinks
- [ ] updateLinks when file is renamed
- [ ] create a markdown note with name projectId.md under each folder, so that when user in obsidian click a link target to the project can navigate to the folder
  - [ ] display this note in sophosia with a different label ???
  - [ ] this note has project title as its title, authors and abstract by default. So hoverPane shows this note instead.
- [ ] when manually created a folder in storagePath, create the corresponding project in sophosia
  - [ ] separate the logic of addProject and createProjectFolder
  - [ ] separate the logic of deleteProject and deleteProjectFolder
  - [ ] create project
- [x] It seems no need to separate pageId and itemId as long as we have the oldItemId
- [ ] change storage path
- [ ] get rid of excalidraw

- To enforce data consistent, we use markdown link of format [label](path/to/file.md#^block-id) in ob
  1. turn of wikilinks
  2. use absolute path in vault
