import type { JsonObject, MeshDescriptor } from "@destaria/package-format";
import { validateJsonValue } from "@destaria/package-format";

const DESTARIA_ASSET_DEFINITION_MARKER = "__destariaAssetDefinition";

type EmptyJsonObject = Record<never, never>;

type DefineAssetOptions<TProps extends JsonObject> = keyof TProps extends never
  ? {
      defaultProps?: TProps;
      mesh(props: TProps): MeshDescriptor;
    }
  : {
      defaultProps: TProps;
      mesh(props: TProps): MeshDescriptor;
    };

/**
 * A reusable authored asset definition.
 *
 * Asset definitions are source-side tokens discovered by the CLI. They are not
 * runtime entities and do not contain renderer objects. The CLI calls `mesh`
 * with effective props to produce serializable package-format data.
 */
export type AssetDefinition<TProps extends JsonObject = EmptyJsonObject> = {
  readonly [DESTARIA_ASSET_DEFINITION_MARKER]: true;

  /**
   * Default JSON-safe props for this asset.
   *
   * Prop-less assets normalize this to `{}`.
   */
  readonly defaultProps: TProps;

  /**
   * Produces mesh package data for the given effective props.
   *
   * This must stay declarative: return package-format descriptors, not runtime
   * geometry, buffers, renderer objects, or WebGPU/WebGL state.
   */
  readonly mesh: (props: TProps) => MeshDescriptor;
};

/**
 * Defines a reusable asset for the Destaria authoring API.
 *
 * `TProps` defaults to `{}` for prop-less assets, so `defaultProps` may be
 * omitted in that case. Prop-based assets must provide JSON-safe `defaultProps`.
 *
 * @example Prop-less asset
 * ```ts
 * export const Rock = defineAsset({
 *   mesh() {
 *     return Mesh.cube();
 *   },
 * });
 * ```
 *
 * @example Prop-based asset
 * ```ts
 * type CrateProps = {
 *   size: "small" | "large";
 * };
 *
 * export const Crate = defineAsset<CrateProps>({
 *   defaultProps: { size: "small" },
 *   mesh(props) {
 *     return props.size === "large" ? Mesh.cube({ size: 4 }) : Mesh.cube();
 *   },
 * });
 * ```
 */
export function defineAsset<TProps extends JsonObject = EmptyJsonObject>(
  options: DefineAssetOptions<TProps>,
): AssetDefinition<TProps> {
  const defaultProps = ("defaultProps" in options ? options.defaultProps : {}) as TProps;
  validateJsonValue(defaultProps, "defaultProps");

  return Object.freeze({
    [DESTARIA_ASSET_DEFINITION_MARKER]: true,
    defaultProps,
    mesh: options.mesh,
  });
}

/**
 * Returns whether a value is an authored asset definition token.
 *
 * The guard checks the marker shape instead of package instance identity so the
 * CLI can recognize definitions loaded through project-local SDK shims.
 */
export function isAssetDefinition(value: unknown): value is AssetDefinition<JsonObject> {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as Partial<Record<typeof DESTARIA_ASSET_DEFINITION_MARKER, unknown>>)[
      DESTARIA_ASSET_DEFINITION_MARKER
    ] === true &&
    typeof (value as Partial<AssetDefinition<JsonObject>>).mesh === "function"
  );
}
