import type { EmulatorSession } from "../core/session";
import type { SessionState } from "../core/types";

export class Controls {
  private assembleBtn: HTMLButtonElement;
  private stepBtn: HTMLButtonElement;
  private runBtn: HTMLButtonElement;
  private resetBtn: HTMLButtonElement;
  private errorEl: HTMLElement;

  constructor(
    private container: HTMLElement,
    private session: EmulatorSession,
  ) {
    this.assembleBtn = document.createElement("button");
    this.assembleBtn.textContent = "Assemble";
    this.assembleBtn.addEventListener("click", () => this.session.assemble());

    this.stepBtn = document.createElement("button");
    this.stepBtn.textContent = "Step";
    this.stepBtn.addEventListener("click", () => this.session.step());

    this.runBtn = document.createElement("button");
    this.runBtn.textContent = "Run";
    this.runBtn.addEventListener("click", () => this.session.run());

    this.resetBtn = document.createElement("button");
    this.resetBtn.textContent = "Reset";
    this.resetBtn.addEventListener("click", () => this.session.reset());

    this.errorEl = document.createElement("div");
    this.errorEl.className = "controls-error";

    const buttonRow = document.createElement("div");
    buttonRow.className = "controls-buttons";
    buttonRow.append(this.assembleBtn, this.stepBtn, this.runBtn, this.resetBtn);
    this.container.append(buttonRow, this.errorEl);

    session.subscribe((state) => this.render(state));
    this.render(session.getState());
  }

  private render(state: SessionState): void {
    const canStep = state.status === "assembled";
    this.stepBtn.disabled = !canStep;
    this.runBtn.disabled = !canStep;
    this.resetBtn.disabled = state.lineMap === null;
    this.errorEl.textContent = state.assembleError ?? "";
  }
}
