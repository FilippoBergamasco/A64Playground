import type { EmulatorSession } from "../core/session";
import type { RegisterSnapshot, SessionState } from "../core/types";
import { toDecimal, toHex } from "./formatting";

interface RowMode {
  mode: "hex" | "dec";
  signed: boolean;
}

export class RegisterPanel {
  private rowModes = new Map<string, RowMode>();
  private lastState!: SessionState;

  constructor(
    private container: HTMLElement,
    session: EmulatorSession,
  ) {
    session.subscribe((state) => this.render(state));
    this.render(session.getState());
  }

  private getRowMode(id: string): RowMode {
    let mode = this.rowModes.get(id);
    if (!mode) {
      mode = { mode: "hex", signed: false };
      this.rowModes.set(id, mode);
    }
    return mode;
  }

  private formatValue(id: string, value: bigint, bitWidth: 32 | 64): string {
    const rowMode = this.getRowMode(id);
    return rowMode.mode === "hex" ? toHex(value, bitWidth) : toDecimal(value, bitWidth, rowMode.signed);
  }

  private render(state: SessionState): void {
    this.lastState = state;
    this.container.replaceChildren();
    if (!state.registers) {
      const empty = document.createElement("div");
      empty.className = "register-panel-empty";
      empty.textContent = "Assemble a program to see registers.";
      this.container.appendChild(empty);
      return;
    }
    const { registers, previousRegisters } = state;

    this.container.appendChild(this.renderNzcvRow(registers, previousRegisters));

    const gpList = document.createElement("div");
    gpList.className = "register-list";
    for (const gp of registers.gp) {
      const prevGp = previousRegisters?.gp[gp.index];
      gpList.appendChild(this.renderGpRow(gp.index, gp.x, prevGp?.x));
    }
    this.container.appendChild(gpList);

    this.container.appendChild(
      this.renderSingleRow("sp", "SP", registers.sp, previousRegisters?.sp, 64),
    );
    this.container.appendChild(
      this.renderSingleRow("pc", "PC", registers.pc, previousRegisters?.pc, 64),
    );
  }

  private renderNzcvRow(registers: RegisterSnapshot, previous: RegisterSnapshot | null): HTMLElement {
    const row = document.createElement("div");
    row.className = "register-row register-row-nzcv";
    for (const flag of ["n", "z", "c", "v"] as const) {
      const bit = document.createElement("span");
      const value = registers.nzcv[flag];
      const changed = previous ? previous.nzcv[flag] !== value : false;
      bit.className = `flag-bit${value ? " flag-set" : ""}${changed ? " changed" : ""}`;
      bit.textContent = `${flag.toUpperCase()}=${value ? "1" : "0"}`;
      row.appendChild(bit);
    }
    return row;
  }

  private renderGpRow(index: number, x: bigint, prevX: bigint | undefined): HTMLElement {
    const id = `x${index}`;
    const row = document.createElement("div");
    const changed = prevX !== undefined && prevX !== x;
    row.className = `register-row${changed ? " changed" : ""}`;

    const label = document.createElement("span");
    label.className = "register-label";
    label.textContent = index === 30 ? "X30 / LR" : `X${index}`;
    row.appendChild(label);

    const wLabel = document.createElement("span");
    wLabel.className = "register-sublabel";
    wLabel.textContent = `W${index}`;
    row.appendChild(wLabel);

    const valueEl = document.createElement("span");
    valueEl.className = "register-value";
    valueEl.textContent = this.formatValue(id, x, 64);
    valueEl.title = "Click to toggle hex/decimal";
    valueEl.addEventListener("click", () => this.cycleMode(id));
    row.appendChild(valueEl);

    return row;
  }

  private renderSingleRow(
    id: string,
    label: string,
    value: bigint,
    prevValue: bigint | undefined,
    bitWidth: 32 | 64,
  ): HTMLElement {
    const row = document.createElement("div");
    const changed = prevValue !== undefined && prevValue !== value;
    row.className = `register-row register-row-special${changed ? " changed" : ""}`;

    const labelEl = document.createElement("span");
    labelEl.className = "register-label";
    labelEl.textContent = label;
    row.appendChild(labelEl);

    const valueEl = document.createElement("span");
    valueEl.className = "register-value";
    valueEl.textContent = this.formatValue(id, value, bitWidth);
    valueEl.title = "Click to toggle hex/decimal";
    valueEl.addEventListener("click", () => this.cycleMode(id));
    row.appendChild(valueEl);

    return row;
  }

  private cycleMode(id: string): void {
    const rowMode = this.getRowMode(id);
    if (rowMode.mode === "hex") {
      rowMode.mode = "dec";
      rowMode.signed = false;
    } else if (!rowMode.signed) {
      rowMode.signed = true;
    } else {
      rowMode.mode = "hex";
      rowMode.signed = false;
    }
    // Re-render is triggered by the next session notification; force an
    // immediate repaint here since a display-mode toggle isn't a session event.
    this.render(this.lastState);
  }
}
