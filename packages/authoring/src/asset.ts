import type { MeshDescriptor } from "@destaria/package-format";

const DESTARIA_ASSET_DEFINITION_MARKER = "__destariaAssetDefinition";

/**
 * A JSON scalar value that can be preserved into authored package data.
 */
export type JsonPrimitive = string | number | boolean | null;

/**
 * JSON-safe object props for asset definitions.
 *
 * Asset props are authored in TypeScript, compiled by the CLI, and may be
 * preserved for runtime usage. Functions, class instances, symbols, undefined,
 * NaN, and Infinity are intentionally excluded.
 */
export type JsonObject = { readonly [key: string]: JsonValue };

type EmptyJsonObject = Record<never, never>;

/**
 * Any JSON-safe value that can cross the authoring-to-runtime boundary.
 */
export type JsonValue = JsonPrimitive | JsonObject | JsonValue[];

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

function validateJsonValue(value: unknown, path: string): asserts value is JsonValue {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean" ||
    (typeof value === "number" && Number.isFinite(value))
  ) {
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => validateJsonValue(item, `${path}[${index}]`));
    return;
  }

  if (isPlainJsonObject(value)) {
    for (const [key, item] of Object.entries(value)) {
      validateJsonValue(item, `${path}.${key}`);
    }
    return;
  }

  throw new TypeError(`${path} must be JSON-safe.`);
}

function isPlainJsonObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}
