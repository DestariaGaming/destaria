import type { JsonObject, JsonValue } from "@destaria/package-format";
import { cloneJsonValue, isPlainJsonObject, validateJsonValue } from "@destaria/package-format";

import type { AssetDefinition } from "./asset";

const DESTARIA_APPEND_DEFAULT_MARKER = "__destariaAppendDefault";

type EmptyObjectOverride = Record<string, never>;

type PropsOverride<TProps extends JsonObject> = keyof TProps extends never
  ? EmptyObjectOverride
  : DeepPropsOverride<TProps>;

type DeepPropsOverride<TValue> = TValue extends readonly (infer TItem)[]
  ? TValue | AppendDefault<TItem & JsonValue>
  : TValue extends JsonObject
    ? { [TKey in keyof TValue]?: DeepPropsOverride<TValue[TKey]> }
    : TValue;

type AppendDefault<TItem extends JsonValue> = {
  readonly [DESTARIA_APPEND_DEFAULT_MARKER]: true;
  readonly values: TItem[];
};

type EntityPosition = {
  readonly x: number;
  readonly y: number;
  readonly z: number;
};

type EntityTransform = {
  readonly position: EntityPosition;
};

/**
 * Authoring-side snapshot for an entity placement.
 *
 * The descriptor preserves the source asset definition token and effective
 * JSON-safe props. CLI scene compilation resolves the token later; descriptors
 * do not contain package asset IDs or runtime entity objects.
 */
export type EntityDescriptor<TProps extends JsonObject = JsonObject> = {
  readonly assetDefinition: AssetDefinition<TProps>;
  readonly props: TProps;
  readonly transform: EntityTransform;
};

export type EntityBuilderApi<TProps extends JsonObject> = {
  /**
   * Merges typed prop overrides into the entity's effective props.
   *
   * Nested objects merge recursively, arrays replace defaults, and
   * `appendDefault([...])` appends values to an existing array prop.
   */
  with(propsOverride: PropsOverride<TProps>): EntityBuilderApi<TProps>;

  /**
   * Sets the entity position transform.
   *
   * @throws TypeError when any coordinate is not a finite number.
   */
  at(x: number, y: number, z: number): EntityBuilderApi<TProps>;

  /**
   * Returns an authoring snapshot for later CLI scene compilation.
   *
   * @throws TypeError when effective props are not JSON-safe.
   */
  toDescriptor(): EntityDescriptor<TProps>;
};

/**
 * Creates an array merge helper for `.with(...)` prop overrides.
 *
 * `appendDefault(values)` appends values to the current default/effective array
 * prop instead of replacing the array.
 */
export function appendDefault<TItem extends JsonValue>(
  values: readonly TItem[],
): AppendDefault<TItem> {
  rejectUndefinedValue(values, "appendDefault values");
  validateJsonValue(values, "appendDefault values");

  return Object.freeze({
    // The marker lets `.with()` distinguish "append these array items" from
    // the normal array behavior, which is replacing the default array.
    [DESTARIA_APPEND_DEFAULT_MARKER]: true,
    values: cloneJsonValue([...values]),
  });
}

/**
 * Creates an entity placement builder for an authored asset definition.
 */
export function entity<TProps extends JsonObject>(
  assetDefinition: AssetDefinition<TProps>,
): EntityBuilderApi<TProps> {
  return new EntityBuilder(assetDefinition);
}

class EntityBuilder<TProps extends JsonObject> implements EntityBuilderApi<TProps> {
  readonly #assetDefinition: AssetDefinition<TProps>;
  readonly #defaultProps: TProps;
  #props: TProps;
  #position: EntityPosition = { x: 0, y: 0, z: 0 };

  constructor(assetDefinition: AssetDefinition<TProps>) {
    this.#assetDefinition = assetDefinition;
    this.#defaultProps = cloneJsonValue(assetDefinition.defaultProps) as TProps;
    this.#props = cloneJsonValue(this.#defaultProps) as TProps;
  }

  with(propsOverride: PropsOverride<TProps>): EntityBuilderApi<TProps> {
    rejectUndefinedValue(propsOverride, "propsOverride");
    this.#props = mergeJsonObjects(
      this.#defaultProps,
      this.#props,
      propsOverride,
      "propsOverride",
    ) as TProps;
    return this;
  }

  at(x: number, y: number, z: number): EntityBuilderApi<TProps> {
    validateFiniteNumber(x, "transform.position.x");
    validateFiniteNumber(y, "transform.position.y");
    validateFiniteNumber(z, "transform.position.z");

    this.#position = { x, y, z };
    return this;
  }

  toDescriptor(): EntityDescriptor<TProps> {
    validateJsonValue(this.#props, "props");

    return {
      assetDefinition: this.#assetDefinition,
      props: cloneJsonValue(this.#props) as TProps,
      transform: {
        position: { ...this.#position },
      },
    };
  }
}

function mergeJsonObjects(
  defaultProps: JsonObject,
  currentProps: JsonObject,
  override: unknown,
  path: string,
): JsonObject {
  if (!isPlainJsonObject(override)) {
    throw new TypeError(`${path} must be a plain object.`);
  }

  const merged: Record<string, JsonValue> = { ...cloneJsonValue(currentProps) };

  for (const [key, overrideValue] of Object.entries(override)) {
    const itemPath = `${path}.${key}`;
    const defaultValue = defaultProps[key];
    const currentValue = merged[key];

    if (isAppendDefault(overrideValue)) {
      if (!Array.isArray(defaultValue)) {
        throw new TypeError(`${itemPath} can only append to an array prop.`);
      }

      merged[key] = [...defaultValue, ...cloneJsonValue(overrideValue.values)];
      continue;
    }

    if (
      isPlainJsonObject(defaultValue) &&
      isPlainJsonObject(currentValue) &&
      isPlainJsonObject(overrideValue)
    ) {
      merged[key] = mergeJsonObjects(defaultValue, currentValue, overrideValue, itemPath);
      continue;
    }

    validateJsonValue(overrideValue, itemPath);
    merged[key] = cloneJsonValue(overrideValue);
  }

  return merged;
}

function isAppendDefault(value: unknown): value is AppendDefault<JsonValue> {
  return (
    typeof value === "object" &&
    value !== null &&
    Object.prototype.hasOwnProperty.call(value, DESTARIA_APPEND_DEFAULT_MARKER) &&
    (value as AppendDefault<JsonValue>)[DESTARIA_APPEND_DEFAULT_MARKER] === true
  );
}

function validateFiniteNumber(value: number, path: string): void {
  if (!Number.isFinite(value)) {
    throw new TypeError(`${path} must be a finite number.`);
  }
}

function rejectUndefinedValue(value: unknown, path: string): void {
  if (value === undefined) {
    throw new TypeError(`${path} must not be undefined.`);
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => rejectUndefinedValue(item, `${path}[${index}]`));
    return;
  }

  if (isAppendDefault(value)) {
    rejectUndefinedValue(value.values, `${path} values`);
    return;
  }

  if (isPlainJsonObject(value)) {
    for (const [key, item] of Object.entries(value)) {
      rejectUndefinedValue(item, `${path}.${key}`);
    }
  }
}
