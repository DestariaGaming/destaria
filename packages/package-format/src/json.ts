import { z } from "zod";

/**
 * A JSON scalar value that can be preserved in package data.
 */
export type JsonPrimitive = string | number | boolean | null;

/**
 * JSON-safe object data.
 */
export type JsonObject = { readonly [key: string]: JsonValue };

/**
 * Any JSON-safe value that can cross the package boundary.
 */
export type JsonValue = JsonPrimitive | JsonObject | JsonValue[];

/**
 * Zod schema for JSON-safe package data.
 */
export const JsonValueSchema = z.json();

/**
 * Returns whether a value is a plain object that can participate in JSON data.
 */
export function isPlainJsonObject(value: unknown): value is Record<string, JsonValue> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

/**
 * Returns whether a value is JSON-safe package data.
 */
export function isJsonValue(value: unknown): value is JsonValue {
  return JsonValueSchema.safeParse(value).success;
}

/**
 * Validates JSON-safe package data.
 *
 * @throws TypeError when `value` cannot be represented as JSON package data.
 */
export function validateJsonValue(value: unknown, path = "value"): asserts value is JsonValue {
  const result = JsonValueSchema.safeParse(value);
  if (result.success) {
    return;
  }

  throw new TypeError(`${findInvalidJsonPath(value, path)} must be JSON-safe.`);
}

/**
 * Returns a validated clone of JSON-safe package data.
 *
 * @throws TypeError when `value` cannot be represented as JSON package data.
 */
export function cloneJsonValue<TValue extends JsonValue>(value: TValue): TValue {
  validateJsonValue(value);
  return structuredClone(value) as TValue;
}

function findInvalidJsonPath(value: unknown, path: string): string {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean" ||
    (typeof value === "number" && Number.isFinite(value))
  ) {
    return path;
  }

  if (Array.isArray(value)) {
    for (const [index, item] of value.entries()) {
      if (!isJsonValue(item)) {
        return findInvalidJsonPath(item, `${path}[${index}]`);
      }
    }

    return path;
  }

  if (isPlainJsonObject(value)) {
    for (const [key, item] of Object.entries(value)) {
      if (!isJsonValue(item)) {
        return findInvalidJsonPath(item, `${path}.${key}`);
      }
    }

    return path;
  }

  return path;
}
