const path = require("path");

const pathUtils = require("airent/resources/utils/path.js");

function augmentConfig(config) {
  config._packages.apiNext = config._packages.apiNext || {};

  config._packages.apiNext.handlerToLibFull = config.apiNext.libImportPath
    ? pathUtils.buildRelativeFull(
        path.join(config.generatedPath, "handlers"),
        config.apiNext.libImportPath,
        config,
      )
    : "@airent/api-next";
  config._packages.apiNext.handlerToHandlerConfigFull =
    pathUtils.buildRelativeFull(
    path.join(config.generatedPath, "handlers"),
    config.apiNext.handlerConfigImportPath,
    config,
  );

  config._packages.apiNext.serverClientToLibFull = config.apiNext.libImportPath
    ? pathUtils.buildRelativeFull(
        path.join(config.generatedPath, "server-clients"),
        config.apiNext.libImportPath,
        config,
      )
    : "@airent/api-next";
  config._packages.apiNext.serverClientToHandlerConfigFull =
    pathUtils.buildRelativeFull(
      path.join(config.generatedPath, "server-clients"),
      config.apiNext.handlerConfigImportPath,
      config,
    );
  config._packages.apiNext.serverClientToContextFull =
    pathUtils.buildRelativeFull(
      path.join(config.generatedPath, "server-clients"),
      config.contextImportPath,
      config,
    );
  config._packages.apiNext.serverClientToBaseUrlFull =
    pathUtils.buildRelativeFull(
      path.join(config.generatedPath, "server-clients"),
      config.api.client.baseUrlImportPath,
      config,
    );
}

function augmentOne(entity, config) {
  if (!entity.api) {
    return;
  }

  entity._packages.apiNext = {
    routeToHandlerFull: pathUtils.buildRelativePath(
      path.join(
        config.apiNext.appPath,
        config.apiNext.airentApiPath,
        "placeholder"
      ),
      path.join(config.generatedPath, "handlers", entity._strings.moduleName),
      config
    ),
    handlerToDispatcherFull: pathUtils.buildRelativePath(
      path.join(config.generatedPath, "handlers"),
      path.join(config.generatedPath, "dispatchers", entity._strings.moduleName)
    ),

    serverClientToTypeFull: pathUtils.buildRelativePath(
      path.join(config.generatedPath, "server-clients"),
      path.join(config.generatedPath, "types", entity._strings.moduleName)
    ),
    serverClientToDispatcherFull: pathUtils.buildRelativePath(
      path.join(config.generatedPath, "server-clients"),
      path.join(config.generatedPath, "dispatchers", entity._strings.moduleName)
    ),
    serverClientToRequestFull: pathUtils.buildRelativePath(
      path.join(config.generatedPath, "server-clients"),
      path.join(config.api.typesPath, entity._strings.moduleName)
    ),

    edgeClientToTypeFull: pathUtils.buildRelativePath(
      path.join(config.generatedPath, "edge-clients"),
      path.join(config.generatedPath, "types", entity._strings.moduleName)
    ),
    edgeClientToRequestFull: pathUtils.buildRelativePath(
      path.join(config.generatedPath, "edge-clients"),
      path.join(config.api.typesPath, entity._strings.moduleName)
    ),
    edgeClientToClientFull: pathUtils.buildRelativePath(
      path.join(config.generatedPath, "edge-clients"),
      path.join(config.generatedPath, "clients", entity._strings.moduleName)
    ),
  };
}

function augment(data) {
  const { entityMap, config } = data;
  augmentConfig(config);
  Object.values(entityMap).forEach((entity) => augmentOne(entity, config));
}

module.exports = { augment };
