import { assemble } from "./assembler";
import { isRealLine } from "./sourceLines";
import type { LineMapEntry } from "./types";

export class AddressMapMismatchError extends Error {
  constructor(instructionLineCount: number, assembledInstructionCount: number) {
    super(
      `Assembled ${assembledInstructionCount} instruction(s) but source has ` +
        `${instructionLineCount} instruction line(s) — this usually means a ` +
        `pseudo-instruction expanded to multiple real instructions (e.g. a 64-bit ` +
        `\`mov\` immediate). Use explicit \`movz\`/\`movk\` sequences in v1.`,
    );
    this.name = "AddressMapMismatchError";
  }
}

export class DataDirectiveError extends Error {
  constructor(lineNumber: number, lineText: string) {
    super(
      `Data directive on line ${lineNumber} ("${lineText.trim()}") could not be assembled on its own. ` +
        `Data directives must not reference labels defined elsewhere in the program — only literal ` +
        `numeric/string operands are supported.`,
    );
    this.name = "DataDirectiveError";
  }
}

export class DataMapMismatchError extends Error {
  constructor() {
    super(
      "The data segment's assembled size doesn't match the sum of its individual directive lines — " +
        "this shouldn't normally happen and may indicate an unsupported directive.",
    );
    this.name = "DataMapMismatchError";
  }
}

interface RealLine {
  text: string;
  sourceLineIndex: number;
}

function collectRealLines(lines: string[], startIndex: number, endIndex: number): RealLine[] {
  const result: RealLine[] = [];
  for (let i = startIndex; i < endIndex; i++) {
    if (isRealLine(lines[i])) result.push({ text: lines[i], sourceLineIndex: i });
  }
  return result;
}

async function buildDataEntries(
  dataLines: RealLine[],
  mc: Uint8Array,
  dataStartAddress: number,
  codeByteLength: number,
): Promise<LineMapEntry[]> {
  const entries: LineMapEntry[] = [];
  let address = dataStartAddress;
  for (const line of dataLines) {
    const result = await assemble(line.text, address);
    if (result.failed) {
      throw new DataDirectiveError(line.sourceLineIndex + 1, line.text);
    }
    const length = result.mc.length;
    const offset = address - dataStartAddress + codeByteLength;
    entries.push({
      kind: "data",
      sourceLineIndex: line.sourceLineIndex,
      sourceLineText: line.text,
      address,
      bytes: mc.slice(offset, offset + length),
    });
    address += length;
  }

  const expectedDataLength = mc.length - codeByteLength;
  if (address - dataStartAddress !== expectedDataLength) {
    throw new DataMapMismatchError();
  }

  return entries;
}

export async function buildLineMap(
  sourceText: string,
  mc: Uint8Array,
  baseAddress: number,
  dataMarkerLineIndex: number | null,
): Promise<LineMapEntry[]> {
  const lines = sourceText.split("\n");
  const codeEndIndex = dataMarkerLineIndex ?? lines.length;
  const codeLines = collectRealLines(lines, 0, codeEndIndex);

  if (dataMarkerLineIndex === null) {
    const assembledCount = mc.length / 4;
    if (!Number.isInteger(assembledCount) || codeLines.length !== assembledCount) {
      throw new AddressMapMismatchError(codeLines.length, assembledCount);
    }
    return codeLines.map((line, i) => ({
      kind: "code",
      sourceLineIndex: line.sourceLineIndex,
      sourceLineText: line.text,
      address: baseAddress + 4 * i,
      bytes: mc.slice(4 * i, 4 * i + 4),
    }));
  }

  const codeByteLength = 4 * codeLines.length;
  if (codeByteLength > mc.length) {
    throw new AddressMapMismatchError(codeLines.length, mc.length / 4);
  }
  const codeEntries: LineMapEntry[] = codeLines.map((line, i) => ({
    kind: "code",
    sourceLineIndex: line.sourceLineIndex,
    sourceLineText: line.text,
    address: baseAddress + 4 * i,
    bytes: mc.slice(4 * i, 4 * i + 4),
  }));

  const dataLines = collectRealLines(lines, dataMarkerLineIndex + 1, lines.length);
  const dataEntries = await buildDataEntries(dataLines, mc, baseAddress + codeByteLength, codeByteLength);

  return [...codeEntries, ...dataEntries];
}
