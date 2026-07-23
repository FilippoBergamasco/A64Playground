interface KeystoneModule {
  ARCH_ARM64: number;
  MODE_LITTLE_ENDIAN: number;
  Keystone: new (arch: number, mode: number) => KeystoneEncoder;
}

interface KeystoneEncoder {
  asm(assembly: string, address: number): { mc: Uint8Array; count: number; failed: boolean };
  errno(): number;
  close(): void;
}

export interface AssembleResult {
  mc: Uint8Array;
  failed: boolean;
}

let modulePromise: Promise<KeystoneModule> | null = null;

function loadKeystone(): Promise<KeystoneModule> {
  if (!modulePromise) {
    modulePromise = (async () => {
      const [{ default: MKeystone }, { default: keystoneWasmUrl }] = await Promise.all([
        import("@alexaltea/keystone-js"),
        import("@alexaltea/keystone-js/dist/keystone.wasm?url"),
      ]);
      return MKeystone({
        locateFile: (path: string) => (path.endsWith(".wasm") ? keystoneWasmUrl : path),
      });
    })();
  }
  return modulePromise;
}

export async function assemble(source: string, baseAddress: number): Promise<AssembleResult> {
  const ks = await loadKeystone();
  const encoder = new ks.Keystone(ks.ARCH_ARM64, ks.MODE_LITTLE_ENDIAN);
  try {
    const result = encoder.asm(source, baseAddress);
    return { mc: result.mc, failed: result.failed };
  } finally {
    encoder.close();
  }
}
