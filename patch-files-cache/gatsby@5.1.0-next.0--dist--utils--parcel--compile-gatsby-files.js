"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

exports.__esModule = true;
exports.PARCEL_CACHE_DIR = exports.COMPILED_CACHE_DIR = void 0;
exports.compileGatsbyFiles = compileGatsbyFiles;
exports.constructParcel = constructParcel;
exports.findCompiledLocalPluginModule = findCompiledLocalPluginModule;
exports.gatsbyFileRegex = void 0;
exports.getResolvedFieldsForPlugin = getResolvedFieldsForPlugin;

var _core = require("@parcel/core");

var _cache = require("@parcel/cache");

var _path = _interopRequireDefault(require("path"));

var _reporter = _interopRequireDefault(require("gatsby-cli/lib/reporter"));

var _fsExtra = require("fs-extra");

var _gatsbyTelemetry = _interopRequireDefault(require("gatsby-telemetry"));

var _isNearMatch = require("../is-near-match");

const COMPILED_CACHE_DIR = `.cache/compiled`;
exports.COMPILED_CACHE_DIR = COMPILED_CACHE_DIR;
const PARCEL_CACHE_DIR = `.cache/.parcel-cache`;
exports.PARCEL_CACHE_DIR = PARCEL_CACHE_DIR;
const gatsbyFileRegex = `gatsby-+(node|config).ts`;
exports.gatsbyFileRegex = gatsbyFileRegex;
const RETRY_COUNT = 5;

function getCacheDir(siteRoot) {
  return `${siteRoot}/${PARCEL_CACHE_DIR}`;
}

function exponentialBackoff(retry) {
  if (retry === 0) {
    return Promise.resolve();
  }

  const timeout = 50 * Math.pow(2, retry);
  return new Promise(resolve => setTimeout(resolve, timeout));
}
/**
 * Construct Parcel with config.
 * @see {@link https://parceljs.org/features/targets/}
 */


function constructParcel(siteRoot, cache) {
  return new _core.Parcel({
    entries: [`${siteRoot}/${gatsbyFileRegex}`, `${siteRoot}/plugins/**/${gatsbyFileRegex}`],
    defaultConfig: require.resolve(`gatsby-parcel-config`),
    mode: `production`,
    cache,
    targets: {
      root: {
        outputFormat: `commonjs`,
        includeNodeModules: false,
        sourceMap: process.env.NODE_ENV === `development`,
        engines: {
          node: "5" === `5` ? `>= 18.0.0` : `>= 14.15.0`
        },
        distDir: `${siteRoot}/${COMPILED_CACHE_DIR}`
      }
    },
    cacheDir: getCacheDir(siteRoot)
  });
}
/**
 * Compile known gatsby-* files (e.g. `gatsby-config`, `gatsby-node`)
 * and output in `<SITE_ROOT>/.cache/compiled`.
 */


async function compileGatsbyFiles(siteRoot, retry = 0) {
  try {
    // Check for gatsby-node.jsx and gatsby-node.tsx (or other misnamed variations)
    const files = await (0, _fsExtra.readdir)(siteRoot);
    let nearMatch = ``;
    const configName = `gatsby-node`;

    for (const file of files) {
      if (nearMatch) {
        break;
      }

      const {
        name
      } = _path.default.parse(file); // Of course, allow valid gatsby-node files


      if (file === `gatsby-node.js` || file === `gatsby-node.ts`) {
        break;
      }

      if ((0, _isNearMatch.isNearMatch)(name, configName, 3)) {
        nearMatch = file;
      }
    } // gatsby-node is misnamed


    if (nearMatch) {
      const isTSX = nearMatch.endsWith(`.tsx`);

      _reporter.default.panic({
        id: `10128`,
        context: {
          configName,
          nearMatch,
          isTSX
        }
      });
    }

    const distDir = `${siteRoot}/${COMPILED_CACHE_DIR}`;
    await (0, _fsExtra.ensureDir)(distDir);
    await (0, _fsExtra.emptyDir)(distDir);
    await exponentialBackoff(retry); // for whatever reason TS thinks LMDBCache is some browser Cache and not actually Parcel's Cache
    // so we force type it to Parcel's Cache

    const cache = new _cache.LMDBCache(getCacheDir(siteRoot));
    const parcel = constructParcel(siteRoot, cache);
    const {
      bundleGraph
    } = await parcel.run();
    let cacheClosePromise = Promise.resolve();

    try {
      // @ts-ignore store is public field on LMDBCache class, but public interface for Cache
      // doesn't have it. There doesn't seem to be proper public API for this, so we have to
      // resort to reaching into internals. Just in case this is wrapped in try/catch if
      // parcel changes internals in future (closing cache is only needed when retrying
      // so the if the change happens we shouldn't fail on happy builds)
      cacheClosePromise = cache.store.close();
    } catch (e) {
      _reporter.default.verbose(`Failed to close parcel cache\n${e.toString()}`);
    }

    await exponentialBackoff(retry);
    const bundles = bundleGraph.getBundles();
    if (bundles.length === 0) return;
    let compiledTSFilesCount = 0;

    for (const bundle of bundles) {
      var _bundle$getMainEntry2;

      // validate that output exists and is valid
      try {
        delete require.cache[bundle.filePath];

        require(bundle.filePath);
      } catch (e) {
        if (retry >= RETRY_COUNT) {
          var _bundle$getMainEntry;

          _reporter.default.panic({
            id: `11904`,
            context: {
              siteRoot,
              retries: RETRY_COUNT,
              compiledFileLocation: bundle.filePath,
              sourceFileLocation: (_bundle$getMainEntry = bundle.getMainEntry()) === null || _bundle$getMainEntry === void 0 ? void 0 : _bundle$getMainEntry.filePath
            }
          });
        } else if (retry > 0) {
          // first retry is most flaky and it seems it always get in good state
          // after that - most likely cache clearing is the trick that fixes the problem
          _reporter.default.verbose(`Failed to import compiled file "${bundle.filePath}" after retry, attempting another retry (#${retry + 1} of ${RETRY_COUNT}) - "${e.message}"`);
        } // sometimes parcel cache gets in weird state and we need to clear the cache


        await cacheClosePromise;

        try {
          await (0, _fsExtra.remove)(getCacheDir(siteRoot));
        } catch {// in windows we might get "EBUSY" errors if LMDB failed to close, so this try/catch is
          // to prevent EBUSY errors from potentially hiding real import errors
        }

        await compileGatsbyFiles(siteRoot, retry + 1);
        return;
      }

      const mainEntry = (_bundle$getMainEntry2 = bundle.getMainEntry()) === null || _bundle$getMainEntry2 === void 0 ? void 0 : _bundle$getMainEntry2.filePath; // mainEntry won't exist for shared chunks

      if (mainEntry) {
        if (mainEntry.endsWith(`.ts`)) {
          compiledTSFilesCount = compiledTSFilesCount + 1;
        }
      }
    }

    if (_gatsbyTelemetry.default.isTrackingEnabled()) {
      _gatsbyTelemetry.default.trackCli(`PARCEL_COMPILATION_END`, {
        valueInteger: compiledTSFilesCount,
        name: `count of compiled ts files`
      });
    }
  } catch (error) {
    if (error.diagnostics) {
      handleErrors(error.diagnostics);
    } else {
      _reporter.default.panic({
        id: `11903`,
        error,
        context: {
          siteRoot,
          sourceMessage: error.message
        }
      });
    }
  }
}

function handleErrors(diagnostics) {
  diagnostics.forEach(err => {
    if (err.codeFrames) {
      err.codeFrames.forEach(c => {
        var _c$codeHighlights$;

        // Assuming that codeHighlights only ever has one entry in the array. Local tests only ever showed one
        const codeHighlightsMessage = c === null || c === void 0 ? void 0 : (_c$codeHighlights$ = c.codeHighlights[0]) === null || _c$codeHighlights$ === void 0 ? void 0 : _c$codeHighlights$.message; // If both messages are the same don't print the specific, otherwise they would be duplicate

        const specificMessage = codeHighlightsMessage === err.message ? undefined : codeHighlightsMessage;

        _reporter.default.panic({
          id: `11901`,
          context: {
            filePath: c === null || c === void 0 ? void 0 : c.filePath,
            generalMessage: err.message,
            specificMessage,
            origin: err === null || err === void 0 ? void 0 : err.origin,
            hints: err === null || err === void 0 ? void 0 : err.hints
          }
        });
      });
    } else {
      _reporter.default.panic({
        id: `11901`,
        context: {
          generalMessage: err.message,
          origin: err === null || err === void 0 ? void 0 : err.origin,
          hints: err === null || err === void 0 ? void 0 : err.hints
        }
      });
    }
  });
}

function getResolvedFieldsForPlugin(rootDir, pluginName) {
  return {
    resolvedCompiledGatsbyNode: findCompiledLocalPluginModule(rootDir, pluginName, `gatsby-node`)
  };
}

function findCompiledLocalPluginModule(rootDir, pluginName, moduleName) {
  const compiledPathForPlugin = pluginName === `default-site-plugin` ? `${rootDir}/${COMPILED_CACHE_DIR}` : `${rootDir}/${COMPILED_CACHE_DIR}/plugins/${pluginName}`;
  const compiledPathForModule = `${compiledPathForPlugin}/${moduleName}.js`;
  const isCompiled = (0, _fsExtra.existsSync)(compiledPathForModule);

  if (isCompiled) {
    return compiledPathForModule;
  }

  return undefined;
}
//# sourceMappingURL=compile-gatsby-files.js.map