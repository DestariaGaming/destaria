import type { MeshDescriptor } from "@destaria/package-format";

// Used to verify Assets in CLI
export const DESTARIA_ASSET_CLASS_MARKER = "__destariaAssetClass";
export type AssetClassMarker = true;

export abstract class Asset {
  static readonly [DESTARIA_ASSET_CLASS_MARKER]: AssetClassMarker = true;
  static mesh?: MeshDescriptor;
}
