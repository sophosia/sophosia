import { beforeAll, describe, expect, it, vi } from "vitest";
import { Edge } from "./models";
import { sqldb } from "./sqlite";
import { mockTable } from "app/test/vitest/mock-sqlite";

describe("sqlite", () => {
  beforeAll(async () => {
    // empty the table
    mockTable.length = 0;
  });

  it("insert", async () => {
    const link = { source: "link-source", target: "link-target" };
    await sqldb.execute("INSERT INTO links (source, target) VALUES ($1, $2)", [
      link.source,
      link.target,
    ]);

    expect(mockTable.length).toBe(1);
    expect(mockTable[0]).toEqual(link);
  });

  it("query", async () => {
    const links =
      (await sqldb.select<Edge[]>("SELECT * FROM links WHERE source = $1", [
        "link-source",
      ])) || [];

    expect(links.length).toBe(1);
    expect(links[0]).toEqual({ source: "link-source", target: "link-target" });
  });

  it("delete", async () => {
    await sqldb.execute("DELETE * FROM links WHERE source = $1", [
      "link-source",
    ]);
    expect(mockTable.length).toBe(0);
  });
});
