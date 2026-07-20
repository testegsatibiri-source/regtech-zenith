// H5 — Typed SDK errors.
export class PackNotFound extends Error {
  constructor(code: string) {
    super(`Country pack not installed: ${code}`);
    this.name = "PackNotFound";
  }
}

export class IncompatibleCoreVersion extends Error {
  constructor(pack: string, requires: string, actual: string) {
    super(`Pack ${pack} requires core ${requires}, running ${actual}`);
    this.name = "IncompatibleCoreVersion";
  }
}

export class CapabilityUnsupported extends Error {
  constructor(pack: string, capability: string) {
    super(`Pack ${pack} does not support capability "${capability}"`);
    this.name = "CapabilityUnsupported";
  }
}
