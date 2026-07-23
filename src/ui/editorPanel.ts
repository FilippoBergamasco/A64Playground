import { EditorView, basicSetup } from "codemirror";
import { EditorState, StateEffect, StateField } from "@codemirror/state";
import { Decoration, type DecorationSet, keymap } from "@codemirror/view";
import { indentWithTab } from "@codemirror/commands";
import { a64Language, a64Highlighting } from "./a64Language";
import type { EmulatorSession } from "../core/session";
import type { SessionState } from "../core/types";

const setCurrentLine = StateEffect.define<number | null>();
const currentLineMark = Decoration.line({ class: "cm-current-line" });

const currentLineField = StateField.define<DecorationSet>({
  create() {
    return Decoration.none;
  },
  update(decorations, tr) {
    let value = decorations.map(tr.changes);
    for (const effect of tr.effects) {
      if (effect.is(setCurrentLine)) {
        if (effect.value === null) {
          value = Decoration.none;
        } else {
          const line = tr.state.doc.line(effect.value + 1);
          value = Decoration.set([currentLineMark.range(line.from)]);
        }
      }
    }
    return value;
  },
  provide: (field) => EditorView.decorations.from(field),
});

export class EditorPanel {
  private view: EditorView;
  private currentLineIndex: number | null = null;

  constructor(container: HTMLElement, session: EmulatorSession, initialSource: string) {
    this.view = new EditorView({
      state: EditorState.create({
        doc: initialSource,
        extensions: [
          basicSetup,
          a64Language,
          a64Highlighting,
          currentLineField,
          keymap.of([indentWithTab]),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) {
              session.setSourceText(update.state.doc.toString());
            }
          }),
        ],
      }),
      parent: container,
    });
    session.subscribe((state) => this.render(state));
    this.render(session.getState());
  }

  private render(state: SessionState): void {
    const lineIndex = state.lineMap?.find((e) => e.address === state.currentPc)?.sourceLineIndex ?? null;
    if (lineIndex === this.currentLineIndex) return;
    this.currentLineIndex = lineIndex;
    this.view.dispatch({ effects: setCurrentLine.of(lineIndex) });
  }
}
