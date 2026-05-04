import { describe, expect, it } from "bun:test";

import { defineAsset } from "./asset";
import { entity } from "./entity";
import { Mesh } from "./mesh";
import { defineScene, isSceneDefinition } from "./scene";

describe("defineScene", () => {
  it("creates a scene descriptor from entity builders", () => {
    const Rock = defineAsset({
      mesh() {
        return Mesh.cube();
      },
    });

    const scene = defineScene({
      entities: [entity(Rock).at(1, 2, 3)],
    });

    expect(scene.toDescriptor()).toEqual({
      entities: [
        {
          assetDefinition: Rock,
          props: {},
          transform: {
            position: { x: 1, y: 2, z: 3 },
          },
        },
      ],
    });
  });

  it("snapshots live builder state when toDescriptor is called", () => {
    const Rock = defineAsset({
      mesh() {
        return Mesh.cube();
      },
    });
    const rock = entity(Rock);
    const scene = defineScene({
      entities: [rock],
    });

    expect(scene.toDescriptor().entities[0]?.transform.position).toEqual({
      x: 0,
      y: 0,
      z: 0,
    });

    rock.at(7, 8, 9);

    expect(scene.toDescriptor().entities[0]?.transform.position).toEqual({
      x: 7,
      y: 8,
      z: 9,
    });
  });

  it("does not call asset mesh when snapshotting a scene", () => {
    const Rock = defineAsset({
      mesh() {
        throw new Error("mesh should not be called");
      },
    });

    expect(() =>
      defineScene({
        entities: [entity(Rock)],
      }).toDescriptor(),
    ).not.toThrow();
  });

  it("freezes the scene definition and entity list", () => {
    const Rock = defineAsset({
      mesh() {
        return Mesh.cube();
      },
    });
    const scene = defineScene({
      entities: [entity(Rock)],
    });

    expect(Object.isFrozen(scene)).toBe(true);
    expect(Object.isFrozen(scene.entities)).toBe(true);
  });

  it("rejects invalid entity entries with indexed errors", () => {
    expect(() =>
      defineScene({
        entities: [undefined as never],
      }),
    ).toThrow("entities[0] must use 'entity()'.");
  });

  it("rejects invalid scene options", () => {
    expect(() => defineScene(undefined as never)).toThrow(
      "defineScene options must be a plain object.",
    );
    expect(() => defineScene({ entities: undefined as never })).toThrow(
      "entities must be an array.",
    );
  });

  it("identifies scene definition tokens structurally", () => {
    const scene = defineScene({
      entities: [],
    });

    expect(isSceneDefinition(scene)).toBe(true);
    expect(isSceneDefinition({})).toBe(false);
  });
});
