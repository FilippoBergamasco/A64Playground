import { assemble } from "./assembler";
import { Emulator, CODE_BASE } from "./emulator";
import { buildLineMap, AddressMapMismatchError, DataDirectiveError, DataMapMismatchError } from "./addressMap";
import { splitDataSegment, DataSegmentError } from "./dataSegment";
import type { SessionState } from "./types";

type Listener = (state: Readonly<SessionState>) => void;

export class EmulatorSession {
  private state: SessionState;
  private listeners = new Set<Listener>();
  private emulator = new Emulator();
  private dataBaseAddress: number | null = null;
  private dataLength = 0;

  constructor(initialSource: string) {
    this.state = {
      status: "unassembled",
      sourceText: initialSource,
      lineMap: null,
      assembleError: null,
      registers: null,
      previousRegisters: null,
      currentPc: null,
      dataBaseAddress: null,
      dataMemory: null,
      previousDataMemory: null,
    };
  }

  getState(): Readonly<SessionState> {
    return this.state;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private setState(patch: Partial<SessionState>): void {
    this.state = { ...this.state, ...patch };
    for (const listener of this.listeners) listener(this.state);
  }

  setSourceText(text: string): void {
    this.setState({ sourceText: text });
  }

  private readDataMemory(): Uint8Array | null {
    if (this.dataBaseAddress === null || this.dataLength === 0) return null;
    return this.emulator.readMemory(this.dataBaseAddress, this.dataLength);
  }

  async assemble(): Promise<void> {
    try {
      const { processedText, dataMarkerLineIndex } = splitDataSegment(this.state.sourceText);
      const { mc, failed } = await assemble(processedText, CODE_BASE);
      if (failed) {
        this.setState({ status: "error", assembleError: "Assembly failed — check syntax", lineMap: null });
        return;
      }
      const lineMap = await buildLineMap(this.state.sourceText, mc, CODE_BASE, dataMarkerLineIndex);
      const codeByteLength = lineMap.filter((entry) => entry.kind === "code").length * 4;
      this.dataBaseAddress = codeByteLength < mc.length ? CODE_BASE + codeByteLength : null;
      this.dataLength = mc.length - codeByteLength;

      await this.emulator.load(mc, codeByteLength);
      const registers = this.emulator.readRegisters();
      this.setState({
        status: "assembled",
        lineMap,
        assembleError: null,
        registers,
        previousRegisters: null,
        currentPc: Number(registers.pc),
        dataBaseAddress: this.dataBaseAddress,
        dataMemory: this.readDataMemory(),
        previousDataMemory: null,
      });
    } catch (err) {
      const isKnownError =
        err instanceof AddressMapMismatchError ||
        err instanceof DataDirectiveError ||
        err instanceof DataMapMismatchError ||
        err instanceof DataSegmentError;
      const message = isKnownError ? err.message : String(err);
      this.setState({ status: "error", assembleError: message, lineMap: null, dataBaseAddress: null, dataMemory: null });
    }
  }

  step(): void {
    if (this.state.status !== "assembled") return;
    const previousRegisters = this.state.registers;
    const previousDataMemory = this.state.dataMemory;
    this.emulator.step();
    const registers = this.emulator.readRegisters();
    this.setState({
      status: this.emulator.isHalted() ? "halted" : "assembled",
      registers,
      previousRegisters,
      currentPc: Number(registers.pc),
      dataMemory: this.readDataMemory(),
      previousDataMemory,
    });
  }

  run(): void {
    if (this.state.status !== "assembled") return;
    const previousRegisters = this.state.registers;
    const previousDataMemory = this.state.dataMemory;
    this.emulator.run();
    const registers = this.emulator.readRegisters();
    this.setState({
      status: "halted",
      registers,
      previousRegisters,
      currentPc: Number(registers.pc),
      dataMemory: this.readDataMemory(),
      previousDataMemory,
    });
  }

  reset(): void {
    if (this.state.lineMap === null) return;
    this.emulator.reset();
    const registers = this.emulator.readRegisters();
    this.setState({
      status: "assembled",
      registers,
      previousRegisters: null,
      currentPc: Number(registers.pc),
      dataMemory: this.readDataMemory(),
      previousDataMemory: null,
    });
  }
}
