import { isBlankOrComment, isDirectiveLine, isLabelOnly } from "./sourceLines";

const DATA_MARKER_RE = /^\s*\.data\s*$/i;

export class DataSegmentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DataSegmentError";
  }
}

export interface SplitSource {
  /** Source text with the `.data` marker line blanked out (safe to hand to Keystone), or unchanged if there is no marker. */
  processedText: string;
  /** Line index of the `.data` marker, or null if the program has no data segment. */
  dataMarkerLineIndex: number | null;
}

export function splitDataSegment(sourceText: string): SplitSource {
  const lines = sourceText.split("\n");
  const markerIndices = lines
    .map((line, index) => ({ line, index }))
    .filter(({ line }) => DATA_MARKER_RE.test(line))
    .map(({ index }) => index);

  if (markerIndices.length > 1) {
    throw new DataSegmentError(
      `Found ${markerIndices.length} \`.data\` markers — only a single data section is supported, placed at the end of the program.`,
    );
  }

  if (markerIndices.length === 0) {
    return { processedText: sourceText, dataMarkerLineIndex: null };
  }

  const markerIndex = markerIndices[0];
  for (let i = markerIndex + 1; i < lines.length; i++) {
    const line = lines[i];
    if (isBlankOrComment(line) || isLabelOnly(line)) continue;
    if (!isDirectiveLine(line)) {
      throw new DataSegmentError(
        `Line ${i + 1} ("${line.trim()}") is not a data directive — only data directives are allowed after \`.data\`.`,
      );
    }
  }

  const processedLines = [...lines];
  processedLines[markerIndex] = "";
  return { processedText: processedLines.join("\n"), dataMarkerLineIndex: markerIndex };
}
