import {
  formatMetaData,
  generateCiteKey,
  getMeta,
  processIdentifiers,
} from "src/backend/project/meta";
import { useSettingStore } from "src/stores/settingStore";
import { beforeAll, describe, expect, it } from "vitest";

describe("meta.ts", () => {
  beforeAll(async () => {
    const settingStore = useSettingStore();
    settingStore.citeKeyRule = "author_year_title";
  });

  it("processIdentifiers", () => {
    const dois = [
      "10.1063/5.0050226",
      "http://dx.doi.org/10.1063/1.1647565",
      "doi: 10.1063/1.1647565",
      "https://doi.org/10.1093/mnras/staa529",
      "http://data.chinadoi.cn/10.3760/cma.j.issn.0253-3758.2020.01.004",
      "random stuff don't match",
    ];
    const identifiers = processIdentifiers(dois);
    expect(identifiers).toEqual([
      "10.1063/5.0050226",
      "10.1063/1.1647565",
      "10.1063/1.1647565",
      "10.1093/mnras/staa529",
      "10.3760/cma.j.issn.0253-3758.2020.01.004",
      "",
    ]);
  });

  it("getMeta", async () => {
    const DOI = "10.1063/5.0050226";
    const metas = await getMeta([DOI]);
    expect(metas.length).toBe(1);
    expect(metas[0].title).toBe(
      "On quasineutral plasma flow in the magnetic nozzle"
    );
  });

  it("formatMetaData", async () => {
    const meta = {
      id: "",
      type: "article-journal",
      "container-title": "",
      "citation-key": "feng_2023_test",
      "container-title-short": "",
      title: "test title",
      author: [{ family: "Feng", given: "Hunt" }],
      year: 2023,
    };
    const formatted = await formatMetaData([meta], "bibtex");
    expect(formatted).toContain("@article{feng_2023_test");
  });

  it("generateCiteKey - single author", () => {
    const meta = {
      id: "",
      "container-title": "",
      "citation-key": "",
      "container-title-short": "",
      title: "test title",
      author: [{ family: "Feng", given: "Hunt" }],
      issued: { "date-parts": [[2023]] },
    };
    const citeKey = generateCiteKey(meta);
    expect(citeKey).toBe("feng_2023_test");
  });
});
