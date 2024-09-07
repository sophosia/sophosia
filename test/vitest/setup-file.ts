// This file will be run before each test file
// mock the indexeddb
import { mockIPC } from "@tauri-apps/api/mocks";
import "fake-indexeddb/auto";
import { createPinia, setActivePinia } from "pinia";
import { afterEach, vi } from "vitest";
import { db } from "../../src/backend/database";
import * as sqlite from "../../src/backend/database/sqlite";
import type { QueryResult } from "tauri-plugin-sql-api";
import { ref } from "vue";
import Database from "tauri-plugin-sql-api";

export const mockLinkTable = [] as Array<{ source: string; target: string }>;
export const mockTable = [] as Array<object>;
vi.spyOn(sqlite, "sqldb", "get").mockReturnValue({
  readyToRead: ref(true),
  load: async () => {
    const test = true;
    if (test) return;
    else return await Database.load(`sqlite:test.db`);
  },
  execute: async (query: string, bindValues: []) => {
    return {
      rowsAffected: 1,
      lastInsertId: 0,
    } as QueryResult;
  },
  select: async <T>(query: string, bindValues?: unknown[] | undefined) => {
    return "" as T | undefined;
  },
  queryData: async (pattern: string) => {
    return "" as unknown;
  },
  createTables: async () => {},
});

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
    case "plugin:sql|execute":
      const query = msg.query;
      if (!query) break;
      if (query.startsWith("INSERT")) {
        const matches = query.match(/\((.*?)\)/);
        const keys = matches![1].split(",").map((raw) => raw.trim());
        const obj = {} as { [k: string]: string };
        for (const [index, key] of keys.entries())
          obj[key] = msg.values![index];
        mockTable.push(obj);
      }
      return { success: true };
      console.log("mockTable", mockTable);
      break;
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
