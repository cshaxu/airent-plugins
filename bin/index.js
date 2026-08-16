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

/** @typedef {Object} ApiExpressConfig
 *  @property {?string} libImportPath
 *  @property {string} handlerConfigImportPath
 *  @property {string} routesFilePath
 */

/** @typedef {Object} Config
 *  @property {"commonjs" | "module"} type
 *  @property {?string} libImportPath
 *  @property {string} schemaPath
 *  @property {string} entityPath
 *  @property {string} generatedPath
 *  @property {?string[]} [augmentors]
 *  @property {?Template[]} [templates]
 *  @property {?ApiExpressConfig} apiExpress
 */

const PROJECT_PATH = process.cwd();
const CONFIG_FILE_PATH = path.join(PROJECT_PATH, "airent.config.json");

const AIRENT_API_EXPRESS_RESOURCES_PATH =
  "node_modules/@airent/api-express/resources";
const API_EXPRESS_AUGMENTOR_PATH = `${AIRENT_API_EXPRESS_RESOURCES_PATH}/augmentor.js`;

const API_EXPRESS_ROUTES_TEMPLATE_CONFIG = {
  name: `${AIRENT_API_EXPRESS_RESOURCES_PATH}/routes-template.ts.ejs`,
  outputPath: `{apiExpress.routesFilePath}`,
  skippable: false,
};
const API_EXPRESS_HANDLER_TEMPLATE_CONFIG = {
  name: `${AIRENT_API_EXPRESS_RESOURCES_PATH}/handler-template.ts.ejs`,
  outputPath: `{generatedPath}/handlers/{kababEntityName}.ts`,
  skippable: false,
};

const API_EXPRESS_TEMPLATE_CONFIGS = [
  API_EXPRESS_ROUTES_TEMPLATE_CONFIG,
  API_EXPRESS_HANDLER_TEMPLATE_CONFIG,
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
    const isAugmentorEnabled = augmentors.includes(API_EXPRESS_AUGMENTOR_PATH);
    const shouldEnableApiExpress = isAugmentorEnabled
      ? true
      : await getShouldEnable(askQuestion, "Api Express");
    if (!shouldEnableApiExpress) {
      return;
    }
    if (!isAugmentorEnabled) {
      augmentors.push(API_EXPRESS_AUGMENTOR_PATH);
    }
    API_EXPRESS_TEMPLATE_CONFIGS.forEach((t) => addTemplate(config, t));

    config.apiExpress = config.apiExpress ?? {};

    config.apiExpress.routesFilePath = await askQuestion(
      "Express Api Routes Output File Path",
      config.apiExpress.routesFilePath ?? "./src/routes.ts"
    );

    config.apiExpress.handlerConfigImportPath = await askQuestion(
      'Import path for "handlerConfig"',
      config.apiExpress.handlerConfigImportPath ?? "./src/framework"
    );

    await writeJsonConfig(CONFIG_FILE_PATH, config);
    console.log(`[AIRENT-API-EXPRESS/INFO] Package configured.`);
  } finally {
    prompt.close();
  }
}

async function main() {
  if (!fs.existsSync(CONFIG_FILE_PATH)) {
    throw new Error('[AIRENT-API-EXPRESS/ERROR] "airent.config.json" not found');
  }
  await configure();
}

main().catch(console.error);
