import { assemble } from "./assembler";
import { Emulator, CODE_BASE } from "./emulator";
import { buildLineMap, AddressMapMismatchError } from "./addressMap";
import type { SessionState } from "./types";

type Listener = (state: Readonly<SessionState>) => void;

export class EmulatorSession {
  private state: SessionState;
  private listeners = new Set<Listener>();
  private emulator = new Emulator();

  constructor(initialSource: string) {
    this.state = {
      status: "unassembled",
      sourceText: initialSource,
      lineMap: null,
      assembleError: null,
      registers: null,
      previousRegisters: null,
      currentPc: null,
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

  async assemble(): Promise<void> {
    try {
      const { mc, failed } = await assemble(this.state.sourceText, CODE_BASE);
      if (failed) {
        this.setState({ status: "error", assembleError: "Assembly failed — check syntax", lineMap: null });
        return;
      }
      const lineMap = buildLineMap(this.state.sourceText, mc, CODE_BASE);
      await this.emulator.load(mc);
      const registers = this.emulator.readRegisters();
      this.setState({
        status: "assembled",
        lineMap,
        assembleError: null,
        registers,
        previousRegisters: null,
        currentPc: Number(registers.pc),
      });
    } catch (err) {
      const message = err instanceof AddressMapMismatchError ? err.message : String(err);
      this.setState({ status: "error", assembleError: message, lineMap: null });
    }
  }

  step(): void {
    if (this.state.status !== "assembled") return;
    const previousRegisters = this.state.registers;
    this.emulator.step();
    const registers = this.emulator.readRegisters();
    this.setState({
      status: this.emulator.isHalted() ? "halted" : "assembled",
      registers,
      previousRegisters,
      currentPc: Number(registers.pc),
    });
  }

  run(): void {
    if (this.state.status !== "assembled") return;
    const previousRegisters = this.state.registers;
    this.emulator.run();
    const registers = this.emulator.readRegisters();
    this.setState({
      status: "halted",
      registers,
      previousRegisters,
      currentPc: Number(registers.pc),
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
    });
  }
}
