const path = require("path");

const codeUtils = require("airent/resources/utils/code.js");
const pathUtils = require("airent/resources/utils/path.js");

function buildCollectionName(entity) {
  return entity.imdb?.collectionName ?? codeUtils.toCamelCase(entity.name);
}

function augmentConfig(config) {
  config.imdb = config.imdb ?? {};
  const { libImportPath } = config.imdb;
  config._packages.imdb = config._packages.imdb ?? {};
  config._packages.imdb.baseToLibFull = libImportPath
    ? pathUtils.buildRelativeFull(
        path.join(config.entityPath, "generated"),
        libImportPath,
        config
      )
    : "@airent/imdb";
}

/**
 * YAML FLAGS
 * - imdb: { collectionName?: string }
 * - isImdb: false | undefined, top-level flag, false to skip generating imdb wrappers
 * - isImdb: boolean | undefined, field-level flag to note field as imdb managed
 * - imdbLoader: boolean | undefined, field-level flag to decide whether to generate loader for the field
 * - orderBy: object | undefined, association-field-level key to specify orderBy for the field loader
 * - take: number | undefined, association-field-level key to specify limit on the field
 */

function buildBeforeBase(entity, config) {
  const baseImports = [
    "CreateArgs",
    "DeleteArgs",
    "FindFirstArgs",
    "FindManyArgs",
    "FindOneArgs",
    "FindUniqueArgs",
    "UpdateArgs",
    "ValidateImdbArgs",
    "entityCompare",
    ...buildLoaderImports(entity),
  ];
  return [
    "// airent-imdb imports",
    `import { ${baseImports.join(", ")} } from '${config._packages.imdb.baseToLibFull}';`,
    "// config imports",
    config.imdb.imdbImport ??
      "import imdb from 'TODO: specify imdbImport in your airent config';",
    "// entity imports",
    `import { ${codeUtils.toPascalCase(entity.name)}PrimitiveField } from '${
      config._packages.baseToTypePath
    }/${entity._strings.moduleName}';`,
    ...buildModelImports(entity, config._packages.baseToTypePath),
  ];
}

function buildBeforeType(entity) {
  return buildModelImports(entity, ".");
}

function buildModelImports(entity, relativePath) {
  const associationTypes = entity.fields
    .filter(codeUtils.isAssociationField)
    .filter((field) => field.isImdb)
    .map((field) => field._type);
  const addedTypeNames = new Set();
  return associationTypes
    .map((type) => {
      if (type === undefined || addedTypeNames.has(type.name)) {
        return "";
      }
      addedTypeNames.add(type.name);
      return `import { ${codeUtils.toPascalCase(
        type.name
      )}Model } from '${relativePath}/${type._entity._strings.moduleName}';`;
    })
    .filter((line) => line.length > 0);
}

function buildLoaderImports(entity) {
  const hasImdbAssociation = entity.fields.some(
    (field) => codeUtils.isAssociationField(field) && field.isImdb
  );
  if (!hasImdbAssociation) {
    return [];
  }
  const imports = ["batchLoad"];
  if (entity.fields.some((field) => field.take)) {
    imports.push("batchLoadTopMany");
  }
  return imports;
}

function buildAfterType(entity) {
  const primitiveFields = entity.fields
    .filter(codeUtils.isPrimitiveField)
    .map((field) => `'${field.name}'`)
    .join(" | ");
  return [
    "",
    ...(entity.deprecated ? ["/** @deprecated */"] : []),
    `export type ${codeUtils.toPascalCase(
      entity.name
    )}PrimitiveField = ${primitiveFields};`,
  ];
}

const SHARED_LOADER_LINES = [
  "const model = one.toModel();",
  "this.fromModelInner(model, true);",
  "return this;",
];

function buildReloaderLines(entity) {
  const fieldAliasMap = entity.fields.reduce((acc, field) => {
    acc[field.name] = field.aliasOf ?? field.name;
    return acc;
  }, {});
  return [
    `const one = await ${entity._strings.baseClass}.findUnique({`,
    "  where: {",
    ...entity.keys.map((key) => `    ${fieldAliasMap[key]}: this.${key},`),
    "  },",
    "}, this.context);",
    "if (one === null) {",
    `  throw new Error('${entity.name} not found.');`,
    "}",
    ...SHARED_LOADER_LINES,
  ];
}

function buildSaverLines(entity) {
  const fieldAliasMap = entity.fields.reduce((acc, field) => {
    acc[field.name] = field.aliasOf ?? field.name;
    return acc;
  }, {});
  return [
    "const dirtyModel = this.toDirtyModel();",
    "if (Object.keys(dirtyModel).length === 0) {",
    "  return this;",
    "}",
    `const one = await ${entity._strings.baseClass}.update({`,
    "  where: {",
    ...entity.keys.map((key) => `    ${fieldAliasMap[key]}: this.${key},`),
    "  },",
    "  data: dirtyModel,",
    "}, this.context);",
    ...SHARED_LOADER_LINES,
  ];
}

function buildDeleterLines(entity) {
  const fieldAliasMap = entity.fields.reduce((acc, field) => {
    acc[field.name] = field.aliasOf ?? field.name;
    return acc;
  }, {});
  return [
    `const one = await ${entity._strings.baseClass}.delete({`,
    "  where: {",
    ...entity.keys.map((key) => `    ${fieldAliasMap[key]}: this.${key},`),
    "  },",
    "}, this.context);",
    ...SHARED_LOADER_LINES,
  ];
}

function buildSelfCreatorLines(entity) {
  return [
    `const one = await ${entity._strings.baseClass}.create({`,
    "  data: model,",
    "}, context);",
    "const createdModel = one.toModel();",
    "return (this as any).fromOne(createdModel, context);",
  ];
}

function buildInitializeMethodLines(entity) {
  const lines = entity.fields
    .filter(codeUtils.isAssociationField)
    .filter((field) => field.isImdb)
    .flatMap((field) => [
      `if (model.${field.name} !== undefined) {`,
      `  this.${field.name} = ${
        codeUtils.isNullableField(field) ? `model.${field.name} === null ? null : ` : ""
      }${field._type._entity._strings.entityClass}.${
        codeUtils.isArrayField(field) ? "fromArray" : "fromOne"
      }(${`model.${field.name}`}, context);`,
      "}",
    ])
    .map((line) => `  ${line}`);
  if (lines.length === 0) {
    return [];
  }
  return [
    "",
    `protected initialize(model: ${entity.model}, context: Context): void {`,
    ...lines,
    "}",
  ];
}

function buildImdbArgName(entity, methodName) {
  const modelName = entity.model;
  const argNameMap = {
    create: `CreateArgs<${modelName}>`,
    delete: `DeleteArgs<${modelName}>`,
    findFirst: `FindFirstArgs<${modelName}>`,
    findMany: `FindManyArgs<${modelName}>`,
    findOne: `FindOneArgs<${modelName}>`,
    findUnique: `FindUniqueArgs<${modelName}>`,
    update: `UpdateArgs<${modelName}>`,
  };
  return argNameMap[methodName];
}

function buildImdbMethodSignatureLines(entity, methodName, typeSuffix) {
  const argName = buildImdbArgName(entity, methodName);
  return [
    "",
    `public static async ${methodName}<`,
    `  ENTITY extends ${entity._strings.baseClass},`,
    `  T extends ${argName},`,
    ">(",
    `  this: EntityConstructor<${entity.model}, Context, ENTITY>,`,
    `  args: ValidateImdbArgs<T, ${argName}>,`,
    "  context: Context,",
    `): Promise<ENTITY${typeSuffix}> {`,
  ];
}

function buildImdbManyMethodLines(entity, methodName) {
  const collectionName = buildCollectionName(entity);
  const argName = buildImdbArgName(entity, methodName);
  const signatureLines = buildImdbMethodSignatureLines(entity, methodName, "[]");
  return [
    ...signatureLines,
    `  const models = await imdb.${collectionName}.${methodName}(`,
    `    args as ${argName}`,
    "  );",
    "  const many = (this as any).fromArray(models, context);",
    "  return many;",
    "}",
  ];
}

function buildImdbFindOneMethodLines(entity, methodName) {
  const collectionName = buildCollectionName(entity);
  const argName = buildImdbArgName(entity, methodName);
  const signatureLines = buildImdbMethodSignatureLines(entity, methodName, " | null");
  return [
    ...signatureLines,
    `  const model = await imdb.${collectionName}.${methodName}(`,
    `    args as ${argName}`,
    "  );",
    "  const one = model === null ? null : (this as any).fromOne(model, context) as ENTITY;",
    "  return one;",
    "}",
  ];
}

function buildOneBeforeLines(entity) {
  return [
    "const oneBefore = await (this as any).findUnique(",
    "  { where: args.where },",
    "  context",
    ") as ENTITY | null;",
    "if (oneBefore === null) {",
    `  throw new Error('${entity.name} not found.');`,
    "}",
  ];
}

const BEFORE_CREATE_LINES = ["await (this as any).beforeCreate(context);"];
const AFTER_CREATE_LINES = ["await (this as any).afterCreate(one, context);"];

function buildImdbCreateOneMethodLines(entity) {
  const beforeAndAfterHooksLines = [
    "",
    `protected static beforeCreate<ENTITY extends ${entity._strings.baseClass}>(`,
    `  this: EntityConstructor<${entity.model}, Context, ENTITY>,`,
    "  _context: Context",
    "): Awaitable<void> {}",
    "",
    `protected static afterCreate<ENTITY extends ${entity._strings.baseClass}>(`,
    `  this: EntityConstructor<${entity.model}, Context, ENTITY>,`,
    "  _one: ENTITY,",
    "  _context: Context",
    "): Awaitable<void> {}",
  ];
  const collectionName = buildCollectionName(entity);
  const argName = buildImdbArgName(entity, "create");
  const signatureLines = buildImdbMethodSignatureLines(entity, "create", "");
  const methodLines = [
    ...signatureLines,
    ...BEFORE_CREATE_LINES.map((line) => `  ${line}`),
    `  const model = await imdb.${collectionName}.create(`,
    `    args as ${argName}`,
    "  );",
    "  const one = (this as any).fromOne(model, context) as ENTITY;",
    ...AFTER_CREATE_LINES.map((line) => `  ${line}`),
    "  return one;",
    "}",
  ];
  return [...beforeAndAfterHooksLines, ...methodLines];
}

const AFTER_UPDATE_LINES = [
  "const updatedFields = entityCompare(",
  "  oneBefore,",
  "  one,",
  "  (this as any).PRIMITIVE_FIELDS",
  ");",
  "await (this as any).afterUpdate(oneBefore, one, updatedFields, context);",
];

function buildImdbUpdateOneMethodLines(entity) {
  const beforeAndAfterHooksLines = [
    "",
    `protected static PRIMITIVE_FIELDS: ${codeUtils.toPascalCase(
      entity.name
    )}PrimitiveField[] = [`,
    ...entity.fields
      .filter(codeUtils.isPrimitiveField)
      .map((field) => `  '${field.name}',`),
    "];",
    "",
    `protected static beforeUpdate<ENTITY extends ${entity._strings.baseClass}>(`,
    `  this: EntityConstructor<${entity.model}, Context, ENTITY>,`,
    "  _oneBefore: ENTITY,",
    "  _context: Context",
    "): Awaitable<void> {}",
    "",
    `protected static afterUpdate<ENTITY extends ${entity._strings.baseClass}>(`,
    `  this: EntityConstructor<${entity.model}, Context, ENTITY>,`,
    "  _oneBefore: ENTITY,",
    "  _oneAfter: ENTITY,",
    `  _updatedFields: ${codeUtils.toPascalCase(entity.name)}PrimitiveField[],`,
    "  _context: Context",
    "): Awaitable<void> {}",
  ];
  const collectionName = buildCollectionName(entity);
  const argName = buildImdbArgName(entity, "update");
  const signatureLines = buildImdbMethodSignatureLines(entity, "update", "");
  const methodLines = [
    ...signatureLines,
    ...buildOneBeforeLines(entity).map((line) => `  ${line}`),
    "  await (this as any).beforeUpdate(oneBefore, context);",
    `  const model = await imdb.${collectionName}.update(`,
    `    args as ${argName}`,
    "  );",
    "  const one = (this as any).fromOne(model, context) as ENTITY;",
    ...AFTER_UPDATE_LINES.map((line) => `  ${line}`),
    "  return one;",
    "}",
  ];
  return [...beforeAndAfterHooksLines, ...methodLines];
}

const AFTER_DELETE_LINES = [
  "await (this as any).afterDelete(oneBefore, context);",
];

function buildImdbDeleteOneMethodLines(entity) {
  const beforeAndAfterHooksLines = [
    "",
    `protected static beforeDelete<ENTITY extends ${entity._strings.baseClass}>(`,
    `  this: EntityConstructor<${entity.model}, Context, ENTITY>,`,
    "  _oneBefore: ENTITY,",
    "  _context: Context",
    "): Awaitable<void> {}",
    "",
    `protected static afterDelete<ENTITY extends ${entity._strings.baseClass}>(`,
    `  this: EntityConstructor<${entity.model}, Context, ENTITY>,`,
    "  _oneBefore: ENTITY,",
    "  _context: Context",
    "): Awaitable<void> {}",
  ];
  const collectionName = buildCollectionName(entity);
  const argName = buildImdbArgName(entity, "delete");
  const signatureLines = buildImdbMethodSignatureLines(entity, "delete", "");
  const methodLines = [
    ...signatureLines,
    ...buildOneBeforeLines(entity).map((line) => `  ${line}`),
    "  await (this as any).beforeDelete(oneBefore, context);",
    `  const model = await imdb.${collectionName}.delete(`,
    `    args as ${argName}`,
    "  );",
    "  const one = (this as any).fromOne(model, context) as ENTITY;",
    ...AFTER_DELETE_LINES.map((line) => `  ${line}`),
    "  return one;",
    "}",
  ];
  return [...beforeAndAfterHooksLines, ...methodLines];
}

function buildInsideBase(entity) {
  return [
    ...buildInitializeMethodLines(entity),
    "",
    "/** imdb wrappers */",
    ...buildImdbManyMethodLines(entity, "findMany"),
    ...buildImdbFindOneMethodLines(entity, "findOne"),
    ...buildImdbFindOneMethodLines(entity, "findFirst"),
    ...buildImdbFindOneMethodLines(entity, "findUnique"),
    ...buildImdbCreateOneMethodLines(entity),
    ...buildImdbUpdateOneMethodLines(entity),
    ...buildImdbDeleteOneMethodLines(entity),
  ];
}

function buildIsLoaderGeneratable(field) {
  if (field.imdbLoader === true) {
    return true;
  }
  if (field.imdbLoader === false) {
    return false;
  }
  const otherEntity = field._type?._entity;
  return otherEntity !== undefined && otherEntity.isImdb !== false;
}

function buildAssociationFieldModelsLoader(field, config) {
  const batch = field.take ? "batchLoadTopMany" : "batchLoad";
  const entity = field._type._entity;
  const collectionName = buildCollectionName(entity);
  const loader = field.orderBy?.length
    ? `(query) => imdb.${collectionName}.findMany({ ...query, orderBy: { ${field.orderBy
        .flatMap((item) => Object.keys(item).map((key) => `${key}: '${item[key]}'`))
        .join(", ")} } })`
    : `imdb.${collectionName}.findMany`;

  const targetFields = codeUtils.getTargetFields(field);
  const matcher = field.take
    ? `, (key, entity) => ${targetFields
        .map(
          (targetField) =>
            `key.${targetField.aliasOf ?? targetField.name} === entity.${targetField.name}`
        )
        .join(" && ")}`
    : "";

  const topSize = field.take ? `, ${field.take}` : "";
  const batchSize =
    config.imdb.imdbBatchSize === undefined
      ? ""
      : `, ${config.imdb.imdbBatchSize}`;

  return `await ${batch}(${loader}${matcher}, keys${topSize}${batchSize})`;
}

function augmentOne(entity, config, isVerbose) {
  if (entity.isImdb === false) {
    return;
  }
  if (isVerbose) {
    console.log(`[AIRENT-IMDB/INFO] augmenting ${entity.name}`);
  }
  entity._code.beforeBase.push(...buildBeforeBase(entity, config));
  entity._code.insideBase.push(...buildInsideBase(entity));
  entity._code.beforeType.push(...buildBeforeType(entity));
  entity._code.afterType.push(...buildAfterType(entity));
  entity._code.reloaderLines = buildReloaderLines(entity);
  entity._code.saverLines = buildSaverLines(entity);
  entity._code.deleterLines = buildDeleterLines(entity);
  entity._code.selfCreatorLines = buildSelfCreatorLines(entity);
  entity.skipSelfLoader = true;
  entity.fields.filter(codeUtils.isAssociationField).forEach((field) => {
    const { loadConfig } = field._code;
    const isLoaderGeneratable = buildIsLoaderGeneratable(field);
    loadConfig.isLoaderGeneratable = isLoaderGeneratable;
    loadConfig.targetModelsLoader = isLoaderGeneratable
      ? buildAssociationFieldModelsLoader(field, config)
      : "[/* TODO: load associated models */]";
  });
}

function augment(data, isVerbose) {
  const { entityMap, config } = data;
  augmentConfig(config);
  Object.values(entityMap).forEach((entity) =>
    augmentOne(entity, config, isVerbose)
  );
}

module.exports = { augment };
