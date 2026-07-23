import type { EmulatorSession } from "../core/session";
import type { SessionState } from "../core/types";
import { addressToHex, bytesToHex } from "./formatting";

export class DisassemblyPanel {
  constructor(
    private container: HTMLElement,
    session: EmulatorSession,
  ) {
    session.subscribe((state) => this.render(state));
    this.render(session.getState());
  }

  private render(state: SessionState): void {
    this.container.replaceChildren();
    if (!state.lineMap) {
      const empty = document.createElement("div");
      empty.className = "disassembly-empty";
      empty.textContent = "Assemble a program to see the disassembly listing.";
      this.container.appendChild(empty);
      return;
    }

    const table = document.createElement("table");
    table.className = "disassembly-table";
    const tbody = document.createElement("tbody");
    for (const entry of state.lineMap) {
      if (entry.kind !== "code") continue;
      const row = document.createElement("tr");
      if (entry.address === state.currentPc) row.className = "current-pc";

      const addrCell = document.createElement("td");
      addrCell.className = "disassembly-address";
      addrCell.textContent = addressToHex(entry.address);
      row.appendChild(addrCell);

      const bytesCell = document.createElement("td");
      bytesCell.className = "disassembly-bytes";
      bytesCell.textContent = bytesToHex(entry.bytes);
      row.appendChild(bytesCell);

      const mnemonicCell = document.createElement("td");
      mnemonicCell.className = "disassembly-mnemonic";
      mnemonicCell.textContent = entry.sourceLineText.trim();
      row.appendChild(mnemonicCell);

      tbody.appendChild(row);
    }
    table.appendChild(tbody);
    this.container.appendChild(table);
  }
}
