// This file will be run before each test file
// mock the indexeddb
import { mockIPC } from "@tauri-apps/api/mocks";
import { createPinia, setActivePinia } from "pinia";
import { afterEach } from "vitest";
import { db } from "../../src/backend/database";
import { mockSQLDB } from "./mock-sqlite";

mockSQLDB();

export const mockFS = new Map<string, { content?: string }>();

interface Message {
  cmd?: string;
  path?: string;
  paths?: string[];
  contents?: ArrayBuffer;
  options?: any;
  query?: string;
  values?: string[];
}
mockIPC((cmd, args) => {
  const msg = (args?.message || args) as Message;
  const _cmd = msg?.cmd || cmd;
  switch (_cmd) {
    case "join":
      return (msg.paths as string[]).join("/");
    case "exists":
      return mockFS.has(msg.path as string);
    case "extname":
      return (msg.path as string)
        .split("/")
        .slice(-1)[0]
        .split(".")
        .slice(-1)[0];
    case "createDir":
      mockFS.set(msg.path as string, {});
      break;
    case "writeFile":
      const content = Buffer.from(msg.contents as ArrayBuffer).toString();
      mockFS.set(msg.path as string, { content });
      break;
    case "readTextFile":
      return mockFS.get(msg.path as string)?.content || "";
    case "removeFile":
      mockFS.delete(msg.path as string);
      break;
    case "resolvePath":
      return msg.path;
    case "readDir":
      const files = [];
      for (const path of mockFS.keys()) {
        const name = path.split("/").slice(-1)[0];
        if (path.includes(msg.path as string)) files.push({ path, name });
      }
      return files;
    case "removeDir":
      for (const path of mockFS.keys()) {
        if (path.includes(msg.path as string)) mockFS.delete(path);
      }
      break;
    case "plugin:fs-extra|metadata":
      const isFile = (msg.path as string).split("/").slice(-1)[0].includes(".");
      return { isFile };
    default:
      break;
  }
});

afterEach(() => {
  mockFS.clear();
});

const storagePath = "test-path";
db.setConfig({
  language: "en_US",
  storagePath: storagePath,
  lastScanTime: 0,
  storagePaths: [storagePath],
});

// set pinia in vitest
setActivePinia(createPinia());
