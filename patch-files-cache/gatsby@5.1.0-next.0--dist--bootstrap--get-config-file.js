"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

exports.__esModule = true;
exports.getConfigFile = getConfigFile;

var _fsExtra = _interopRequireDefault(require("fs-extra"));

var _testRequireError = require("../utils/test-require-error");

var _reporter = _interopRequireDefault(require("gatsby-cli/lib/reporter"));

var _path = _interopRequireDefault(require("path"));

var _fsExistsCached = require("fs-exists-cached");

var _compileGatsbyFiles = require("../utils/parcel/compile-gatsby-files");

var _isNearMatch = require("../utils/is-near-match");

async function getConfigFile(siteDirectory, configName, distance = 3) {
  let configPath = ``;
  let configFilePath = ``;
  let configModule; // Attempt to find compiled gatsby-config.js in .cache/compiled/gatsby-config.js

  try {
    configPath = _path.default.join(`${siteDirectory}/${_compileGatsbyFiles.COMPILED_CACHE_DIR}`, configName);
    configFilePath = require.resolve(configPath);
    configModule = require(configFilePath);
  } catch (outerError) {
    var _outerError$requireSt, _outerError$requireSt2, _outerError$requireSt3;

    // Not all plugins will have a compiled file, so the err.message can look like this:
    // "Cannot find module '<root>/node_modules/gatsby-source-filesystem/.cache/compiled/gatsby-config'"
    // But the compiled file can also have an error like this:
    // "Cannot find module 'foobar'"
    // So this is trying to differentiate between an error we're fine ignoring and an error that we should throw
    const isModuleNotFoundError = outerError.code === `MODULE_NOT_FOUND`;
    const isThisFileRequireError = (_outerError$requireSt = outerError === null || outerError === void 0 ? void 0 : (_outerError$requireSt2 = outerError.requireStack) === null || _outerError$requireSt2 === void 0 ? void 0 : (_outerError$requireSt3 = _outerError$requireSt2[0]) === null || _outerError$requireSt3 === void 0 ? void 0 : _outerError$requireSt3.includes(`get-config-file`)) !== null && _outerError$requireSt !== void 0 ? _outerError$requireSt : true; // User's module require error inside gatsby-config.js

    if (!(isModuleNotFoundError && isThisFileRequireError)) {
      _reporter.default.panic({
        id: `11902`,
        error: outerError,
        context: {
          configName,
          message: outerError.message
        }
      });
    } // Attempt to find uncompiled gatsby-config.js in root dir


    configPath = _path.default.join(siteDirectory, configName);

    try {
      configFilePath = require.resolve(configPath);
      configModule = require(configFilePath);
    } catch (innerError) {
      // Some other error that is not a require error
      if (!(0, _testRequireError.testRequireError)(configPath, innerError)) {
        _reporter.default.panic({
          id: `10123`,
          error: innerError,
          context: {
            configName,
            message: innerError.message
          }
        });
      }

      const files = await _fsExtra.default.readdir(siteDirectory);
      let tsConfig = false;
      let nearMatch = ``;

      for (const file of files) {
        if (tsConfig || nearMatch) {
          break;
        }

        const {
          name,
          ext
        } = _path.default.parse(file);

        if (name === configName && ext === `.ts`) {
          tsConfig = true;
          break;
        }

        if ((0, _isNearMatch.isNearMatch)(name, configName, distance)) {
          nearMatch = file;
        }
      } // gatsby-config.ts exists but compiled gatsby-config.js does not


      if (tsConfig) {
        _reporter.default.panic({
          id: `10127`,
          error: innerError,
          context: {
            configName
          }
        });
      } // gatsby-config is misnamed


      if (nearMatch) {
        const isTSX = nearMatch.endsWith(`.tsx`);

        _reporter.default.panic({
          id: `10124`,
          error: innerError,
          context: {
            configName,
            nearMatch,
            isTSX
          }
        });
      } // gatsby-config.js is incorrectly located in src/gatsby-config.js


      if ((0, _fsExistsCached.sync)(_path.default.join(siteDirectory, `src`, configName + `.js`))) {
        _reporter.default.panic({
          id: `10125`,
          context: {
            configName
          }
        });
      }
    }
  }

  return {
    configModule,
    configFilePath
  };
}
//# sourceMappingURL=get-config-file.js.map