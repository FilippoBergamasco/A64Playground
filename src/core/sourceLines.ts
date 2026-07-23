const LABEL_ONLY_RE = /^\s*[A-Za-z_.$][\w.$]*\s*:\s*$/;
const DIRECTIVE_RE = /^\s*(?:[A-Za-z_.$][\w.$]*\s*:\s*)?\.[A-Za-z_]/;

export function isBlankOrComment(line: string): boolean {
  const trimmed = line.trim();
  return trimmed === "" || trimmed.startsWith("//") || trimmed.startsWith(";");
}

export function isLabelOnly(line: string): boolean {
  return LABEL_ONLY_RE.test(line);
}

export function isRealLine(line: string): boolean {
  if (isBlankOrComment(line)) return false;
  if (isLabelOnly(line)) return false;
  return true;
}

export function isDirectiveLine(line: string): boolean {
  return DIRECTIVE_RE.test(line);
}
