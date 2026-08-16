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

/** @typedef {Object} PrismaConfig
 *  @property {?string} libImportPath
 *  @property {string} extensionSchemaPath
 *  @property {string} prismaImport
 *  @property {string} prismaBatchSize
 */

/** @typedef {Object} Config
 *  @property {"commonjs" | "module"} type
 *  @property {?string} libImportPath
 *  @property {string} schemaPath
 *  @property {string} entityPath
 *  @property {string} contextImportPath
 *  @property {?string[]} [augmentors]
 *  @property {?Template[]} [templates]
 *  @property {?PrismaConfig} prisma
 */

const CONFIG_FILE_PATH = path.join(process.cwd(), "airent.config.json");

const AIRENT_PRISMA_RESOURCES_PATH = "node_modules/@airent/prisma/resources";

const PRISMA_AUGMENTOR_PATH = `${AIRENT_PRISMA_RESOURCES_PATH}/augmentor.js`;

async function loadConfig() {
  return normalizeConfigCollections(await loadJsonConfig(CONFIG_FILE_PATH));
}

async function configure() {
  const config = await loadConfig();
  const { augmentors } = config;
  const isPrismaAugmentorEnabled = augmentors.includes(PRISMA_AUGMENTOR_PATH);
  const shouldEnablePrismaAugmentor = isPrismaAugmentorEnabled
    ? true
    : await getShouldEnable(askQuestion, "Prisma");
  if (!shouldEnablePrismaAugmentor) {
    return;
  }
  if (!isPrismaAugmentorEnabled) {
    augmentors.push(PRISMA_AUGMENTOR_PATH);
  }

  config.prisma = config.prisma ?? {};

  config.prisma.prismaImport = await askQuestion(
    'Statement to import "prisma"',
    config.prisma.prismaImport ?? "import prisma from '@/lib/prisma';"
  );
  config.prisma.prismaBatchSize = await askQuestion(
    "Prisma batch size",
    config.prisma.prismaBatchSize ?? "1000"
  );

  const isPrismaYamlGeneratorEnabled =
    !!config.prisma.extensionSchemaPath?.length;
  const shouldEnablePrismaYamlGenerator = isPrismaYamlGeneratorEnabled
    ? false
    : await getShouldEnable(askQuestion, "Prisma Dbml-based YAML Generator");
  if (shouldEnablePrismaYamlGenerator) {
    config.prisma.extensionSchemaPath = config.schemaPath;
    config.schemaPath = "node_modules/.airent/schemas";
    config.prisma.primitiveFields = await askQuestion(
      "Default behavior to generate primitive fields (skip | internal | external)",
      "external"
    );
    config.prisma.associationFields = await askQuestion(
      "Default behavior to generate association fields (skip | internal | external)",
      "internal"
    );
    console.log(
      '[AIRENT-PRISMA/INFO] Please run "npx airent-prisma generate" before "npx airent" in the future.'
    );
  }

  await writeJsonConfig(CONFIG_FILE_PATH, config);
  console.log(`[AIRENT-PRISMA/INFO] Package configured.`);
}

async function main(args) {
  try {
    if (!fs.existsSync(CONFIG_FILE_PATH)) {
      throw new Error('[AIRENT-PRISMA/ERROR] "airent.config.json" not found');
    }

    if (args.includes("generate")) {
      const { generate } = require("./generate");
      await generate(args);
    } else {
      await configure();
    }
  } finally {
    prompt.close();
  }
}

main(process.argv.slice(2)).catch(console.error);
