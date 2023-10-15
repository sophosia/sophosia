- [ ] backend

  - create 1 json file for each project, save them in the same location, and create views for usual queries
  - [x] storagePath
    - [x] getStoragePath from AppConfigDir
    - [x] setStoragePath to AppConfigDir
  - [x] create hidden folder in storagePath once storagePath is known
    - [x] create .sophosia
    - [x] create .sophosia/project, .sophosia/note, .sophosia/folder, .sophosia/annotation, .sophosia/pdfState
  - [x] implement JsonDB
    - [x] get, remove, put, post
    - [x] save/load appState.json, layout.json to/from .sophosia
    - [x] save/load other json files to/from .sophosia/dataType
  - [ ] replace db.find with db.getDocs(dataType) and some filter functions
  - [ ] remove \_rev from model

- [ ] note
  - the internal links will use wikilinks
  - no native support of wikilinks in vditor, need to render wikilinks after vditor is finished rendering.
  - can use regex to find all texts like this [[*]], then render them as link

To better use it with obsidian, we need

- [ ] short uid using nanoid
