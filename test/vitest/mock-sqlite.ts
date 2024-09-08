import * as sqlite from "../../src/backend/database/sqlite";
import type { QueryResult } from "tauri-plugin-sql-api";
import { afterEach, vi } from "vitest";
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
        updateSQLDB(query, bindValues);
      } else if (query.startsWith("DELETE")) {
        const conditionStr = query.split("WHERE").at(1);
        if (!conditionStr) return;
        if (conditionStr.includes("LIKE")) {
          const [key, _] = conditionStr.split("LIKE").map((str) => str.trim());
          mockTable = mockTable.filter(
            (row) =>
              key in row && row[key].startsWith(bindValues.at(0)! as string)
          );
        }
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
      if (!conditionStr) return mockTable as T;
      let subConditionStr = [] as string[];

      if (conditionStr.includes("LIKE")) {
        const [key, _] = conditionStr.split("LIKE").map((cond) => cond.trim());
        const rows = [] as Array<{ [k: string]: string }>;
        for (const row of mockTable) {
          if (key in row && row[key].startsWith(bindValues![0] as string))
            rows.push(row);
        }
        return rows as T;
      }

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
      return rows as T;
    },
    queryData: async (pattern: string) => {
      return "" as unknown;
    },
    createTables: async () => {},
  });
}

function updateSQLDB(query: string, bindValues: string[]) {
  if (query === "UPDATE categories SET category = REPLACE(category, $1, $2)") {
    for (const row of mockTable) {
      row.category = row.category.replace(bindValues[0], bindValues[1]);
    }
  } else if (
    query === "UPDATE categories SET category = $1 WHERE category = $2"
  ) {
    for (const row of mockTable) {
      if (row.category === bindValues[1]) row.category = bindValues[0];
    }
  }

  // UPDATE table SET key = REPLACE() WHERE condition = $2
  //
  // UPDATE links
  // SET source = CASE WHEN source = $1 THEN $2 ELSE source END,
  //     target = CASE WHEN target = $1 THEN $2 ELSE target END
  // WHERE source = $1 OR target = $1`,
}

afterEach(() => {
  mockTable = [];
});
