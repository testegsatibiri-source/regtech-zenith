// H11-Freeze — Country Pack Interface contract version.
// Bumping this is a breaking change. See docs/governance/country-pack-interface-v1.md.
// Packs advertise their target interface via manifest.interfaceVersion; the
// validator rejects packs outside the supported range.

export const PACK_INTERFACE_VERSION = "1.0.0";
/** Semver range of pack interface versions this Core supports. */
export const SUPPORTED_PACK_INTERFACE_RANGE = "^1.0.0";
