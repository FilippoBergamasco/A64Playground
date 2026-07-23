import type { RegisterSnapshot } from "./types";

interface UnicornInstance {
  mem_map(address: number, size: number, perms: number): void;
  mem_write(address: number, data: Uint8Array): void;
  mem_read(address: number, size: number): Uint8Array;
  reg_write_i64(regId: number, value: bigint): void;
  reg_read_i64(regId: number): bigint;
  reg_write_i32(regId: number, value: number): void;
  reg_read_i32(regId: number): number;
  emu_start(begin: number, until: number, timeout: number, count: number): void;
  close(): void;
}

interface UnicornModule {
  ARCH_ARM64: number;
  MODE_ARM: number;
  PROT_ALL: number;
  ARM64_REG_PC: number;
  ARM64_REG_SP: number;
  ARM64_REG_NZCV: number;
  Unicorn: new (arch: number, mode: number) => UnicornInstance;
  [key: string]: unknown;
}

let modulePromise: Promise<UnicornModule> | null = null;

function loadUnicorn(): Promise<UnicornModule> {
  if (!modulePromise) {
    modulePromise = import("@alexaltea/unicorn-js/aarch64").then(
      (mod) => (mod.default as () => Promise<UnicornModule>)(),
    );
  }
  return modulePromise;
}

const CODE_BASE = 0x400000;
const REGION_SIZE = 0x10000; // 64 KiB: code + stack, page-aligned

function gpRegId(uc: UnicornModule, index: number): number {
  return uc[`ARM64_REG_X${index}`] as number;
}

export class Emulator {
  private uc: UnicornModule | null = null;
  private emu: UnicornInstance | null = null;
  private mc: Uint8Array = new Uint8Array(0);
  private codeByteLength = 0;

  async load(mc: Uint8Array, codeByteLength: number): Promise<void> {
    this.mc = mc;
    this.codeByteLength = codeByteLength;
    this.uc ??= await loadUnicorn();
    if (this.emu) this.emu.close();
    this.emu = new this.uc.Unicorn(this.uc.ARCH_ARM64, this.uc.MODE_ARM);
    this.emu.mem_map(CODE_BASE, REGION_SIZE, this.uc.PROT_ALL);
    this.resetState();
  }

  reset(): void {
    if (!this.emu) throw new Error("Emulator not loaded");
    this.resetState();
  }

  private resetState(): void {
    const emu = this.emu!;
    const uc = this.uc!;
    emu.mem_write(CODE_BASE, this.mc);
    for (let i = 0; i <= 30; i++) {
      emu.reg_write_i64(gpRegId(uc, i), 0n);
    }
    emu.reg_write_i32(uc.ARM64_REG_NZCV, 0);
    emu.reg_write_i64(uc.ARM64_REG_SP, BigInt(CODE_BASE + REGION_SIZE));
    emu.reg_write_i64(uc.ARM64_REG_PC, BigInt(CODE_BASE));
  }

  private endAddress(): number {
    return CODE_BASE + this.codeByteLength;
  }

  readMemory(address: number, length: number): Uint8Array {
    return this.emu!.mem_read(address, length);
  }

  step(): void {
    const emu = this.emu!;
    const uc = this.uc!;
    const pc = Number(emu.reg_read_i64(uc.ARM64_REG_PC));
    if (pc >= this.endAddress()) return;
    emu.emu_start(pc, this.endAddress(), 0, 1);
  }

  run(): void {
    const emu = this.emu!;
    emu.emu_start(CODE_BASE, this.endAddress(), 0, 0);
  }

  isHalted(): boolean {
    const emu = this.emu!;
    const uc = this.uc!;
    return Number(emu.reg_read_i64(uc.ARM64_REG_PC)) >= this.endAddress();
  }

  readRegisters(): RegisterSnapshot {
    const emu = this.emu!;
    const uc = this.uc!;
    const gp = [];
    for (let i = 0; i <= 30; i++) {
      const x = emu.reg_read_i64(gpRegId(uc, i));
      gp.push({ index: i, x, w: Number(x & 0xffffffffn) });
    }
    const nzcvBits = emu.reg_read_i32(uc.ARM64_REG_NZCV) >>> 0;
    return {
      nzcv: {
        n: (nzcvBits & 0x80000000) !== 0,
        z: (nzcvBits & 0x40000000) !== 0,
        c: (nzcvBits & 0x20000000) !== 0,
        v: (nzcvBits & 0x10000000) !== 0,
      },
      gp,
      sp: emu.reg_read_i64(uc.ARM64_REG_SP),
      pc: emu.reg_read_i64(uc.ARM64_REG_PC),
    };
  }

  close(): void {
    this.emu?.close();
    this.emu = null;
  }
}

export { CODE_BASE };
