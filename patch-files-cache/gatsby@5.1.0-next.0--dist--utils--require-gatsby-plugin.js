"use strict";

exports.__esModule = true;
exports.requireGatsbyPlugin = requireGatsbyPlugin;
exports.setGatsbyPluginCache = setGatsbyPluginCache;
const pluginModuleCache = new Map();

function setGatsbyPluginCache(plugin, module, moduleObject) {
  const key = `${plugin.name}/${module}`;
  pluginModuleCache.set(key, moduleObject);
}

function requireGatsbyPlugin(plugin, module) {
  const key = `${plugin.name}/${module}`;
  let pluginModule = pluginModuleCache.get(key);

  if (!pluginModule) {
    pluginModule = require(module === `gatsby-node` && plugin.resolvedCompiledGatsbyNode ? plugin.resolvedCompiledGatsbyNode : `${plugin.resolve}/${module}`);
    pluginModuleCache.set(key, pluginModule);
  }

  return pluginModule;
}
//# sourceMappingURL=require-gatsby-plugin.js.map