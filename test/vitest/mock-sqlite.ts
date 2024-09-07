import * as sqlite from "../../src/backend/database/sqlite";
import type { QueryResult } from "tauri-plugin-sql-api";
import { vi } from "vitest";
import { ref } from "vue";
import Database from "tauri-plugin-sql-api";
import { parseInt } from "lodash";
export let mockTable = [] as Array<{ [k: string]: string }>;

export function mockSQLDB() {
  vi.spyOn(sqlite, "sqldb", "get").mockReturnValue({
    readyToRead: ref(true),
    load: async () => {
      const test = true;
      if (test) return;
      else return await Database.load(`sqlite:test.db`);
    },
    execute: async (query: string, bindValues: []) => {
      if (query.startsWith("INSERT")) {
        const match = query.match(/\((.*?)\)/)?.at(0);
        if (!match) return;
        const keys = match
          .slice(1, -1)
          .split(",")
          .map((key) => key.trim());
        if (keys.length !== bindValues.length) return;
        const row = {} as { [k: string]: string };
        keys.forEach((key, index) => {
          let value: string = bindValues[index];
          if (typeof value === "number") value = (value as number).toString();
          else if (typeof value === "object") value = JSON.stringify(value);
          row[key] = value;
        });
        mockTable.push(row);
      } else if (query.startsWith("UPDATE")) {
        // TODO: mock update?
      } else if (query.startsWith("DELETE")) {
        const conditionStr = query.split("WHERE").at(1);
        if (!conditionStr) return;
        const [key, _] = conditionStr
          .split(conditionStr.includes("=") ? "=" : "IN")
          .map((str) => str.trim());
        mockTable = mockTable.filter(
          (row) => key in row && !bindValues.includes(row[key] as never)
        );
      }

      return {
        rowsAffected: 1,
        lastInsertId: 0,
      } as QueryResult;
    },
    select: async <T>(query: string, bindValues?: unknown[] | undefined) => {
      if (!query.startsWith("SELECT")) return;
      const conditionStr = query.split("WHERE").at(1);
      if (!conditionStr) return;
      let subConditionStr = [] as string[];
      // for now we only have these simple cases in application
      if (conditionStr.includes("AND"))
        subConditionStr = conditionStr.split("AND");
      else if (conditionStr.includes("OR"))
        subConditionStr = conditionStr.split("OR");
      else subConditionStr.push(conditionStr);

      const conditions = new Map<string, string>();
      for (const str of subConditionStr) {
        const [key, valPlaceHolder] = str.split("=").map((s) => s.trim());
        const index = parseInt(valPlaceHolder.slice(1)) - 1;
        conditions.set(key, bindValues![index] as string);
      }

      const rows = [] as Array<{ [k: string]: string }>;
      for (const row of mockTable) {
        for (const [key, val] of conditions.entries())
          if (key in row && row[key] === val) rows.push(row);
      }
      return rows as T | undefined;
    },
    queryData: async (pattern: string) => {
      return "" as unknown;
    },
    createTables: async () => {},
  });
}
