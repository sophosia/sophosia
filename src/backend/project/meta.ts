import Cite from "citation-js";
import "@citation-js/plugin-isbn"; // must import this so we can use isbn as identifier
import { getProjects } from "./project";
import { AppState, Author, Folder, Meta, Project, db } from "../database";
import {
  readBinaryFile,
  readTextFile,
  writeTextFile,
} from "@tauri-apps/api/fs";
import { save } from "@tauri-apps/api/dialog";
// util (to scan identifier in PDF)
import * as pdfjsLib from "pdfjs-dist";
import { TextItem } from "pdfjs-dist/types/src/display/api";
pdfjsLib.GlobalWorkerOptions.workerSrc = "pdfjs/pdf.worker.min.js"; // in the public folder
/**
 * Get artible/book info given an identifier using citation.js
 * @param identifier - identifier(s)
 * @param format - json, bib, bibliography, ris, ...
 * @param options - e.g. {format: "html"}, {template: "vancouver"}
 * @returns citation data
 */
export async function getMeta(
  identifiers: string | string[] | Project[],
  format?: string,
  options?: { format?: string; template?: string }
): Promise<Meta[] | string> {
  try {
    // if identifiers is string, then it must be a collection file like bib, ris
    if (Array.isArray(identifiers) && typeof identifiers[0] === "string") {
      for (let [index, str] of identifiers.entries()) {
        // Tauri is not able to allow http call except using http module ...
        // instead of doing http://some-special-doi-server/, we do https://doi.org/
        str = str.replace(/.*doi\.\w\//, "https://doi.org/");
        if (!str.startsWith("https://doi.org/") && str.includes("/"))
          str = `https://doi.org/${str}`;
        identifiers[index] = str.replace("⁃", "-"); // replace some weird characters
      }
    }
    console.log("identifiders", identifiers);
    console.log("Format", format);
    console.log("options",options);
    const data = await Cite.async(identifiers);
    
    if (!format || format === "json") {
      let metas = data.data;
      const appState = (await db.get("appState")) as AppState;
      const citeKeyRule = appState.settings.citeKeyRule;
      for (let i in metas) {
        delete metas[i]._graph;
        if (!metas[i]["citation-key"])
          metas[i]["citation-key"] = generateCiteKey(metas[i], citeKeyRule);
      }
      return metas;
    } else if (!options) return data.format(format);
    else return data.format(format, options);
  } catch (error) {
    console.log(error);
    return [] as Meta[];
  }
}

(window as any).getMeta = getMeta;

/**
 * Export a folder of references to a specific format
 * @param folder
 * @param format
 * @param options
 */
export async function exportMeta(
  folder: Folder,
  format: string,
  options: { format?: string; template?: string }
) {
  try {
    let projects: Project[] = await getProjects(folder._id);
    let metas = await getMeta(projects, format, options);
    if (format === "json") {
      let path = await save();
      if (path) {
        if (path.slice(-5).indexOf(".json") === -1) path += ".json";
        await writeTextFile(path, JSON.stringify(metas));
      }
    } else {
      let extension = "";
      if (["bibtex", "biblatex"].includes(format)) extension = "bib";
      else if (format === "bibliography") extension = "txt";
      else if (format === "ris") extension = "ris";
      let path = await save({
        filters: [
          {
            name: extension,
            extensions: [extension],
          },
        ],
      });
      if (path) {
        if (path.slice(-4).indexOf(`.${extension}`) === -1)
          path += `.${extension}`;
        await writeTextFile(path, metas as string);
      }
    }
  } catch (error) {
    console.log(error);
    throw error;
  }
}

/**
 * Read a reference file (such as .bib) and return the containing metas
 * @param filePath
 * @returns citation data
 */
export async function importMeta(filePath: string): Promise<Meta[]> {
  let data = await readTextFile(filePath);
  return (await getMeta(data, "json")) as Meta[];
}

/**
 * Generate citation-key according to given meta
 * @param meta
 * @param rule - example: "author_year_title", "author year title" (space means no connector in between) ...
 */
export function generateCiteKey(
  meta: Meta,
  rule = "author_year_title",
  longTitle = false
): string {
  // parsing the rule
  let connector = "";
  let keys = ["author", "title", "year"];
  for (let symbol of [" ", "_"]) {
    keys = rule.split(symbol);
    if (keys[0] && keys[1] && keys[2]) {
      connector = symbol;
      break;
    }
  }

  let parts = { author: "", year: "", title: "" };
  // author
  let lastNames = "unknown";
  if (meta.author && meta.author.length > 0) {
    let familyNames = [];
    for (let author of meta.author as Author[]) {
      if (familyNames.length === 2) {
        // the third author and other will be briviated as etal
        familyNames.push("etal");
        break;
      }

      let family = author?.family;
      let literal = author?.literal;
      if (family) familyNames.push(family.toLowerCase());
      else if (literal) {
        // split the name by two ways "first last" and "last, feng"
        literal = literal.trim();
        let split1 = literal.split(" ");
        let split2 = literal.split(",");
        if (split1.length > 1) familyNames.push(split1[1].trim().toLowerCase());
        else if (split2.length > 1)
          familyNames.push(split2[0].trim().toLowerCase());
        else familyNames.push(literal.toLowerCase());
      }
    }

    // sometimes the last name contains multiple words, remove the space
    lastNames = familyNames.join(connector).replaceAll(" ", "");
  }
  parts.author = lastNames;

  // year
  let year = "unknown";
  if (meta.issued) year = meta.issued["date-parts"][0][0].toString();
  parts.year = year;

  if (longTitle) {
    parts.title = meta.title
      .toLowerCase()
      .split(" ")
      .join(connector)
      .replace(/[,.:'"/?!~`\\|]/, ""); // remove all special characters
  } else {
    // title's first word
    let title = meta.title
      .split(" ")
      .filter((w) => !["a", "an", "the", "on"].includes(w.toLowerCase()))[0]
      .replace(/[,.:'"/?!~`\\|]/, ""); // remove all special characters;
    parts.title = title.toLowerCase();
  }

  let citeKey = keys
    .map((key) => parts[key as "year" | "author" | "title"])
    .join(connector);

  // if connector is " ", it means no connector in between
  // connect all parts to a Pascal Case string
  if (connector === " ") {
    citeKey = citeKey
      .replace(
        /(\w)(\w*)/g,
        (_, g1: string, g2: string) => g1.toUpperCase() + g2
      )
      .replaceAll(" ", "");
  }
  return citeKey;
}

export async function getMetaFromFile(
  filePath: string
): Promise<Meta | undefined> {
  try {
    let buffer = await readBinaryFile(filePath);
    let pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
    for (
      let pageNumber = 1;
      pageNumber <= Math.min(10, pdf.numPages);
      pageNumber++
    ) {
      let page = await pdf.getPage(pageNumber);
      let content = await page.getTextContent();
      for (let item of content.items) {
        let identifier = null;
        // match ISBN-10 or ISBN-13
        let isbns = (item as TextItem).str.match(
          /^ISBN.* (?=(?:\D*\d){10}(?:(?:\D*\d){3})?$)[\d-]+$/
        );
        if (!!isbns) {
          let matched = isbns[0].match(
            /(?=(?:\D*\d){10}(?:(?:\D*\d){3})?$)[\d-]+/
          );
          if (matched) identifier = matched[0];
        }
        // match DOI
        let dois = (item as TextItem).str.match(/http.*doi.*/);
        if (!!dois) identifier = dois[0];
        else {
          let match = (item as TextItem).str.match(/doi(.*)/i);
          if (!!match && match[1]) identifier = match[1].replace(":", "");
        }

        // update project meta
        if (!!identifier) {
          console.log(identifier);
          let metas = await getMeta([identifier], "json");
          return metas[0] as Meta;
        }
      }
    }
  } catch (error) {
    console.log(error);
  }
}
