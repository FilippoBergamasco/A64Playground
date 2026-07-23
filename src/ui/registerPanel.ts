import type { EmulatorSession } from "../core/session";
import type { GpRegisterValue, RegisterSnapshot, SessionState } from "../core/types";
import { DataViewer, type DataWidth } from "./dataViewer";

export class RegisterPanel {
  private viewers = new Map<string, DataViewer>();

  constructor(
    private container: HTMLElement,
    session: EmulatorSession,
  ) {
    session.subscribe((state) => this.render(state));
    this.render(session.getState());
  }

  private getViewer(id: string, width: DataWidth): DataViewer {
    let viewer = this.viewers.get(id);
    if (!viewer) {
      viewer = new DataViewer(width);
      this.viewers.set(id, viewer);
    }
    return viewer;
  }

  private render(state: SessionState): void {
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

    this.container.appendChild(
      this.renderSingleRow("pc", "PC", registers.pc, previousRegisters?.pc),
    );

    const gpList = document.createElement("div");
    gpList.className = "register-list";
    for (const gp of registers.gp) {
      const prevGp = previousRegisters?.gp[gp.index];
      gpList.appendChild(this.renderGpRow(gp, prevGp));
    }
    this.container.appendChild(gpList);

    this.container.appendChild(
      this.renderSingleRow("sp", "SP", registers.sp, previousRegisters?.sp),
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

  private renderGpRow(gp: GpRegisterValue, prevGp: GpRegisterValue | undefined): HTMLElement {
    const row = document.createElement("div");
    row.className = "register-row";

    const label = document.createElement("span");
    label.className = "register-label";
    label.textContent = gp.index === 30 ? "X30 / LR" : `X${gp.index}`;
    row.appendChild(label);

    const xViewer = this.getViewer(`x${gp.index}`, 8);
    xViewer.update(gp.x, prevGp !== undefined && prevGp.x !== gp.x);
    row.appendChild(xViewer.element);

    const wLabel = document.createElement("span");
    wLabel.className = "register-sublabel";
    wLabel.textContent = `W${gp.index}`;
    row.appendChild(wLabel);

    const wViewer = this.getViewer(`w${gp.index}`, 4);
    wViewer.update(BigInt(gp.w), prevGp !== undefined && prevGp.w !== gp.w);
    row.appendChild(wViewer.element);

    return row;
  }

  private renderSingleRow(
    id: string,
    label: string,
    value: bigint,
    prevValue: bigint | undefined,
  ): HTMLElement {
    const row = document.createElement("div");
    row.className = "register-row";

    const labelEl = document.createElement("span");
    labelEl.className = "register-label";
    labelEl.textContent = label;
    row.appendChild(labelEl);

    const viewer = this.getViewer(id, 8);
    viewer.update(value, prevValue !== undefined && prevValue !== value);
    row.appendChild(viewer.element);

    return row;
  }
}
