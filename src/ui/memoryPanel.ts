import type { EmulatorSession } from "../core/session";
import type { LineMapEntry, SessionState } from "../core/types";
import { DataViewer, type DataWidth } from "./dataViewer";
import { addressToHex, byteToAscii, bytesEqual, bytesToAscii, bytesToHex, bytesToLEBigInt } from "./formatting";

const VIEWER_WIDTHS = new Set<DataWidth>([1, 2, 4, 8]);
const HEX_ROW_BYTES = 8;

type MemoryViewMode = "values" | "hex";

export class MemoryPanel {
  private viewers = new Map<string, DataViewer>();
  private mode: MemoryViewMode = "values";
  private lastState: SessionState;
  private body: HTMLElement;
  private modeButtons = new Map<MemoryViewMode, HTMLButtonElement>();

  constructor(
    private container: HTMLElement,
    session: EmulatorSession,
  ) {
    const toolbar = document.createElement("div");
    toolbar.className = "memory-toolbar";
    const modes: [MemoryViewMode, string, string][] = [
      ["values", "Values", "One row per .data directive, shown as a value"],
      ["hex", "Hex", "Raw bytes, 8 per row, with ASCII"],
    ];
    for (const [mode, label, title] of modes) {
      const btn = document.createElement("button");
      btn.textContent = label;
      btn.title = title;
      btn.addEventListener("click", () => this.setMode(mode));
      this.modeButtons.set(mode, btn);
      toolbar.appendChild(btn);
    }

    this.body = document.createElement("div");
    this.body.className = "memory-body";
    this.container.append(toolbar, this.body);

    this.lastState = session.getState();
    session.subscribe((state) => {
      this.lastState = state;
      this.render();
    });
    this.updateModeButtons();
    this.render();
  }

  private setMode(mode: MemoryViewMode): void {
    if (this.mode === mode) return;
    this.mode = mode;
    this.updateModeButtons();
    this.render();
  }

  private updateModeButtons(): void {
    for (const [mode, btn] of this.modeButtons) {
      btn.classList.toggle("active", mode === this.mode);
    }
  }

  private getViewer(id: string, width: DataWidth): DataViewer {
    let viewer = this.viewers.get(id);
    if (!viewer) {
      viewer = new DataViewer(width);
      this.viewers.set(id, viewer);
    }
    return viewer;
  }

  private render(): void {
    const state = this.lastState;
    this.body.replaceChildren();
    if (!state.lineMap || state.dataBaseAddress === null || !state.dataMemory) {
      const empty = document.createElement("div");
      empty.className = "memory-panel-empty";
      empty.textContent = "No .data segment in this program.";
      this.body.appendChild(empty);
      return;
    }

    const table =
      this.mode === "values"
        ? this.renderValues(state.lineMap, state.dataBaseAddress, state.dataMemory, state.previousDataMemory)
        : this.renderHex(state.lineMap, state.dataBaseAddress, state.dataMemory, state.previousDataMemory);
    this.body.appendChild(table);
  }

  private renderValues(
    lineMap: LineMapEntry[],
    dataBaseAddress: number,
    dataMemory: Uint8Array,
    previousDataMemory: Uint8Array | null,
  ): HTMLTableElement {
    const table = document.createElement("table");
    table.className = "memory-table";
    const tbody = document.createElement("tbody");

    for (const entry of lineMap) {
      if (entry.kind !== "data") continue;

      const offset = entry.address - dataBaseAddress;
      const length = entry.bytes.length;
      const currentBytes = dataMemory.slice(offset, offset + length);
      const previousBytes = previousDataMemory?.slice(offset, offset + length) ?? null;
      const changed = previousBytes !== null && !bytesEqual(currentBytes, previousBytes);

      const row = document.createElement("tr");

      const addrCell = document.createElement("td");
      addrCell.className = "memory-address";
      addrCell.textContent = addressToHex(entry.address);
      row.appendChild(addrCell);

      const valueCell = document.createElement("td");
      valueCell.className = "memory-value";
      if (VIEWER_WIDTHS.has(length as DataWidth)) {
        const viewer = this.getViewer(`${entry.sourceLineIndex}`, length as DataWidth);
        viewer.update(bytesToLEBigInt(currentBytes), changed);
        valueCell.appendChild(viewer.element);
      } else {
        const dump = document.createElement("span");
        dump.className = `memory-dump${changed ? " changed" : ""}`;
        dump.textContent = `${bytesToHex(currentBytes)}  ${bytesToAscii(currentBytes)}`;
        valueCell.appendChild(dump);
      }
      row.appendChild(valueCell);

      const labelCell = document.createElement("td");
      labelCell.className = "memory-label";
      labelCell.textContent = entry.sourceLineText.trim();
      row.appendChild(labelCell);

      tbody.appendChild(row);
    }

    table.appendChild(tbody);
    return table;
  }

  private renderHex(
    lineMap: LineMapEntry[],
    dataBaseAddress: number,
    dataMemory: Uint8Array,
    previousDataMemory: Uint8Array | null,
  ): HTMLTableElement {
    // Which source line defined each data byte, for the hover tooltip.
    const owner: (LineMapEntry | undefined)[] = new Array(dataMemory.length);
    for (const entry of lineMap) {
      if (entry.kind !== "data") continue;
      const offset = entry.address - dataBaseAddress;
      for (let i = 0; i < entry.bytes.length && offset + i < owner.length; i++) {
        owner[offset + i] = entry;
      }
    }

    const table = document.createElement("table");
    table.className = "memory-table memory-hex";
    const tbody = document.createElement("tbody");

    // Rows are aligned to HEX_ROW_BYTES; the data base is only 4-byte aligned
    // (it directly follows code), so the first/last row may have blank slots.
    const endAddress = dataBaseAddress + dataMemory.length;
    const firstRow = dataBaseAddress - (dataBaseAddress % HEX_ROW_BYTES);
    for (let rowAddr = firstRow; rowAddr < endAddress; rowAddr += HEX_ROW_BYTES) {
      const row = document.createElement("tr");

      const addrCell = document.createElement("td");
      addrCell.className = "memory-address";
      addrCell.textContent = addressToHex(rowAddr);
      row.appendChild(addrCell);

      const hexCell = document.createElement("td");
      hexCell.className = "memory-hex-bytes";
      const asciiCell = document.createElement("td");
      asciiCell.className = "memory-hex-ascii";

      for (let i = 0; i < HEX_ROW_BYTES; i++) {
        const address = rowAddr + i;
        const offset = address - dataBaseAddress;
        const byteSpan = document.createElement("span");
        byteSpan.className = "memory-byte";
        const charSpan = document.createElement("span");
        charSpan.className = "memory-char";

        if (offset >= 0 && offset < dataMemory.length) {
          const value = dataMemory[offset];
          byteSpan.textContent = value.toString(16).padStart(2, "0");
          charSpan.textContent = byteToAscii(value);

          const changed = previousDataMemory !== null && previousDataMemory[offset] !== value;
          byteSpan.classList.toggle("changed", changed);
          charSpan.classList.toggle("changed", changed);

          const source = owner[offset]?.sourceLineText.trim();
          const title = source ? `${addressToHex(address)}  ${source}` : addressToHex(address);
          byteSpan.title = title;
          charSpan.title = title;
        } else {
          byteSpan.classList.add("empty");
          charSpan.classList.add("empty");
        }

        hexCell.appendChild(byteSpan);
        asciiCell.appendChild(charSpan);
      }

      row.append(hexCell, asciiCell);
      tbody.appendChild(row);
    }

    table.appendChild(tbody);
    return table;
  }
}
