#!/usr/bin/env node

const { importer, Parser } = require("@dbml/core");
const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");

const { sequential } = require("airent");
const codeUtils = require("airent/resources/utils/code.js");

const PROJECT_PATH = process.cwd();
const CONFIG_FILE_PATH = path.join(PROJECT_PATH, "airent.config.json");
const PRISMA_DBML_FILE_NAME = "dbml/schema.dbml";

async function loadConfig(isVerbose) {
  if (isVerbose) {
    console.log(`[AIRENT-PRISMA/INFO] Loading config ${CONFIG_FILE_PATH} ...`);
  }
  const configContent = await fs.promises.readFile(CONFIG_FILE_PATH, "utf8");
  const config = JSON.parse(configContent);
  if (isVerbose) {
    console.log(config);
  }
  return config;
}

async function getSchemaFilePaths(schemaPath) {
  // read all files in the YAML directory
  const allFileNames = await fs.promises.readdir(schemaPath);

  // filter only YAML files (with .yml or .yaml extension)
  return allFileNames
    .filter((fileName) => {
      const extname = path.extname(fileName).toLowerCase();
      return extname === ".yml" || extname === ".yaml";
    })
    .map((fileName) => path.join(schemaPath, fileName));
}

async function loadSchema(schemaFilePath, isVerbose) {
  if (isVerbose) {
    console.log(`[AIRENT-PRISMA/INFO] Loading schema ${schemaFilePath} ...`);
  }
  const schemaContent = await fs.promises.readFile(schemaFilePath, "utf8");
  return yaml.load(schemaContent);
}

async function loadSchemas(schemaPath, isVerbose) {
  const schemaFilePaths = await getSchemaFilePaths(schemaPath);
  const functions = schemaFilePaths.map(
    (path) => () => loadSchema(path, isVerbose)
  );
  return await sequential(functions);
}

async function loadDbml(dbmlFilePath, isVerbose) {
  if (isVerbose) {
    console.log(`[AIRENT-PRISMA/INFO] Loading dbml ${dbmlFilePath} ...`);
  }
  const content = fs.readFileSync(dbmlFilePath, "utf-8");
  const imported = importer.import(content, "dbml");
  return new Parser().parse(imported, "dbml");
}

const NATIVE_PRISMA_TYPES = {
  BigInt: "bigint",
  Boolean: "boolean",
  Bytes: "Buffer",
  DateTime: "Date",
  Decimal: "number",
  Float: "number",
  Int: "number",
  String: "string",
  "String[]": "string[]",
};

function buildTableSchema(table, enums, refs, aliasMap) {
  const { name: tableName } = table;
  const entityName = aliasMap[tableName] ?? tableName;

  // build entity-level attributes
  const entity = {
    name: entityName,
    model: `${entityName}Model`,
    prisma: { tableFields: table.fields.map((f) => f.name) },
    types: [
      {
        name: `Prisma${entityName}`,
        aliasOf: entityName,
        import: "@prisma/client",
      },
    ],
    keys: table.fields.filter((f) => f.pk).map((f) => f.name),
    fields: [],
  };

  // build fields and types
  const existingTypeNames = new Set();
  table.fields.forEach((rawField, index) => {
    const { name: fieldName, type } = rawField;
    const { type_name: rawTypeName } = type;
    const field = { id: index + 1, name: fieldName };
    const typeSuffix = rawField.pk || rawField.not_null ? "" : " | null";
    const nativeType = NATIVE_PRISMA_TYPES[rawTypeName];
    if (nativeType) {
      field.type = `${nativeType}${typeSuffix}`;
      field.strategy = "primitive";
    } else if (rawTypeName === "Json") {
      field.type = `PrismaJsonValue${typeSuffix}`;
      field.strategy = "primitive";
      field.cast = true;
      if (!existingTypeNames.has(rawTypeName)) {
        entity.types.push({
          name: "PrismaJsonValue",
          define: "Prisma.JsonValue",
        });
        existingTypeNames.add(rawTypeName);
      }
    } else if (enums.has(rawTypeName)) {
      field.type = `Prisma${rawTypeName}${typeSuffix}`;
      field.strategy = "primitive";
      if (!existingTypeNames.has(rawTypeName)) {
        entity.types.push({
          name: `Prisma${rawTypeName}`,
          aliasOf: rawTypeName,
          import: "@prisma/client",
        });
        existingTypeNames.add(rawTypeName);
      }
    } else {
      const sourceTable = tableName;
      const targetTable = rawTypeName;
      const ref = refs.find((ref) =>
        sourceTable < targetTable
          ? ref[0].table === sourceTable && ref[1].table === targetTable
          : ref[0].table === targetTable && ref[1].table === sourceTable
      );
      if (ref) {
        const source = ref.find((r) => r.table === sourceTable);
        const target = ref.find((r) => r.table === targetTable);
        const targetEntityName = aliasMap[targetTable] ?? targetTable;
        if (target.relation === "*") {
          field.type = `${targetEntityName}[]`;
        } else {
          field.type = `${targetEntityName}${typeSuffix}`;
        }
        field.strategy = "association";
        field.sourceKeys = source.fields;
        field.targetKeys = target.fields;
      }
    }
    if (field.type) {
      field.isPrisma = true;
      entity.fields.push(field);
    }
  });

  return entity;
}

async function loadTableSchemas(aliasMap, config, isVerbose) {
  const prismaSchemaPath = config.prisma.prismaSchemaPath ?? 'prisma';
  const PRISMA_DBML_FILE_PATH = path.join(
    PROJECT_PATH,
    prismaSchemaPath,
    PRISMA_DBML_FILE_NAME
  );
  const database = await loadDbml(PRISMA_DBML_FILE_PATH, isVerbose);
  const enums = new Set(
    database.schemas.flatMap((s) => s.enums).map((e) => e.name)
  );
  const refs = database.schemas
    .flatMap((s) => s.refs)
    .map((ref) => ref.endpoints.slice(0, 2))
    .map(([a, b]) => (a.tableName < b.tableName ? [a, b] : [b, a]))
    .map(([a, b]) => [
      { table: a.tableName, fields: a.fieldNames, relation: a.relation },
      { table: b.tableName, fields: b.fieldNames, relation: b.relation },
    ]);
  const tables = database.schemas.flatMap((s) => s.tables);
  return tables.map((table) => buildTableSchema(table, enums, refs, aliasMap));
}

function polish(tableSchema, config) {
  const fields = tableSchema.fields
    .filter(
      (field) =>
        (field.strategy === "primitive" &&
          config.prisma.primitiveFields !== "skip") ||
        (field.strategy === "association" &&
          config.prisma.associationFields !== "skip")
    )
    .map((field) => {
      const isInternal =
        (field.strategy === "primitive" &&
          config.prisma.primitiveFields === "internal") ||
        (field.strategy === "association" &&
          config.prisma.associationFields === "internal");
      field.internal = isInternal;
      return field;
    });
  tableSchema.fields = fields;
  return tableSchema;
}

function mergeOne(inputSchema, tableSchema, config, isVerbose) {
  if (isVerbose) {
    console.log(`[AIRENT-PRISMA/INFO] Merging schema ${tableSchema.name} ...`);
  }
  const {
    name: tableName,
    model: tableModel,
    prisma: tablePrisma,
    types: tableTypesRaw,
    keys: tableKeys,
    fields: tableFieldsRaw,
  } = tableSchema;
  const {
    name: _inputName,
    aliasOf: _inputAliasOf,
    model: inputModel,
    prisma: inputPrismaRaw,
    types: inputTypesRaw,
    keys: inputKeysRaw,
    fields: inputFieldsRaw,
    ...extras
  } = inputSchema;

  // bulid model
  const model = inputModel ?? tableModel;

  // build prisma
  const inputPrisma = inputPrismaRaw ?? {};
  const prisma = { ...tablePrisma, ...inputPrisma };

  // build fields
  const inputFieldNames = new Set(
    (inputFieldsRaw ?? []).map((f) => f.aliasOf ?? f.name)
  );
  const skipPrismaFields = new Set(inputPrisma?.skipFields ?? []);
  const internalPrismaFields = new Set(inputPrisma?.internalFields ?? []);
  const externalPrismaFields = new Set(inputPrisma?.externalFields ?? []);
  const deprecatedPrismaFields = new Set(inputPrisma?.deprecatedFields ?? []);
  const tableFields = tableFieldsRaw
    .filter((f) => {
      const isConfigSkip =
        (f.strategy === "primitive" &&
          config.prisma.primitiveFields === "skip") ||
        (f.strategy === "association" &&
          config.prisma.associationFields === "skip");
      const isFieldSkip = skipPrismaFields.has(f.name);
      const isFieldInternal = internalPrismaFields.has(f.name);
      const isFieldExternal = externalPrismaFields.has(f.name);
      const isFieldCustomized = inputFieldNames.has(f.name);
      return (
        !isFieldCustomized &&
        !isFieldSkip &&
        (isFieldInternal || isFieldExternal || !isConfigSkip)
      );
    })
    .map((f) => {
      const isConfigInternal =
        (f.strategy === "primitive" &&
          config.prisma.primitiveFields === "internal") ||
        (f.strategy === "association" &&
          config.prisma.associationFields === "internal");
      const isFieldInternal = internalPrismaFields.has(f.name);
      const isFieldExternal = externalPrismaFields.has(f.name);
      const isInternal =
        isFieldInternal || (isConfigInternal && !isFieldExternal);
      return {
        ...f,
        ...(deprecatedPrismaFields.has(f.name) && { deprecated: true }),
        internal: isInternal,
      };
    });
  const inputFields = inputFieldsRaw ?? [];
  const fields = [...tableFields, ...inputFields];

  // build keys
  const inputKeys = inputKeysRaw ?? [];
  const keys = [...tableKeys, ...inputKeys];

  // build types
  const inputTypes = inputTypesRaw ?? [];
  const inputTypeNames = new Set(inputTypes.map((t) => t.name));
  const tableTypes = tableTypesRaw.filter((f) => !inputTypeNames.has(f.name));
  const types = [...tableTypes, ...inputTypes];

  return { name: tableName, model, prisma, ...extras, types, keys, fields };
}

function mergeAll(inputSchemas, tableSchemas, config, isVerbose) {
  if (isVerbose) {
    console.log("[AIRENT-PRISMA/INFO] Reconciling schemas ...");
  }
  const tableSchemaNames = tableSchemas.map((s) => s.name);
  const inputSchemaNames = inputSchemas.map((s) => s.name);
  return Array.from(new Set([...tableSchemaNames, ...inputSchemaNames]))
    .sort()
    .map((schemaName) => {
      const tableSchema = tableSchemas.find((s) => s.name === schemaName);
      const inputSchema = inputSchemas.find((s) => s.name === schemaName);

      if (
        inputSchema !== undefined &&
        tableSchema === undefined &&
        inputSchema.isPrisma !== false
      ) {
        throw new Error(
          `[AIRENT-PRISMA/ERROR] "${schemaName}" is missing from Prisma schema.`
        );
      }

      const entity = tableSchema
        ? inputSchema
          ? inputSchema.isPrisma === false
            ? inputSchema
            : mergeOne(inputSchema, tableSchema, config, isVerbose)
          : polish(tableSchema, config)
        : inputSchema;

      const entName = codeUtils.toPascalCase(entity.name);
      const modelDefinition =
        entity.isPrisma === false ? entity.model : `Prisma${entName}`;
      const modelName = `${entName}Model`;

      if (entity.isPrisma === false) {
        entity.types.push({ name: modelName, define: modelDefinition });
        entity.model = modelName;
        return entity;
      }

      // build prisma model definition
      const prismaAssociationFields = entity.fields
        .filter(codeUtils.isAssociationField)
        .filter((t) => t.isPrisma);
      const prismaModelAssociationDefinitions = prismaAssociationFields.map(
        (f) =>
          `${f.name}?: ${codeUtils.toPascalCase(
            codeUtils.toSingularTypeName(f.type)
          )}Model${
            codeUtils.isArrayField(f)
              ? "[]"
              : codeUtils.isNullableField(f)
              ? " | null"
              : ""
          }`
      );
      const prismaModelAssociationDefinitionsString =
        prismaAssociationFields.length === 0
          ? ""
          : ` & { ${prismaModelAssociationDefinitions.join("; ")} }`;
      const modelDefinitionWithAssociationFields = `${modelDefinition}${prismaModelAssociationDefinitionsString}`;
      entity.types.push({
        name: modelName,
        define: modelDefinitionWithAssociationFields,
      });
      return entity;
    });
}

function reconcile(schemas) {
  // if a primitive field is aliased, this is to ensure all association
  // fields in other entities will reference the correct field name
  const entityAliasMap = schemas.reduce((entityMap, entity) => {
    entityMap[entity.name] = entity.fields
      .filter((field) => codeUtils.isPrimitiveField(field))
      .filter((field) => field.aliasOf)
      .reduce((fieldMap, field) => {
        fieldMap[field.aliasOf] = field.name;
        return fieldMap;
      }, {});
    return entityMap;
  }, {});
  return schemas.map((entity) => {
    const keys = entity.keys.map(
      (name) => entityAliasMap[entity.name][name] ?? name
    );
    const fields = entity.fields.map((field) => {
      if (!codeUtils.isAssociationField(field)) {
        return field;
      }
      const entName = codeUtils.toSingularTypeName(field.type);
      const fieldAliasMap = entityAliasMap[entName];
      const targetKeys = field.targetKeys.map(
        (name) => fieldAliasMap[name] ?? name
      );
      return { ...field, targetKeys };
    });
    return { ...entity, keys, fields };
  });
}

async function generateOne(entity, outputPath, isVerbose) {
  const fileName = `${codeUtils.toKababCase(entity.name)}.yml`;
  const outputFilePath = path.join(outputPath, fileName);
  if (isVerbose) {
    console.log(`[AIRENT-PRISMA/INFO] Generating YAML ${outputFilePath} ...`);
  }
  const content = yaml.dump(entity, { lineWidth: -1 });
  await fs.promises.writeFile(outputFilePath, content, "utf-8");
}

async function generate(argv) {
  const isVerbose = argv.includes("--verbose") || argv.includes("-v");

  // load config
  const config = await loadConfig(isVerbose);
  const inputSchemaPath = path.join(
    PROJECT_PATH,
    config.prisma.extensionSchemaPath
  );
  const outputSchemaPath = path.join(PROJECT_PATH, config.schemaPath);

  const inputSchemas = await loadSchemas(inputSchemaPath, isVerbose);
  const aliasMap = inputSchemas.reduce((acc, entity) => {
    acc[entity.aliasOf ?? entity.name] = entity.name;
    return acc;
  }, {});
  const tableSchemas = await loadTableSchemas(aliasMap, config, isVerbose);
  const mergedSchemas = mergeAll(inputSchemas, tableSchemas, config, isVerbose);
  const outputSchemas = reconcile(mergedSchemas);

  // Ensure the output directory exists
  await fs.promises.mkdir(outputSchemaPath, { recursive: true });

  // Generate new YAML files
  const functions = outputSchemas.map(
    (entity) => () => generateOne(entity, outputSchemaPath, isVerbose)
  );
  await sequential(functions);

  const prismaCount = outputSchemas.filter((s) => s.isPrisma !== false).length;
  const nonPrismaCount = outputSchemas.filter(
    (s) => s.isPrisma === false
  ).length;
  console.log(
    `[AIRENT-PRISMA/INFO] Task completed: ${codeUtils.toPhrase(
      prismaCount,
      "Prisma entity"
    )} and ${codeUtils.toPhrase(nonPrismaCount, "non-Prisma entity")}.`
  );
}

module.exports = { generate };
