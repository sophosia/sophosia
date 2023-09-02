# sophosia (sophosia)

A research paper/ textbook / note management tool

## Install Tauri

First we need to install system dependencies, read this page
[Setting Up Linux](https://tauri.app/v1/guides/getting-started/prerequisites)

Then we can proceed to the next step, since the tauri cli is already included in the dev dependencies list in the `package.json` already.

## Install the dependencies

```bash
yarn
# or
npm install
```

### Start the app in development mode (hot-code reloading, error reporting, etc.)

This command starts `pouchdb-server` at port 3000, and runs `yarn tauri dev`.

```bash
yarn dev
# or
npm dev
```

### Inspect database using Fauton UI

This is for better debugging. We can inspect the database by accessing `localhost:3000/_utils`

### Lint the files

```bash
yarn lint
# or
npm run lint
```

### Format the files

```bash
yarn format
# or
npm run format
```

### Build the app for production

```bash
yarn build
# or
npm build
```

### Customize the configuration

See [Configuring quasar.config.js](https://v2.quasar.dev/quasar-cli-vite/quasar-config-js).

### !Neovim

When using neovim, do not start development in neovim's built-in command line window, otherwise tauri fails to start. Instead, create another command line tab to run the dev.
