const ABOUT_HTML = `
  <h2>A64 Playground &mdash; v. 1.0.0</h2>
  <p>&copy; 2026 Ca' Foscari University of Venice</p>

  <h3>Purpose</h3>
  <p>
    A64 Playground is an educational tool for writing, assembling and stepping
    through AArch64 (A64) assembly programs. It is <strong>not</strong> meant to
    be a 100% accurate emulation of the A64 instruction set: use it to learn,
    not as a reference for exact hardware behavior.
  </p>

  <h3>Technologies</h3>
  <ul>
    <li><a href="https://github.com/keystone-engine/keystone" target="_blank" rel="noopener noreferrer">Keystone</a> &mdash; assembles source code into machine code</li>
    <li><a href="https://www.unicorn-engine.org/" target="_blank" rel="noopener noreferrer">Unicorn</a> &mdash; emulates instruction execution</li>
    <li><a href="https://codemirror.net/" target="_blank" rel="noopener noreferrer">CodeMirror</a> &mdash; source code editor</li>
  </ul>
  <p>
    There is no disassembler: the disassembly view is derived from the
    assembler's own output. There is no linker and no section support: the
    <code>.data</code> section is simulated by placing data right after the code
    in a single flat address space.
  </p>

  <h3>Credits</h3>
  <p>
    Developed by Filippo Bergamasco with the assistance of Claude (Anthropic),
    an AI model, used through
    <a href="https://claude.com/claude-code" target="_blank" rel="noopener noreferrer">Claude Code</a>.
  </p>

  <h3>Privacy</h3>
  <p>
    The application runs <strong>entirely in your browser</strong>. No data is
    sent to or collected by any server: your programs never leave your machine,
    and there are no accounts, cookies, analytics or tracking. 
    Shared links store the program in the URL fragment
    (the part after <code>#</code>), which browsers never send to the server.
  </p>

  <h3>License</h3>
  <p>
  Copyright (C) 2026 Ca' Foscari University of Venice
  </p>
  <p>                                                                              
  A64 Playground is free software: you can redistribute it and/or modify it 
  under the terms of the GNU General Public License as published by the Free Software
  Foundation, either version 3 of the License, or (at your option) any later version.
  </p>
  <p>
  <a href="https://github.com/FilippoBergamasco/A64Playground" target="_blank" rel="noopener noreferrer">Official GitHub repository</a>
  </p>
`;

export class AboutDialog {
  private dialog: HTMLDialogElement;

  constructor() {
    this.dialog = document.createElement("dialog");
    this.dialog.className = "about-dialog";

    // The dialog itself has no padding, so a click whose target is the dialog
    // element can only have landed on the backdrop.
    const content = document.createElement("div");
    content.className = "about-content";
    content.innerHTML = ABOUT_HTML;

    const closeBtn = document.createElement("button");
    closeBtn.className = "about-close";
    closeBtn.textContent = "Close";
    closeBtn.addEventListener("click", () => this.dialog.close());

    this.dialog.addEventListener("click", (e) => {
      if (e.target === this.dialog) this.dialog.close();
    });

    content.append(closeBtn);
    this.dialog.append(content);
    document.body.append(this.dialog);
  }

  open(): void {
    this.dialog.showModal();
  }
}
