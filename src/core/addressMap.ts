import type { LineMapEntry } from "./types";

const LABEL_ONLY_RE = /^\s*[A-Za-z_.$][\w.$]*\s*:\s*$/;

function isBlankOrComment(line: string): boolean {
  const trimmed = line.trim();
  return trimmed === "" || trimmed.startsWith("//") || trimmed.startsWith(";");
}

function isRealInstructionLine(line: string): boolean {
  if (isBlankOrComment(line)) return false;
  if (LABEL_ONLY_RE.test(line)) return false;
  return true;
}

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

export function buildLineMap(sourceText: string, mc: Uint8Array, baseAddress: number): LineMapEntry[] {
  const lines = sourceText.split("\n");
  const realInstructionLines = lines
    .map((text, sourceLineIndex) => ({ text, sourceLineIndex }))
    .filter((line) => isRealInstructionLine(line.text));

  const assembledCount = mc.length / 4;
  if (!Number.isInteger(assembledCount) || realInstructionLines.length !== assembledCount) {
    throw new AddressMapMismatchError(realInstructionLines.length, assembledCount);
  }

  return realInstructionLines.map((line, i) => ({
    sourceLineIndex: line.sourceLineIndex,
    sourceLineText: line.text,
    address: baseAddress + 4 * i,
    bytes: mc.slice(4 * i, 4 * i + 4),
  }));
}
