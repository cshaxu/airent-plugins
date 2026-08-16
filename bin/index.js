#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const configUtils = require("airent/resources/utils/configurator.js");
const {
  addTemplate,
  createPrompt,
  getShouldEnable,
  loadJsonConfig,
  normalizeConfigCollections,
  writeJsonConfig,
} = configUtils;

/** @typedef {Object} Config
 *  @property {"commonjs" | "module"} type
 *  @property {?string} libImportPath
 *  @property {string} schemaPath
 *  @property {string} entityPath
 *  @property {?ApiNextTanstackConfig} [apiNextTanstack]
 *  @property {?string[]} [augmentors]
 *  @property {?Template[]} [templates]
 */

/** @typedef {Object} ApiNextTanstackConfig
 *  @property {?string} [fieldRequestsImportPath]
 *  @property {?string} [mutationErrorHandlerImportPath]
 */

const PROJECT_PATH = process.cwd();
const CONFIG_FILE_PATH = path.join(PROJECT_PATH, "airent.config.json");

const AIRENT_API_NEXT_TANSTACK_RESOURCES_PATH =
  "node_modules/@airent/api-next-tanstack/resources";
const API_NEXT_TANSTACK_AUGMENTOR_PATH =
  `${AIRENT_API_NEXT_TANSTACK_RESOURCES_PATH}/augmentor.js`;
const DEFAULT_FIELD_REQUESTS_IMPORT_PATH = "@/frontend/types/data";

const API_NEXT_TANSTACK_TEMPLATE_CONFIGS = [
  {
    name: `${AIRENT_API_NEXT_TANSTACK_RESOURCES_PATH}/base-template.ts.ejs`,
    outputPath: `{generatedPath}/tanstack-hooks/{kababEntityName}-base.ts`,
    skippable: false,
  },
  {
    name: `${AIRENT_API_NEXT_TANSTACK_RESOURCES_PATH}/types-template.ts.ejs`,
    outputPath: `{generatedPath}/tanstack-hooks/{kababEntityName}-types.ts`,
    skippable: false,
  },
  {
    name: `${AIRENT_API_NEXT_TANSTACK_RESOURCES_PATH}/client-hooks-template.ts.ejs`,
    outputPath: `{generatedPath}/tanstack-hooks/{kababEntityName}-client.ts`,
    skippable: false,
  },
  {
    name: `${AIRENT_API_NEXT_TANSTACK_RESOURCES_PATH}/server-hooks-template.ts.ejs`,
    outputPath: `{generatedPath}/tanstack-hooks/{kababEntityName}-server.ts`,
    skippable: false,
  },
  {
    name: `${AIRENT_API_NEXT_TANSTACK_RESOURCES_PATH}/server-cached-hooks-template.ts.ejs`,
    outputPath: `{generatedPath}/tanstack-hooks/{kababEntityName}-server-cached.ts`,
    skippable: false,
  },
];

async function loadConfig() {
  return normalizeConfigCollections(await loadJsonConfig(CONFIG_FILE_PATH));
}

async function configure() {
  const prompt = createPrompt();
  const { askQuestion } = prompt;

  try {
    const config = await loadConfig();
    const { augmentors } = config;
    const isAugmentorEnabled = augmentors.includes(
      API_NEXT_TANSTACK_AUGMENTOR_PATH
    );
    const shouldEnableApiNextTanstack = isAugmentorEnabled
      ? true
      : await getShouldEnable(askQuestion, "Api Next Tanstack");
    if (!shouldEnableApiNextTanstack) {
      return;
    }
    if (!isAugmentorEnabled) {
      augmentors.push(API_NEXT_TANSTACK_AUGMENTOR_PATH);
    }
    config.apiNextTanstack = {
      fieldRequestsImportPath:
        config.apiNextTanstack?.fieldRequestsImportPath ??
        DEFAULT_FIELD_REQUESTS_IMPORT_PATH,
      ...(config.apiNextTanstack?.mutationErrorHandlerImportPath
        ? {
            mutationErrorHandlerImportPath:
              config.apiNextTanstack.mutationErrorHandlerImportPath,
          }
        : {}),
    };
    API_NEXT_TANSTACK_TEMPLATE_CONFIGS.forEach((t) => addTemplate(config, t));

    await writeJsonConfig(CONFIG_FILE_PATH, config);
    console.log(`[AIRENT-API-NEXT-TANSTACK/INFO] Package configured.`);
  } finally {
    prompt.close();
  }
}

async function main() {
  if (!fs.existsSync(CONFIG_FILE_PATH)) {
    throw new Error(
      '[AIRENT-API-NEXT-TANSTACK/ERROR] "airent.config.json" not found'
    );
  }
  await configure();
}

main().catch(console.error);
