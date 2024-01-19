import { getMeta } from "src/backend/project/meta";
import { beforeAll, describe, expect, it } from "vitest";
import { AppState, Meta, db } from "../database";

describe("meta.ts", () => {
  beforeAll(async () => {
    await db.put({
      _id: "appState",
      dataType: "appState",
      settings: { citeKeyRule: "author_year_title" },
    } as AppState);
  });

  it("getMeta", async () => {
    const DOI = "10.1063/5.0050226";
    const metas = (await getMeta([DOI])) as Meta[];
    expect(metas.length).toBe(1);
    expect(metas[0].title).toBe(
      "On quasineutral plasma flow in the magnetic nozzle"
    );
  });
});
