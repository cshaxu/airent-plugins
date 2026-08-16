#!/usr/bin/env node

// IMPORTS //

const ejs = require("ejs");
const fs = require("fs");
const path = require("path");

const codeUtils = require("airent/resources/utils/code.js");
const pathUtils = require("airent/resources/utils/path.js");

// UTILITIES //

const getTypeScriptFileNames = (inputPath) =>
  fs.promises
    .readdir(inputPath)
    .then((a) =>
      a.filter((n) => n.endsWith(".ts")).map((f) => f.replace(".ts", ""))
    );

const getFolderNames = (inputPath) =>
  fs.promises
    .readdir(inputPath)
    .then((routes) =>
      routes.filter((r) => fs.statSync(path.join(inputPath, r)).isDirectory())
    );

const readFileContent = (inputPath) => fs.promises.readFile(inputPath, "utf-8");
const writeFileContent = async (outputPath, fileName, content) => {
  if (!fs.existsSync(outputPath)) {
    await fs.promises.mkdir(outputPath, { recursive: true });
  }
  await fs.promises.writeFile(path.join(outputPath, fileName), content);
};
const remove = (inputPath) =>
  fs.promises.rm(inputPath, { force: true, recursive: true });

// TYPES AND CONSTANTS //

const PROJECT_PATH = process.cwd();
const CONFIG_FILE_PATH = path.join(PROJECT_PATH, "airent.config.json");
const VERCEL_JSON_PATH = path.join(PROJECT_PATH, "vercel.json");

const AIRENT_API_NEXT_PATH = path.join(__dirname, "..");
const AIRENT_API_NEXT_RESOURCES_PATH = path.join(
  AIRENT_API_NEXT_PATH,
  "resources"
);

const CRON_TEMPLATE_PATH = path.join(
  AIRENT_API_NEXT_RESOURCES_PATH,
  "server-cron-template.ts.ejs"
);
const DEBUG_TEMPLATE_PATH = path.join(
  AIRENT_API_NEXT_RESOURCES_PATH,
  "server-debug-template.ts.ejs"
);
const WEBHOOK_TEMPLATE_PATH = path.join(
  AIRENT_API_NEXT_RESOURCES_PATH,
  "server-webhook-template.ts.ejs"
);

async function loadConfig(isVerbose) {
  if (isVerbose) {
    console.log(
      `[AIRENT-API-NEXT/INFO] Loading config ${CONFIG_FILE_PATH} ...`
    );
  }
  const configContent = await fs.promises.readFile(CONFIG_FILE_PATH, "utf8");
  const config = JSON.parse(configContent);
  if (isVerbose) {
    console.log(config.apiNext);
  }
  return config;
}

function buildPackage(absoluteSourcePath, targetPath, config) {
  if (targetPath.startsWith(".")) {
    const absoluteTargetPath = path.join(PROJECT_PATH, targetPath);
    const relativePath = pathUtils.buildRelativePath(
      absoluteSourcePath,
      absoluteTargetPath
    );
    return `${relativePath}${codeUtils.getModuleSuffix(config)}`;
  }
  return targetPath;
}

function buildLibPackage(absolutePath, config) {
  const { libImportPath } = config.apiNext;
  return libImportPath
    ? buildPackage(absolutePath, libImportPath, config)
    : "@airent/api-next";
}

function buildContextPackage(absolutePath, config) {
  return buildPackage(absolutePath, config.contextImportPath, config);
}

function buildHandlerConfigPackage(absolutePath, config) {
  return buildPackage(
    absolutePath,
    config.apiNext.handlerConfigImportPath,
    config
  );
}

function buildDispatcherConfigPackage(absolutePath, config) {
  return buildPackage(
    absolutePath,
    config.api.server.dispatcherConfigImportPath,
    config
  );
}

async function generateInner(
  templatePath,
  inputPath,
  outputPath,
  inputType,
  outputType,
  config,
  inputContentParser
) {
  const template = await readFileContent(templatePath);

  const absoluteInputPath = path.join(PROJECT_PATH, inputPath);
  const names = [];
  if (inputType === "files") {
    const fileNames = await getTypeScriptFileNames(absoluteInputPath);
    names.push(...fileNames);
  } else if (inputType === "folders") {
    const folderNames = await getFolderNames(absoluteInputPath);
    names.push(...folderNames);
  } else {
    throw new Error(
      "[AIRENT-API-NEXT/ERROR] Invalid input type: must be 'file' or 'folder'"
    );
  }
  if (names.length === 0) {
    return;
  }

  const parsedInputContents =
    inputType === "files" && inputContentParser !== undefined
      ? await Promise.all(
          names.map(async (name) => {
            const filePath = path.join(absoluteInputPath, `${name}.ts`);
            const inputContent = await readFileContent(filePath);
            return await inputContentParser(name, inputContent);
          })
        )
      : undefined;
  const entries = names.map((name, i) => ({
    name,
    ...(parsedInputContents && { parsed: parsedInputContents[i] }),
  }));

  const absoluteOutputPath = path.join(PROJECT_PATH, outputPath);

  if (outputType === "file") {
    const packages = {
      toApiNextLibFull: buildLibPackage(
        path.dirname(absoluteOutputPath),
        config
      ),
      toContextFull: buildContextPackage(
        path.dirname(absoluteOutputPath),
        config
      ),
      toHandlerConfigFull: buildHandlerConfigPackage(
        path.dirname(absoluteOutputPath),
        config
      ),
      toDispatcherConfigFull: buildDispatcherConfigPackage(
        path.dirname(absoluteOutputPath),
        config
      ),
    };
    const data = { packages, entries, config, utils: codeUtils };
    const content = ejs.render(template, data);
    await writeFileContent(
      path.dirname(absoluteOutputPath),
      path.basename(absoluteOutputPath),
      content
    );
  } else if (outputType === "files") {
    await remove(absoluteOutputPath);
    const packages = {
      toApiNextLibFull: buildLibPackage(absoluteOutputPath, config),
      toContextFull: buildContextPackage(absoluteOutputPath, config),
      toHandlerConfigFull: buildHandlerConfigPackage(
        absoluteOutputPath,
        config
      ),
      toDispatcherConfigFull: buildDispatcherConfigPackage(
        absoluteOutputPath,
        config
      ),
    };
    const functions = entries.map(async (entry) => {
      const data = { packages, entry, config, utils: codeUtils };
      const outputContent = ejs.render(template, data);
      await writeFileContent(
        absoluteOutputPath,
        `${entry.name}.ts`,
        outputContent
      );
    });
    await Promise.all(functions);
  } else if (outputType === "routes") {
    await remove(absoluteOutputPath);
    const functions = entries.map(async (entry) => {
      const absoluteOutputFolderPath = path.join(
        absoluteOutputPath,
        entry.name
      );
      const packages = {
        toApiNextLibFull: buildLibPackage(absoluteOutputFolderPath, config),
        toContextFull: buildContextPackage(absoluteOutputFolderPath, config),
        toHandlerConfigFull: buildHandlerConfigPackage(
          absoluteOutputFolderPath,
          config
        ),
        toDispatcherConfigFull: buildDispatcherConfigPackage(
          absoluteOutputFolderPath,
          config
        ),
      };
      const data = { packages, entry, config, utils: codeUtils };
      const outputContent = ejs.render(template, data);
      await writeFileContent(
        absoluteOutputFolderPath,
        "route.ts",
        outputContent
      );
    });
    await Promise.all(functions);
  } else {
    throw new Error(
      "[AIRENT-API-NEXT/ERROR] Invalid output type: must be 'file' or 'route'"
    );
  }
  return entries;
}

async function buildCronJobApis(config, isVerbose) {
  if (isVerbose) {
    console.log("[AIRENT-API-NEXT/INFO] Building cron job APIs ...");
  }

  const inputContentParser = (name, inputContent) => {
    const sourcePackage = buildPackage(
      path.join(
        PROJECT_PATH,
        config.apiNext.appPath,
        config.apiNext.cronApiPath,
        "placeholder"
      ),
      `./${path.join(config.apiNext.cronSourcePath, name)}`,
      config
    );
    const inputLines = inputContent.split("\n");
    const maxDuration = inputLines
      .filter((l) => l.startsWith("export const maxDuration ="))
      .map((l) => l.split("=")[1].trim().replace(";", ""))
      .at(0);
    const schedule = inputLines
      .filter((l) => l.startsWith("export const schedule = "))
      .map((l) =>
        l
          .split("=")[1]
          .trim()
          .replace(";", "")
          .replaceAll("'", "")
          .replaceAll('"', "")
      )
      .at(0);
    if (!schedule?.length) {
      throw new Error(
        `[AIRENT-API-NEXT/ERROR] Cron source '${name}' must export 'schedule'.`
      );
    }
    return { sourcePackage, maxDuration, schedule };
  };

  const entries = await generateInner(
    CRON_TEMPLATE_PATH,
    config.apiNext.cronSourcePath,
    path.join(config.apiNext.appPath, config.apiNext.cronApiPath),
    "files",
    "routes",
    config,
    inputContentParser
  );

  // build & save vercel.json
  const isVercelJsonExists = fs.existsSync(VERCEL_JSON_PATH);
  const vercelJsonContent = isVercelJsonExists
    ? await readFileContent(VERCEL_JSON_PATH).then((c) => c || "{}")
    : "{}";
  const vercelJson = JSON.parse(vercelJsonContent);
  vercelJson.crons = entries.map((entry) => ({
    path: `${config.apiNext.cronApiPath}/${entry.name}`,
    schedule: entry.parsed.schedule,
  }));
  const newVercelJsonContent = JSON.stringify(vercelJson, null, 2) + "\n";
  await fs.promises.writeFile(VERCEL_JSON_PATH, newVercelJsonContent);
}

async function buildPredefinedApi(
  name,
  templatePath,
  apiPath,
  sourcePath,
  config,
  isVerbose
) {
  if (isVerbose) {
    console.log(`[AIRENT-API-NEXT/INFO] Building ${name} API endpoints ...`);
  }

  const inputContentParser = (name) => {
    const sourcePackage = buildPackage(
      path.join(PROJECT_PATH, config.apiNext.appPath, apiPath, "placeholder"),
      `./${path.join(sourcePath, name)}`,
      config
    );
    return { sourcePackage };
  };

  await generateInner(
    templatePath,
    sourcePath,
    path.join(config.apiNext.appPath, apiPath),
    "files",
    "routes",
    config,
    inputContentParser
  );
}

async function buildDebugApi(config, isVerbose) {
  await buildPredefinedApi(
    "debug",
    DEBUG_TEMPLATE_PATH,
    config.apiNext.debugApiPath,
    config.apiNext.debugSourcePath,
    config,
    isVerbose
  );
}

async function buildWebhookApis(config, isVerbose) {
  await buildPredefinedApi(
    "webhook",
    WEBHOOK_TEMPLATE_PATH,
    config.apiNext.webhookApiPath,
    config.apiNext.webhookSourcePath,
    config,
    isVerbose
  );
}

async function buildPlugins(config, isVerbose) {
  const { templates } = config.apiNext;
  if (!templates?.length) {
    return;
  }
  const functions = templates.map(async (template) => {
    const { name, inputType, outputType, inputPath, outputPath } = template;
    const templatePath = path.join(PROJECT_PATH, name);
    if (isVerbose) {
      console.log(`[AIRENT-API-NEXT/INFO] Generating with ${templatePath} ...`);
    }
    await generateInner(
      templatePath,
      inputPath,
      outputPath,
      inputType,
      outputType,
      config
    );
  });
  await Promise.all(functions);
}

async function generate(argv) {
  const isVerbose = argv.includes("--verbose") || argv.includes("-v");

  // load config
  const config = await loadConfig(isVerbose);

  const meta = [];

  if (config.apiNext.cronApiPath) {
    await buildCronJobApis(config, isVerbose);
    meta.push("1C");
  }
  if (config.apiNext.debugApiPath) {
    await buildDebugApi(config, isVerbose);
    meta.push("1D");
  }
  if (config.apiNext.webhookApiPath) {
    await buildWebhookApis(config, isVerbose);
    meta.push("1W");
  }
  await buildPlugins(config, isVerbose);
  meta.push(`${(config.apiNext.templates ?? []).length}P`);

  console.log(`[AIRENT-API-NEXT/INFO] Task completed: ${meta.join("/")}.`);
}

module.exports = { generate };
