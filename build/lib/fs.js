"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.fs = exports.default = void 0;
require("source-map-support/register");
var _bluebird = _interopRequireDefault(require("bluebird"));
var _crypto = _interopRequireDefault(require("crypto"));
var _fs = require("fs");
var _glob = require("glob");
var _klaw = _interopRequireDefault(require("klaw"));
var _lodash = _interopRequireDefault(require("lodash"));
var _mv = _interopRequireDefault(require("mv"));
var _ncp = _interopRequireDefault(require("ncp"));
var _path = _interopRequireDefault(require("path"));
var _pkgDir = _interopRequireDefault(require("pkg-dir"));
var _readPkg = _interopRequireDefault(require("read-pkg"));
var _sanitizeFilename = _interopRequireDefault(require("sanitize-filename"));
var _which = _interopRequireDefault(require("which"));
var _logger = _interopRequireDefault(require("./logger"));
var _timing = _interopRequireDefault(require("./timing"));
var _system = require("./system");
var _util = require("./util");
const ncpAsync = _bluebird.default.promisify(_ncp.default);
const findRootCached = _lodash.default.memoize(_pkgDir.default.sync);
const fs = exports.fs = {
  async hasAccess(path) {
    try {
      await _fs.promises.access(path, _fs.constants.R_OK);
    } catch {
      return false;
    }
    return true;
  },
  async isExecutable(path) {
    try {
      if ((0, _system.isWindows)()) {
        return await fs.hasAccess(path);
      }
      await _fs.promises.access(path, _fs.constants.R_OK | _fs.constants.X_OK);
    } catch {
      return false;
    }
    return true;
  },
  async exists(path) {
    return await fs.hasAccess(path);
  },
  async rimraf(filepath) {
    return await _fs.promises.rm(filepath, {
      recursive: true,
      force: true
    });
  },
  rimrafSync(filepath) {
    return (0, _fs.rmSync)(filepath, {
      recursive: true,
      force: true
    });
  },
  async mkdir(filepath, opts = {}) {
    try {
      return await _fs.promises.mkdir(filepath, opts);
    } catch (err) {
      if ((err === null || err === void 0 ? void 0 : err.code) !== 'EEXIST') {
        throw err;
      }
    }
  },
  async copyFile(source, destination, opts = {}) {
    if (!(await fs.hasAccess(source))) {
      throw new Error(`The file at '${source}' does not exist or is not accessible`);
    }
    return await ncpAsync(source, destination, opts);
  },
  async md5(filePath) {
    return await fs.hash(filePath, 'md5');
  },
  mv: _bluebird.default.promisify(_mv.default),
  which: _which.default,
  glob: (pattern, options) => _bluebird.default.resolve(options ? (0, _glob.glob)(pattern, options) : (0, _glob.glob)(pattern)),
  sanitizeName: _sanitizeFilename.default,
  async hash(filePath, algorithm = 'sha1') {
    return await new _bluebird.default((resolve, reject) => {
      const fileHash = _crypto.default.createHash(algorithm);
      const readStream = (0, _fs.createReadStream)(filePath);
      readStream.on('error', e => reject(new Error(`Cannot calculate ${algorithm} hash for '${filePath}'. Original error: ${e.message}`)));
      readStream.on('data', chunk => fileHash.update(chunk));
      readStream.on('end', () => resolve(fileHash.digest('hex')));
    });
  },
  walk(dir, opts) {
    return (0, _klaw.default)(dir, opts);
  },
  async mkdirp(dir) {
    return await fs.mkdir(dir, {
      recursive: true
    });
  },
  async walkDir(dir, recursive, callback) {
    let isValidRoot = false;
    let errMsg = null;
    try {
      isValidRoot = (await fs.stat(dir)).isDirectory();
    } catch (e) {
      errMsg = e.message;
    }
    if (!isValidRoot) {
      throw Error(`'${dir}' is not a valid root directory` + (errMsg ? `. Original error: ${errMsg}` : ''));
    }
    let walker;
    let fileCount = 0;
    let directoryCount = 0;
    const timer = new _timing.default().start();
    return await new _bluebird.default(function (resolve, reject) {
      let lastFileProcessed = _bluebird.default.resolve();
      walker = (0, _klaw.default)(dir, {
        depthLimit: recursive ? -1 : 0
      });
      walker.on('data', function (item) {
        walker.pause();
        if (!item.stats.isDirectory()) {
          fileCount++;
        } else {
          directoryCount++;
        }
        lastFileProcessed = _bluebird.default.try(async () => await callback(item.path, item.stats.isDirectory())).then(function (done = false) {
          if (done) {
            resolve(item.path);
          } else {
            walker.resume();
          }
        }).catch(reject);
      }).on('error', function (err, item) {
        _logger.default.warn(`Got an error while walking '${item.path}': ${err.message}`);
        if (err.code === 'ENOENT') {
          _logger.default.warn('All files may not have been accessed');
          reject(err);
        }
      }).on('end', function () {
        lastFileProcessed.then(file => {
          resolve(file !== null && file !== void 0 ? file : null);
        }).catch(function (err) {
          _logger.default.warn(`Unexpected error: ${err.message}`);
          reject(err);
        });
      });
    }).finally(function () {
      _logger.default.debug(`Traversed ${(0, _util.pluralize)('directory', directoryCount, true)} ` + `and ${(0, _util.pluralize)('file', fileCount, true)} ` + `in ${timer.getDuration().asMilliSeconds.toFixed(0)}ms`);
      if (walker) {
        walker.destroy();
      }
    });
  },
  readPackageJsonFrom(dir, opts = {}) {
    const cwd = fs.findRoot(dir);
    try {
      return _readPkg.default.sync({
        normalize: true,
        ...opts,
        cwd
      });
    } catch (err) {
      err.message = `Failed to read a \`package.json\` from dir \`${dir}\`:\n\n${err.message}`;
      throw err;
    }
  },
  findRoot(dir) {
    if (!dir || !_path.default.isAbsolute(dir)) {
      throw new TypeError('`findRoot()` must be provided a non-empty, absolute path');
    }
    const result = findRootCached(dir);
    if (!result) {
      throw new Error(`\`findRoot()\` could not find \`package.json\` from ${dir}`);
    }
    return result;
  },
  access: _fs.promises.access,
  appendFile: _fs.promises.appendFile,
  chmod: _fs.promises.chmod,
  close: _bluebird.default.promisify(_fs.close),
  constants: _fs.constants,
  createWriteStream: _fs.createWriteStream,
  createReadStream: _fs.createReadStream,
  lstat: _fs.promises.lstat,
  open: _bluebird.default.promisify(_fs.open),
  openFile: _fs.promises.open,
  readdir: _fs.promises.readdir,
  read: _bluebird.default.promisify(_fs.read),
  readFile: _fs.promises.readFile,
  readlink: _fs.promises.readlink,
  realpath: _fs.promises.realpath,
  rename: _fs.promises.rename,
  stat: _fs.promises.stat,
  symlink: _fs.promises.symlink,
  unlink: _fs.promises.unlink,
  write: _bluebird.default.promisify(_fs.write),
  writeFile: _fs.promises.writeFile,
  F_OK: _fs.constants.F_OK,
  R_OK: _fs.constants.R_OK,
  W_OK: _fs.constants.W_OK,
  X_OK: _fs.constants.X_OK
};
var _default = exports.default = fs;require('source-map-support').install();


//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGliL2ZzLmpzIiwibmFtZXMiOlsiX2JsdWViaXJkIiwiX2ludGVyb3BSZXF1aXJlRGVmYXVsdCIsInJlcXVpcmUiLCJfY3J5cHRvIiwiX2ZzIiwiX2dsb2IiLCJfa2xhdyIsIl9sb2Rhc2giLCJfbXYiLCJfbmNwIiwiX3BhdGgiLCJfcGtnRGlyIiwiX3JlYWRQa2ciLCJfc2FuaXRpemVGaWxlbmFtZSIsIl93aGljaCIsIl9sb2dnZXIiLCJfdGltaW5nIiwiX3N5c3RlbSIsIl91dGlsIiwibmNwQXN5bmMiLCJCIiwicHJvbWlzaWZ5IiwibmNwIiwiZmluZFJvb3RDYWNoZWQiLCJfIiwibWVtb2l6ZSIsInBrZ0RpciIsInN5bmMiLCJmcyIsImV4cG9ydHMiLCJoYXNBY2Nlc3MiLCJwYXRoIiwiZnNQcm9taXNlcyIsImFjY2VzcyIsImNvbnN0YW50cyIsIlJfT0siLCJpc0V4ZWN1dGFibGUiLCJpc1dpbmRvd3MiLCJYX09LIiwiZXhpc3RzIiwicmltcmFmIiwiZmlsZXBhdGgiLCJybSIsInJlY3Vyc2l2ZSIsImZvcmNlIiwicmltcmFmU3luYyIsInJtU3luYyIsIm1rZGlyIiwib3B0cyIsImVyciIsImNvZGUiLCJjb3B5RmlsZSIsInNvdXJjZSIsImRlc3RpbmF0aW9uIiwiRXJyb3IiLCJtZDUiLCJmaWxlUGF0aCIsImhhc2giLCJtdiIsIndoaWNoIiwiZ2xvYiIsInBhdHRlcm4iLCJvcHRpb25zIiwicmVzb2x2ZSIsInNhbml0aXplTmFtZSIsInNhbml0aXplIiwiYWxnb3JpdGhtIiwicmVqZWN0IiwiZmlsZUhhc2giLCJjcnlwdG8iLCJjcmVhdGVIYXNoIiwicmVhZFN0cmVhbSIsImNyZWF0ZVJlYWRTdHJlYW0iLCJvbiIsImUiLCJtZXNzYWdlIiwiY2h1bmsiLCJ1cGRhdGUiLCJkaWdlc3QiLCJ3YWxrIiwiZGlyIiwia2xhdyIsIm1rZGlycCIsIndhbGtEaXIiLCJjYWxsYmFjayIsImlzVmFsaWRSb290IiwiZXJyTXNnIiwic3RhdCIsImlzRGlyZWN0b3J5Iiwid2Fsa2VyIiwiZmlsZUNvdW50IiwiZGlyZWN0b3J5Q291bnQiLCJ0aW1lciIsIlRpbWVyIiwic3RhcnQiLCJsYXN0RmlsZVByb2Nlc3NlZCIsImRlcHRoTGltaXQiLCJpdGVtIiwicGF1c2UiLCJzdGF0cyIsInRyeSIsInRoZW4iLCJkb25lIiwicmVzdW1lIiwiY2F0Y2giLCJsb2ciLCJ3YXJuIiwiZmlsZSIsImZpbmFsbHkiLCJkZWJ1ZyIsInBsdXJhbGl6ZSIsImdldER1cmF0aW9uIiwiYXNNaWxsaVNlY29uZHMiLCJ0b0ZpeGVkIiwiZGVzdHJveSIsInJlYWRQYWNrYWdlSnNvbkZyb20iLCJjd2QiLCJmaW5kUm9vdCIsInJlYWRQa2ciLCJub3JtYWxpemUiLCJpc0Fic29sdXRlIiwiVHlwZUVycm9yIiwicmVzdWx0IiwiYXBwZW5kRmlsZSIsImNobW9kIiwiY2xvc2UiLCJjcmVhdGVXcml0ZVN0cmVhbSIsImxzdGF0Iiwib3BlbiIsIm9wZW5GaWxlIiwicmVhZGRpciIsInJlYWQiLCJyZWFkRmlsZSIsInJlYWRsaW5rIiwicmVhbHBhdGgiLCJyZW5hbWUiLCJzeW1saW5rIiwidW5saW5rIiwid3JpdGUiLCJ3cml0ZUZpbGUiLCJGX09LIiwiV19PSyIsIl9kZWZhdWx0IiwiZGVmYXVsdCJdLCJzb3VyY2VSb290IjoiLi4vLi4iLCJzb3VyY2VzIjpbImxpYi9mcy5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyIvLyBAdHMtY2hlY2tcblxuaW1wb3J0IEIgZnJvbSAnYmx1ZWJpcmQnO1xuaW1wb3J0IGNyeXB0byBmcm9tICdjcnlwdG8nO1xuaW1wb3J0IHtcbiAgY2xvc2UsXG4gIGNvbnN0YW50cyxcbiAgY3JlYXRlUmVhZFN0cmVhbSxcbiAgY3JlYXRlV3JpdGVTdHJlYW0sXG4gIHByb21pc2VzIGFzIGZzUHJvbWlzZXMsXG4gIHJlYWQsXG4gIHdyaXRlLFxuICBybVN5bmMsXG4gIG9wZW4sXG59IGZyb20gJ2ZzJztcbmltcG9ydCB7IGdsb2IgfSBmcm9tICdnbG9iJztcbmltcG9ydCBrbGF3IGZyb20gJ2tsYXcnO1xuaW1wb3J0IF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCBtdiBmcm9tICdtdic7XG5pbXBvcnQgbmNwIGZyb20gJ25jcCc7XG5pbXBvcnQgcGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCBwa2dEaXIgZnJvbSAncGtnLWRpcic7XG5pbXBvcnQgcmVhZFBrZyBmcm9tICdyZWFkLXBrZyc7XG5pbXBvcnQgc2FuaXRpemUgZnJvbSAnc2FuaXRpemUtZmlsZW5hbWUnO1xuaW1wb3J0IHdoaWNoIGZyb20gJ3doaWNoJztcbmltcG9ydCBsb2cgZnJvbSAnLi9sb2dnZXInO1xuaW1wb3J0IFRpbWVyIGZyb20gJy4vdGltaW5nJztcbmltcG9ydCB7aXNXaW5kb3dzfSBmcm9tICcuL3N5c3RlbSc7XG5pbXBvcnQge3BsdXJhbGl6ZX0gZnJvbSAnLi91dGlsJztcblxuY29uc3QgbmNwQXN5bmMgPVxuICAvKiogQHR5cGUgeyhzb3VyY2U6IHN0cmluZywgZGVzdDogc3RyaW5nLCBvcHRzOiBuY3AuT3B0aW9uc3x1bmRlZmluZWQpID0+IEI8dm9pZD59ICovIChcbiAgICBCLnByb21pc2lmeShuY3ApXG4gICk7XG5jb25zdCBmaW5kUm9vdENhY2hlZCA9IF8ubWVtb2l6ZShwa2dEaXIuc3luYyk7XG5cbmNvbnN0IGZzID0ge1xuICAvKipcbiAgICogUmVzb2x2ZXMgYHRydWVgIGlmIGBwYXRoYCBpcyBfcmVhZGFibGVfLCB3aGljaCBkaWZmZXJzIGZyb20gTm9kZS5qcycgZGVmYXVsdCBiZWhhdmlvciBvZiBcImNhbiB3ZSBzZWUgaXQ/XCJcbiAgICpcbiAgICogT24gV2luZG93cywgQUNMcyBhcmUgbm90IHN1cHBvcnRlZCwgc28gdGhpcyBiZWNvbWVzIGEgc2ltcGxlIGNoZWNrIGZvciBleGlzdGVuY2UuXG4gICAqXG4gICAqIFRoaXMgZnVuY3Rpb24gd2lsbCBuZXZlciByZWplY3QuXG4gICAqIEBwYXJhbSB7UGF0aExpa2V9IHBhdGhcbiAgICogQHJldHVybnMge1Byb21pc2U8Ym9vbGVhbj59XG4gICAqL1xuICBhc3luYyBoYXNBY2Nlc3MgKHBhdGgpIHtcbiAgICB0cnkge1xuICAgICAgYXdhaXQgZnNQcm9taXNlcy5hY2Nlc3MocGF0aCwgY29uc3RhbnRzLlJfT0spO1xuICAgIH0gY2F0Y2gge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSxcblxuICAvKipcbiAgICogUmVzb2x2ZXMgYHRydWVgIGlmIGBwYXRoYCBpcyBleGVjdXRhYmxlOyBgZmFsc2VgIG90aGVyd2lzZS5cbiAgICpcbiAgICogT24gV2luZG93cywgdGhpcyBmdW5jdGlvbiBkZWxlZ2F0ZXMgdG8ge0BsaW5rY29kZSBmcy5oYXNBY2Nlc3N9LlxuICAgKlxuICAgKiBUaGlzIGZ1bmN0aW9uIHdpbGwgbmV2ZXIgcmVqZWN0LlxuICAgKiBAcGFyYW0ge1BhdGhMaWtlfSBwYXRoXG4gICAqIEByZXR1cm5zIHtQcm9taXNlPGJvb2xlYW4+fVxuICAgKi9cbiAgYXN5bmMgaXNFeGVjdXRhYmxlIChwYXRoKSB7XG4gICAgdHJ5IHtcbiAgICAgIGlmIChpc1dpbmRvd3MoKSkge1xuICAgICAgICByZXR1cm4gYXdhaXQgZnMuaGFzQWNjZXNzKHBhdGgpO1xuICAgICAgfVxuICAgICAgYXdhaXQgZnNQcm9taXNlcy5hY2Nlc3MocGF0aCwgY29uc3RhbnRzLlJfT0sgfCBjb25zdGFudHMuWF9PSyk7XG4gICAgfSBjYXRjaCB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xuICB9LFxuXG4gIC8qKlxuICAgKiBBbGlhcyBmb3Ige0BsaW5rY29kZSBmcy5oYXNBY2Nlc3N9XG4gICAqIEBwYXJhbSB7UGF0aExpa2V9IHBhdGhcbiAgICovXG4gIGFzeW5jIGV4aXN0cyAocGF0aCkge1xuICAgIHJldHVybiBhd2FpdCBmcy5oYXNBY2Nlc3MocGF0aCk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIFJlbW92ZSBhIGRpcmVjdG9yeSBhbmQgYWxsIGl0cyBjb250ZW50cywgcmVjdXJzaXZlbHlcbiAgICogQHBhcmFtIHtQYXRoTGlrZX0gZmlsZXBhdGhcbiAgICogQHJldHVybnMgUHJvbWlzZTx2b2lkPlxuICAgKiBAc2VlIGh0dHBzOi8vbm9kZWpzLm9yZy9hcGkvZnMuaHRtbCNmc3Byb21pc2Vzcm1wYXRoLW9wdGlvbnNcbiAgICovXG4gIGFzeW5jIHJpbXJhZiAoZmlsZXBhdGgpIHtcbiAgICByZXR1cm4gYXdhaXQgZnNQcm9taXNlcy5ybShmaWxlcGF0aCwge3JlY3Vyc2l2ZTogdHJ1ZSwgZm9yY2U6IHRydWV9KTtcbiAgfSxcblxuICAvKipcbiAgICogUmVtb3ZlIGEgZGlyZWN0b3J5IGFuZCBhbGwgaXRzIGNvbnRlbnRzLCByZWN1cnNpdmVseSBpbiBzeW5jXG4gICAqIEBwYXJhbSB7UGF0aExpa2V9IGZpbGVwYXRoXG4gICAqIEByZXR1cm5zIHVuZGVmaW5lZFxuICAgKiBAc2VlIGh0dHBzOi8vbm9kZWpzLm9yZy9hcGkvZnMuaHRtbCNmc3Jtc3luY3BhdGgtb3B0aW9uc1xuICAgKi9cbiAgcmltcmFmU3luYyAoZmlsZXBhdGgpIHtcbiAgICByZXR1cm4gcm1TeW5jKGZpbGVwYXRoLCB7cmVjdXJzaXZlOiB0cnVlLCBmb3JjZTogdHJ1ZX0pO1xuICB9LFxuXG4gIC8qKlxuICAgKiBMaWtlIE5vZGUuanMnIGBmc1Byb21pc2VzLm1rZGlyKClgLCBidXQgd2lsbCBfbm90XyByZWplY3QgaWYgdGhlIGRpcmVjdG9yeSBhbHJlYWR5IGV4aXN0cy5cbiAgICpcbiAgICogQHBhcmFtIHtzdHJpbmd8QnVmZmVyfFVSTH0gZmlsZXBhdGhcbiAgICogQHBhcmFtIHtpbXBvcnQoJ2ZzJykuTWFrZURpcmVjdG9yeU9wdGlvbnN9IFtvcHRzXVxuICAgKiBAcmV0dXJucyB7UHJvbWlzZTxzdHJpbmd8dW5kZWZpbmVkPn1cbiAgICogQHNlZSBodHRwczovL25vZGVqcy5vcmcvYXBpL2ZzLmh0bWwjZnNwcm9taXNlc21rZGlycGF0aC1vcHRpb25zXG4gICAqL1xuICBhc3luYyBta2RpciAoZmlsZXBhdGgsIG9wdHMgPSB7fSkge1xuICAgIHRyeSB7XG4gICAgICByZXR1cm4gYXdhaXQgZnNQcm9taXNlcy5ta2RpcihmaWxlcGF0aCwgb3B0cyk7XG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICBpZiAoZXJyPy5jb2RlICE9PSAnRUVYSVNUJykge1xuICAgICAgICB0aHJvdyBlcnI7XG4gICAgICB9XG4gICAgfVxuICB9LFxuICAvKipcbiAgICogQ29waWVzIGZpbGVzIF9hbmQgZW50aXJlIGRpcmVjdG9yaWVzX1xuICAgKiBAcGFyYW0ge3N0cmluZ30gc291cmNlIC0gU291cmNlIHRvIGNvcHlcbiAgICogQHBhcmFtIHtzdHJpbmd9IGRlc3RpbmF0aW9uIC0gRGVzdGluYXRpb24gdG8gY29weSB0b1xuICAgKiBAcGFyYW0ge25jcC5PcHRpb25zfSBbb3B0c10gLSBBZGRpdGlvbmFsIGFyZ3VtZW50cyB0byBwYXNzIHRvIGBuY3BgXG4gICAqIEBzZWUgaHR0cHM6Ly9ucG0uaW0vbmNwXG4gICAqIEByZXR1cm5zIHtQcm9taXNlPHZvaWQ+fVxuICAgKi9cbiAgYXN5bmMgY29weUZpbGUgKHNvdXJjZSwgZGVzdGluYXRpb24sIG9wdHMgPSB7fSkge1xuICAgIGlmICghKGF3YWl0IGZzLmhhc0FjY2Vzcyhzb3VyY2UpKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBUaGUgZmlsZSBhdCAnJHtzb3VyY2V9JyBkb2VzIG5vdCBleGlzdCBvciBpcyBub3QgYWNjZXNzaWJsZWApO1xuICAgIH1cbiAgICByZXR1cm4gYXdhaXQgbmNwQXN5bmMoc291cmNlLCBkZXN0aW5hdGlvbiwgb3B0cyk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIENyZWF0ZSBhbiBNRDUgaGFzaCBvZiBhIGZpbGUuXG4gICAqIEBwYXJhbSB7UGF0aExpa2V9IGZpbGVQYXRoXG4gICAqIEByZXR1cm5zIHtQcm9taXNlPHN0cmluZz59XG4gICAqL1xuICBhc3luYyBtZDUgKGZpbGVQYXRoKSB7XG4gICAgcmV0dXJuIGF3YWl0IGZzLmhhc2goZmlsZVBhdGgsICdtZDUnKTtcbiAgfSxcblxuICAvKipcbiAgICogTW92ZSBhIGZpbGVcbiAgICovXG4gIG12OiAvKiogQHR5cGUgeyhmcm9tOiBzdHJpbmcsIHRvOiBzdHJpbmcsIG9wdHM/OiBtdi5PcHRpb25zKSA9PiBCPHZvaWQ+fSAqLyAoQi5wcm9taXNpZnkobXYpKSxcblxuICAvKipcbiAgICogRmluZCBwYXRoIHRvIGFuIGV4ZWN1dGFibGUgaW4gc3lzdGVtIGBQQVRIYFxuICAgKiBAc2VlIGh0dHBzOi8vZ2l0aHViLmNvbS9ucG0vbm9kZS13aGljaFxuICAgKi9cbiAgd2hpY2gsXG5cbiAgLyoqXG4gICAqIEdpdmVuIGEgZ2xvYiBwYXR0ZXJuLCByZXNvbHZlIHdpdGggbGlzdCBvZiBmaWxlcyBtYXRjaGluZyB0aGF0IHBhdHRlcm5cbiAgICogQHNlZSBodHRwczovL2dpdGh1Yi5jb20vaXNhYWNzL25vZGUtZ2xvYlxuICAgKi9cbiAgZ2xvYjogLyoqIEB0eXBlIHsocGF0dGVybjogc3RyaW5nLCBvcHRzPzogaW1wb3J0KCdnbG9iJykuR2xvYk9wdGlvbnMpID0+IEI8c3RyaW5nW10+fSAqLyAoXG4gICAgKHBhdHRlcm4sIG9wdGlvbnMpID0+IEIucmVzb2x2ZShvcHRpb25zID8gZ2xvYihwYXR0ZXJuLCBvcHRpb25zKSA6IGdsb2IocGF0dGVybikpXG4gICksXG5cbiAgLyoqXG4gICAqIFNhbml0aXplIGEgZmlsZW5hbWVcbiAgICogQHNlZSBodHRwczovL2dpdGh1Yi5jb20vcGFyc2hhcC9ub2RlLXNhbml0aXplLWZpbGVuYW1lXG4gICAqL1xuICBzYW5pdGl6ZU5hbWU6IHNhbml0aXplLFxuXG4gIC8qKlxuICAgKiBDcmVhdGUgYSBoZXggZGlnZXN0IG9mIHNvbWUgZmlsZSBhdCBgZmlsZVBhdGhgXG4gICAqIEBwYXJhbSB7UGF0aExpa2V9IGZpbGVQYXRoXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBbYWxnb3JpdGhtXVxuICAgKiBAcmV0dXJucyB7UHJvbWlzZTxzdHJpbmc+fVxuICAgKi9cbiAgYXN5bmMgaGFzaCAoZmlsZVBhdGgsIGFsZ29yaXRobSA9ICdzaGExJykge1xuICAgIHJldHVybiBhd2FpdCBuZXcgQigocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICBjb25zdCBmaWxlSGFzaCA9IGNyeXB0by5jcmVhdGVIYXNoKGFsZ29yaXRobSk7XG4gICAgICBjb25zdCByZWFkU3RyZWFtID0gY3JlYXRlUmVhZFN0cmVhbShmaWxlUGF0aCk7XG4gICAgICByZWFkU3RyZWFtLm9uKCdlcnJvcicsIChlKSA9PlxuICAgICAgICByZWplY3QoXG4gICAgICAgICAgbmV3IEVycm9yKFxuICAgICAgICAgICAgYENhbm5vdCBjYWxjdWxhdGUgJHthbGdvcml0aG19IGhhc2ggZm9yICcke2ZpbGVQYXRofScuIE9yaWdpbmFsIGVycm9yOiAke2UubWVzc2FnZX1gXG4gICAgICAgICAgKVxuICAgICAgICApXG4gICAgICApO1xuICAgICAgcmVhZFN0cmVhbS5vbignZGF0YScsIChjaHVuaykgPT4gZmlsZUhhc2gudXBkYXRlKGNodW5rKSk7XG4gICAgICByZWFkU3RyZWFtLm9uKCdlbmQnLCAoKSA9PiByZXNvbHZlKGZpbGVIYXNoLmRpZ2VzdCgnaGV4JykpKTtcbiAgICB9KTtcbiAgfSxcblxuICAvKipcbiAgICogUmV0dXJucyBhbiBgV2Fsa2VyYCBpbnN0YW5jZSwgd2hpY2ggaXMgYSByZWFkYWJsZSBzdHJlYW0gKGFuZCB0aHVzbHkgYW4gYXN5bmMgaXRlcmF0b3IpLlxuICAgKlxuICAgKiBAcGFyYW0ge3N0cmluZ30gZGlyIC0gRGlyIHRvIHN0YXJ0IHdhbGtpbmcgYXRcbiAgICogQHBhcmFtIHtpbXBvcnQoJ2tsYXcnKS5PcHRpb25zfSBbb3B0c11cbiAgICogQHJldHVybnMge2ltcG9ydCgna2xhdycpLldhbGtlcn1cbiAgICogQHNlZSBodHRwczovL3d3dy5ucG1qcy5jb20vcGFja2FnZS9rbGF3XG4gICAqL1xuICB3YWxrIChkaXIsIG9wdHMpIHtcbiAgICByZXR1cm4ga2xhdyhkaXIsIG9wdHMpO1xuICB9LFxuXG4gIC8qKlxuICAgKiBSZWN1cnNpdmVseSBjcmVhdGUgYSBkaXJlY3RvcnkuXG4gICAqIEBwYXJhbSB7UGF0aExpa2V9IGRpclxuICAgKiBAcmV0dXJucyB7UHJvbWlzZTxzdHJpbmd8dW5kZWZpbmVkPn1cbiAgICovXG4gIGFzeW5jIG1rZGlycCAoZGlyKSB7XG4gICAgcmV0dXJuIGF3YWl0IGZzLm1rZGlyKGRpciwge3JlY3Vyc2l2ZTogdHJ1ZX0pO1xuICB9LFxuXG4gIC8qKlxuICAgKiBXYWxrcyBhIGRpcmVjdG9yeSBnaXZlbiBhY2NvcmRpbmcgdG8gdGhlIHBhcmFtZXRlcnMgZ2l2ZW4uIFRoZSBjYWxsYmFjayB3aWxsIGJlIGludm9rZWQgd2l0aCBhIHBhdGggam9pbmVkIHdpdGggdGhlIGRpciBwYXJhbWV0ZXJcbiAgICogQHBhcmFtIHtzdHJpbmd9IGRpciBEaXJlY3RvcnkgcGF0aCB3aGVyZSB3ZSB3aWxsIHN0YXJ0IHdhbGtpbmdcbiAgICogQHBhcmFtIHtib29sZWFufSByZWN1cnNpdmUgU2V0IGl0IHRvIHRydWUgaWYgeW91IHdhbnQgdG8gY29udGludWUgd2Fsa2luZyBzdWIgZGlyZWN0b3JpZXNcbiAgICogQHBhcmFtIHtXYWxrRGlyQ2FsbGJhY2t9IGNhbGxiYWNrIFRoZSBjYWxsYmFjayB0byBiZSBjYWxsZWQgd2hlbiBhIG5ldyBwYXRoIGlzIGZvdW5kXG4gICAqIEB0aHJvd3Mge0Vycm9yfSBJZiB0aGUgYGRpcmAgcGFyYW1ldGVyIGNvbnRhaW5zIGEgcGF0aCB0byBhbiBpbnZhbGlkIGZvbGRlclxuICAgKiBAcmV0dXJucyB7UHJvbWlzZTxzdHJpbmc/Pn0gcmV0dXJucyB0aGUgZm91bmQgcGF0aCBvciBudWxsIGlmIHRoZSBpdGVtIHdhcyBub3QgZm91bmRcbiAgICovXG4gIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBwcm9taXNlL3ByZWZlci1hd2FpdC10by1jYWxsYmFja3NcbiAgYXN5bmMgd2Fsa0RpciAoZGlyLCByZWN1cnNpdmUsIGNhbGxiYWNrKSB7XG4gICAgbGV0IGlzVmFsaWRSb290ID0gZmFsc2U7XG4gICAgbGV0IGVyck1zZyA9IG51bGw7XG4gICAgdHJ5IHtcbiAgICAgIGlzVmFsaWRSb290ID0gKGF3YWl0IGZzLnN0YXQoZGlyKSkuaXNEaXJlY3RvcnkoKTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICBlcnJNc2cgPSBlLm1lc3NhZ2U7XG4gICAgfVxuICAgIGlmICghaXNWYWxpZFJvb3QpIHtcbiAgICAgIHRocm93IEVycm9yKFxuICAgICAgICBgJyR7ZGlyfScgaXMgbm90IGEgdmFsaWQgcm9vdCBkaXJlY3RvcnlgICsgKGVyck1zZyA/IGAuIE9yaWdpbmFsIGVycm9yOiAke2Vyck1zZ31gIDogJycpXG4gICAgICApO1xuICAgIH1cblxuICAgIGxldCB3YWxrZXI7XG4gICAgbGV0IGZpbGVDb3VudCA9IDA7XG4gICAgbGV0IGRpcmVjdG9yeUNvdW50ID0gMDtcbiAgICBjb25zdCB0aW1lciA9IG5ldyBUaW1lcigpLnN0YXJ0KCk7XG4gICAgcmV0dXJuIGF3YWl0IG5ldyBCKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgIGxldCBsYXN0RmlsZVByb2Nlc3NlZCA9IEIucmVzb2x2ZSgpO1xuICAgICAgd2Fsa2VyID0ga2xhdyhkaXIsIHtcbiAgICAgICAgZGVwdGhMaW1pdDogcmVjdXJzaXZlID8gLTEgOiAwLFxuICAgICAgfSk7XG4gICAgICB3YWxrZXJcbiAgICAgICAgLm9uKCdkYXRhJywgZnVuY3Rpb24gKGl0ZW0pIHtcbiAgICAgICAgICB3YWxrZXIucGF1c2UoKTtcblxuICAgICAgICAgIGlmICghaXRlbS5zdGF0cy5pc0RpcmVjdG9yeSgpKSB7XG4gICAgICAgICAgICBmaWxlQ291bnQrKztcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZGlyZWN0b3J5Q291bnQrKztcbiAgICAgICAgICB9XG5cbiAgICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgcHJvbWlzZS9wcmVmZXItYXdhaXQtdG8tY2FsbGJhY2tzXG4gICAgICAgICAgbGFzdEZpbGVQcm9jZXNzZWQgPSBCLnRyeShhc3luYyAoKSA9PiBhd2FpdCBjYWxsYmFjayhpdGVtLnBhdGgsIGl0ZW0uc3RhdHMuaXNEaXJlY3RvcnkoKSkpXG4gICAgICAgICAgICAudGhlbihmdW5jdGlvbiAoZG9uZSA9IGZhbHNlKSB7XG4gICAgICAgICAgICAgIGlmIChkb25lKSB7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZShpdGVtLnBhdGgpO1xuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHdhbGtlci5yZXN1bWUoKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIC5jYXRjaChyZWplY3QpO1xuICAgICAgICB9KVxuICAgICAgICAub24oJ2Vycm9yJywgZnVuY3Rpb24gKGVyciwgaXRlbSkge1xuICAgICAgICAgIGxvZy53YXJuKGBHb3QgYW4gZXJyb3Igd2hpbGUgd2Fsa2luZyAnJHtpdGVtLnBhdGh9JzogJHtlcnIubWVzc2FnZX1gKTtcbiAgICAgICAgICAvLyBrbGF3IGNhbm5vdCBnZXQgYmFjayBmcm9tIGFuIEVOT0VOVCBlcnJvclxuICAgICAgICAgIGlmIChlcnIuY29kZSA9PT0gJ0VOT0VOVCcpIHtcbiAgICAgICAgICAgIGxvZy53YXJuKCdBbGwgZmlsZXMgbWF5IG5vdCBoYXZlIGJlZW4gYWNjZXNzZWQnKTtcbiAgICAgICAgICAgIHJlamVjdChlcnIpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSlcbiAgICAgICAgLm9uKCdlbmQnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgbGFzdEZpbGVQcm9jZXNzZWRcbiAgICAgICAgICAgIC50aGVuKChmaWxlKSA9PiB7XG4gICAgICAgICAgICAgIHJlc29sdmUoLyoqIEB0eXBlIHtzdHJpbmd8dW5kZWZpbmVkfSAqLyAoZmlsZSkgPz8gbnVsbCk7XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgLmNhdGNoKGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgbG9nLndhcm4oYFVuZXhwZWN0ZWQgZXJyb3I6ICR7ZXJyLm1lc3NhZ2V9YCk7XG4gICAgICAgICAgICAgIHJlamVjdChlcnIpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH0pLmZpbmFsbHkoZnVuY3Rpb24gKCkge1xuICAgICAgbG9nLmRlYnVnKFxuICAgICAgICBgVHJhdmVyc2VkICR7cGx1cmFsaXplKCdkaXJlY3RvcnknLCBkaXJlY3RvcnlDb3VudCwgdHJ1ZSl9IGAgK1xuICAgICAgICAgIGBhbmQgJHtwbHVyYWxpemUoJ2ZpbGUnLCBmaWxlQ291bnQsIHRydWUpfSBgICtcbiAgICAgICAgICBgaW4gJHt0aW1lci5nZXREdXJhdGlvbigpLmFzTWlsbGlTZWNvbmRzLnRvRml4ZWQoMCl9bXNgXG4gICAgICApO1xuICAgICAgaWYgKHdhbGtlcikge1xuICAgICAgICB3YWxrZXIuZGVzdHJveSgpO1xuICAgICAgfVxuICAgIH0pO1xuICB9LFxuICAvKipcbiAgICogUmVhZHMgdGhlIGNsb3Nlc3QgYHBhY2thZ2UuanNvbmAgZmlsZSBmcm9tIGFic29sdXRlIHBhdGggYGRpcmAuXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBkaXIgLSBEaXJlY3RvcnkgdG8gc2VhcmNoIGZyb21cbiAgICogQHBhcmFtIHtpbXBvcnQoJ3JlYWQtcGtnJykuT3B0aW9uc30gW29wdHNdIC0gQWRkaXRpb25hbCBvcHRpb25zIGZvciBgcmVhZC1wa2dgXG4gICAqIEB0aHJvd3Mge0Vycm9yfSBJZiB0aGVyZSB3ZXJlIHByb2JsZW1zIGZpbmRpbmcgb3IgcmVhZGluZyBhIGBwYWNrYWdlLmpzb25gIGZpbGVcbiAgICogQHJldHVybnMge2ltcG9ydCgncmVhZC1wa2cnKS5Ob3JtYWxpemVkUGFja2FnZUpzb259IEEgcGFyc2VkIGBwYWNrYWdlLmpzb25gXG4gICAqL1xuICByZWFkUGFja2FnZUpzb25Gcm9tIChkaXIsIG9wdHMgPSB7fSkge1xuICAgIGNvbnN0IGN3ZCA9IGZzLmZpbmRSb290KGRpcik7XG4gICAgdHJ5IHtcbiAgICAgIHJldHVybiByZWFkUGtnLnN5bmMoXG4gICAgICAgIC8qKiBAdHlwZSB7aW1wb3J0KCdyZWFkLXBrZycpLk5vcm1hbGl6ZU9wdGlvbnN9ICovICh7bm9ybWFsaXplOiB0cnVlLCAuLi5vcHRzLCBjd2R9KVxuICAgICAgKTtcbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgIGVyci5tZXNzYWdlID0gYEZhaWxlZCB0byByZWFkIGEgXFxgcGFja2FnZS5qc29uXFxgIGZyb20gZGlyIFxcYCR7ZGlyfVxcYDpcXG5cXG4ke2Vyci5tZXNzYWdlfWA7XG4gICAgICB0aHJvdyBlcnI7XG4gICAgfVxuICB9LFxuICAvKipcbiAgICogRmluZHMgdGhlIHByb2plY3Qgcm9vdCBkaXJlY3RvcnkgZnJvbSBgZGlyYC5cbiAgICogQHBhcmFtIHtzdHJpbmd9IGRpciAtIERpcmVjdG9yeSB0byBzZWFyY2ggZnJvbVxuICAgKiBAdGhyb3dzIHtUeXBlRXJyb3J9IElmIGBkaXJgIGlzIG5vdCBhIG5vbmVtcHR5IHN0cmluZyBvciByZWxhdGl2ZSBwYXRoXG4gICAqIEB0aHJvd3Mge0Vycm9yfSBJZiB0aGVyZSB3ZXJlIHByb2JsZW1zIGZpbmRpbmcgdGhlIHByb2plY3Qgcm9vdFxuICAgKiBAcmV0dXJucyB7c3RyaW5nfSBUaGUgY2xvc2VzZXQgcGFyZW50IGRpciBjb250YWluaW5nIGBwYWNrYWdlLmpzb25gXG4gICAqL1xuICBmaW5kUm9vdCAoZGlyKSB7XG4gICAgaWYgKCFkaXIgfHwgIXBhdGguaXNBYnNvbHV0ZShkaXIpKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdgZmluZFJvb3QoKWAgbXVzdCBiZSBwcm92aWRlZCBhIG5vbi1lbXB0eSwgYWJzb2x1dGUgcGF0aCcpO1xuICAgIH1cbiAgICBjb25zdCByZXN1bHQgPSBmaW5kUm9vdENhY2hlZChkaXIpO1xuICAgIGlmICghcmVzdWx0KSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYFxcYGZpbmRSb290KClcXGAgY291bGQgbm90IGZpbmQgXFxgcGFja2FnZS5qc29uXFxgIGZyb20gJHtkaXJ9YCk7XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG4gIH0sXG5cbiAgLy8gYWRkIHRoZSBzdXBwb3J0ZWQgYGZzYCBmdW5jdGlvbnNcbiAgYWNjZXNzOiBmc1Byb21pc2VzLmFjY2VzcyxcbiAgYXBwZW5kRmlsZTogZnNQcm9taXNlcy5hcHBlbmRGaWxlLFxuICBjaG1vZDogZnNQcm9taXNlcy5jaG1vZCxcbiAgY2xvc2U6IEIucHJvbWlzaWZ5KGNsb3NlKSxcbiAgY29uc3RhbnRzLFxuICBjcmVhdGVXcml0ZVN0cmVhbSxcbiAgY3JlYXRlUmVhZFN0cmVhbSxcbiAgbHN0YXQ6IGZzUHJvbWlzZXMubHN0YXQsXG4gIC8qKlxuICAgKiBXYXJuaW5nOiB0aGlzIGlzIGEgcHJvbWlzaWZpZWQge0BsaW5rY29kZSBvcGVuIGZzLm9wZW59LlxuICAgKiBJdCByZXNvbHZlcyB3L2EgZmlsZSBkZXNjcmlwdG9yIGluc3RlYWQgb2YgYSB7QGxpbmtjb2RlIGZzUHJvbWlzZXMuRmlsZUhhbmRsZSBGaWxlSGFuZGxlfSBvYmplY3QsIGFzIHtAbGlua2NvZGUgZnNQcm9taXNlcy5vcGVufSBkb2VzLiBVc2Uge0BsaW5rY29kZSBmcy5vcGVuRmlsZX0gaWYgeW91IHdhbnQgYSBgRmlsZUhhbmRsZWAuXG4gICAqIEB0eXBlIHsocGF0aDogUGF0aExpa2UsIGZsYWdzOiBpbXBvcnQoJ2ZzJykuT3Blbk1vZGUsIG1vZGU/OiBpbXBvcnQoJ2ZzJykuTW9kZSkgPT4gUHJvbWlzZTxudW1iZXI+fVxuICAgKi9cbiAgb3BlbjogQi5wcm9taXNpZnkob3BlbiksXG4gIG9wZW5GaWxlOiBmc1Byb21pc2VzLm9wZW4sXG4gIHJlYWRkaXI6IGZzUHJvbWlzZXMucmVhZGRpcixcblxuICByZWFkOiAvKipcbiAgICogQHR5cGUge1JlYWRGbjxOb2RlSlMuQXJyYXlCdWZmZXJWaWV3Pn1cbiAgICovICgvKiogQHR5cGUge3Vua25vd259ICovIChCLnByb21pc2lmeShyZWFkKSkpLFxuICByZWFkRmlsZTogZnNQcm9taXNlcy5yZWFkRmlsZSxcbiAgcmVhZGxpbms6IGZzUHJvbWlzZXMucmVhZGxpbmssXG4gIHJlYWxwYXRoOiBmc1Byb21pc2VzLnJlYWxwYXRoLFxuICByZW5hbWU6IGZzUHJvbWlzZXMucmVuYW1lLFxuICBzdGF0OiBmc1Byb21pc2VzLnN0YXQsXG4gIHN5bWxpbms6IGZzUHJvbWlzZXMuc3ltbGluayxcbiAgdW5saW5rOiBmc1Byb21pc2VzLnVubGluayxcbiAgd3JpdGU6IEIucHJvbWlzaWZ5KHdyaXRlKSxcbiAgd3JpdGVGaWxlOiBmc1Byb21pc2VzLndyaXRlRmlsZSxcblxuICAvLyBkZXByZWNhdGVkIHByb3BzXG5cbiAgLyoqXG4gICAqIFVzZSBgY29uc3RhbnRzLkZfT0tgIGluc3RlYWQuXG4gICAqIEBkZXByZWNhdGVkXG4gICAqL1xuICBGX09LOiBjb25zdGFudHMuRl9PSyxcblxuICAvKipcbiAgICogVXNlIGBjb25zdGFudHMuUl9PS2AgaW5zdGVhZC5cbiAgICogQGRlcHJlY2F0ZWRcbiAgICovXG4gIFJfT0s6IGNvbnN0YW50cy5SX09LLFxuXG4gIC8qKlxuICAgKiBVc2UgYGNvbnN0YW50cy5XX09LYCBpbnN0ZWFkLlxuICAgKiBAZGVwcmVjYXRlZFxuICAgKi9cbiAgV19PSzogY29uc3RhbnRzLldfT0ssXG5cbiAgLyoqXG4gICAqIFVzZSBgY29uc3RhbnRzLlhfT0tgIGluc3RlYWQuXG4gICAqIEBkZXByZWNhdGVkXG4gICAqL1xuICBYX09LOiBjb25zdGFudHMuWF9PSyxcbn07XG5cbmV4cG9ydCB7ZnN9O1xuZXhwb3J0IGRlZmF1bHQgZnM7XG5cbi8qKlxuICogVGhlIGNhbGxiYWNrIGZ1bmN0aW9uIHdoaWNoIHdpbGwgYmUgY2FsbGVkIGR1cmluZyB0aGUgZGlyZWN0b3J5IHdhbGtpbmdcbiAqIEBjYWxsYmFjayBXYWxrRGlyQ2FsbGJhY2tcbiAqIEBwYXJhbSB7c3RyaW5nfSBpdGVtUGF0aCBUaGUgcGF0aCBvZiB0aGUgZmlsZSBvciBmb2xkZXJcbiAqIEBwYXJhbSB7Ym9vbGVhbn0gaXNEaXJlY3RvcnkgU2hvd3MgaWYgaXQgaXMgYSBkaXJlY3Rvcnkgb3IgYSBmaWxlXG4gKiBAcmV0dXJuIHtib29sZWFufHZvaWR9IHJldHVybiB0cnVlIGlmIHlvdSB3YW50IHRvIHN0b3Agd2Fsa2luZ1xuICovXG5cbi8qKlxuICogQHR5cGVkZWYge2ltcG9ydCgnZ2xvYicpfSBnbG9iXG4gKiBAdHlwZWRlZiB7aW1wb3J0KCdtdicpfSBtdlxuICogQHR5cGVkZWYge2ltcG9ydCgnZnMnKS5QYXRoTGlrZX0gUGF0aExpa2VcbiAqL1xuXG4vKipcbiAqIEB0ZW1wbGF0ZSB7Tm9kZUpTLkFycmF5QnVmZmVyVmlld30gVEJ1ZmZlclxuICogQGNhbGxiYWNrIFJlYWRGblxuICogQHBhcmFtIHtudW1iZXJ9IGZkXG4gKiBAcGFyYW0ge1RCdWZmZXJ8aW1wb3J0KCdub2RlOmZzJykuUmVhZEFzeW5jT3B0aW9uczxUQnVmZmVyPn0gYnVmZmVyXG4gKiBAcGFyYW0ge251bWJlcn0gW29mZnNldF1cbiAqIEBwYXJhbSB7bnVtYmVyfSBbbGVuZ3RoXVxuICogQHBhcmFtIHtudW1iZXI/fSBbcG9zaXRpb25dXG4gKiBAcmV0dXJucyB7Qjx7Ynl0ZXNSZWFkOiBudW1iZXIsIGJ1ZmZlcjogVEJ1ZmZlcn0+fVxuICovXG4iXSwibWFwcGluZ3MiOiI7Ozs7Ozs7O0FBRUEsSUFBQUEsU0FBQSxHQUFBQyxzQkFBQSxDQUFBQyxPQUFBO0FBQ0EsSUFBQUMsT0FBQSxHQUFBRixzQkFBQSxDQUFBQyxPQUFBO0FBQ0EsSUFBQUUsR0FBQSxHQUFBRixPQUFBO0FBV0EsSUFBQUcsS0FBQSxHQUFBSCxPQUFBO0FBQ0EsSUFBQUksS0FBQSxHQUFBTCxzQkFBQSxDQUFBQyxPQUFBO0FBQ0EsSUFBQUssT0FBQSxHQUFBTixzQkFBQSxDQUFBQyxPQUFBO0FBQ0EsSUFBQU0s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
