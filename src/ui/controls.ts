import type { EmulatorSession } from "../core/session";
import type { SessionState } from "../core/types";
import { buildShareUrl } from "../core/shareLink";

export class Controls {
  private assembleBtn: HTMLButtonElement;
  private stepBtn: HTMLButtonElement;
  private runBtn: HTMLButtonElement;
  private resetBtn: HTMLButtonElement;
  private copyLinkBtn: HTMLButtonElement;
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

    this.copyLinkBtn = document.createElement("button");
    this.copyLinkBtn.textContent = "Copy Link";
    this.copyLinkBtn.addEventListener("click", () => this.copyShareLink());

    this.errorEl = document.createElement("div");
    this.errorEl.className = "controls-error";

    const buttonRow = document.createElement("div");
    buttonRow.className = "controls-buttons";
    buttonRow.append(this.assembleBtn, this.stepBtn, this.runBtn, this.resetBtn, this.copyLinkBtn);
    this.container.append(buttonRow, this.errorEl);

    session.subscribe((state) => this.render(state));
    this.render(session.getState());
  }

  private async copyShareLink(): Promise<void> {
    const url = buildShareUrl(this.session.getState().sourceText);
    history.replaceState(null, "", url);
    try {
      await navigator.clipboard.writeText(url);
      this.flashCopyLinkLabel("Copied!");
    } catch {
      this.flashCopyLinkLabel("Copy failed");
    }
  }

  private flashCopyLinkLabel(label: string): void {
    this.copyLinkBtn.textContent = label;
    setTimeout(() => {
      this.copyLinkBtn.textContent = "Copy Link";
    }, 1500);
  }

  private render(state: SessionState): void {
    const canStep = state.status === "assembled";
    this.stepBtn.disabled = !canStep;
    this.runBtn.disabled = !canStep;
    this.resetBtn.disabled = state.lineMap === null;
    this.errorEl.textContent = state.assembleError ?? "";
  }
}
