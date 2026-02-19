import type { AnnotationData, Rect } from "../database";
import { AnnotationType, db, sqldb } from "../database";
import type {
  PdfAnnotationObject,
  PdfDocumentObject,
  PdfInkListObject,
  Rect as PdfRect,
  Size,
} from "@embedpdf/models";
import {
  PdfAnnotationBorderStyle,
  PdfAnnotationIcon,
  PdfAnnotationSubtype,
} from "@embedpdf/models";

export const LEGACY_ANNOTATION_SOURCE = "sophosia-legacy-migration";

const MARKUP_TYPES = new Set([
  AnnotationType.HIGHLIGHT,
  AnnotationType.UNDERLINE,
  AnnotationType.STRIKEOUT,
]);

function parseLegacyRects(rects: AnnotationData["rects"] | string | undefined): Rect[] {
  if (!rects) return [];
  if (Array.isArray(rects)) return rects;
  try {
    return JSON.parse(rects) as Rect[];
  } catch {
    return [];
  }
}

function toNumber(value: unknown, fallback = 0): number {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function normalizeColor(color?: string) {
  if (!color) return "#ffff00";
  return color;
}

function pageSizeFor(document: PdfDocumentObject, pageIndex: number): Size | null {
  const page = document.pages[pageIndex];
  return page?.size || null;
}

function legacyRectPercentToPdfRect(rect: Rect, pageSize: Size): PdfRect {
  return {
    origin: {
      x: clamp((toNumber(rect.left) / 100) * pageSize.width, 0, pageSize.width),
      y: clamp((toNumber(rect.top) / 100) * pageSize.height, 0, pageSize.height),
    },
    size: {
      width: clamp(
        (toNumber(rect.width) / 100) * pageSize.width,
        0,
        pageSize.width
      ),
      height: clamp(
        (toNumber(rect.height) / 100) * pageSize.height,
        0,
        pageSize.height
      ),
    },
  };
}

function pdfRectToLegacyPercentRect(rect: PdfRect, pageSize: Size): Rect {
  return {
    left: (rect.origin.x / pageSize.width) * 100,
    top: (rect.origin.y / pageSize.height) * 100,
    width: (rect.size.width / pageSize.width) * 100,
    height: (rect.size.height / pageSize.height) * 100,
  };
}

function unionRects(rects: PdfRect[]): PdfRect | null {
  if (!rects.length) return null;
  let minX = rects[0].origin.x;
  let minY = rects[0].origin.y;
  let maxX = rects[0].origin.x + rects[0].size.width;
  let maxY = rects[0].origin.y + rects[0].size.height;
  for (const rect of rects.slice(1)) {
    minX = Math.min(minX, rect.origin.x);
    minY = Math.min(minY, rect.origin.y);
    maxX = Math.max(maxX, rect.origin.x + rect.size.width);
    maxY = Math.max(maxY, rect.origin.y + rect.size.height);
  }
  return {
    origin: { x: minX, y: minY },
    size: { width: maxX - minX, height: maxY - minY },
  };
}

function defaultCommentRect(pageSize: Size, rect?: Rect): PdfRect {
  const width = Math.max(pageSize.width * 0.04, 22);
  const height = Math.max(pageSize.height * 0.03, 22);
  const leftPercent = rect ? toNumber(rect.left) : 10;
  const topPercent = rect ? toNumber(rect.top) : 10;
  const x = clamp((leftPercent / 100) * pageSize.width, 0, pageSize.width - width);
  const y = clamp((topPercent / 100) * pageSize.height, 0, pageSize.height - height);
  return {
    origin: { x, y },
    size: { width, height },
  };
}

function parseKonvaInkList(content: string, pageSize: Size): {
  inkList: PdfInkListObject[];
  strokeColor?: string;
  strokeWidth?: number;
} {
  if (!content) return { inkList: [] };
  try {
    const stage = JSON.parse(content);
    const attrs = stage?.attrs || {};
    const stageWidth = toNumber(attrs.width);
    const stageHeight = toNumber(attrs.height);
    if (!stageWidth || !stageHeight) return { inkList: [] };

    const layers = Array.isArray(stage?.children) ? stage.children : [];
    const inkList = [] as PdfInkListObject[];
    let strokeColor = "";
    let strokeWidth = 1;

    for (const layer of layers) {
      const children = Array.isArray(layer?.children) ? layer.children : [];
      for (const child of children) {
        if (child?.className !== "Line") continue;
        const childAttrs = child?.attrs || {};
        if (childAttrs.globalCompositeOperation === "destination-out") continue;
        const points = Array.isArray(childAttrs.points) ? childAttrs.points : [];
        if (points.length < 4) continue;
        const converted = [] as { x: number; y: number }[];
        for (let i = 0; i < points.length - 1; i += 2) {
          converted.push({
            x: (toNumber(points[i]) / stageWidth) * pageSize.width,
            y: (toNumber(points[i + 1]) / stageHeight) * pageSize.height,
          });
        }
        inkList.push({ points: converted });
        if (!strokeColor && typeof childAttrs.stroke === "string") {
          strokeColor = childAttrs.stroke;
        }
        if (!strokeWidth && Number.isFinite(childAttrs.strokeWidth)) {
          strokeWidth = toNumber(childAttrs.strokeWidth, 1);
        }
      }
    }

    return {
      inkList,
      strokeColor: strokeColor || undefined,
      strokeWidth,
    };
  } catch {
    return { inkList: [] };
  }
}

function normalizeLegacyAnnotation(raw: AnnotationData): AnnotationData {
  return {
    ...raw,
    pageNumber: toNumber(raw.pageNumber, 1),
    rects: parseLegacyRects(raw.rects),
  };
}

function supportedLegacyType(type: AnnotationType) {
  return (
    type === AnnotationType.HIGHLIGHT ||
    type === AnnotationType.UNDERLINE ||
    type === AnnotationType.STRIKEOUT ||
    type === AnnotationType.RECTANGLE ||
    type === AnnotationType.COMMENT ||
    type === AnnotationType.INK
  );
}

function normalizeSqlRow(row: Record<string, unknown>): AnnotationData {
  return {
    _id: String(row._id || ""),
    timestampAdded: toNumber(row.timestampAdded, Date.now()),
    timestampModified: toNumber(row.timestampModified, Date.now()),
    dataType: "pdfAnnotation",
    projectId: String(row.projectId || ""),
    pageNumber: toNumber(row.pageNumber, 1),
    content: String(row.content || ""),
    color: String(row.color || ""),
    rects: parseLegacyRects(row.rects as string | undefined),
    type: String(row.type || AnnotationType.HIGHLIGHT) as AnnotationType,
  };
}

export async function loadLegacyAnnotations(
  projectId: string
): Promise<AnnotationData[]> {
  const normalized = [] as AnnotationData[];
  const seen = new Set<string>();

  const sqlRows =
    (await sqldb.select<Record<string, unknown>[]>(
      "SELECT * FROM annotations WHERE projectId = $1",
      [projectId]
    )) || [];

  for (const row of sqlRows) {
    const annotation = normalizeSqlRow(row);
    if (!annotation._id || seen.has(annotation._id)) continue;
    if (!supportedLegacyType(annotation.type)) continue;
    seen.add(annotation._id);
    normalized.push(annotation);
  }

  if (normalized.length > 0) return normalized;

  const docs = ((await db.getDocs("pdfAnnotation")) || []) as AnnotationData[];
  for (const doc of docs) {
    if (!doc || doc.projectId !== projectId) continue;
    const annotation = normalizeLegacyAnnotation(doc);
    if (!annotation._id || seen.has(annotation._id)) continue;
    if (!supportedLegacyType(annotation.type)) continue;
    seen.add(annotation._id);
    normalized.push(annotation);
  }
  return normalized;
}

export function legacyToEmbedAnnotation(
  legacyAnnotation: AnnotationData,
  document: PdfDocumentObject
): PdfAnnotationObject | null {
  const annotation = normalizeLegacyAnnotation(legacyAnnotation);
  const pageIndex = annotation.pageNumber - 1;
  const pageSize = pageSizeFor(document, pageIndex);
  if (!pageSize) return null;
  const color = normalizeColor(annotation.color);
  const legacyRects = annotation.rects || [];
  const segmentRects = legacyRects.map((rect) =>
    legacyRectPercentToPdfRect(rect, pageSize)
  );
  const defaultRect: PdfRect = {
    origin: { x: pageSize.width * 0.1, y: pageSize.height * 0.1 },
    size: { width: pageSize.width * 0.2, height: pageSize.height * 0.03 },
  };
  const rect = unionRects(segmentRects) || defaultRect;
  const base = {
    id: annotation._id,
    pageIndex,
    rect,
    contents: annotation.content || undefined,
    custom: {
      source: LEGACY_ANNOTATION_SOURCE,
      legacyAnnotationId: annotation._id,
    },
  };

  switch (annotation.type) {
    case AnnotationType.HIGHLIGHT:
      return {
        ...base,
        type: PdfAnnotationSubtype.HIGHLIGHT,
        strokeColor: color,
        opacity: 0.35,
        segmentRects: segmentRects.length ? segmentRects : [rect],
      };
    case AnnotationType.UNDERLINE:
      return {
        ...base,
        type: PdfAnnotationSubtype.UNDERLINE,
        strokeColor: color,
        opacity: 1,
        segmentRects: segmentRects.length ? segmentRects : [rect],
      };
    case AnnotationType.STRIKEOUT:
      return {
        ...base,
        type: PdfAnnotationSubtype.STRIKEOUT,
        strokeColor: color,
        opacity: 1,
        segmentRects: segmentRects.length ? segmentRects : [rect],
      };
    case AnnotationType.RECTANGLE:
      return {
        ...base,
        type: PdfAnnotationSubtype.SQUARE,
        color,
        opacity: 0.2,
        strokeWidth: 1,
        strokeColor: color,
        strokeStyle: PdfAnnotationBorderStyle.SOLID,
        flags: ["print"],
      };
    case AnnotationType.COMMENT:
      return {
        ...base,
        type: PdfAnnotationSubtype.TEXT,
        rect: defaultCommentRect(pageSize, legacyRects[0]),
        contents: annotation.content || "",
        color,
        opacity: 1,
        icon: PdfAnnotationIcon.Note,
      };
    case AnnotationType.INK: {
      const { inkList, strokeColor, strokeWidth } = parseKonvaInkList(
        annotation.content,
        pageSize
      );
      if (!inkList.length) return null;
      return {
        ...base,
        type: PdfAnnotationSubtype.INK,
        inkList,
        strokeColor: strokeColor || color,
        opacity: 1,
        strokeWidth: strokeWidth || 1,
      };
    }
    default:
      return null;
  }
}

function embedTypeToLegacyType(type: PdfAnnotationSubtype): AnnotationType | null {
  switch (type) {
    case PdfAnnotationSubtype.HIGHLIGHT:
      return AnnotationType.HIGHLIGHT;
    case PdfAnnotationSubtype.UNDERLINE:
      return AnnotationType.UNDERLINE;
    case PdfAnnotationSubtype.STRIKEOUT:
      return AnnotationType.STRIKEOUT;
    case PdfAnnotationSubtype.SQUARE:
      return AnnotationType.RECTANGLE;
    case PdfAnnotationSubtype.TEXT:
      return AnnotationType.COMMENT;
    case PdfAnnotationSubtype.INK:
      return AnnotationType.INK;
    default:
      return null;
  }
}

export function embedToLegacyAnnotation(
  annotation: PdfAnnotationObject,
  projectId: string,
  document: PdfDocumentObject
): AnnotationData | null {
  const legacyType = embedTypeToLegacyType(annotation.type);
  if (!legacyType) return null;
  const pageIndex = annotation.pageIndex;
  const pageSize = pageSizeFor(document, pageIndex);
  if (!pageSize) return null;

  let rects = [] as Rect[];
  if (
    annotation.type === PdfAnnotationSubtype.HIGHLIGHT ||
    annotation.type === PdfAnnotationSubtype.UNDERLINE ||
    annotation.type === PdfAnnotationSubtype.STRIKEOUT
  ) {
    const segmentRects = annotation.segmentRects || [];
    rects = segmentRects.map((rect) => pdfRectToLegacyPercentRect(rect, pageSize));
  } else {
    rects = [pdfRectToLegacyPercentRect(annotation.rect, pageSize)];
  }

  const content =
    legacyType === AnnotationType.INK
      ? JSON.stringify({
          inkList:
            annotation.type === PdfAnnotationSubtype.INK
              ? annotation.inkList || []
              : [],
        })
      : annotation.contents || "";

  const color =
    annotation.type === PdfAnnotationSubtype.INK ||
    annotation.type === PdfAnnotationSubtype.HIGHLIGHT ||
    annotation.type === PdfAnnotationSubtype.UNDERLINE ||
    annotation.type === PdfAnnotationSubtype.STRIKEOUT
      ? annotation.strokeColor || annotation.color || "#ffff00"
      : annotation.color || annotation.strokeColor || "#ffff00";

  return {
    _id: annotation.id,
    timestampAdded: Date.now(),
    timestampModified: Date.now(),
    dataType: "pdfAnnotation",
    projectId,
    pageNumber: pageIndex + 1,
    content,
    color,
    rects,
    type: legacyType,
  };
}

export async function saveLegacyAnnotation(annotation: AnnotationData) {
  const now = Date.now();
  let timestampAdded = annotation.timestampAdded;
  try {
    const existing = (await db.get(annotation._id)) as AnnotationData;
    timestampAdded = existing.timestampAdded;
  } catch {
    timestampAdded = annotation.timestampAdded || now;
  }

  const next = {
    ...annotation,
    timestampAdded,
    timestampModified: now,
    dataType: "pdfAnnotation" as const,
  };

  await db.put(next);
  await sqldb.execute("DELETE FROM annotations WHERE _id = $1", [next._id]);
  await sqldb.execute(
    `INSERT INTO annotations (projectId, _id, type, rects, color, pageNumber, content, timestampAdded, timestampModified)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [
      next.projectId,
      next._id,
      next.type,
      next.rects,
      next.color,
      next.pageNumber,
      next.content,
      next.timestampAdded,
      next.timestampModified,
    ]
  );
}

export async function deleteLegacyAnnotation(annotationId: string) {
  try {
    const existing = await db.get(annotationId);
    await db.remove(existing);
  } catch {
    // already removed from json storage
  }
  await sqldb.execute("DELETE FROM annotations WHERE _id = $1", [annotationId]);
}

export function shouldMigrateLegacyType(type: AnnotationType) {
  return MARKUP_TYPES.has(type) || type === AnnotationType.RECTANGLE || type === AnnotationType.COMMENT || type === AnnotationType.INK;
}
