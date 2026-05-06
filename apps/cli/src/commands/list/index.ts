import type { CLICommandOptions } from "cli-forge";

import { getProjectContext } from "../../project/context";
import { getSourceRegistry, type SourceRegistry } from "../../project/source-registry";
import { formatProjectPath } from "../../shared/paths";
import { getOutput, withOutput } from "../../shared/output";

const LIST_TYPES = ["assets", "scenes"] as const;
type ListType = (typeof LIST_TYPES)[number];

type RootCommandArgs = {
  unmatched: string[];
  "--"?: string[];
  project: string;
  output?: string;
  json: boolean;
};

type ListCommandArgs = RootCommandArgs & {
  types: string[];
};

export const listCommand: CLICommandOptions<RootCommandArgs, ListCommandArgs> = {
  description: "List discovered Destaria source files",
  builder: (args) =>
    args.positional("types", {
      type: "array",
      items: "string",
      description: "Source types to list",
      default: [],
    }),
  handler: withOutput(async (args: ListCommandArgs) => {
    const output = await getOutput();
    const selectedTypes = parseListTypes(args.types ?? []);

    if (selectedTypes instanceof Error) {
      return output.fail(selectedTypes.message);
    }

    const projectContext = await getProjectContext();
    const sourceRegistry = await getSourceRegistry();

    return output
      .success(formatListOutput(projectContext.projectRoot, sourceRegistry, selectedTypes))
      .json(createListJson(projectContext.projectRoot, sourceRegistry, selectedTypes));
  }),
};

function parseListTypes(types: string[]): ListType[] | Error {
  if (types.length === 0) {
    return [...LIST_TYPES];
  }

  const unknownTypes = types.filter((type) => !isListType(type));
  if (unknownTypes.length > 0) {
    return new Error(
      `Unknown list type ${unknownTypes.map((type) => `"${type}"`).join(", ")}. Valid types: ${LIST_TYPES.join(", ")}.`,
    );
  }

  return [...new Set(types)] as ListType[];
}

function isListType(value: string): value is ListType {
  return LIST_TYPES.includes(value as ListType);
}

function formatListOutput(
  projectRoot: string,
  sourceRegistry: SourceRegistry,
  selectedTypes: ListType[],
): string {
  const lines: string[] = [];

  if (selectedTypes.includes("scenes")) {
    lines.push(
      "Entry scene",
      `  ${formatProjectPath(projectRoot, sourceRegistry.entrySceneFile)}`,
      "",
      "Scenes",
      ...formatList(sourceRegistry.sceneFiles, projectRoot),
    );
  }

  if (selectedTypes.includes("assets")) {
    if (lines.length > 0) {
      lines.push("");
    }

    lines.push("Assets", ...formatList(sourceRegistry.assetFiles, projectRoot));
  }

  return lines.join("\n");
}

function createListJson(
  projectRoot: string,
  sourceRegistry: SourceRegistry,
  selectedTypes: ListType[],
): unknown {
  const data: Record<string, unknown> = {};

  if (selectedTypes.includes("scenes")) {
    data.entryScene = formatProjectPath(projectRoot, sourceRegistry.entrySceneFile);
    data.scenes = sourceRegistry.sceneFiles.map((file) => formatProjectPath(projectRoot, file));
  }

  if (selectedTypes.includes("assets")) {
    data.assets = sourceRegistry.assetFiles.map((file) => formatProjectPath(projectRoot, file));
  }

  return data;
}

function formatList(files: string[], projectRoot: string): string[] {
  if (files.length === 0) {
    return ["  (none)"];
  }

  return files.map((file) => `  ${formatProjectPath(projectRoot, file)}`);
}
