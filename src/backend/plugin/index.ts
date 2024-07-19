import {
  createDir,
  exists,
  readTextFile,
  removeDir,
  writeTextFile,
} from "@tauri-apps/api/fs";
import { ResponseType, getClient } from "@tauri-apps/api/http";
import { join } from "@tauri-apps/api/path";
import { convertFileSrc } from "@tauri-apps/api/tauri";
import type { Button, View } from "sophosia";
import { Component, Plugin } from "sophosia";
import { useLayoutStore } from "src/stores/layoutStore";
import { ref } from "vue";
import { PluginManifest, PluginStatus, PluginStatusMap, db } from "../database";

interface PluginStatusData {
  _id: "plugin";
  dataType: "plugin";
  status: PluginStatus;
}

export async function getPluginStatus(): Promise<PluginStatus> {
  const defaultStatus = {} as PluginStatus;
  try {
    const pluginStatusData = (await db.get("plugin")) as PluginStatusData;
    return Object.assign(defaultStatus, pluginStatusData.status);
  } catch (error) {
    console.log(error);
    return defaultStatus;
  }
}

export async function updatePluginStatus(status: PluginStatus) {
  try {
    const pluginStatusData = {
      _id: "plugin",
      dataType: "plugin",
      status: status,
    } as PluginStatusData;
    await db.put(pluginStatusData);
  } catch (error) {
    console.log(error);
  }
}

class PluginManager {
  statusMap = ref<PluginStatusMap>(new Map());
  pluginManifests = ref<PluginManifest[]>([]);
  communityManifests = ref<PluginManifest[]>([]);
  plugins = ref<Map<string, Plugin>>(new Map());
  buttons = ref<Button[]>([]);
  views = ref<View[]>([]);
  // settings = ref<Map<string, Setting[]>>(new Map());

  /**
   * Initialize pluginManager
   */
  async init() {
    await this.loadAll();
  }

  /******************************************************
   * Get community metas, download, delete
   ******************************************************/
  /**
   * Filter plugin metas
   * @param text
   * @param local - are we filtering local plugins or community plugins
   */
  filter(text: string | null, local: boolean): PluginManifest[] {
    const manifests = local ? this.pluginManifests : this.communityManifests;
    if (!text) return manifests.value;
    const re = RegExp(text, "i"); // case insensitive
    return manifests.value.filter((meta) => {
      for (const [key, value] of Object.entries(meta)) {
        if ((value as string).search(re) != -1) return true;
      }
    });
  }

  async getCommunityManifests() {
    // if the communityManifests are there, no need to get them again
    if (this.communityManifests.value.length > 0) return;
    try {
      // get community plugins
      const response = await fetch(
        "https://raw.githubusercontent.com/sophosia/sophosia-releases/main/plugins.json"
      );
      this.communityManifests.value = await response.json();
    } catch (error) {
      console.log(error);
    }
  }

  /**
   * Download 3 files: main.js, styles.css, and manifest.json
   * To update plugin, simply download it again
   */
  async download(meta: PluginManifest) {
    const client = await getClient();
    for (const file of ["main.js", "style.css", "manifest.json"]) {
      const directory = await join(await this.pluginFolder(), meta.id);
      const filePath = await join(directory, file);
      if (!(await exists(directory))) await createDir(directory);
      const url = `https://github.com/${meta.repo}/releases/latest/download/${file}`;
      const response = await client.get(url, {
        responseType: ResponseType.Text,
      });
      await writeTextFile(filePath, response.data as string);
    }
    await this.load(meta.id, false); // not yet enabled
    await this.saveStatus();
  }

  /**
   * Delete a plugin on disk
   */
  async delete(meta: PluginManifest) {
    this.statusMap.value.delete(meta.id);
    this.plugins.value.delete(meta.id);
    this.pluginManifests.value = this.pluginManifests.value.filter(
      (m) => m.id != meta.id
    );
    await this.saveStatus();
    const directory = await join(await this.pluginFolder(), meta.id);
    await removeDir(directory, { recursive: true });
  }

  /**************************************************
   * Load, toggle plugins
   **************************************************/
  /**
   * Load all plugins
   */
  async loadAll() {
    await this.loadStatus();
    for (const [id, status] of this.statusMap.value.entries()) {
      if (!this.plugins.value.has(id)) await this.load(id, status.enabled);
    }
  }

  /**
   * Clear all data and then load all plugins
   */
  async reloadAll() {
    this.statusMap.value.clear();
    this.pluginManifests.value = [];
    this.communityManifests.value = [];
    this.plugins.value.clear();

    await this.loadAll();
  }

  /**
   * Load all plugins from disk
   */
  async load(pluginId: string, enabled: boolean) {
    const pluginPath = await join(await this.pluginFolder(), pluginId);
    const manifestPath = await join(pluginPath, "manifest.json");
    const manifest = JSON.parse(await readTextFile(manifestPath));
    let jsPath = await join(pluginPath, "main.js");
    let stylePath = await join(pluginPath, "style.css");
    const module = await import(/* @vite-ignore */ convertFileSrc(jsPath));
    const pluginClass = module.default;
    const plugin = new pluginClass(pluginId) as Plugin;
    this._load(pluginId, plugin);
    const style = document.createElement("link");
    document.head.append(style);
    style.rel = "stylesheet";
    style.href = convertFileSrc(stylePath);
    if (
      this.pluginManifests.value.findIndex((m) => m.id === manifest.id) === -1
    )
      this.pluginManifests.value.push(manifest);
    this.plugins.value.set(pluginId, plugin);
    await this.toggle(pluginId, enabled);
  }

  /**
   * Bind functions to the plugin class instance
   * @param plugin
   */
  private _load(pluginId: string, plugin: Plugin) {
    // register elements
    plugin.addButton = (button) => {
      button.id = `${pluginId}-${button.id}`;
      this.buttons.value.push(button);
    };
    plugin.addView = (view) => {
      view.id = `${pluginId}-${view.id}`;
      this.views.value.push(view);
    };
    // plugin.addSetting = (setting) => {
    //   if (!this.settings.value.has(pluginId))
    //     this.settings.value.set(pluginId, []);
    //   const settings = this.settings.value.get(pluginId)!;
    //   settings.push(setting);
    //   this.settings.value.set(pluginId, settings);
    // };

    // layout control
    const layoutStore = useLayoutStore();
    plugin.toggleLeftMenu = layoutStore.toggleLeftMenu;
    plugin.setLeftMenuView = layoutStore.setLeftMenuView;
    plugin.openPage = layoutStore.openPage;

    // data
    plugin.loadData = async () => {
      try {
        const dataPath = await join(
          await this.pluginFolder(),
          pluginId,
          "data.json"
        );
        return JSON.parse(await readTextFile(dataPath));
      } catch (error) {
        console.log(error);
      }
    };
    plugin.saveData = async (data: any) => {
      try {
        const dataPath = await join(
          await this.pluginFolder(),
          pluginId,
          "data.json"
        );
        await writeTextFile(dataPath, JSON.stringify(data));
      } catch (error) {
        console.log(error);
      }
    };
  }

  /**
   * Enable / Disable a plugin
   * @param enabled
   */
  async toggle(pluginId: string, enabled: boolean) {
    const plugin = this.plugins.value.get(pluginId);
    if (!plugin) return;

    let status = this.statusMap.value.get(pluginId);
    // if no status, meaning we just downloaded, it shouldn't be updatable
    if (!status) status = { enabled: enabled, updatable: false };
    else status.enabled = enabled;
    this.statusMap.value.set(pluginId, status);
    this.saveStatus();
    if (enabled) {
      await plugin.enable();
      // this.loadSettings(pluginId);
    } else {
      await plugin.disable();
      this.buttons.value = this.buttons.value.filter(
        (btn) => !btn.id.startsWith(pluginId)
      );
      this.views.value = this.views.value.filter(
        (view) => !view.id.startsWith(pluginId)
      );
    }
  }

  /**
   * Get plugin status
   * {pluginId: {enabled: boolean, updatable: boolean}}
   */
  async loadStatus() {
    const filePath = await join(await this.pluginFolder(), "status.json");
    if (!(await exists(filePath))) return;
    const status = JSON.parse(await readTextFile(filePath));
    this.statusMap.value = new Map(Object.entries(status));
  }

  async saveStatus() {
    const filePath = await join(await this.pluginFolder(), "status.json");
    const json = Object.fromEntries(this.statusMap.value);
    await writeTextFile(filePath, JSON.stringify(json));
  }

  /***********************************************************
   * Getters for buttons and views
   **********************************************************/

  getButtons(component: Component) {
    return this.buttons.value.filter((btn) => btn.component == component);
  }

  getViews(component: Component): View[] {
    return this.views.value.filter((view) => view.component == component);
  }

  getStatus(pluginId: string) {
    return this.statusMap.value.get(pluginId);
  }

  // getSettings(pluginId: string) {
  //   return this.settings.value.get(pluginId) || [];
  // }

  // async loadSettings(pluginId: string) {
  //   try {
  //     const settingsPath = await join(
  //       await this.pluginFolder(),
  //       pluginId,
  //       "settings.json"
  //     );
  //     this.settings.value.set(
  //       pluginId,
  //       JSON.parse(await readTextFile(settingsPath))
  //     );
  //   } catch (error) {
  //     console.log(error);
  //     this.settings.value.set(pluginId, []);
  //   }
  // }

  // async saveSettings(pluginId: string, settings: Setting[]) {
  //   try {
  //     const settingsPath = await join(
  //       await this.pluginFolder(),
  //       pluginId,
  //       "settings.json"
  //     );
  //     return await writeTextFile(settingsPath, JSON.stringify(settings));
  //   } catch (error) {
  //     console.log(error);
  //   }
  // }

  /*******************************************************
   * Path getters and setter
   *******************************************************/
  /**
   * Get the path to `plugins` folder
   * @returns path to `plugins` folder
   */
  private async pluginFolder(): Promise<string> {
    return await join(db.config.storagePath, ".sophosia", "plugin");
  }
}

// plugins
const pluginManager = new PluginManager();
export default pluginManager;
