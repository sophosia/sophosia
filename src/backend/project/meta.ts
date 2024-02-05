import "@citation-js/plugin-isbn"; // must import this so we can use isbn as identifier
import Cite from "citation-js";

import { save } from "@tauri-apps/api/dialog";
import {
  readBinaryFile,
  readTextFile,
  writeTextFile,
} from "@tauri-apps/api/fs";
import { Author, Folder, Meta, Project } from "../database";
import { getProjects } from "./project";
// util (to scan identifier in PDF)
import * as pdfjsLib from "pdfjs-dist";
import { TextItem } from "pdfjs-dist/types/src/display/api";
import { useSettingStore } from "src/stores/settingStore";
pdfjsLib.GlobalWorkerOptions.workerSrc = "pdfjs/pdf.worker.min.js"; // in the public folder

/**
 * Get meta - Helper function
 * Processes the given identifiers to ensure they are in the correct format.
 *
 * This function primarily handles the formatting of DOI URLs when the identifiers
 * are an array of strings. It ensures that DOI URLs start with 'https://doi.org/'
 * and replaces certain special characters.
 *
 * @param {string[]} identifiers - The identifiers to be processed.
 *    This can be a single string, an array of strings, or an array of Project objects.
 *    If it's an array of strings, each string is processed for DOI URL formatting.
 *
 * @returns {string[]} - The processed identifiers.
 *    If the input is an array of strings, it returns the array with processed DOI URLs.
 *    For other types of inputs, it returns the input unchanged.
 */
export function processIdentifiers(identifiers: string[]): string[] {
  return identifiers.map((str) => {
    const match = str.match(/10.\d{4,9}\/[-._;()/:A-Z0-9]+/i);
    return match ? match[0] : "";
  });
}

/**
 * Get meta - Helper function
 * Formats the metadata based on the specified format and options.
 *
 * This function takes the raw metadata and formats it either as JSON or using a custom
 * format specified in the options. If no format is specified, it defaults to JSON.
 *
 * @param metas - The raw metadata to be formatted.
 * @param format - The format in which to return the metadata (e.g., 'json').
 * @param options - Additional formatting options, including the template for custom formatting.
 *
 * @returns {Promise<Meta[] | string>} - The formatted metadata.
 */
export async function formatMetaData(
  metas: Meta[],
  format?: string,
  options?: { format?: string; template?: string }
): Promise<Meta[] | string> {
  if (!format || format === "json") {
    const settingStore = useSettingStore();
    const citeKeyRule = settingStore.citeKeyRule;
    for (const meta of metas) {
      delete (meta as Meta & { _graph: any })._graph;
      if (!meta["citation-key"])
        meta["citation-key"] = generateCiteKey(meta, citeKeyRule);
    }
    return metas;
  } else if (options) {
    const data = await Cite.async(metas);
    return data.format(format, options);
  } else {
    const data = await Cite.async(metas);
    return data.format(format);
  }
}

/**
 * Retrieves metadata for given identifiers and formats it based on the specified options.
 *
 * @param {string[]} identifiers - The identifiers for which metadata is to be retrieved.
 * @returns {Promise<Meta[]>} A promise resolving to the formatted metadata.
 *
 * Processes the identifiers, making necessary adjustments for DOI URLs, and retrieves metadata using the Cite library.
 * Returns the metadata in the specified format, handling JSON formatting and citation key generation if needed.
 *
 * @throws Logs an error and returns an empty array if an error occurs during the retrieval process.
 */
export async function getMeta(identifiers: string[]): Promise<Meta[]> {
  try {
    const processedIdentifiers = processIdentifiers(identifiers);

    const data = await Cite.async(processedIdentifiers);
    return (await formatMetaData(data.data)) as Meta[];
  } catch (error) {
    console.log(error);
    return [] as Meta[];
  }
}

(window as any).getMeta = getMeta;

/**
 * Exports metadata in a specified format.
 *
 * @param {string} format - The format for the metadata export (e.g., 'json', 'bibtex').
 * @param {Object} options - Formatting options.
 * @param {Folder} [folder] - The folder containing projects to export metadata for.
 * @param {Project} [project] - A single project for which to export metadata.
 *
 * Depending on the provided parameters, this function either exports metadata for a single project,
 * all projects in a folder, or returns if neither is provided. The metadata is then saved to a file
 * in the chosen format.
 *
 * @throws Throws and logs an error if the export process encounters any issues.
 */
export async function exportMeta(
  folder: Folder,
  format: string,
  options?: { format?: string; template?: string }
) {
  try {
    const projects = await getProjects(folder._id);
    const metas = await formatMetaData(projects, format, options);

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
 * Imports metadata from a file.
 *
 * @param {string} filePath - The path to the file containing metadata.
 * @returns {Promise<Meta[]>} A promise resolving to an array of Meta objects.
 *
 * Reads the metadata from the specified file and converts it into an array of Meta objects.
 */
export async function importMeta(filePath: string): Promise<Meta[]> {
  const text = await readTextFile(filePath);
  const data = await Cite.async(text);
  return (await formatMetaData(data.data)) as Meta[];
}

/**
 * Generates a citation key based on given metadata and a rule.
 *
 * @param {Meta} meta - The metadata object used to generate the citation key.
 * @param {string} [rule="author_year_title"] - The rule for generating the citation key (default: "author_year_title").
 * @param {boolean} [longTitle=false] - Whether to use the full title or just the first word for the title part of the key.
 * @returns {string} The generated citation key.
 *
 * Constructs the citation key by extracting and formatting parts of the metadata (author, year, title)
 * based on the specified rule and title length preference.
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

/**
 * Extracts metadata from a file, such as a PDF, by reading its content.
 *
 * @param {string} filePath - The path to the file from which metadata is to be extracted.
 * @returns {Promise<Meta | undefined>} A promise resolving to a Meta object if metadata is found, undefined otherwise.
 *
 * Scans the initial pages of the file for identifiers like ISBNs or DOIs, then retrieves corresponding metadata.
 * Focuses primarily on text content to identify possible metadata sources.
 *
 * @throws Logs an error if the file reading or metadata extraction process fails.
 */
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
          let metas = await getMeta([identifier]);
          return metas[0] as Meta;
        }
      }
    }
  } catch (error) {
    console.log(error);
  }
}
