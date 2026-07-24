import type { EmulatorSession } from "../core/session";
import type { SessionState } from "../core/types";
import { DataViewer, type DataWidth } from "./dataViewer";
import { addressToHex, bytesEqual, bytesToAscii, bytesToHex, bytesToLEBigInt } from "./formatting";

const VIEWER_WIDTHS = new Set<DataWidth>([1, 2, 4, 8]);

export class MemoryPanel {
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
    if (!state.lineMap || state.dataBaseAddress === null || !state.dataMemory) {
      const empty = document.createElement("div");
      empty.className = "memory-panel-empty";
      empty.textContent = "No .data segment in this program.";
      this.container.appendChild(empty);
      return;
    }

    const { dataBaseAddress, dataMemory, previousDataMemory } = state;
    const table = document.createElement("table");
    table.className = "memory-table";
    const tbody = document.createElement("tbody");

    for (const entry of state.lineMap) {
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
    this.container.appendChild(table);
  }
}
