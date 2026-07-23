import { StreamLanguage, HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import type { StreamParser, StringStream } from "@codemirror/language";
import { tags } from "@lezer/highlight";

// Minimal hand-rolled tokenizer: `//` starts a line comment, `#<num>`
// immediates (signed decimal or `0x`-prefixed hex) are numbers, x0-x30/w0-w30
// plus sp/lr are registers, a word at the start of a line followed by `:` is
// a label definition, everything else is plain code. No keyword awareness
// yet.

//To extend later (keywords, directives), add more stream.match(...)
// branches in a64Parser.token returning different tag strings (e.g.
// "keyword"), then add matching entries to a64HighlightStyle.

const immediateRe = /^#[+-]?(0x[0-9a-fA-F]+|[0-9]+)/;
const registerRe = /^(?:[xw](?:30|[12][0-9]|[0-9])|sp|lr)\b/i;
// Lookahead keeps the trailing `:` out of the match so it's left as plain code.
const labelRe = /^[A-Za-z_]\w*(?=\s*:)/;

// There's no general identifier token, so text is otherwise consumed one
// character at a time — check the register regex doesn't match mid-word
// (e.g. the "sp" inside a label like "mysp").
function precededByWordChar(stream: StringStream): boolean {
  return stream.pos > 0 && /\w/.test(stream.string.charAt(stream.pos - 1));
}

const a64Parser: StreamParser<null> = {
  token(stream) {
    if (stream.sol() && stream.match(labelRe)) {
      return "labelName";
    }
    if (stream.match("//")) {
      stream.skipToEnd();
      return "comment";
    }
    if (stream.match(immediateRe)) {
      return "number";
    }
    if (!precededByWordChar(stream) && stream.match(registerRe)) {
      return "variableName";
    }
    stream.next();
    return null;
  },
};

const a64HighlightStyle = HighlightStyle.define([
  { tag: tags.comment, class: "cm-a64-comment" },
  { tag: tags.number, class: "cm-a64-number" },
  { tag: tags.variableName, class: "cm-a64-register" },
  { tag: tags.labelName, class: "cm-a64-label" },
]);

export const a64Language = StreamLanguage.define(a64Parser);
export const a64Highlighting = syntaxHighlighting(a64HighlightStyle);
