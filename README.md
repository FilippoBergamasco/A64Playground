# A64Playground

A64 Playground is an educational tool for writing, assembling and stepping
through AArch64 (A64) assembly programs. It is **not** meant to
be a 100% accurate emulation of the A64 instruction set: use it to learn,
not as a reference for exact hardware behavior.

[Try it now](https://www.dais.unive.it/~bergamasco/A64Playground/)

## Technologies

- [Keystone](https://github.com/keystone-engine/keystone): assembles source code into machine code
- [Unicorn engine](https://www.unicorn-engine.org/): emulates instruction execution
- [Code mirror](https://codemirror.net/): source code editor

There is no disassembler: the disassembly view is derived from the
assembler's own output. There is no linker and no section support: the
`.data` section is simulated by placing data right after the code
in a single flat address space.

## Credits
Developed by Filippo Bergamasco with the assistance of Claude (Anthropic),
an AI model, used through [Claude Code](https://claude.com/claude-code).

## Privacy
The application runs **entirely in your browser**. No data is sent to or
collected by any server: your programs never leave your machine, and there are
no accounts, cookies, analytics or tracking.  Shared links store the program in
the URL fragment (the part after `#`), which browsers never send to the server.

## License
```
Copyright (C) 2026 Ca' Foscari University of Venice
                                                                                
Code contained in this repository is free software: you can redistribute it
and/or modify it under the terms of the GNU General Public License as published
by the Free Software Foundation, either version 3 of the License, or (at your
option) any later version.

These programs are distributed in the hope that they will be useful, but WITHOUT
ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS
FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.

You should have received a copy of the GNU General Public License along with
this program. If not, see <https://www.gnu.org/licenses/>.
```