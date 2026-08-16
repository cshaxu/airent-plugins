const path = require("path");

const pathUtils = require("airent/resources/utils/path.js");

function augmentConfig(config) {
  config._packages.apiExpress = {
    handlerToLibFull: config.apiExpress.libImportPath
      ? pathUtils.buildRelativeFull(
          path.join(config.generatedPath, "handlers"),
          config.apiExpress.libImportPath,
          config
        )
      : "@airent/api-express",
    handlerToHandlerConfigFull: pathUtils.buildRelativeFull(
      path.join(config.generatedPath, "handlers"),
      config.apiExpress.handlerConfigImportPath,
      config
    ),
  };
}

function augmentOne(entity, config) {
  if (!entity.api) {
    return;
  }

  entity._packages.apiExpress = {
    routesToHandlerFull: pathUtils.buildRelativePath(
      path.dirname(config.apiExpress.routesFilePath),
      path.join(config.generatedPath, "handlers", entity._strings.moduleName)
    ),
    handlerToDispatcherFull: pathUtils.buildRelativePath(
      path.join(config.generatedPath, "handlers"),
      path.join(config.generatedPath, "dispatchers", entity._strings.moduleName)
    ),
  };
}

function augment(data) {
  const { entityMap, config } = data;
  augmentConfig(config);
  Object.values(entityMap).forEach((entity) => augmentOne(entity, config));
}

module.exports = { augment };
