<p align="center">
<img src="public/icons/logo.svg" style="width: 100px; vertical-align:middle">
<br>
<h2 align="center">Sophosia: Your Research Helper</h2>
<br>
<a title="Build Status" target="_blank" href="https://github.com/sophosia/sophosia/actions"><img src="https://img.shields.io/github/actions/workflow/status/sophosia/sophosia/publish.yml?style=flat-square"></a>
<a title="Release" target="_blank" href="https://github.com/sophosia/sophosia/releases"><img src="https://img.shields.io/github/v/release/sophosia/sophosia?style=flat-square"></a>
<a title="Downloads" target="_blank" href="https://github.com/sophosia/sophosia/releases"><img src="https://img.shields.io/github/downloads/sophosia/sophosia/total?style=flat-square"></a>
<a title="Stars" target="_blank" href="https://github.com/sophosia/sophosia"><img src="https://img.shields.io/github/stars/sophosia/sophosia?style=flat-square"></a>
<a title="Commits" target="_blank" href="https://github.com/sophosia/sophosia/commits/main"><img src="https://img.shields.io/github/commit-activity/m/sophosia/sophosia?style=flat-square"></a>
<br>
<a title="Twitter" target="_blank" href="https://twitter.com/sophosia_app"><img alt="Twitter Follow" src="https://img.shields.io/badge/@sophosia_app-1976d2?logo=twitter&style=social"></a>
<a title="QQ" target="_blank" href=""><img alt="QQ Group" src="https://img.shields.io/badge/QQ:808198109-1976d2?logo=tencentqq&style=social"></a>
<a title="Discord" target="_blank" href="https://discord.gg/m3QkadNJ"><img alt="Join Discord" src="https://img.shields.io/badge/Sophosia-1976d2?logo=discord&style=social"></a>
</p>

<p align="center">
<a href="https://github.com/sophosia/sophosia/blob/main/README.md">English</a>
|
<a href="https://github.com/sophosia/sophosia/blob/main/README.zh_CN.md">中文</a>
</p>

# Sophosia

Sophosia is a paper/book/note management tool. It is a reference management tool with various useful functionalities such as: built-in PDF reader, live markdown note and excalidraw note.

## Reference Management

References can be managed in library page.

- Favorites, folders, tags, search, etc. All essential functions are there
- Able to one-click-retrieve meta information and related reference by providing identifier such as DOI
  ![library-page.png](./galleries/library-page.png)

## PDF Reader

Research helper has a built-in PDF reader.

- Able to adjust page layout, light/dark mode and more
- Support markdown comment (also latex) in annotations
- Able to preview internal links in hover windows
  ![reader-page.png](./galleries/reader-page.png)

## Note-taking System

Due to the flexible multi-window layout, it is never this easy to take notes while reading.

- Support WYSIWYG markdown note and excalidraw note
- Able to cite other references/notes in markdown note
- Support math(latex), code block, mindmap and more in markdown down
  ![note-page.png](./galleries/note-page.png)

# Contribute to Research-Helper

Research Helper uses [QUASAR](https://quasar.dev) as framework. In this project, the combination of [Vue.js3](https://vuejs.org) and [Tauri](https://tauri.app) is used.

## Install the dependencies

1. Tauri is needed. The instructions of installing Tauri is on [Tauri's official site](https://tauri.app/v1/guides/getting-started/setup).
2. The frontend will be built using Vue3. The frontend packages are listed in `package.json` already. Using `yarn` (recommanded) or `npm` to install them.

```bash
yarn # strongly recommanded
# or
npm install
```

## Start the Tauri app in development mode (hot-code reloading, error reporting, etc.)

```bash
yarn dev
```

## To build the app

```bash
yarn build
```

## Tests

```bash
yarn test:unit:ci # backend unit test
yarn test:component:ci # vue component test
```

# Acknowledgement

This project is made possible by the following open source projects.

- Quasar
- Tauri
- Vue.js
- citation-js
- cytoscape
- golden-layout
- pdf.js
- konva
- vditor
- Excalidraw
