# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Current State

The v1 slice described below is implemented. Commands:

- `npm install` — install dependencies
- `npm run dev` — start the Vite dev server
- `npm run build` — type-check (`tsc -b`) and produce a static production build in `dist/`
- `npm run preview` — serve the production build locally

No test suite exists yet; verification is manual (see the end-to-end flow below).

## Architecture

**A64 Playground** is a browser-based, no-backend educational simulator for A64 (AArch64) assembly: students write a program, assemble it, and step through execution while inspecting registers, a disassembly listing, and an optional data segment, entirely client-side.

### Tech Stack

- 100% frontend, static hosting only — no server, no API calls
- Vanilla TypeScript + direct DOM manipulation — no UI framework
- Vite build tooling
- **CodeMirror 6** — source editor, with a minimal hand-rolled `StreamLanguage` (`src/ui/a64Language.ts`) for syntax highlighting: currently only distinguishes `//` line comments from code, no keyword/register/immediate awareness yet
- **`@alexaltea/keystone-js`** (WASM) — assembles A64 source into machine code bytes
- **`@alexaltea/unicorn-js/aarch64`** (WASM, per-arch subpath) — emulates execution; exposes register/memory read-write
- No disassembler library — the "disassembly view" is derived from the assembler's own output (see below), not a real disassembler
- No linker/section support — Keystone assembles the whole program in a single flat address space (no relocations); its own `.data`/`.text`/`.section` directives are unusable (bare `.data`/`.text` crash the WASM build, `.section .data` is rejected by its parser), so the data segment is an app-level convention layered on top, not a real ELF section

### Module layout

- `src/core/` — assembler/emulator/state, no DOM references:
  - `assembler.ts` — lazy-loads Keystone WASM, wraps `encoder.asm(source, baseAddress)`. Keystone ships a separate `.wasm` file that must be explicitly located via `locateFile` + a Vite `?url` import (its default `scriptDirectory` auto-detection breaks once bundled). Also rewrites GNU as's `.dword` (an 8-byte directive alias Keystone doesn't recognize — it only knows `.xword`) to `.xword` before assembling; the rewrite only fires in directive position (start of line / after a label), so occurrences inside strings or comments are left alone. This runs inside `assemble()` itself so both the whole-program call and `addressMap.ts`'s per-line data measurement calls (see below) get it automatically.
  - `emulator.ts` — lazy-loads Unicorn WASM (wasm is embedded inline in the JS, no asset config needed), owns the `Unicorn` instance lifecycle. `SP` is its own real Unicorn register (`ARM64_REG_SP`), **not** aliased to `X28`. `Step` = `emu_start(pc, end, 0, 1)` (count=1 executes exactly one instruction). Execution's "end" boundary is the end of the **code** region, not the end of the whole assembled buffer — data bytes are `mem_write`'d into the same mapped region right after code (so `ldr`/`str` can address them), but PC reaching them counts as halted rather than attempting to execute them. `readMemory()` wraps Unicorn's `mem_read` for live inspection of (possibly-mutated) data.
  - `dataSegment.ts` — parses the optional `.data` marker convention (see below): validates there's at most one `.data` line and that everything after it looks like a directive, then blanks that line out (preserving line indices) before the source is handed to Keystone, since Keystone can't see a real `.data` directive.
  - `addressMap.ts` — maps source lines to addresses/bytes without a disassembler. The code region (before `.data`, or the whole program if there's no `.data`) is fixed-width 4 bytes/instruction: after assembling once (for correct label/branch resolution), each real-instruction line is zipped to the next 4-byte slice of the output in order. A pseudo-instruction that expands to >1 real instruction (e.g. a large 64-bit `mov` immediate) breaks this and is surfaced as an explicit error — use explicit `movz`/`movk` sequences instead. The data region (after `.data`) is variable-width per line, so instead of a fixed-width assumption, each data-directive line is re-assembled **on its own** (via `assembler.ts`) purely to measure its byte length at the correct running address (needed for `.align` to pad correctly) — the actual bytes shown/loaded are still sliced from the one whole-program assembly. This only works because **data directives may not reference labels defined elsewhere** (only literal numeric/string operands, though a line may define its own label, e.g. `msg: .asciz "hi"`) — an isolated line with an external label reference fails to assemble and surfaces as an explicit error. Every `LineMapEntry` is tagged `kind: "code" | "data"` so panels can filter without duplicating the array.
  - `session.ts` — `EmulatorSession`: single source of truth, plain pub/sub (`subscribe`/notify on every mutation), no framework store. `Reset` rewinds registers/memory to the initial state but **keeps the last successful assembly loaded** — Step/Run work immediately without re-assembling. Also snapshots the current data-segment bytes (`dataMemory`/`previousDataMemory` in `SessionState`) on every mutation, since data — unlike code — can be written to by the running program and must be re-read live from Unicorn, not just shown from the initial assembly.
- `src/ui/` — DOM rendering only; panels subscribe to `EmulatorSession` and fully re-render on each notification, never call Keystone/Unicorn directly:
  - `editorPanel.ts` — CodeMirror 6 + current-line decoration (CM6 `StateEffect`/`StateField`) driven by the line-map lookup for the current PC
  - `a64Language.ts` — minimal `StreamLanguage` syntax highlighting (`//` comments vs. everything else)
  - `registerPanel.ts` — NZCV pinned at top; one row per GP register showing X<i>/W<i> together (W is the low 32 bits of X, derived client-side, not separately read); `X30` labeled "LR"; `SP` and `PC` each their own row, PC last. Per-row (not global) hex/decimal/signed toggle, held as local UI state, not in `SessionState`. Diff-highlighting compares against the previous snapshot.
  - `disassemblyPanel.ts` — full-program address/bytes/mnemonic table (code entries only), current-PC row highlighted
  - `memoryPanel.ts` — same address/bytes/label table shape as `disassemblyPanel.ts`, but for data entries: renders **current** bytes read live from `SessionState.dataMemory` (not the static bytes captured at assemble time), reusing `DataViewer`'s hex/udec/sdec toggle for fixed 1/2/4/8-byte entries and a hex+ASCII dump for variable-length ones (strings, byte arrays, `.space`/`.zero`), diff-highlighted against `previousDataMemory`
  - `controls.ts` — Assemble / Step / Run / Reset buttons, enable/disable by session status

### The `.data` segment convention

Single editor, single flat address space (no linker) — so the data segment is just a source-level convention, not a real ELF section:

- A program may contain **at most one** bare `.data` line, and it must be the **last** thing in the program — everything from that line to EOF is the data region, everything before it is code.
- Everything after `.data` must look like a directive (optional `label:` prefix + a token starting with `.`) — e.g. `.byte`, `.hword`/`.word`/`.xword`, `.ascii`/`.asciz`/`.string`, `.space`/`.zero`, `.align`. Which directives Keystone actually accepts isn't hard-coded anywhere — it's whatever Keystone's own assembler supports.
- Data directive operands must be literal (numeric/string) — they must **not** reference a label defined elsewhere in the program (a line may still define its own label, e.g. `msg: .asciz "hi"`). Code is unaffected by this and can freely reference data labels (`adr x0, msg`, etc.).
- Programs without a `.data` line behave exactly as before this feature — fully backward compatible.

### Conventions

- No network calls, no backend; no localStorage persistence in v1
- Keep assembler and emulator logic isolated in `core/`, separate from `ui/`
- UI state is a pure reflection of `EmulatorSession` state — panels don't duplicate it

### Out of Scope (v1)

- Multi-file programs / linking
- OS or syscall emulation
- Breakpoints/watchpoints, run-to-cursor, pause-mid-run
- Full SIMD/FP instruction coverage beyond teaching needs
- localStorage persistence
- AArch64-aware syntax highlighting (generic `gas` mode only)
