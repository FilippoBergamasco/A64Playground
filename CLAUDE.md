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

**A64 Playground** is a browser-based, no-backend educational simulator for A64 (AArch64) assembly: students write a program, assemble it, and step through execution while inspecting registers and a disassembly listing, entirely client-side.

### Tech Stack

- 100% frontend, static hosting only — no server, no API calls
- Vanilla TypeScript + direct DOM manipulation — no UI framework
- Vite build tooling
- **CodeMirror 6** — source editor, with a minimal hand-rolled `StreamLanguage` (`src/ui/a64Language.ts`) for syntax highlighting: currently only distinguishes `//` line comments from code, no keyword/register/immediate awareness yet
- **`@alexaltea/keystone-js`** (WASM) — assembles A64 source into machine code bytes
- **`@alexaltea/unicorn-js/aarch64`** (WASM, per-arch subpath) — emulates execution; exposes register/memory read-write
- No disassembler library — the "disassembly view" is derived from the assembler's own output (see below), not a real disassembler

### Module layout

- `src/core/` — assembler/emulator/state, no DOM references:
  - `assembler.ts` — lazy-loads Keystone WASM, wraps `encoder.asm(source, baseAddress)`. Keystone ships a separate `.wasm` file that must be explicitly located via `locateFile` + a Vite `?url` import (its default `scriptDirectory` auto-detection breaks once bundled).
  - `emulator.ts` — lazy-loads Unicorn WASM (wasm is embedded inline in the JS, no asset config needed), owns the `Unicorn` instance lifecycle. `SP` is its own real Unicorn register (`ARM64_REG_SP`), **not** aliased to `X28`. `Step` = `emu_start(pc, end, 0, 1)` (count=1 executes exactly one instruction).
  - `addressMap.ts` — maps source lines to addresses/bytes without a disassembler: AArch64 is fixed-width 4 bytes/instruction, so after assembling the whole program once (for correct label/branch resolution), each real-instruction source line is zipped to the next 4-byte slice of the output in order. A pseudo-instruction that expands to >1 real instruction (e.g. a large 64-bit `mov` immediate) breaks this and is surfaced as an explicit error — use explicit `movz`/`movk` sequences instead.
  - `session.ts` — `EmulatorSession`: single source of truth, plain pub/sub (`subscribe`/notify on every mutation), no framework store. `Reset` rewinds registers/memory to the initial state but **keeps the last successful assembly loaded** — Step/Run work immediately without re-assembling.
- `src/ui/` — DOM rendering only; panels subscribe to `EmulatorSession` and fully re-render on each notification, never call Keystone/Unicorn directly:
  - `editorPanel.ts` — CodeMirror 6 + current-line decoration (CM6 `StateEffect`/`StateField`) driven by the line-map lookup for the current PC
  - `a64Language.ts` — minimal `StreamLanguage` syntax highlighting (`//` comments vs. everything else)
  - `registerPanel.ts` — NZCV pinned at top; one row per GP register showing X<i>/W<i> together (W is the low 32 bits of X, derived client-side, not separately read); `X30` labeled "LR"; `SP` and `PC` each their own row, PC last. Per-row (not global) hex/decimal/signed toggle, held as local UI state, not in `SessionState`. Diff-highlighting compares against the previous snapshot.
  - `disassemblyPanel.ts` — full-program address/bytes/mnemonic table, current-PC row highlighted
  - `controls.ts` — Assemble / Step / Run / Reset buttons, enable/disable by session status

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
