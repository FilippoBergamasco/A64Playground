export interface LineMapEntry {
  sourceLineIndex: number;
  sourceLineText: string;
  address: number;
  bytes: Uint8Array;
}

export interface GpRegisterValue {
  index: number;
  x: bigint;
  w: number;
}

export interface RegisterSnapshot {
  nzcv: { n: boolean; z: boolean; c: boolean; v: boolean };
  gp: GpRegisterValue[];
  sp: bigint;
  pc: bigint;
}

export type SessionStatus =
  | "unassembled"
  | "assembled"
  | "halted"
  | "error";

export interface SessionState {
  status: SessionStatus;
  sourceText: string;
  lineMap: LineMapEntry[] | null;
  assembleError: string | null;
  registers: RegisterSnapshot | null;
  previousRegisters: RegisterSnapshot | null;
  currentPc: number | null;
}
