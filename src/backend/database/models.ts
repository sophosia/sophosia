import { PDFPageView } from "pdfjs-dist/web/pdf_viewer";
import { QTreeNode } from "quasar";

/***********************************
 * Project, Note, Folder and related data types
 ***********************************/

export interface Author {
  family?: string;
  given?: string;
  literal?: string; // this exists only if family and given do not exist
  sequence?: string; // first / additional etc
  affiliation?: string[];
}

interface Reference {
  key: string; // identifier, usually DOI
  DOI?: string;
  author?: string;
  year?: number;
  "article-title"?: string;
  "series-title"?: string;
  unstructured?: string;
}

/**
 * Meta datatype
 */
export interface Meta {
  id: string; // citation id
  "citation-label"?: string; // citatin label
  "citation-key": string; // used to cite for bibtex
  type?: string; // article / book / conference-paper ...
  "original-title"?: string; // original (untranslated) title
  title: string; // article / book title (translated)
  author: Author[]; // array of authors [{family: "Feng", given: "Feng"}, {literal: "John"}]
  abstract?: string; // article abstract
  issued?: { "date-parts": Array<any> }; // issued date
  DOI?: string; // Digital Object Identity
  ISBN?: string; // ISBN of a book
  ISSN?: string;
  URL?: string; // URL to this article/book
  publisher?: string; // publisher
  version?: string;
  volume?: number;
  keyword?: string;
  "container-title": string; // journal name
  "container-title-short": string;
  page?: string;
  source?: string;
  language?: string;
  reference?: Reference[]; // reference objects
}

export enum NoteType {
  MARKDOWN = "markdown",
  EXCALIDRAW = "excalidraw",
}

/**
 * Note datatype, both for database and for UI display
 */
export interface Note {
  _id: string; // unique id of the note
  dataType: "note"; // for database search
  projectId: string; // the project it belongs to
  path: string; // path to actual markdown file
  label: string; // markdown file name
  type: NoteType;
}

export type CategoryNode = QTreeNode<{ _id: string; children: CategoryNode[] }>;

/**
 * Multilevel note and folder support
 */
export interface FolderOrNote {
  _id: string;
  label: string;
  dataType: "folder" | "note";
  type?: NoteType;
  children?: FolderOrNote[];
}

/**
 * Project datatype, goes into database
 */
export interface Project extends Meta {
  _id: string; // unique id
  timestampAdded: number; // timestamp when data is saved
  timestampModified: number; // timestamp when data is updated
  dataType: "project"; // for database search
  label: string; //title
  children: FolderOrNote[];
  path: undefined | string; // attached pdf file path
  tags: string[]; // user defined keywords for easier search
  categories: string[]; // array of categories (in form of paths) containing this project
  favorite?: boolean;
  // index signature, so we can access property like this project[key]
  [k: string]: any;
}

export enum SpecialCategory {
  LIBRARY = "library",
  ADDED = "added",
  FAVORITES = "favorite",
}

/******************************************
 * For GraphView
 ******************************************/
export interface Edge {
  source: string;
  target: string;
}

export interface Node {
  id: string; // id of the node
  label: string; // label of the node
  type: "project" | "note" | "annotation";
}

export interface NodeUI {
  data: Node & { bg?: string; shape?: string; parent?: string };
}

export interface EdgeUI {
  data: Edge;
}

/****************************************
 * PDF Reader
 ****************************************/
export interface PDFState {
  _id: string; // handled by db
  dataType: "pdfState"; // for database search
  projectId: string; // the corresponding project id
  pagesCount: number; // total pages of the pdf
  currentPageNumber: number; // current page of the pdf
  pageHistory: number[]; // history of page number
  currentScale: number; // zoom scale of the pdf
  // if scale is not the first two options, then scaleValue === scale.toString()
  currentScaleValue: "page-width" | "page-height" | string;
  spreadMode: SpreadMode; // 0: no spread, 1: odd spread, 2: even spread
  tool: AnnotationType;
  darkMode: boolean;
  color: string; // hex value
  scrollLeft: number; // current scrollLeft position
  scrollTop: number; // current scrollTop position
  inkThickness: number;
  inkOpacity: number;
  eraserType: EraserType;
  eraserThickness: number;
}

export interface Rect {
  height: number;
  left: number;
  top: number;
  width: number;
}

export enum AnnotationType {
  CURSOR = "cursor",
  COMMENT = "comment",
  HIGHLIGHT = "highlight",
  RECTANGLE = "rectangle",
  UNDERLINE = "underline",
  STRIKEOUT = "strikeout",
  INK = "ink",
  ERASER = "eraser",
}

export enum EraserType {
  STROKE = "stroke",
  PIXEL = "pixel",
}

export enum SpreadMode {
  NO_SPREAD,
  ODD_SPREAD,
  EVEN_SPREAD,
}

/**
 * Goes into database
 */
export interface AnnotationData {
  _id: string; // handled by db
  timestampAdded: number; // timestamp when data is saved
  timestampModified: number; // timestamp when data is updated
  dataType: "pdfAnnotation"; // for database search
  projectId: string; // which project (pdf)
  pageNumber: number; // on which page
  content: string; // comments of the annotation
  color: string; // hex value
  rects: Rect[]; // a multiline highlight annotation has more than 1 rect
  type: AnnotationType;
}

/**
 * Table of contents node
 */
type RefProxy = {
  num: number;
  gen: number;
};

/**
 * Table of Content Node
 */
export interface TOCNode extends QTreeNode {
  dest?: string | any[] | null; // destination
  ref?: RefProxy;
}

/**
 * PDF search options
 */
export interface PDFSearch {
  query: string;
  highlightAll: boolean;
  caseSensitive: boolean;
  entireWord: boolean;
}

export interface RenderEvt {
  error: Error | null;
  pageNumber: number;
  source: PDFPageView;
}

/**************************************************
 * App global settings
 **************************************************/
/**
 * Config is settings that are independent of workspace
 */
export interface Config {
  language: string;
  storagePath: string;
  lastScanTime: number;
  storagePaths: string[];
}

/**
 * Settings are different in each workspace
 */
export interface Settings {
  theme: string; // dark by default
  fontSize: string; // 16px by default
  translateLanguage: string;
  citeKeyRule: string; // "author_title_year" by default
}

export interface AppState {
  _id: "appState";
  dataType: "appState";
  // layout
  ribbonClickedBtnId: string;
  leftMenuSize: number;
  rightMenuSize: number;
  // project
  selectedCategory: string;
  currentItemId: string;
  historyItemIds: string[];
  openedProjectIds: string[];
  // settings
  theme: string; // dark by default
  fontSize: string; // 16px by default
  pdfTranslateEngine: "google" | "yandex" | "deepl"; // for pdf translator
  pdfTranslateApiKey: string; // for pdf translator
  pdfTranslateLanguage: string; // for pdf translator
  showTranslatedTitle: boolean; // display translated title in project table
  citeKeyRule: string; // "author_year_title" by default
  pdfRenameRule: string; // "author_year_fullTitle" by default
  projectIdRule: string; // "uid" by default

}

export interface Row {
  id: string;
  type: "row";
  split: number;
  children: Layout[];
}

export interface Col {
  id: string;
  type: "col";
  split: number;
  children: Layout[];
}

export interface Stack {
  id: string;
  type: "stack";
  children: Page[];
}

export interface Page {
  id: string;
  type: PageType;
  label: string;
  visible?: boolean; // if visible not exists, then it's not visible
  data?: { path?: string; focusAnnotId?: string };
}

export enum PageType {
  LibraryPage = "LibraryPage",
  ReaderPage = "ReaderPage",
  NotebookPage = "NotebookPage",
  NotePage = "NotePage",
  ExcalidrawPage = "ExcalidrawPage",
  HelpPage = "HelpPage",
  SettingsPage = "SettingsPage",
  PluginSettingsPage = "PluginSettingsPage",
  PluginPage = "PluginPage",
}

export type Layout = Row | Col | Stack;

/*******************
 * EventBus
 *******************/
export interface BusEvent {
  source: string; // from which component
  target?: string; // to which component
  data?: any;
}

/******************
 * Plugin System
 ******************/
export enum Component {
  Ribbon = "Ribbon",
  LeftMenu = "LeftMenu",
  PDFMenu = "PDFMenu",
  PluginPage = "PluginPage",
}

export interface Button {
  id: string;
  icon: string;
  tooltip: string;
  component: Component;
  click: () => void;
}

export interface ToggleButton {
  id: string;
  uid: string;
  icon: string;
  tooltip: string;
}

export interface View {
  id: string;
  component: Component;
  mount: (container: HTMLElement) => void;
}

export interface SettingToggle {
  label: string;
  description: string;
  type: "toggle";
  value: boolean;
}

export interface SettingSelect {
  label: string;
  description: string;
  type: "select";
  options: Array<{ label: string; icon?: string; value: any }>;
  value: { label: string; icon?: string; value: any };
}

export interface SettingInput {
  label: string;
  description: string;
  type: "input";
  inputType: "text" | "number";
  value: string | number;
}

export interface SettingSlider {
  label: string;
  description: string;
  type: "slider";
  min: number;
  max: number;
  step?: number; // step between valid values > 0.0
  snap?: boolean; // snap on valid values
  value: number;
}

export type Setting =
  | SettingToggle
  | SettingSelect
  | SettingInput
  | SettingSlider;

export interface PluginManifest {
  id: string;
  name: string;
  author: string;
  version: string;
  description: string;
  repo: string;
}

export interface PluginStatus {
  enabled: boolean;
  updatable: boolean;
}

export type PluginStatusMap = Map<string, PluginStatus>;

