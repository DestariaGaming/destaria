import type { JsonObject } from "@destaria/package-format";
import { isPlainJsonObject } from "@destaria/package-format";

import type { EntityBuilderApi, EntityDescriptor } from "./entity";

const DESTARIA_SCENE_DEFINITION_MARKER = "__destariaSceneDefinition";

export type SceneEntityEntry<TProps extends JsonObject = JsonObject> = EntityBuilderApi<TProps>;

/**
 * Authoring-side snapshot for a scene declaration.
 *
 * Scene descriptors preserve authored entity placement intent for later CLI
 * compilation. They do not contain package asset IDs or runtime scene objects.
 */
export type SceneDescriptor = {
  readonly entities: readonly EntityDescriptor[];
};

/**
 * A reusable authored scene definition.
 *
 * Scene definitions are source-side tokens discovered by the CLI. They contain
 * entity builders and snapshot them only when `toDescriptor()` is called.
 */
export type SceneDefinition = {
  readonly [DESTARIA_SCENE_DEFINITION_MARKER]: true;
  readonly entities: readonly SceneEntityEntry[];

  /**
   * Returns an authoring snapshot for later CLI scene compilation.
   *
   * Builder entries are evaluated at call time so compilation sees the latest
   * authored builder state.
   */
  toDescriptor(): SceneDescriptor;
};

type DefineSceneOptions = {
  readonly entities: readonly SceneEntityEntry[];
};

/**
 * Defines a scene as an authoring-side container for entity placements.
 */
export function defineScene(options: DefineSceneOptions): SceneDefinition {
  if (!isPlainJsonObject(options)) {
    throw new TypeError("defineScene options must be a plain object.");
  }

  if (!Array.isArray(options.entities)) {
    throw new TypeError("entities must be an array.");
  }

  options.entities.forEach(validateEntityEntry);

  const entities = Object.freeze([...options.entities]);

  return Object.freeze({
    [DESTARIA_SCENE_DEFINITION_MARKER]: true,
    entities,
    toDescriptor() {
      return {
        entities: entities.map((entry) => entry.toDescriptor()),
      };
    },
  });
}

/**
 * Returns whether a value is an authored scene definition token.
 *
 * The guard checks marker shape instead of package instance identity so the CLI
 * can recognize definitions loaded through project-local SDK shims.
 */
export function isSceneDefinition(value: unknown): value is SceneDefinition {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as Partial<Record<typeof DESTARIA_SCENE_DEFINITION_MARKER, unknown>>)[
      DESTARIA_SCENE_DEFINITION_MARKER
    ] === true &&
    Array.isArray((value as Partial<SceneDefinition>).entities) &&
    typeof (value as Partial<SceneDefinition>).toDescriptor === "function"
  );
}

function validateEntityEntry(entry: unknown, index: number): void {
  if (isEntityBuilderEntry(entry)) {
    return;
  }

  throw new TypeError(`entities[${index}] must use 'entity()'.`);
}

function isEntityBuilderEntry(value: unknown): value is EntityBuilderApi<JsonObject> {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { toDescriptor?: unknown }).toDescriptor === "function"
  );
}
