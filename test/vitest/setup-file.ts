// This file will be run before each test file
// mock the indexeddb
import "fake-indexeddb/auto";
import { mockIPC } from "@tauri-apps/api/mocks";
import { db } from "../../src/backend/database";
import { afterEach } from "vitest";

export const mockFS = new Map<string, { content?: string }>();

interface Message {
  cmd?: string;
  path?: string;
  paths?: string[];
  contents?: ArrayBuffer;
  options?: any;
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
    case "readDir":
      const files = [];
      for (const path of mockFS.keys()) {
        if (path.includes(msg.path as string)) files.push({ path });
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
const storagePaths = [storagePath];
db.setConfig({
  language: "en_US",
  storagePath: storagePath,
  lastScanTime: 0,
  storagePaths: storagePaths,
});
