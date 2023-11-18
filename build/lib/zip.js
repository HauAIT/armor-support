"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports._extractEntryTo = _extractEntryTo;
exports.assertValidZip = assertValidZip;
exports.default = void 0;
exports.extractAllTo = extractAllTo;
exports.readEntries = readEntries;
exports.toArchive = toArchive;
exports.toInMemoryZip = toInMemoryZip;
require("source-map-support/register");
var _lodash = _interopRequireDefault(require("lodash"));
var _bluebird = _interopRequireDefault(require("bluebird"));
var _yauzl = _interopRequireDefault(require("yauzl"));
var _archiver = _interopRequireDefault(require("archiver"));
var _fs = require("fs");
var _path = _interopRequireDefault(require("path"));
var _stream = _interopRequireDefault(require("stream"));
var _fs2 = _interopRequireDefault(require("./fs"));
var _system = require("./system");
var _base64Stream = require("base64-stream");
var _util = require("./util");
var _timing = _interopRequireDefault(require("./timing"));
var _logger = _interopRequireDefault(require("./logger"));
var _getStream = _interopRequireDefault(require("get-stream"));
var _aitProcess = require("ait-process");
const openZip = _bluebird.default.promisify(_yauzl.default.open);
const pipeline = _bluebird.default.promisify(_stream.default.pipeline);
const ZIP_MAGIC = 'PK';
const IFMT = 61440;
const IFDIR = 16384;
const IFLNK = 40960;
class ZipExtractor {
  constructor(sourcePath, opts = {}) {
    this.zipfile = void 0;
    this.zipPath = sourcePath;
    this.opts = opts;
    this.canceled = false;
  }
  extractFileName(entry) {
    return _lodash.default.isBuffer(entry.fileName) ? entry.fileName.toString(this.opts.fileNamesEncoding) : entry.fileName;
  }
  async extract() {
    const {
      dir,
      fileNamesEncoding
    } = this.opts;
    this.zipfile = await openZip(this.zipPath, {
      lazyEntries: true,
      decodeStrings: !fileNamesEncoding
    });
    this.canceled = false;
    return new _bluebird.default((resolve, reject) => {
      this.zipfile.on('error', err => {
        this.canceled = true;
        reject(err);
      });
      this.zipfile.readEntry();
      this.zipfile.on('close', () => {
        if (!this.canceled) {
          resolve();
        }
      });
      this.zipfile.on('entry', async entry => {
        if (this.canceled) {
          return;
        }
        const fileName = this.extractFileName(entry);
        if (fileName.startsWith('__MACOSX/')) {
          this.zipfile.readEntry();
          return;
        }
        const destDir = _path.default.dirname(_path.default.join(dir, fileName));
        try {
          await _fs2.default.mkdir(destDir, {
            recursive: true
          });
          const canonicalDestDir = await _fs2.default.realpath(destDir);
          const relativeDestDir = _path.default.relative(dir, canonicalDestDir);
          if (relativeDestDir.split(_path.default.sep).includes('..')) {
            new Error(`Out of bound path "${canonicalDestDir}" found while processing file ${fileName}`);
          }
          await this.extractEntry(entry);
          this.zipfile.readEntry();
        } catch (err) {
          this.canceled = true;
          this.zipfile.close();
          reject(err);
        }
      });
    });
  }
  async extractEntry(entry) {
    if (this.canceled) {
      return;
    }
    const {
      dir
    } = this.opts;
    const fileName = this.extractFileName(entry);
    const dest = _path.default.join(dir, fileName);
    const mode = entry.externalFileAttributes >> 16 & 0xffff;
    const isSymlink = (mode & IFMT) === IFLNK;
    const isDir = (mode & IFMT) === IFDIR || fileName.endsWith('/') || entry.versionMadeBy >> 8 === 0 && entry.externalFileAttributes === 16;
    const procMode = this.getExtractedMode(mode, isDir) & 0o777;
    const destDir = isDir ? dest : _path.default.dirname(dest);
    const mkdirOptions = {
      recursive: true
    };
    if (isDir) {
      mkdirOptions.mode = procMode;
    }
    await _fs2.default.mkdir(destDir, mkdirOptions);
    if (isDir) {
      return;
    }
    const openReadStream = _bluebird.default.promisify(this.zipfile.openReadStream.bind(this.zipfile));
    const readStream = await openReadStream(entry);
    if (isSymlink) {
      const link = await (0, _getStream.default)(readStream);
      await _fs2.default.symlink(link, dest);
    } else {
      await pipeline(readStream, _fs2.default.createWriteStream(dest, {
        mode: procMode
      }));
    }
  }
  getExtractedMode(entryMode, isDir) {
    const {
      defaultDirMode,
      defaultFileMode
    } = this.opts;
    let mode = entryMode;
    if (mode === 0) {
      if (isDir) {
        if (defaultDirMode) {
          mode = parseInt(defaultDirMode, 10);
        }
        if (!mode) {
          mode = 0o755;
        }
      } else {
        if (defaultFileMode) {
          mode = parseInt(defaultFileMode, 10);
        }
        if (!mode) {
          mode = 0o644;
        }
      }
    }
    return mode;
  }
}
async function extractAllTo(zipFilePath, destDir, opts = {}) {
  if (!_path.default.isAbsolute(destDir)) {
    throw new Error(`Target path '${destDir}' is expected to be absolute`);
  }
  await _fs2.default.mkdir(destDir, {
    recursive: true
  });
  const dir = await _fs2.default.realpath(destDir);
  if (opts.useSystemUnzip) {
    try {
      await extractWithSystemUnzip(zipFilePath, dir);
      return;
    } catch (err) {
      _logger.default.warn('unzip failed; falling back to JS: %s', err.stderr || err.message);
    }
  }
  const extractor = new ZipExtractor(zipFilePath, {
    ...opts,
    dir
  });
  await extractor.extract();
}
async function extractWithSystemUnzip(zipFilePath, destDir) {
  const isWindowsHost = (0, _system.isWindows)();
  let executablePath;
  try {
    executablePath = await getExecutablePath(isWindowsHost ? 'powershell.exe' : 'unzip');
  } catch (e) {
    throw new Error('Could not find system unzip');
  }
  if (isWindowsHost) {
    await (0, _aitProcess.exec)(executablePath, ['-command', 'Expand-Archive', '-LiteralPath', zipFilePath, '-DestinationPath', destDir, '-Force']);
  } else {
    await (0, _aitProcess.exec)(executablePath, ['-q', '-o', zipFilePath, '-d', destDir]);
  }
}
async function _extractEntryTo(zipFile, entry, destDir) {
  const dstPath = _path.default.resolve(destDir, entry.fileName);
  if (/\/$/.test(entry.fileName)) {
    if (!(await _fs2.default.exists(dstPath))) {
      await _fs2.default.mkdirp(dstPath);
    }
    return;
  } else if (!(await _fs2.default.exists(_path.default.dirname(dstPath)))) {
    await _fs2.default.mkdirp(_path.default.dirname(dstPath));
  }
  const writeStream = (0, _fs.createWriteStream)(dstPath, {
    flags: 'w'
  });
  const writeStreamPromise = new _bluebird.default((resolve, reject) => {
    writeStream.once('finish', resolve);
    writeStream.once('error', reject);
  });
  const zipReadStream = await new _bluebird.default((resolve, reject) => {
    zipFile.openReadStream(entry, (err, readStream) => err ? reject(err) : resolve(readStream));
  });
  const zipReadStreamPromise = new _bluebird.default((resolve, reject) => {
    zipReadStream.once('end', resolve);
    zipReadStream.once('error', reject);
  });
  zipReadStream.pipe(writeStream);
  return await _bluebird.default.all([zipReadStreamPromise, writeStreamPromise]);
}
async function readEntries(zipFilePath, onEntry) {
  const zipfile = await openZip(zipFilePath, {
    lazyEntries: true
  });
  const zipReadStreamPromise = new _bluebird.default((resolve, reject) => {
    zipfile.once('end', resolve);
    zipfile.once('error', reject);
    zipfile.on('entry', async entry => {
      const res = await onEntry({
        entry,
        extractEntryTo: async destDir => await _extractEntryTo(zipfile, entry, destDir)
      });
      if (res === false) {
        return zipfile.emit('end');
      }
      zipfile.readEntry();
    });
  });
  zipfile.readEntry();
  return await zipReadStreamPromise;
}
async function toInMemoryZip(srcPath, opts = {}) {
  if (!(await _fs2.default.exists(srcPath))) {
    throw new Error(`No such file or folder: ${srcPath}`);
  }
  const {
    isMetered = true,
    encodeToBase64 = false,
    maxSize = 1 * _util.GiB,
    level = 9
  } = opts;
  const resultBuffers = [];
  let resultBuffersSize = 0;
  const resultWriteStream = new _stream.default.Writable({
    write: (buffer, encoding, next) => {
      resultBuffers.push(buffer);
      resultBuffersSize += buffer.length;
      if (maxSize > 0 && resultBuffersSize > maxSize) {
        resultWriteStream.emit('error', new Error(`The size of the resulting ` + `archive must not be greater than ${(0, _util.toReadableSizeString)(maxSize)}`));
      }
      next();
    }
  });
  const archive = (0, _archiver.default)('zip', {
    zlib: {
      level
    }
  });
  let srcSize = null;
  const base64EncoderStream = encodeToBase64 ? new _base64Stream.Base64Encode() : null;
  const resultWriteStreamPromise = new _bluebird.default((resolve, reject) => {
    resultWriteStream.once('error', e => {
      if (base64EncoderStream) {
        archive.unpipe(base64EncoderStream);
        base64EncoderStream.unpipe(resultWriteStream);
      } else {
        archive.unpipe(resultWriteStream);
      }
      archive.abort();
      archive.destroy();
      reject(e);
    });
    resultWriteStream.once('finish', () => {
      srcSize = archive.pointer();
      resolve();
    });
  });
  const archiveStreamPromise = new _bluebird.default((resolve, reject) => {
    archive.once('finish', resolve);
    archive.once('error', e => reject(new Error(`Failed to archive '${srcPath}': ${e.message}`)));
  });
  const timer = isMetered ? new _timing.default().start() : null;
  if ((await _fs2.default.stat(srcPath)).isDirectory()) {
    archive.directory(srcPath, false);
  } else {
    archive.file(srcPath, {
      name: _path.default.basename(srcPath)
    });
  }
  if (base64EncoderStream) {
    archive.pipe(base64EncoderStream);
    base64EncoderStream.pipe(resultWriteStream);
  } else {
    archive.pipe(resultWriteStream);
  }
  archive.finalize();
  await _bluebird.default.all([archiveStreamPromise, resultWriteStreamPromise]);
  if (timer) {
    _logger.default.debug(`Zipped ${encodeToBase64 ? 'and base64-encoded ' : ''}` + `'${_path.default.basename(srcPath)}' ` + (srcSize ? `(${(0, _util.toReadableSizeString)(srcSize)}) ` : '') + `in ${timer.getDuration().asSeconds.toFixed(3)}s ` + `(compression level: ${level})`);
  }
  return Buffer.concat(resultBuffers);
}
async function assertValidZip(filePath) {
  if (!(await _fs2.default.exists(filePath))) {
    throw new Error(`The file at '${filePath}' does not exist`);
  }
  const {
    size
  } = await _fs2.default.stat(filePath);
  if (size < 4) {
    throw new Error(`The file at '${filePath}' is too small to be a ZIP archive`);
  }
  const fd = await _fs2.default.open(filePath, 'r');
  try {
    const buffer = Buffer.alloc(ZIP_MAGIC.length);
    await _fs2.default.read(fd, buffer, 0, ZIP_MAGIC.length, 0);
    const signature = buffer.toString('ascii');
    if (signature !== ZIP_MAGIC) {
      throw new Error(`The file signature '${signature}' of '${filePath}' ` + `is not equal to the expected ZIP archive signature '${ZIP_MAGIC}'`);
    }
    return true;
  } finally {
    await _fs2.default.close(fd);
  }
}
async function toArchive(dstPath, src = {}, opts = {}) {
  const {
    level = 9
  } = opts;
  const {
    pattern = '**/*',
    cwd = _path.default.dirname(dstPath),
    ignore = []
  } = src;
  const archive = (0, _archiver.default)('zip', {
    zlib: {
      level
    }
  });
  const stream = _fs2.default.createWriteStream(dstPath);
  return await new _bluebird.default((resolve, reject) => {
    archive.glob(pattern, {
      cwd,
      ignore
    }).on('error', reject).pipe(stream);
    stream.on('error', e => {
      archive.unpipe(stream);
      archive.abort();
      archive.destroy();
      reject(e);
    }).on('finish', resolve);
    archive.finalize();
  });
}
const getExecutablePath = _lodash.default.memoize(async function getExecutablePath(binaryName) {
  const fullPath = await _fs2.default.which(binaryName);
  _logger.default.debug(`Found '${binaryName}' at '${fullPath}'`);
  return fullPath;
});
var _default = exports.default = {
  extractAllTo,
  readEntries,
  toInMemoryZip,
  assertValidZip,
  toArchive
};require('source-map-support').install();


//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGliL3ppcC5qcyIsIm5hbWVzIjpbIl9sb2Rhc2giLCJfaW50ZXJvcFJlcXVpcmVEZWZhdWx0IiwicmVxdWlyZSIsIl9ibHVlYmlyZCIsIl95YXV6bCIsIl9hcmNoaXZlciIsIl9mcyIsIl9wYXRoIiwiX3N0cmVhbSIsIl9mczIiLCJfc3lzdGVtIiwiX2Jhc2U2NFN0cmVhbSIsIl91dGlsIiwiX3RpbWluZyIsIl9sb2dnZXIiLCJfZ2V0U3RyZWFtIiwiX2FpdFByb2Nlc3MiLCJvcGVuWmlwIiwiQiIsInByb21pc2lmeSIsInlhdXpsIiwib3BlbiIsInBpcGVsaW5lIiwic3RyZWFtIiwiWklQX01BR0lDIiwiSUZNVCIsIklGRElSIiwiSUZMTksiLCJaaXBFeHRyYWN0b3IiLCJjb25zdHJ1Y3RvciIsInNvdXJjZVBhdGgiLCJvcHRzIiwiemlwZmlsZSIsInppcFBhdGgiLCJjYW5jZWxlZCIsImV4dHJhY3RGaWxlTmFtZSIsImVudHJ5IiwiXyIsImlzQnVmZmVyIiwiZmlsZU5hbWUiLCJ0b1N0cmluZyIsImZpbGVOYW1lc0VuY29kaW5nIiwiZXh0cmFjdCIsImRpciIsImxhenlFbnRyaWVzIiwiZGVjb2RlU3RyaW5ncyIsInJlc29sdmUiLCJyZWplY3QiLCJvbiIsImVyciIsInJlYWRFbnRyeSIsInN0YXJ0c1dpdGgiLCJkZXN0RGlyIiwicGF0aCIsImRpcm5hbWUiLCJqb2luIiwiZnMiLCJta2RpciIsInJlY3Vyc2l2ZSIsImNhbm9uaWNhbERlc3REaXIiLCJyZWFscGF0aCIsInJlbGF0aXZlRGVzdERpciIsInJlbGF0aXZlIiwic3BsaXQiLCJzZXAiLCJpbmNsdWRlcyIsIkVycm9yIiwiZXh0cmFjdEVudHJ5IiwiY2xvc2UiLCJkZXN0IiwibW9kZSIsImV4dGVybmFsRmlsZUF0dHJpYnV0ZXMiLCJpc1N5bWxpbmsiLCJpc0RpciIsImVuZHNXaXRoIiwidmVyc2lvbk1hZGVCeSIsInByb2NNb2RlIiwiZ2V0RXh0cmFjdGVkTW9kZSIsIm1rZGlyT3B0aW9ucyIsIm9wZW5SZWFkU3RyZWFtIiwiYmluZCIsInJlYWRTdHJlYW0iLCJsaW5rIiwiZ2V0U3RyZWFtIiwic3ltbGluayIsImNyZWF0ZVdyaXRlU3RyZWFtIiwiZW50cnlNb2RlIiwiZGVmYXVsdERpck1vZGUiLCJkZWZhdWx0RmlsZU1vZGUiLCJwYXJzZUludCIsImV4dHJhY3RBbGxUbyIsInppcEZpbGVQYXRoIiwiaXNBYnNvbHV0ZSIsInVzZVN5c3RlbVVuemlwIiwiZXh0cmFjdFdpdGhTeXN0ZW1VbnppcCIsImxvZyIsIndhcm4iLCJzdGRlcnIiLCJtZXNzYWdlIiwiZXh0cmFjdG9yIiwiaXNXaW5kb3dzSG9zdCIsImlzV2luZG93cyIsImV4ZWN1dGFibGVQYXRoIiwiZ2V0RXhlY3V0YWJsZVBhdGgiLCJlIiwiZXhlYyIsIl9leHRyYWN0RW50cnlUbyIsInppcEZpbGUiLCJkc3RQYXRoIiwidGVzdCIsImV4aXN0cyIsIm1rZGlycCIsIndyaXRlU3RyZWFtIiwiZmxhZ3MiLCJ3cml0ZVN0cmVhbVByb21pc2UiLCJvbmNlIiwiemlwUmVhZFN0cmVhbSIsInppcFJlYWRTdHJlYW1Qcm9taXNlIiwicGlwZSIsImFsbCIsInJlYWRFbnRyaWVzIiwib25FbnRyeSIsInJlcyIsImV4dHJhY3RFbnRyeVRvIiwiZW1pdCIsInRvSW5NZW1vcnlaaXAiLCJzcmNQYXRoIiwiaXNNZXRlcmVkIiwiZW5jb2RlVG9CYXNlNjQiLCJtYXhTaXplIiwiR2lCIiwibGV2ZWwiLCJyZXN1bHRCdWZmZXJzIiwicmVzdWx0QnVmZmVyc1NpemUiLCJyZXN1bHRXcml0ZVN0cmVhbSIsIldyaXRhYmxlIiwid3JpdGUiLCJidWZmZXIiLCJlbmNvZGluZyIsIm5leHQiLCJwdXNoIiwibGVuZ3RoIiwidG9SZWFkYWJsZVNpemVTdHJpbmciLCJhcmNoaXZlIiwiYXJjaGl2ZXIiLCJ6bGliIiwic3JjU2l6ZSIsImJhc2U2NEVuY29kZXJTdHJlYW0iLCJCYXNlNjRFbmNvZGUiLCJyZXN1bHRXcml0ZVN0cmVhbVByb21pc2UiLCJ1bnBpcGUiLCJhYm9ydCIsImRlc3Ryb3kiLCJwb2ludGVyIiwiYXJjaGl2ZVN0cmVhbVByb21pc2UiLCJ0aW1lciIsIlRpbWVyIiwic3RhcnQiLCJzdGF0IiwiaXNEaXJlY3RvcnkiLCJkaXJlY3RvcnkiLCJmaWxlIiwibmFtZSIsImJhc2VuYW1lIiwiZmluYWxpemUiLCJkZWJ1ZyIsImdldER1cmF0aW9uIiwiYXNTZWNvbmRzIiwidG9GaXhlZCIsIkJ1ZmZlciIsImNvbmNhdCIsImFzc2VydFZhbGlkWmlwIiwiZmlsZVBhdGgiLCJzaXplIiwiZmQiLCJhbGxvYyIsInJlYWQiLCJzaWduYXR1cmUiLCJ0b0FyY2hpdmUiLCJzcmMiLCJwYXR0ZXJuIiwiY3dkIiwiaWdub3JlIiwiZ2xvYiIsIm1lbW9pemUiLCJiaW5hcnlOYW1lIiwiZnVsbFBhdGgiLCJ3aGljaCIsIl9kZWZhdWx0IiwiZXhwb3J0cyIsImRlZmF1bHQiXSwic291cmNlUm9vdCI6Ii4uLy4uIiwic291cmNlcyI6WyJsaWIvemlwLmpzIl0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQgQiBmcm9tICdibHVlYmlyZCc7XG5pbXBvcnQgeWF1emwgZnJvbSAneWF1emwnO1xuaW1wb3J0IGFyY2hpdmVyIGZyb20gJ2FyY2hpdmVyJztcbmltcG9ydCB7Y3JlYXRlV3JpdGVTdHJlYW19IGZyb20gJ2ZzJztcbmltcG9ydCBwYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHN0cmVhbSBmcm9tICdzdHJlYW0nO1xuaW1wb3J0IGZzIGZyb20gJy4vZnMnO1xuaW1wb3J0IHtpc1dpbmRvd3N9IGZyb20gJy4vc3lzdGVtJztcbmltcG9ydCB7QmFzZTY0RW5jb2RlfSBmcm9tICdiYXNlNjQtc3RyZWFtJztcbmltcG9ydCB7dG9SZWFkYWJsZVNpemVTdHJpbmcsIEdpQn0gZnJvbSAnLi91dGlsJztcbmltcG9ydCBUaW1lciBmcm9tICcuL3RpbWluZyc7XG5pbXBvcnQgbG9nIGZyb20gJy4vbG9nZ2VyJztcbmltcG9ydCBnZXRTdHJlYW0gZnJvbSAnZ2V0LXN0cmVhbSc7XG5pbXBvcnQge2V4ZWN9IGZyb20gJ2FpdC1wcm9jZXNzJztcblxuLyoqXG4gKiBAdHlwZSB7KHBhdGg6IHN0cmluZywgb3B0aW9ucz86IHlhdXpsLk9wdGlvbnMpID0+IFByb21pc2U8eWF1emwuWmlwRmlsZT59XG4gKi9cbmNvbnN0IG9wZW5aaXAgPSBCLnByb21pc2lmeSh5YXV6bC5vcGVuKTtcbi8qKlxuICogQHR5cGUgeyhzb3VyY2U6IE5vZGVKUy5SZWFkYWJsZVN0cmVhbSwgZGVzdGluYXRpb246IE5vZGVKUy5Xcml0YWJsZVN0cmVhbSkgPT4gUHJvbWlzZTxOb2RlSlMuV3JpdGFibGVTdHJlYW0+fVxuICovXG5jb25zdCBwaXBlbGluZSA9IEIucHJvbWlzaWZ5KHN0cmVhbS5waXBlbGluZSk7XG5jb25zdCBaSVBfTUFHSUMgPSAnUEsnO1xuY29uc3QgSUZNVCA9IDYxNDQwO1xuY29uc3QgSUZESVIgPSAxNjM4NDtcbmNvbnN0IElGTE5LID0gNDA5NjA7XG5cbi8vIFRoaXMgY2xhc3MgaXMgbW9zdGx5IGNvcGllZCBmcm9tIGh0dHBzOi8vZ2l0aHViLmNvbS9tYXhvZ2Rlbi9leHRyYWN0LXppcC9ibG9iL21hc3Rlci9pbmRleC5qc1xuY2xhc3MgWmlwRXh0cmFjdG9yIHtcbiAgLyoqIEB0eXBlIHt5YXV6bC5aaXBGaWxlfSAqL1xuICB6aXBmaWxlO1xuXG4gIGNvbnN0cnVjdG9yIChzb3VyY2VQYXRoLCBvcHRzID0ge30pIHtcbiAgICB0aGlzLnppcFBhdGggPSBzb3VyY2VQYXRoO1xuICAgIHRoaXMub3B0cyA9IG9wdHM7XG4gICAgdGhpcy5jYW5jZWxlZCA9IGZhbHNlO1xuICB9XG5cbiAgZXh0cmFjdEZpbGVOYW1lIChlbnRyeSkge1xuICAgIHJldHVybiBfLmlzQnVmZmVyKGVudHJ5LmZpbGVOYW1lKVxuICAgICAgPyBlbnRyeS5maWxlTmFtZS50b1N0cmluZyh0aGlzLm9wdHMuZmlsZU5hbWVzRW5jb2RpbmcpXG4gICAgICA6IGVudHJ5LmZpbGVOYW1lO1xuICB9XG5cbiAgYXN5bmMgZXh0cmFjdCAoKSB7XG4gICAgY29uc3Qge2RpciwgZmlsZU5hbWVzRW5jb2Rpbmd9ID0gdGhpcy5vcHRzO1xuICAgIHRoaXMuemlwZmlsZSA9IGF3YWl0IG9wZW5aaXAodGhpcy56aXBQYXRoLCB7XG4gICAgICBsYXp5RW50cmllczogdHJ1ZSxcbiAgICAgIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS90aGVqb3Nod29sZmUveWF1emwvY29tbWl0L2NjNzQ1NWFjNzg5YmE4NDk3MzE4NGU1ZWJkZTA1ODFjZGM0YzNiMzkjZGlmZi0wNGM2ZTkwZmFhYzI2NzVhYTg5ZTIxNzZkMmVlYzdkOFI5NVxuICAgICAgZGVjb2RlU3RyaW5nczogIWZpbGVOYW1lc0VuY29kaW5nLFxuICAgIH0pO1xuICAgIHRoaXMuY2FuY2VsZWQgPSBmYWxzZTtcblxuICAgIHJldHVybiBuZXcgQigocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICB0aGlzLnppcGZpbGUub24oJ2Vycm9yJywgKGVycikgPT4ge1xuICAgICAgICB0aGlzLmNhbmNlbGVkID0gdHJ1ZTtcbiAgICAgICAgcmVqZWN0KGVycik7XG4gICAgICB9KTtcbiAgICAgIHRoaXMuemlwZmlsZS5yZWFkRW50cnkoKTtcblxuICAgICAgdGhpcy56aXBmaWxlLm9uKCdjbG9zZScsICgpID0+IHtcbiAgICAgICAgaWYgKCF0aGlzLmNhbmNlbGVkKSB7XG4gICAgICAgICAgcmVzb2x2ZSgpO1xuICAgICAgICB9XG4gICAgICB9KTtcblxuICAgICAgdGhpcy56aXBmaWxlLm9uKCdlbnRyeScsIGFzeW5jIChlbnRyeSkgPT4ge1xuICAgICAgICBpZiAodGhpcy5jYW5jZWxlZCkge1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGZpbGVOYW1lID0gdGhpcy5leHRyYWN0RmlsZU5hbWUoZW50cnkpO1xuICAgICAgICBpZiAoZmlsZU5hbWUuc3RhcnRzV2l0aCgnX19NQUNPU1gvJykpIHtcbiAgICAgICAgICB0aGlzLnppcGZpbGUucmVhZEVudHJ5KCk7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgZGVzdERpciA9IHBhdGguZGlybmFtZShwYXRoLmpvaW4oZGlyLCBmaWxlTmFtZSkpO1xuICAgICAgICB0cnkge1xuICAgICAgICAgIGF3YWl0IGZzLm1rZGlyKGRlc3REaXIsIHtyZWN1cnNpdmU6IHRydWV9KTtcblxuICAgICAgICAgIGNvbnN0IGNhbm9uaWNhbERlc3REaXIgPSBhd2FpdCBmcy5yZWFscGF0aChkZXN0RGlyKTtcbiAgICAgICAgICBjb25zdCByZWxhdGl2ZURlc3REaXIgPSBwYXRoLnJlbGF0aXZlKGRpciwgY2Fub25pY2FsRGVzdERpcik7XG5cbiAgICAgICAgICBpZiAocmVsYXRpdmVEZXN0RGlyLnNwbGl0KHBhdGguc2VwKS5pbmNsdWRlcygnLi4nKSkge1xuICAgICAgICAgICAgbmV3IEVycm9yKFxuICAgICAgICAgICAgICBgT3V0IG9mIGJvdW5kIHBhdGggXCIke2Nhbm9uaWNhbERlc3REaXJ9XCIgZm91bmQgd2hpbGUgcHJvY2Vzc2luZyBmaWxlICR7ZmlsZU5hbWV9YFxuICAgICAgICAgICAgKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBhd2FpdCB0aGlzLmV4dHJhY3RFbnRyeShlbnRyeSk7XG4gICAgICAgICAgdGhpcy56aXBmaWxlLnJlYWRFbnRyeSgpO1xuICAgICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgICB0aGlzLmNhbmNlbGVkID0gdHJ1ZTtcbiAgICAgICAgICB0aGlzLnppcGZpbGUuY2xvc2UoKTtcbiAgICAgICAgICByZWplY3QoZXJyKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfSk7XG4gIH1cblxuICBhc3luYyBleHRyYWN0RW50cnkgKGVudHJ5KSB7XG4gICAgaWYgKHRoaXMuY2FuY2VsZWQpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBjb25zdCB7ZGlyfSA9IHRoaXMub3B0cztcblxuICAgIGNvbnN0IGZpbGVOYW1lID0gdGhpcy5leHRyYWN0RmlsZU5hbWUoZW50cnkpO1xuICAgIGNvbnN0IGRlc3QgPSBwYXRoLmpvaW4oZGlyLCBmaWxlTmFtZSk7XG5cbiAgICAvLyBjb252ZXJ0IGV4dGVybmFsIGZpbGUgYXR0ciBpbnQgaW50byBhIGZzIHN0YXQgbW9kZSBpbnRcbiAgICBjb25zdCBtb2RlID0gKGVudHJ5LmV4dGVybmFsRmlsZUF0dHJpYnV0ZXMgPj4gMTYpICYgMHhmZmZmO1xuICAgIC8vIGNoZWNrIGlmIGl0J3MgYSBzeW1saW5rIG9yIGRpciAodXNpbmcgc3RhdCBtb2RlIGNvbnN0YW50cylcbiAgICBjb25zdCBpc1N5bWxpbmsgPSAobW9kZSAmIElGTVQpID09PSBJRkxOSztcbiAgICBjb25zdCBpc0RpciA9XG4gICAgICAobW9kZSAmIElGTVQpID09PSBJRkRJUiB8fFxuICAgICAgLy8gRmFpbHNhZmUsIGJvcnJvd2VkIGZyb20ganNaaXBcbiAgICAgIGZpbGVOYW1lLmVuZHNXaXRoKCcvJykgfHxcbiAgICAgIC8vIGNoZWNrIGZvciB3aW5kb3dzIHdlaXJkIHdheSBvZiBzcGVjaWZ5aW5nIGEgZGlyZWN0b3J5XG4gICAgICAvLyBodHRwczovL2dpdGh1Yi5jb20vbWF4b2dkZW4vZXh0cmFjdC16aXAvaXNzdWVzLzEzI2lzc3VlY29tbWVudC0xNTQ0OTQ1NjZcbiAgICAgIChlbnRyeS52ZXJzaW9uTWFkZUJ5ID4+IDggPT09IDAgJiYgZW50cnkuZXh0ZXJuYWxGaWxlQXR0cmlidXRlcyA9PT0gMTYpO1xuICAgIGNvbnN0IHByb2NNb2RlID0gdGhpcy5nZXRFeHRyYWN0ZWRNb2RlKG1vZGUsIGlzRGlyKSAmIDBvNzc3O1xuICAgIC8vIGFsd2F5cyBlbnN1cmUgZm9sZGVycyBhcmUgY3JlYXRlZFxuICAgIGNvbnN0IGRlc3REaXIgPSBpc0RpciA/IGRlc3QgOiBwYXRoLmRpcm5hbWUoZGVzdCk7XG4gICAgY29uc3QgbWtkaXJPcHRpb25zID0ge3JlY3Vyc2l2ZTogdHJ1ZX07XG4gICAgaWYgKGlzRGlyKSB7XG4gICAgICBta2Rpck9wdGlvbnMubW9kZSA9IHByb2NNb2RlO1xuICAgIH1cbiAgICBhd2FpdCBmcy5ta2RpcihkZXN0RGlyLCBta2Rpck9wdGlvbnMpO1xuICAgIGlmIChpc0Rpcikge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8qKiBAdHlwZSB7KGVudHJ5OiB5YXV6bC5FbnRyeSkgPT4gUHJvbWlzZTxOb2RlSlMuUmVhZGFibGVTdHJlYW0+fSAqL1xuICAgIGNvbnN0IG9wZW5SZWFkU3RyZWFtID0gQi5wcm9taXNpZnkodGhpcy56aXBmaWxlLm9wZW5SZWFkU3RyZWFtLmJpbmQodGhpcy56aXBmaWxlKSk7XG4gICAgY29uc3QgcmVhZFN0cmVhbSA9IGF3YWl0IG9wZW5SZWFkU3RyZWFtKGVudHJ5KTtcbiAgICBpZiAoaXNTeW1saW5rKSB7XG4gICAgICAvLyBAdHMtaWdub3JlIFRoaXMgdHlwZWNhc3QgaXMgb2tcbiAgICAgIGNvbnN0IGxpbmsgPSBhd2FpdCBnZXRTdHJlYW0ocmVhZFN0cmVhbSk7XG4gICAgICBhd2FpdCBmcy5zeW1saW5rKGxpbmssIGRlc3QpO1xuICAgIH0gZWxzZSB7XG4gICAgICBhd2FpdCBwaXBlbGluZShyZWFkU3RyZWFtLCBmcy5jcmVhdGVXcml0ZVN0cmVhbShkZXN0LCB7bW9kZTogcHJvY01vZGV9KSk7XG4gICAgfVxuICB9XG5cbiAgZ2V0RXh0cmFjdGVkTW9kZSAoZW50cnlNb2RlLCBpc0Rpcikge1xuICAgIGNvbnN0IHtkZWZhdWx0RGlyTW9kZSwgZGVmYXVsdEZpbGVNb2RlfSA9IHRoaXMub3B0cztcblxuICAgIGxldCBtb2RlID0gZW50cnlNb2RlO1xuICAgIC8vIFNldCBkZWZhdWx0cywgaWYgbmVjZXNzYXJ5XG4gICAgaWYgKG1vZGUgPT09IDApIHtcbiAgICAgIGlmIChpc0Rpcikge1xuICAgICAgICBpZiAoZGVmYXVsdERpck1vZGUpIHtcbiAgICAgICAgICBtb2RlID0gcGFyc2VJbnQoZGVmYXVsdERpck1vZGUsIDEwKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghbW9kZSkge1xuICAgICAgICAgIG1vZGUgPSAwbzc1NTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaWYgKGRlZmF1bHRGaWxlTW9kZSkge1xuICAgICAgICAgIG1vZGUgPSBwYXJzZUludChkZWZhdWx0RmlsZU1vZGUsIDEwKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghbW9kZSkge1xuICAgICAgICAgIG1vZGUgPSAwbzY0NDtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBtb2RlO1xuICB9XG59XG5cbi8qKlxuICogQHR5cGVkZWYgRXh0cmFjdEFsbE9wdGlvbnNcbiAqIEBwcm9wZXJ0eSB7c3RyaW5nfSBbZmlsZU5hbWVzRW5jb2RpbmddIFRoZSBlbmNvZGluZyB0byB1c2UgZm9yIGV4dHJhY3RlZCBmaWxlIG5hbWVzLlxuICogRm9yIFpJUCBhcmNoaXZlcyBjcmVhdGVkIG9uIE1hY09TIGl0IGlzIHVzdWFsbHkgZXhwZWN0ZWQgdG8gYmUgYHV0ZjhgLlxuICogQnkgZGVmYXVsdCBpdCBpcyBhdXRvZGV0ZWN0ZWQgYmFzZWQgb24gdGhlIGVudHJ5IG1ldGFkYXRhIGFuZCBpcyBvbmx5IG5lZWRlZCB0byBiZSBzZXQgZXhwbGljaXRseVxuICogaWYgdGhlIHBhcnRpY3VsYXIgYXJjaGl2ZSBkb2VzIG5vdCBjb21wbHkgdG8gdGhlIHN0YW5kYXJkcywgd2hpY2ggbGVhZHMgdG8gY29ycnVwdGVkIGZpbGUgbmFtZXNcbiAqIGFmdGVyIGV4dHJhY3Rpb24uIE9ubHkgYXBwbGljYWJsZSBpZiBzeXN0ZW0gdW56aXAgYmluYXJ5IGlzIE5PVCBiZWluZyB1c2VkLlxuICogQHByb3BlcnR5IHtib29sZWFufSBbdXNlU3lzdGVtVW56aXBdIElmIHRydWUsIGF0dGVtcHQgdG8gdXNlIHN5c3RlbSB1bnppcDsgaWYgdGhpcyBmYWlscyxcbiAqIGZhbGxiYWNrIHRvIHRoZSBKUyB1bnppcCBpbXBsZW1lbnRhdGlvbi5cbiAqL1xuXG4vKipcbiAqIEV4dHJhY3QgemlwZmlsZSB0byBhIGRpcmVjdG9yeVxuICpcbiAqIEBwYXJhbSB7c3RyaW5nfSB6aXBGaWxlUGF0aCBUaGUgZnVsbCBwYXRoIHRvIHRoZSBzb3VyY2UgWklQIGZpbGVcbiAqIEBwYXJhbSB7c3RyaW5nfSBkZXN0RGlyIFRoZSBmdWxsIHBhdGggdG8gdGhlIGRlc3RpbmF0aW9uIGZvbGRlclxuICogQHBhcmFtIHtFeHRyYWN0QWxsT3B0aW9uc30gW29wdHNdXG4gKi9cbmFzeW5jIGZ1bmN0aW9uIGV4dHJhY3RBbGxUbyAoemlwRmlsZVBhdGgsIGRlc3REaXIsIG9wdHMgPSAvKiogQHR5cGUge0V4dHJhY3RBbGxPcHRpb25zfSAqLyAoe30pKSB7XG4gIGlmICghcGF0aC5pc0Fic29sdXRlKGRlc3REaXIpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBUYXJnZXQgcGF0aCAnJHtkZXN0RGlyfScgaXMgZXhwZWN0ZWQgdG8gYmUgYWJzb2x1dGVgKTtcbiAgfVxuXG4gIGF3YWl0IGZzLm1rZGlyKGRlc3REaXIsIHtyZWN1cnNpdmU6IHRydWV9KTtcbiAgY29uc3QgZGlyID0gYXdhaXQgZnMucmVhbHBhdGgoZGVzdERpcik7XG4gIGlmIChvcHRzLnVzZVN5c3RlbVVuemlwKSB7XG4gICAgdHJ5IHtcbiAgICAgIGF3YWl0IGV4dHJhY3RXaXRoU3lzdGVtVW56aXAoemlwRmlsZVBhdGgsIGRpcik7XG4gICAgICByZXR1cm47XG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICBsb2cud2FybigndW56aXAgZmFpbGVkOyBmYWxsaW5nIGJhY2sgdG8gSlM6ICVzJywgZXJyLnN0ZGVyciB8fCBlcnIubWVzc2FnZSk7XG4gICAgfVxuICB9XG4gIGNvbnN0IGV4dHJhY3RvciA9IG5ldyBaaXBFeHRyYWN0b3IoemlwRmlsZVBhdGgsIHtcbiAgICAuLi5vcHRzLFxuICAgIGRpcixcbiAgfSk7XG4gIGF3YWl0IGV4dHJhY3Rvci5leHRyYWN0KCk7XG59XG5cbi8qKlxuICogRXhlY3V0ZXMgc3lzdGVtIHVuemlwIChlLmcuLCBgL3Vzci9iaW4vdW56aXBgKS4gSWYgYXZhaWxhYmxlLCBpdCBpc1xuICogc2lnbmlmaWNhbnRseSBmYXN0ZXIgdGhhbiB0aGUgSlMgaW1wbGVtZW50YXRpb24uXG4gKiBCeSBkZWZhdWx0IGFsbCBmaWxlcyBpbiB0aGUgZGVzdERpciBnZXQgb3ZlcnJpZGRlbiBpZiBhbHJlYWR5IGV4aXN0LlxuICpcbiAqIEBwYXJhbSB7c3RyaW5nfSB6aXBGaWxlUGF0aCBUaGUgZnVsbCBwYXRoIHRvIHRoZSBzb3VyY2UgWklQIGZpbGVcbiAqIEBwYXJhbSB7c3RyaW5nfSBkZXN0RGlyIFRoZSBmdWxsIHBhdGggdG8gdGhlIGRlc3RpbmF0aW9uIGZvbGRlci5cbiAqIFRoaXMgZm9sZGVyIGlzIGV4cGVjdGVkIHRvIGFscmVhZHkgZXhpc3QgYmVmb3JlIGV4dHJhY3RpbmcgdGhlIGFyY2hpdmUuXG4gKi9cbmFzeW5jIGZ1bmN0aW9uIGV4dHJhY3RXaXRoU3lzdGVtVW56aXAgKHppcEZpbGVQYXRoLCBkZXN0RGlyKSB7XG4gIGNvbnN0IGlzV2luZG93c0hvc3QgPSBpc1dpbmRvd3MoKTtcbiAgbGV0IGV4ZWN1dGFibGVQYXRoO1xuICB0cnkge1xuICAgIGV4ZWN1dGFibGVQYXRoID0gYXdhaXQgZ2V0RXhlY3V0YWJsZVBhdGgoaXNXaW5kb3dzSG9zdCA/ICdwb3dlcnNoZWxsLmV4ZScgOiAndW56aXAnKTtcbiAgfSBjYXRjaCAoZSkge1xuICAgIHRocm93IG5ldyBFcnJvcignQ291bGQgbm90IGZpbmQgc3lzdGVtIHVuemlwJyk7XG4gIH1cblxuICBpZiAoaXNXaW5kb3dzSG9zdCkge1xuICAgIC8vIG9uIFdpbmRvd3Mgd2UgdXNlIFBvd2VyU2hlbGwgdG8gdW56aXAgZmlsZXNcbiAgICBhd2FpdCBleGVjKGV4ZWN1dGFibGVQYXRoLCBbXG4gICAgICAnLWNvbW1hbmQnLFxuICAgICAgJ0V4cGFuZC1BcmNoaXZlJyxcbiAgICAgICctTGl0ZXJhbFBhdGgnLFxuICAgICAgemlwRmlsZVBhdGgsXG4gICAgICAnLURlc3RpbmF0aW9uUGF0aCcsXG4gICAgICBkZXN0RGlyLFxuICAgICAgJy1Gb3JjZScsXG4gICAgXSk7XG4gIH0gZWxzZSB7XG4gICAgLy8gLXEgbWVhbnMgcXVpZXQgKG5vIHN0ZG91dClcbiAgICAvLyAtbyBtZWFucyBvdmVyd3JpdGVcbiAgICAvLyAtZCBpcyB0aGUgZGVzdCBkaXJcbiAgICBhd2FpdCBleGVjKGV4ZWN1dGFibGVQYXRoLCBbJy1xJywgJy1vJywgemlwRmlsZVBhdGgsICctZCcsIGRlc3REaXJdKTtcbiAgfVxufVxuXG4vKipcbiAqIEV4dHJhY3QgYSBzaW5nbGUgemlwIGVudHJ5IHRvIGEgZGlyZWN0b3J5XG4gKlxuICogQHBhcmFtIHt5YXV6bC5aaXBGaWxlfSB6aXBGaWxlIFRoZSBzb3VyY2UgWklQIHN0cmVhbVxuICogQHBhcmFtIHt5YXV6bC5FbnRyeX0gZW50cnkgVGhlIGVudHJ5IGluc3RhbmNlXG4gKiBAcGFyYW0ge3N0cmluZ30gZGVzdERpciBUaGUgZnVsbCBwYXRoIHRvIHRoZSBkZXN0aW5hdGlvbiBmb2xkZXJcbiAqL1xuYXN5bmMgZnVuY3Rpb24gX2V4dHJhY3RFbnRyeVRvICh6aXBGaWxlLCBlbnRyeSwgZGVzdERpcikge1xuICBjb25zdCBkc3RQYXRoID0gcGF0aC5yZXNvbHZlKGRlc3REaXIsIGVudHJ5LmZpbGVOYW1lKTtcblxuICAvLyBDcmVhdGUgZGVzdCBkaXJlY3RvcnkgaWYgZG9lc24ndCBleGlzdCBhbHJlYWR5XG4gIGlmICgvXFwvJC8udGVzdChlbnRyeS5maWxlTmFtZSkpIHtcbiAgICBpZiAoIShhd2FpdCBmcy5leGlzdHMoZHN0UGF0aCkpKSB7XG4gICAgICBhd2FpdCBmcy5ta2RpcnAoZHN0UGF0aCk7XG4gICAgfVxuICAgIHJldHVybjtcbiAgfSBlbHNlIGlmICghKGF3YWl0IGZzLmV4aXN0cyhwYXRoLmRpcm5hbWUoZHN0UGF0aCkpKSkge1xuICAgIGF3YWl0IGZzLm1rZGlycChwYXRoLmRpcm5hbWUoZHN0UGF0aCkpO1xuICB9XG5cbiAgLy8gQ3JlYXRlIGEgd3JpdGUgc3RyZWFtXG4gIGNvbnN0IHdyaXRlU3RyZWFtID0gY3JlYXRlV3JpdGVTdHJlYW0oZHN0UGF0aCwge2ZsYWdzOiAndyd9KTtcbiAgY29uc3Qgd3JpdGVTdHJlYW1Qcm9taXNlID0gbmV3IEIoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgIHdyaXRlU3RyZWFtLm9uY2UoJ2ZpbmlzaCcsIHJlc29sdmUpO1xuICAgIHdyaXRlU3RyZWFtLm9uY2UoJ2Vycm9yJywgcmVqZWN0KTtcbiAgfSk7XG5cbiAgLy8gQ3JlYXRlIHppcFJlYWRTdHJlYW0gYW5kIHBpcGUgZGF0YSB0byB0aGUgd3JpdGUgc3RyZWFtXG4gIC8vIChmb3Igc29tZSBvZGQgcmVhc29uIEIucHJvbWlzaWZ5IGRvZXNuJ3Qgd29yayBvbiB6aXBmaWxlLm9wZW5SZWFkU3RyZWFtLCBpdCBjYXVzZXMgYW4gZXJyb3IgJ2Nsb3NlZCcpXG4gIGNvbnN0IHppcFJlYWRTdHJlYW0gPSBhd2FpdCBuZXcgQigocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgemlwRmlsZS5vcGVuUmVhZFN0cmVhbShlbnRyeSwgKGVyciwgcmVhZFN0cmVhbSkgPT4gKGVyciA/IHJlamVjdChlcnIpIDogcmVzb2x2ZShyZWFkU3RyZWFtKSkpO1xuICB9KTtcbiAgY29uc3QgemlwUmVhZFN0cmVhbVByb21pc2UgPSBuZXcgQigocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgemlwUmVhZFN0cmVhbS5vbmNlKCdlbmQnLCByZXNvbHZlKTtcbiAgICB6aXBSZWFkU3RyZWFtLm9uY2UoJ2Vycm9yJywgcmVqZWN0KTtcbiAgfSk7XG4gIHppcFJlYWRTdHJlYW0ucGlwZSh3cml0ZVN0cmVhbSk7XG5cbiAgLy8gV2FpdCBmb3IgdGhlIHppcFJlYWRTdHJlYW0gYW5kIHdyaXRlU3RyZWFtIHRvIGVuZCBiZWZvcmUgcmV0dXJuaW5nXG4gIHJldHVybiBhd2FpdCBCLmFsbChbemlwUmVhZFN0cmVhbVByb21pc2UsIHdyaXRlU3RyZWFtUHJvbWlzZV0pO1xufVxuXG4vKipcbiAqIEB0eXBlZGVmIFppcEVudHJ5XG4gKiBAcHJvcGVydHkge3lhdXpsLkVudHJ5fSBlbnRyeSBUaGUgYWN0dWFsIGVudHJ5IGluc3RhbmNlXG4gKiBAcHJvcGVydHkge2Z1bmN0aW9ufSBleHRyYWN0RW50cnlUbyBBbiBhc3luYyBmdW5jdGlvbiwgd2hpY2ggYWNjZXB0cyBvbmUgcGFyYW1ldGVyLlxuICogVGhpcyBwYXJhbWV0ZXIgY29udGFpbnMgdGhlIGRlc3RpbmF0aW9uIGZvbGRlciBwYXRoIHRvIHdoaWNoIHRoaXMgZnVuY3Rpb24gaXMgZ29pbmcgdG8gZXh0cmFjdCB0aGUgZW50cnkuXG4gKi9cblxuLyoqXG4gKiBHZXQgZW50cmllcyBmb3IgYSB6aXAgZm9sZGVyXG4gKlxuICogQHBhcmFtIHtzdHJpbmd9IHppcEZpbGVQYXRoIFRoZSBmdWxsIHBhdGggdG8gdGhlIHNvdXJjZSBaSVAgZmlsZVxuICogQHBhcmFtIHtmdW5jdGlvbn0gb25FbnRyeSBDYWxsYmFjayB3aGVuIGVudHJ5IGlzIHJlYWQuXG4gKiBUaGUgY2FsbGJhY2sgaXMgZXhwZWN0ZWQgdG8gYWNjZXB0IG9uZSBhcmd1bWVudCBvZiBaaXBFbnRyeSB0eXBlLlxuICogVGhlIGl0ZXJhdGlvbiB0aHJvdWdoIHRoZSBzb3VyY2UgemlwIGZpbGUgd2lsbCBiaSB0ZXJtaW5hdGVkIGFzIHNvb24gYXNcbiAqIHRoZSByZXN1bHQgb2YgdGhpcyBmdW5jdGlvbiBlcXVhbHMgdG8gYGZhbHNlYC5cbiAqL1xuYXN5bmMgZnVuY3Rpb24gcmVhZEVudHJpZXMgKHppcEZpbGVQYXRoLCBvbkVudHJ5KSB7XG4gIC8vIE9wZW4gYSB6aXAgZmlsZSBhbmQgc3RhcnQgcmVhZGluZyBlbnRyaWVzXG4gIGNvbnN0IHppcGZpbGUgPSBhd2FpdCBvcGVuWmlwKHppcEZpbGVQYXRoLCB7bGF6eUVudHJpZXM6IHRydWV9KTtcbiAgY29uc3QgemlwUmVhZFN0cmVhbVByb21pc2UgPSBuZXcgQigocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgemlwZmlsZS5vbmNlKCdlbmQnLCByZXNvbHZlKTtcbiAgICB6aXBmaWxlLm9uY2UoJ2Vycm9yJywgcmVqZWN0KTtcblxuICAgIC8vIE9uIGVhY2ggZW50cnksIGNhbGwgJ29uRW50cnknIGFuZCB0aGVuIHJlYWQgdGhlIG5leHQgZW50cnlcbiAgICB6aXBmaWxlLm9uKCdlbnRyeScsIGFzeW5jIChlbnRyeSkgPT4ge1xuICAgICAgY29uc3QgcmVzID0gYXdhaXQgb25FbnRyeSh7XG4gICAgICAgIGVudHJ5LFxuICAgICAgICBleHRyYWN0RW50cnlUbzogYXN5bmMgKGRlc3REaXIpID0+IGF3YWl0IF9leHRyYWN0RW50cnlUbyh6aXBmaWxlLCBlbnRyeSwgZGVzdERpciksXG4gICAgICB9KTtcbiAgICAgIGlmIChyZXMgPT09IGZhbHNlKSB7XG4gICAgICAgIHJldHVybiB6aXBmaWxlLmVtaXQoJ2VuZCcpO1xuICAgICAgfVxuICAgICAgemlwZmlsZS5yZWFkRW50cnkoKTtcbiAgICB9KTtcbiAgfSk7XG4gIHppcGZpbGUucmVhZEVudHJ5KCk7XG5cbiAgLy8gV2FpdCBmb3IgdGhlIGVudHJpZXMgdG8gZmluaXNoIGJlaW5nIGl0ZXJhdGVkIHRocm91Z2hcbiAgcmV0dXJuIGF3YWl0IHppcFJlYWRTdHJlYW1Qcm9taXNlO1xufVxuXG4vKipcbiAqIEB0eXBlZGVmIFppcE9wdGlvbnNcbiAqIEBwcm9wZXJ0eSB7Ym9vbGVhbn0gW2VuY29kZVRvQmFzZTY0PWZhbHNlXSBXaGV0aGVyIHRvIGVuY29kZVxuICogdGhlIHJlc3VsdGluZyBhcmNoaXZlIHRvIGEgYmFzZTY0LWVuY29kZWQgc3RyaW5nXG4gKiBAcHJvcGVydHkge2Jvb2xlYW59IFtpc01ldGVyZWQ9dHJ1ZV0gV2hldGhlciB0byBsb2cgdGhlIGFjdHVhbFxuICogYXJjaGl2ZXIgcGVyZm9ybWFuY2VcbiAqIEBwcm9wZXJ0eSB7bnVtYmVyfSBbbWF4U2l6ZT0xMDczNzQxODI0XSBUaGUgbWF4aW11bSBzaXplIG9mXG4gKiB0aGUgcmVzdWx0aW5nIGFyY2hpdmUgaW4gYnl0ZXMuIFRoaXMgaXMgc2V0IHRvIDFHQiBieSBkZWZhdWx0LCBiZWNhdXNlXG4gKiBBcm1vciBsaW1pdHMgdGhlIG1heGltdW0gSFRUUCBib2R5IHNpemUgdG8gMUdCLiBBbHNvLCB0aGUgTm9kZUpTIGhlYXBcbiAqIHNpemUgbXVzdCBiZSBlbm91Z2ggdG8ga2VlcCB0aGUgcmVzdWx0aW5nIG9iamVjdCAodXN1YWxseSB0aGlzIHNpemUgaXNcbiAqIGxpbWl0ZWQgdG8gMS40IEdCKVxuICogQHByb3BlcnR5IHtudW1iZXJ9IFtsZXZlbD05XSBUaGUgY29tcHJlc3Npb24gbGV2ZWwuIFRoZSBtYXhpbXVtXG4gKiBsZXZlbCBpcyA5ICh0aGUgYmVzdCBjb21wcmVzc2lvbiwgd29yc3QgcGVyZm9ybWFuY2UpLiBUaGUgbWluaW11bVxuICogY29tcHJlc3Npb24gbGV2ZWwgaXMgMCAobm8gY29tcHJlc3Npb24pLlxuICovXG5cbi8qKlxuICogQ29udmVydHMgY29udGVudHMgb2YgbG9jYWwgZGlyZWN0b3J5IHRvIGFuIGluLW1lbW9yeSAuemlwIGJ1ZmZlclxuICpcbiAqIEBwYXJhbSB7c3RyaW5nfSBzcmNQYXRoIFRoZSBmdWxsIHBhdGggdG8gdGhlIGZvbGRlciBvciBmaWxlIGJlaW5nIHppcHBlZFxuICogQHBhcmFtIHtaaXBPcHRpb25zfSBvcHRzIFppcHBpbmcgb3B0aW9uc1xuICogQHJldHVybnMge1Byb21pc2U8QnVmZmVyPn0gWmlwcGVkIChhbmQgZW5jb2RlZCBpZiBgZW5jb2RlVG9CYXNlNjRgIGlzIHRydXRoeSlcbiAqIGNvbnRlbnQgb2YgdGhlIHNvdXJjZSBwYXRoIGFzIG1lbW9yeSBidWZmZXJcbiAqIEB0aHJvd3Mge0Vycm9yfSBpZiB0aGVyZSB3YXMgYW4gZXJyb3Igd2hpbGUgcmVhZGluZyB0aGUgc291cmNlXG4gKiBvciB0aGUgc291cmNlIGlzIHRvbyBiaWdcbiAqL1xuYXN5bmMgZnVuY3Rpb24gdG9Jbk1lbW9yeVppcCAoc3JjUGF0aCwgb3B0cyA9IC8qKiBAdHlwZSB7WmlwT3B0aW9uc30gKi8gKHt9KSkge1xuICBpZiAoIShhd2FpdCBmcy5leGlzdHMoc3JjUGF0aCkpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBObyBzdWNoIGZpbGUgb3IgZm9sZGVyOiAke3NyY1BhdGh9YCk7XG4gIH1cblxuICBjb25zdCB7aXNNZXRlcmVkID0gdHJ1ZSwgZW5jb2RlVG9CYXNlNjQgPSBmYWxzZSwgbWF4U2l6ZSA9IDEgKiBHaUIsIGxldmVsID0gOX0gPSBvcHRzO1xuICBjb25zdCByZXN1bHRCdWZmZXJzID0gW107XG4gIGxldCByZXN1bHRCdWZmZXJzU2l6ZSA9IDA7XG4gIC8vIENyZWF0ZSBhIHdyaXRhYmxlIHN0cmVhbSB0aGF0IHppcCBidWZmZXJzIHdpbGwgYmUgc3RyZWFtZWQgdG9cbiAgY29uc3QgcmVzdWx0V3JpdGVTdHJlYW0gPSBuZXcgc3RyZWFtLldyaXRhYmxlKHtcbiAgICB3cml0ZTogKGJ1ZmZlciwgZW5jb2RpbmcsIG5leHQpID0+IHtcbiAgICAgIHJlc3VsdEJ1ZmZlcnMucHVzaChidWZmZXIpO1xuICAgICAgcmVzdWx0QnVmZmVyc1NpemUgKz0gYnVmZmVyLmxlbmd0aDtcbiAgICAgIGlmIChtYXhTaXplID4gMCAmJiByZXN1bHRCdWZmZXJzU2l6ZSA+IG1heFNpemUpIHtcbiAgICAgICAgcmVzdWx0V3JpdGVTdHJlYW0uZW1pdChcbiAgICAgICAgICAnZXJyb3InLFxuICAgICAgICAgIG5ldyBFcnJvcihcbiAgICAgICAgICAgIGBUaGUgc2l6ZSBvZiB0aGUgcmVzdWx0aW5nIGAgK1xuICAgICAgICAgICAgICBgYXJjaGl2ZSBtdXN0IG5vdCBiZSBncmVhdGVyIHRoYW4gJHt0b1JlYWRhYmxlU2l6ZVN0cmluZyhtYXhTaXplKX1gXG4gICAgICAgICAgKVxuICAgICAgICApO1xuICAgICAgfVxuICAgICAgbmV4dCgpO1xuICAgIH0sXG4gIH0pO1xuXG4gIC8vIFppcCAnc3JjRGlyJyBhbmQgc3RyZWFtIGl0IHRvIHRoZSBhYm92ZSB3cml0YWJsZSBzdHJlYW1cbiAgY29uc3QgYXJjaGl2ZSA9IGFyY2hpdmVyKCd6aXAnLCB7XG4gICAgemxpYjoge2xldmVsfSxcbiAgfSk7XG4gIGxldCBzcmNTaXplID0gbnVsbDtcbiAgY29uc3QgYmFzZTY0RW5jb2RlclN0cmVhbSA9IGVuY29kZVRvQmFzZTY0ID8gbmV3IEJhc2U2NEVuY29kZSgpIDogbnVsbDtcbiAgY29uc3QgcmVzdWx0V3JpdGVTdHJlYW1Qcm9taXNlID0gbmV3IEIoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgIHJlc3VsdFdyaXRlU3RyZWFtLm9uY2UoJ2Vycm9yJywgKGUpID0+IHtcbiAgICAgIGlmIChiYXNlNjRFbmNvZGVyU3RyZWFtKSB7XG4gICAgICAgIGFyY2hpdmUudW5waXBlKGJhc2U2NEVuY29kZXJTdHJlYW0pO1xuICAgICAgICBiYXNlNjRFbmNvZGVyU3RyZWFtLnVucGlwZShyZXN1bHRXcml0ZVN0cmVhbSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBhcmNoaXZlLnVucGlwZShyZXN1bHRXcml0ZVN0cmVhbSk7XG4gICAgICB9XG4gICAgICBhcmNoaXZlLmFib3J0KCk7XG4gICAgICBhcmNoaXZlLmRlc3Ryb3koKTtcbiAgICAgIHJlamVjdChlKTtcbiAgICB9KTtcbiAgICByZXN1bHRXcml0ZVN0cmVhbS5vbmNlKCdmaW5pc2gnLCAoKSA9PiB7XG4gICAgICBzcmNTaXplID0gYXJjaGl2ZS5wb2ludGVyKCk7XG4gICAgICByZXNvbHZlKCk7XG4gICAgfSk7XG4gIH0pO1xuICBjb25zdCBhcmNoaXZlU3RyZWFtUHJvbWlzZSA9IG5ldyBCKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICBhcmNoaXZlLm9uY2UoJ2ZpbmlzaCcsIHJlc29sdmUpO1xuICAgIGFyY2hpdmUub25jZSgnZXJyb3InLCAoZSkgPT4gcmVqZWN0KG5ldyBFcnJvcihgRmFpbGVkIHRvIGFyY2hpdmUgJyR7c3JjUGF0aH0nOiAke2UubWVzc2FnZX1gKSkpO1xuICB9KTtcbiAgY29uc3QgdGltZXIgPSBpc01ldGVyZWQgPyBuZXcgVGltZXIoKS5zdGFydCgpIDogbnVsbDtcbiAgaWYgKChhd2FpdCBmcy5zdGF0KHNyY1BhdGgpKS5pc0RpcmVjdG9yeSgpKSB7XG4gICAgYXJjaGl2ZS5kaXJlY3Rvcnkoc3JjUGF0aCwgZmFsc2UpO1xuICB9IGVsc2Uge1xuICAgIGFyY2hpdmUuZmlsZShzcmNQYXRoLCB7XG4gICAgICBuYW1lOiBwYXRoLmJhc2VuYW1lKHNyY1BhdGgpLFxuICAgIH0pO1xuICB9XG4gIGlmIChiYXNlNjRFbmNvZGVyU3RyZWFtKSB7XG4gICAgYXJjaGl2ZS5waXBlKGJhc2U2NEVuY29kZXJTdHJlYW0pO1xuICAgIGJhc2U2NEVuY29kZXJTdHJlYW0ucGlwZShyZXN1bHRXcml0ZVN0cmVhbSk7XG4gIH0gZWxzZSB7XG4gICAgYXJjaGl2ZS5waXBlKHJlc3VsdFdyaXRlU3RyZWFtKTtcbiAgfVxuICBhcmNoaXZlLmZpbmFsaXplKCk7XG5cbiAgLy8gV2FpdCBmb3IgdGhlIHN0cmVhbXMgdG8gZmluaXNoXG4gIGF3YWl0IEIuYWxsKFthcmNoaXZlU3RyZWFtUHJvbWlzZSwgcmVzdWx0V3JpdGVTdHJlYW1Qcm9taXNlXSk7XG5cbiAgaWYgKHRpbWVyKSB7XG4gICAgbG9nLmRlYnVnKFxuICAgICAgYFppcHBlZCAke2VuY29kZVRvQmFzZTY0ID8gJ2FuZCBiYXNlNjQtZW5jb2RlZCAnIDogJyd9YCArXG4gICAgICAgIGAnJHtwYXRoLmJhc2VuYW1lKHNyY1BhdGgpfScgYCArXG4gICAgICAgIChzcmNTaXplID8gYCgke3RvUmVhZGFibGVTaXplU3RyaW5nKHNyY1NpemUpfSkgYCA6ICcnKSArXG4gICAgICAgIGBpbiAke3RpbWVyLmdldER1cmF0aW9uKCkuYXNTZWNvbmRzLnRvRml4ZWQoMyl9cyBgICtcbiAgICAgICAgYChjb21wcmVzc2lvbiBsZXZlbDogJHtsZXZlbH0pYFxuICAgICk7XG4gIH1cbiAgLy8gUmV0dXJuIHRoZSBhcnJheSBvZiB6aXAgYnVmZmVycyBjb25jYXRlbmF0ZWQgaW50byBvbmUgYnVmZmVyXG4gIHJldHVybiBCdWZmZXIuY29uY2F0KHJlc3VsdEJ1ZmZlcnMpO1xufVxuXG4vKipcbiAqIFZlcmlmaWVzIHdoZXRoZXIgdGhlIGdpdmVuIGZpbGUgaXMgYSB2YWxpZCBaSVAgYXJjaGl2ZVxuICpcbiAqIEBwYXJhbSB7c3RyaW5nfSBmaWxlUGF0aCAtIEZ1bGwgcGF0aCB0byB0aGUgZmlsZVxuICogQHRocm93cyB7RXJyb3J9IElmIHRoZSBmaWxlIGRvZXMgbm90IGV4aXN0IG9yIGlzIG5vdCBhIHZhbGlkIFpJUCBhcmNoaXZlXG4gKi9cbmFzeW5jIGZ1bmN0aW9uIGFzc2VydFZhbGlkWmlwIChmaWxlUGF0aCkge1xuICBpZiAoIShhd2FpdCBmcy5leGlzdHMoZmlsZVBhdGgpKSkge1xuICAgIHRocm93IG5ldyBFcnJvcihgVGhlIGZpbGUgYXQgJyR7ZmlsZVBhdGh9JyBkb2VzIG5vdCBleGlzdGApO1xuICB9XG5cbiAgY29uc3Qge3NpemV9ID0gYXdhaXQgZnMuc3RhdChmaWxlUGF0aCk7XG4gIGlmIChzaXplIDwgNCkge1xuICAgIHRocm93IG5ldyBFcnJvcihgVGhlIGZpbGUgYXQgJyR7ZmlsZVBhdGh9JyBpcyB0b28gc21hbGwgdG8gYmUgYSBaSVAgYXJjaGl2ZWApO1xuICB9XG4gIGNvbnN0IGZkID0gYXdhaXQgZnMub3BlbihmaWxlUGF0aCwgJ3InKTtcbiAgdHJ5IHtcbiAgICBjb25zdCBidWZmZXIgPSBCdWZmZXIuYWxsb2MoWklQX01BR0lDLmxlbmd0aCk7XG4gICAgYXdhaXQgZnMucmVhZChmZCwgYnVmZmVyLCAwLCBaSVBfTUFHSUMubGVuZ3RoLCAwKTtcbiAgICBjb25zdCBzaWduYXR1cmUgPSBidWZmZXIudG9TdHJpbmcoJ2FzY2lpJyk7XG4gICAgaWYgKHNpZ25hdHVyZSAhPT0gWklQX01BR0lDKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgIGBUaGUgZmlsZSBzaWduYXR1cmUgJyR7c2lnbmF0dXJlfScgb2YgJyR7ZmlsZVBhdGh9JyBgICtcbiAgICAgICAgICBgaXMgbm90IGVxdWFsIHRvIHRoZSBleHBlY3RlZCBaSVAgYXJjaGl2ZSBzaWduYXR1cmUgJyR7WklQX01BR0lDfSdgXG4gICAgICApO1xuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSBmaW5hbGx5IHtcbiAgICBhd2FpdCBmcy5jbG9zZShmZCk7XG4gIH1cbn1cblxuLyoqXG4gKiBAdHlwZWRlZiBaaXBDb21wcmVzc2lvbk9wdGlvbnNcbiAqIEBwcm9wZXJ0eSB7bnVtYmVyfSBsZXZlbCBbOV0gLSBDb21wcmVzc2lvbiBsZXZlbCBpbiByYW5nZSAwLi45XG4gKiAoZ3JlYXRlciBudW1iZXJzIG1lYW4gYmV0dGVyIGNvbXByZXNzaW9uLCBidXQgbG9uZ2VyIHByb2Nlc3NpbmcgdGltZSlcbiAqL1xuXG4vKipcbiAqIEB0eXBlZGVmIFppcFNvdXJjZU9wdGlvbnNcbiAqIEBwcm9wZXJ0eSB7c3RyaW5nfSBbcGF0dGVybj0nKipcXC8qJ10gLSBHTE9CIHBhdHRlcm4gZm9yIGNvbXByZXNzaW9uXG4gKiBAcHJvcGVydHkge3N0cmluZ30gW2N3ZF0gLSBUaGUgc291cmNlIHJvb3QgZm9sZGVyICh0aGUgcGFyZW50IGZvbGRlciBvZlxuICogdGhlIGRlc3RpbmF0aW9uIGZpbGUgYnkgZGVmYXVsdClcbiAqIEBwcm9wZXJ0eSB7c3RyaW5nW119IFtpZ25vcmVdIC0gVGhlIGxpc3Qgb2YgaWdub3JlZCBwYXR0ZXJuc1xuICovXG5cbi8qKlxuICogQ3JlYXRlcyBhbiBhcmNoaXZlIGJhc2VkIG9uIHRoZSBnaXZlbiBnbG9iIHBhdHRlcm5cbiAqXG4gKiBAcGFyYW0ge3N0cmluZ30gZHN0UGF0aCAtIFRoZSByZXN1bHRpbmcgYXJjaGl2ZSBwYXRoXG4gKiBAcGFyYW0ge1ppcFNvdXJjZU9wdGlvbnN9IHNyYyAtIFNvdXJjZSBvcHRpb25zXG4gKiBAcGFyYW0ge1ppcENvbXByZXNzaW9uT3B0aW9uc30gb3B0cyAtIENvbXByZXNzaW9uIG9wdGlvbnNcbiAqIEB0aHJvd3Mge0Vycm9yfSBJZiB0aGVyZSB3YXMgYW4gZXJyb3Igd2hpbGUgY3JlYXRpbmcgdGhlIGFyY2hpdmVcbiAqL1xuYXN5bmMgZnVuY3Rpb24gdG9BcmNoaXZlIChcbiAgZHN0UGF0aCxcbiAgc3JjID0gLyoqIEB0eXBlIHtaaXBTb3VyY2VPcHRpb25zfSAqLyAoe30pLFxuICBvcHRzID0gLyoqIEB0eXBlIHtaaXBDb21wcmVzc2lvbk9wdGlvbnN9ICovICh7fSlcbikge1xuICBjb25zdCB7bGV2ZWwgPSA5fSA9IG9wdHM7XG4gIGNvbnN0IHtwYXR0ZXJuID0gJyoqLyonLCBjd2QgPSBwYXRoLmRpcm5hbWUoZHN0UGF0aCksIGlnbm9yZSA9IFtdfSA9IHNyYztcbiAgY29uc3QgYXJjaGl2ZSA9IGFyY2hpdmVyKCd6aXAnLCB7emxpYjoge2xldmVsfX0pO1xuICBjb25zdCBzdHJlYW0gPSBmcy5jcmVhdGVXcml0ZVN0cmVhbShkc3RQYXRoKTtcbiAgcmV0dXJuIGF3YWl0IG5ldyBCKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICBhcmNoaXZlXG4gICAgICAuZ2xvYihwYXR0ZXJuLCB7XG4gICAgICAgIGN3ZCxcbiAgICAgICAgaWdub3JlLFxuICAgICAgfSlcbiAgICAgIC5vbignZXJyb3InLCByZWplY3QpXG4gICAgICAucGlwZShzdHJlYW0pO1xuICAgIHN0cmVhbVxuICAgICAgLm9uKCdlcnJvcicsIChlKSA9PiB7XG4gICAgICAgIGFyY2hpdmUudW5waXBlKHN0cmVhbSk7XG4gICAgICAgIGFyY2hpdmUuYWJvcnQoKTtcbiAgICAgICAgYXJjaGl2ZS5kZXN0cm95KCk7XG4gICAgICAgIHJlamVjdChlKTtcbiAgICAgIH0pXG4gICAgICAub24oJ2ZpbmlzaCcsIHJlc29sdmUpO1xuICAgIGFyY2hpdmUuZmluYWxpemUoKTtcbiAgfSk7XG59XG5cbi8qKlxuICogRmluZHMgYW5kIG1lbW9pemVzIHRoZSBmdWxsIHBhdGggdG8gdGhlIGdpdmVuIGV4ZWN1dGFibGUuXG4gKiBSZWplY3RzIGlmIGl0IGlzIG5vdCBmb3VuZC5cbiAqL1xuY29uc3QgZ2V0RXhlY3V0YWJsZVBhdGggPSBfLm1lbW9pemUoXG4gIC8qKlxuICAgKiBAcmV0dXJucyB7UHJvbWlzZTxzdHJpbmc+fSBGdWxsIFBhdGggdG8gdGhlIGV4ZWN1dGFibGVcbiAgICovXG4gIGFzeW5jIGZ1bmN0aW9uIGdldEV4ZWN1dGFibGVQYXRoIChiaW5hcnlOYW1lKSB7XG4gICAgY29uc3QgZnVsbFBhdGggPSBhd2FpdCBmcy53aGljaChiaW5hcnlOYW1lKTtcbiAgICBsb2cuZGVidWcoYEZvdW5kICcke2JpbmFyeU5hbWV9JyBhdCAnJHtmdWxsUGF0aH0nYCk7XG4gICAgcmV0dXJuIGZ1bGxQYXRoO1xuICB9XG4pO1xuXG5leHBvcnQge2V4dHJhY3RBbGxUbywgcmVhZEVudHJpZXMsIHRvSW5NZW1vcnlaaXAsIF9leHRyYWN0RW50cnlUbywgYXNzZXJ0VmFsaWRaaXAsIHRvQXJjaGl2ZX07XG5leHBvcnQgZGVmYXVsdCB7XG4gIGV4dHJhY3RBbGxUbyxcbiAgcmVhZEVudHJpZXMsXG4gIHRvSW5NZW1vcnlaaXAsXG4gIGFzc2VydFZhbGlkWmlwLFxuICB0b0FyY2hpdmUsXG59O1xuIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7OztBQUFBLElBQUFBLE9BQUEsR0FBQUMsc0JBQUEsQ0FBQUMsT0FBQTtBQUNBLElBQUFDLFNBQUEsR0FBQUYsc0JBQUEsQ0FBQUMsT0FBQTtBQUNBLElBQUFFLE1BQUEsR0FBQUgsc0JBQUEsQ0FBQUMsT0FBQTtBQUNBLElBQUFHLFNBQUEsR0FBQUosc0JBQUEsQ0FBQUMsT0FBQTtBQUNBLElBQUFJLEdBQUEsR0FBQUosT0FBQTtBQUNBLElBQUFLLEtBQUEsR0FBQU4sc0JBQUEsQ0FBQUMsT0FBQTtBQUNBLElBQUFNLE9BQUEsR0FBQVAsc0JBQUEsQ0FBQUMsT0FBQTtBQUNBLElBQUFPLElBQUEsR0FBQVIsc0JBQUEsQ0FBQUMs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
