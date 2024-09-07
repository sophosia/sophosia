import { beforeAll, describe, expect, it, vi } from "vitest";
import { Edge } from "./models";
import { sqldb } from "./sqlite";

describe("sqlite", () => {
  it("insert", async () => {
    await sqldb.execute("INSERT INTO links (source, target) VALUES ($1, $2)", [
      "link-source",
      "link-target",
    ]);
  });

  it("query", async () => {
    const links =
      (await sqldb.select<Edge[]>("SELECT * FROM links WHERE source = $1", [
        "link-source",
      ])) || [];
    console.log("links", links);
  });
});
