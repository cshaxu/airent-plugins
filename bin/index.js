#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const configUtils = require("airent/resources/utils/configurator.js");
const {
  createPrompt,
  getShouldEnable,
  loadJsonConfig,
  normalizeConfigCollections,
  writeJsonConfig,
} = configUtils;
const prompt = createPrompt();
const { askQuestion } = prompt;

/** @typedef {Object} ImdbConfig
 *  @property {?string} libImportPath
 *  @property {string} imdbImport
 *  @property {string} imdbBatchSize
 */

/** @typedef {Object} Config
 *  @property {"commonjs" | "module"} type
 *  @property {?string} libImportPath
 *  @property {string} schemaPath
 *  @property {string} entityPath
 *  @property {string} contextImportPath
 *  @property {?string[]} [augmentors]
 *  @property {?Template[]} [templates]
 *  @property {?ImdbConfig} imdb
 */

const CONFIG_FILE_PATH = path.join(process.cwd(), "airent.config.json");

const AIRENT_IMDB_RESOURCES_PATH = "node_modules/@airent/imdb/resources";

const IMDB_AUGMENTOR_PATH = `${AIRENT_IMDB_RESOURCES_PATH}/augmentor.js`;

async function loadConfig() {
  return normalizeConfigCollections(await loadJsonConfig(CONFIG_FILE_PATH));
}

async function configure() {
  const config = await loadConfig();
  const { augmentors } = config;
  const isImdbAugmentorEnabled = augmentors.includes(IMDB_AUGMENTOR_PATH);
  const shouldEnableImdbAugmentor = isImdbAugmentorEnabled
    ? true
    : await getShouldEnable(askQuestion, "IMDB");
  if (!shouldEnableImdbAugmentor) {
    return;
  }
  if (!isImdbAugmentorEnabled) {
    augmentors.push(IMDB_AUGMENTOR_PATH);
  }

  config.imdb = config.imdb ?? {};

  config.imdb.imdbImport = await askQuestion(
    'Statement to import "imdb"',
    config.imdb.imdbImport ?? "import imdb from '@/lib/imdb';"
  );
  config.imdb.imdbBatchSize = await askQuestion(
    "IMDB batch size",
    config.imdb.imdbBatchSize ?? "1000"
  );

  await writeJsonConfig(CONFIG_FILE_PATH, config);
  console.log(`[AIRENT-IMDB/INFO] Package configured.`);
}

async function main(args) {
  try {
    if (!fs.existsSync(CONFIG_FILE_PATH)) {
      throw new Error('[AIRENT-IMDB/ERROR] "airent.config.json" not found');
    }

    if (args.includes("generate")) {
      console.log(
        '[AIRENT-IMDB/INFO] No separate generate step is required. Run "npx airent" after updating your schemas.'
      );
    } else {
      await configure();
    }
  } finally {
    prompt.close();
  }
}

main(process.argv.slice(2)).catch(console.error);
