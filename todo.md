- [x] updateLinks when file is renamed
  - [x] scan all notes and update them
  - [x] update indexeddb
  - [x] trigger function when rename
  - [ ] popup to indicate changes
- [x] all noteLinks must have the .md extension in their link, project link don't need this
  - [x] clear the notes in indexeddb and scan all of them, then hold [{noteId}]
  - [x] add/update/delete entry in indexeddb when add/update/delete note (do it in projectStore)
  - [x] getNotes for hints, retrieves them from db
  - [x] enter links using hints
  - [x] hoverpane
- [x] create a markdown note with name projectId.md under each folder, so that when user in obsidian click a link target to the project can navigate to the folder
  - [x] display this note in sophosia with a different label ???
- [x] It seems no need to separate pageId and itemId as long as we have the oldItemId
- [ ] change storage path
- [ ] get rid of excalidraw

- To enforce data consistent, we use markdown link of format [label](path/to/file.md#^block-id) in ob

  1. turn of wikilinks
  2. use absolute path in vault

- [ ] AnnotCard image preview?
