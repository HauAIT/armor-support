"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
require("source-map-support/register");
var _index = require("../index.js");
var _chai = _interopRequireDefault(require("chai"));
var _path = _interopRequireDefault(require("path"));
var _aitProcess = require("ait-process");
var _bluebird = _interopRequireDefault(require("bluebird"));
var _lodash = _interopRequireDefault(require("lodash"));
const should = _chai.default.should();
const MOCHA_TIMEOUT = 20000;
describe('fs', function () {
  this.timeout(MOCHA_TIMEOUT);
  const existingPath = _path.default.resolve(__dirname, 'fs-specs.js');
  it('should exist', function () {
    should.exist(_index.fs);
  });
  it('should have expected methods', function () {
    should.exist(_index.fs.open);
    should.exist(_index.fs.close);
    should.exist(_index.fs.access);
    should.exist(_index.fs.mkdir);
    should.exist(_index.fs.readlink);
    should.exist(_index.fs.exists);
    should.exist(_index.fs.rimraf);
    should.exist(_index.fs.rimrafSync);
    should.exist(_index.fs.readFile);
    should.exist(_index.fs.writeFile);
    should.exist(_index.fs.lstat);
    should.exist(_index.fs.mv);
  });
  describe('mkdir', function () {
    let dirName = _path.default.resolve(__dirname, 'tmp');
    it('should make a directory that does not exist', async function () {
      await _index.fs.rimraf(dirName);
      await _index.fs.mkdir(dirName);
      let exists = await _index.fs.hasAccess(dirName);
      exists.should.be.true;
    });
    it('should not complain if the dir already exists', async function () {
      let exists = await _index.fs.hasAccess(dirName);
      exists.should.be.true;
      await _index.fs.mkdir(dirName);
    });
    it('should still throw an error if something else goes wrong', async function () {
      await _index.fs.mkdir('/bin/foo').should.be.rejected;
    });
  });
  it('hasAccess', async function () {
    (await _index.fs.exists(existingPath)).should.be.ok;
    let nonExistingPath = _path.default.resolve(__dirname, 'wrong-specs.js');
    (await _index.fs.hasAccess(nonExistingPath)).should.not.be.ok;
  });
  it('exists', async function () {
    (await _index.fs.exists(existingPath)).should.be.ok;
    let nonExistingPath = _path.default.resolve(__dirname, 'wrong-specs.js');
    (await _index.fs.exists(nonExistingPath)).should.not.be.ok;
  });
  it('readFile', async function () {
    (await _index.fs.readFile(existingPath, 'utf8')).should.contain('readFile');
  });
  describe('copyFile', function () {
    it('should be able to copy a file', async function () {
      let newPath = _path.default.resolve(await _index.tempDir.openDir(), 'fs-specs.js');
      await _index.fs.copyFile(existingPath, newPath);
      (await _index.fs.readFile(newPath, 'utf8')).should.contain('readFile');
    });
    it('should throw an error if the source does not exist', async function () {
      await _index.fs.copyFile('/sdfsdfsdfsdf', '/tmp/bla').should.eventually.be.rejected;
    });
  });
  it('rimraf', async function () {
    let newPath = _path.default.resolve(await _index.tempDir.openDir(), 'fs-specs.js');
    await _index.fs.copyFile(existingPath, newPath);
    (await _index.fs.exists(newPath)).should.be.true;
    await _index.fs.rimraf(newPath);
    (await _index.fs.exists(newPath)).should.be.false;
  });
  it('sanitizeName', function () {
    _index.fs.sanitizeName(':file?.txt', {
      replacement: '-'
    }).should.eql('-file-.txt');
  });
  it('rimrafSync', async function () {
    let newPath = _path.default.resolve(await _index.tempDir.openDir(), 'fs-specs.js');
    await _index.fs.copyFile(existingPath, newPath);
    (await _index.fs.exists(newPath)).should.be.true;
    _index.fs.rimrafSync(newPath);
    (await _index.fs.exists(newPath)).should.be.false;
  });
  describe('md5', function () {
    this.timeout(1200000);
    let smallFilePath;
    let bigFilePath;
    before(async function () {
      smallFilePath = existingPath;
      bigFilePath = _path.default.resolve(await _index.tempDir.openDir(), 'enormous.txt');
      let file = await _index.fs.open(bigFilePath, 'w');
      let fileData = '';
      for (let i = 0; i < 4096; i++) {
        fileData += '1';
      }
      for (let i = 0; i < 40000; i++) {
        await _index.fs.write(file, fileData);
      }
      await _index.fs.close(file);
    });
    after(async function () {
      await _index.fs.unlink(bigFilePath);
    });
    it('should calculate hash of correct length', async function () {
      (await _index.fs.md5(smallFilePath)).should.have.length(32);
    });
    it('should be able to run on huge file', async function () {
      (await _index.fs.md5(bigFilePath)).should.have.length(32);
    });
  });
  describe('hash', function () {
    it('should calculate sha1 hash', async function () {
      (await _index.fs.hash(existingPath, 'sha1')).should.have.length(40);
    });
    it('should calculate md5 hash', async function () {
      (await _index.fs.hash(existingPath, 'md5')).should.have.length(32);
    });
  });
  it('stat', async function () {
    let stat = await _index.fs.stat(existingPath);
    stat.should.have.property('atime');
  });
  describe('which', function () {
    it('should find correct executable', async function () {
      let systemNpmPath = (await (0, _aitProcess.exec)('which', ['npm'])).stdout.trim();
      let npmPath = await _index.fs.which('npm');
      npmPath.should.equal(systemNpmPath);
    });
    it('should fail gracefully', async function () {
      await _index.fs.which('something_that_does_not_exist').should.eventually.be.rejected;
    });
  });
  describe('walkDir', function () {
    it('walkDir recursive', async function () {
      let inCallback = 0;
      const filePath = await _index.fs.walkDir(__dirname, true, async item => {
        if (item.endsWith('logger/helpers.js')) {
          ++inCallback;
          await _bluebird.default.delay(500);
          --inCallback;
          return true;
        }
      });
      inCallback.should.equal(0);
      filePath.should.not.be.null;
    });
    it('should walk all elements recursive', async function () {
      let inCallback = 0;
      const filePath = await _index.fs.walkDir(__dirname, true, async () => {
        ++inCallback;
        await _bluebird.default.delay(500);
        --inCallback;
      });
      inCallback.should.equal(0);
      _lodash.default.isNil(filePath).should.be.true;
    });
    it('should throw error through callback', async function () {
      let processed = 0;
      await _chai.default.expect(_index.fs.walkDir(__dirname, true, () => {
        ++processed;
        throw 'Callback error';
      })).to.be.rejectedWith('Callback error');
      processed.should.equal(1);
    });
    it('should traverse non-recursively', async function () {
      const filePath = await _index.fs.walkDir(__dirname, false, item => item.endsWith('logger/helpers.js'));
      _lodash.default.isNil(filePath).should.be.true;
    });
  });
});require('source-map-support').install();


//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdC9mcy1zcGVjcy5qcyIsIm5hbWVzIjpbIl9pbmRleCIsInJlcXVpcmUiLCJfY2hhaSIsIl9pbnRlcm9wUmVxdWlyZURlZmF1bHQiLCJfcGF0aCIsIl9haXRQcm9jZXNzIiwiX2JsdWViaXJkIiwiX2xvZGFzaCIsInNob3VsZCIsImNoYWkiLCJNT0NIQV9USU1FT1VUIiwiZGVzY3JpYmUiLCJ0aW1lb3V0IiwiZXhpc3RpbmdQYXRoIiwicGF0aCIsInJlc29sdmUiLCJfX2Rpcm5hbWUiLCJpdCIsImV4aXN0IiwiZnMiLCJvcGVuIiwiY2xvc2UiLCJhY2Nlc3MiLCJta2RpciIsInJlYWRsaW5rIiwiZXhpc3RzIiwicmltcmFmIiwicmltcmFmU3luYyIsInJlYWRGaWxlIiwid3JpdGVGaWxlIiwibHN0YXQiLCJtdiIsImRpck5hbWUiLCJoYXNBY2Nlc3MiLCJiZSIsInRydWUiLCJyZWplY3RlZCIsIm9rIiwibm9uRXhpc3RpbmdQYXRoIiwibm90IiwiY29udGFpbiIsIm5ld1BhdGgiLCJ0ZW1wRGlyIiwib3BlbkRpciIsImNvcHlGaWxlIiwiZXZlbnR1YWxseSIsImZhbHNlIiwic2FuaXRpemVOYW1lIiwicmVwbGFjZW1lbnQiLCJlcWwiLCJzbWFsbEZpbGVQYXRoIiwiYmlnRmlsZVBhdGgiLCJiZWZvcmUiLCJmaWxlIiwiZmlsZURhdGEiLCJpIiwid3JpdGUiLCJhZnRlciIsInVubGluayIsIm1kNSIsImhhdmUiLCJsZW5ndGgiLCJoYXNoIiwic3RhdCIsInByb3BlcnR5Iiwic3lzdGVtTnBtUGF0aCIsImV4ZWMiLCJzdGRvdXQiLCJ0cmltIiwibnBtUGF0aCIsIndoaWNoIiwiZXF1YWwiLCJpbkNhbGxiYWNrIiwiZmlsZVBhdGgiLCJ3YWxrRGlyIiwiaXRlbSIsImVuZHNXaXRoIiwiQiIsImRlbGF5IiwibnVsbCIsIl8iLCJpc05pbCIsInByb2Nlc3NlZCIsImV4cGVjdCIsInRvIiwicmVqZWN0ZWRXaXRoIl0sInNvdXJjZVJvb3QiOiIuLi8uLiIsInNvdXJjZXMiOlsidGVzdC9mcy1zcGVjcy5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBmcywgdGVtcERpciB9IGZyb20gJy4uL2luZGV4LmpzJztcbmltcG9ydCBjaGFpIGZyb20gJ2NoYWknO1xuaW1wb3J0IHBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgeyBleGVjIH0gZnJvbSAnYWl0LXByb2Nlc3MnO1xuaW1wb3J0IEIgZnJvbSAnYmx1ZWJpcmQnO1xuaW1wb3J0IF8gZnJvbSAnbG9kYXNoJztcblxuXG5jb25zdCBzaG91bGQgPSBjaGFpLnNob3VsZCgpO1xuXG5jb25zdCBNT0NIQV9USU1FT1VUID0gMjAwMDA7XG5cbmRlc2NyaWJlKCdmcycsIGZ1bmN0aW9uICgpIHtcbiAgdGhpcy50aW1lb3V0KE1PQ0hBX1RJTUVPVVQpO1xuXG4gIGNvbnN0IGV4aXN0aW5nUGF0aCA9IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICdmcy1zcGVjcy5qcycpO1xuICBpdCgnc2hvdWxkIGV4aXN0JywgZnVuY3Rpb24gKCkge1xuICAgIHNob3VsZC5leGlzdChmcyk7XG4gIH0pO1xuICBpdCgnc2hvdWxkIGhhdmUgZXhwZWN0ZWQgbWV0aG9kcycsIGZ1bmN0aW9uICgpIHtcbiAgICBzaG91bGQuZXhpc3QoZnMub3Blbik7XG4gICAgc2hvdWxkLmV4aXN0KGZzLmNsb3NlKTtcbiAgICBzaG91bGQuZXhpc3QoZnMuYWNjZXNzKTtcbiAgICBzaG91bGQuZXhpc3QoZnMubWtkaXIpO1xuICAgIHNob3VsZC5leGlzdChmcy5yZWFkbGluayk7XG4gICAgc2hvdWxkLmV4aXN0KGZzLmV4aXN0cyk7XG4gICAgc2hvdWxkLmV4aXN0KGZzLnJpbXJhZik7XG4gICAgc2hvdWxkLmV4aXN0KGZzLnJpbXJhZlN5bmMpO1xuICAgIHNob3VsZC5leGlzdChmcy5yZWFkRmlsZSk7XG4gICAgc2hvdWxkLmV4aXN0KGZzLndyaXRlRmlsZSk7XG4gICAgc2hvdWxkLmV4aXN0KGZzLmxzdGF0KTtcbiAgICBzaG91bGQuZXhpc3QoZnMubXYpO1xuICB9KTtcblxuICBkZXNjcmliZSgnbWtkaXInLCBmdW5jdGlvbiAoKSB7XG4gICAgbGV0IGRpck5hbWUgPSBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAndG1wJyk7XG5cbiAgICBpdCgnc2hvdWxkIG1ha2UgYSBkaXJlY3RvcnkgdGhhdCBkb2VzIG5vdCBleGlzdCcsIGFzeW5jIGZ1bmN0aW9uICgpIHtcbiAgICAgIGF3YWl0IGZzLnJpbXJhZihkaXJOYW1lKTtcbiAgICAgIGF3YWl0IGZzLm1rZGlyKGRpck5hbWUpO1xuICAgICAgbGV0IGV4aXN0cyA9IGF3YWl0IGZzLmhhc0FjY2VzcyhkaXJOYW1lKTtcbiAgICAgIGV4aXN0cy5zaG91bGQuYmUudHJ1ZTtcbiAgICB9KTtcblxuICAgIGl0KCdzaG91bGQgbm90IGNvbXBsYWluIGlmIHRoZSBkaXIgYWxyZWFkeSBleGlzdHMnLCBhc3luYyBmdW5jdGlvbiAoKSB7XG4gICAgICBsZXQgZXhpc3RzID0gYXdhaXQgZnMuaGFzQWNjZXNzKGRpck5hbWUpO1xuICAgICAgZXhpc3RzLnNob3VsZC5iZS50cnVlO1xuICAgICAgYXdhaXQgZnMubWtkaXIoZGlyTmFtZSk7XG4gICAgfSk7XG5cbiAgICBpdCgnc2hvdWxkIHN0aWxsIHRocm93IGFuIGVycm9yIGlmIHNvbWV0aGluZyBlbHNlIGdvZXMgd3JvbmcnLCBhc3luYyBmdW5jdGlvbiAoKSB7XG4gICAgICBhd2FpdCBmcy5ta2RpcignL2Jpbi9mb28nKS5zaG91bGQuYmUucmVqZWN0ZWQ7XG4gICAgfSk7XG4gIH0pO1xuXG4gIGl0KCdoYXNBY2Nlc3MnLCBhc3luYyBmdW5jdGlvbiAoKSB7XG4gICAgKGF3YWl0IGZzLmV4aXN0cyhleGlzdGluZ1BhdGgpKS5zaG91bGQuYmUub2s7XG4gICAgbGV0IG5vbkV4aXN0aW5nUGF0aCA9IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICd3cm9uZy1zcGVjcy5qcycpO1xuICAgIChhd2FpdCBmcy5oYXNBY2Nlc3Mobm9uRXhpc3RpbmdQYXRoKSkuc2hvdWxkLm5vdC5iZS5vaztcbiAgfSk7XG4gIGl0KCdleGlzdHMnLCBhc3luYyBmdW5jdGlvbiAoKSB7XG4gICAgKGF3YWl0IGZzLmV4aXN0cyhleGlzdGluZ1BhdGgpKS5zaG91bGQuYmUub2s7XG4gICAgbGV0IG5vbkV4aXN0aW5nUGF0aCA9IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICd3cm9uZy1zcGVjcy5qcycpO1xuICAgIChhd2FpdCBmcy5leGlzdHMobm9uRXhpc3RpbmdQYXRoKSkuc2hvdWxkLm5vdC5iZS5vaztcbiAgfSk7XG4gIGl0KCdyZWFkRmlsZScsIGFzeW5jIGZ1bmN0aW9uICgpIHtcbiAgICAoYXdhaXQgZnMucmVhZEZpbGUoZXhpc3RpbmdQYXRoLCAndXRmOCcpKS5zaG91bGQuY29udGFpbigncmVhZEZpbGUnKTtcbiAgfSk7XG5cbiAgZGVzY3JpYmUoJ2NvcHlGaWxlJywgZnVuY3Rpb24gKCkge1xuICAgIGl0KCdzaG91bGQgYmUgYWJsZSB0byBjb3B5IGEgZmlsZScsIGFzeW5jIGZ1bmN0aW9uICgpIHtcbiAgICAgIGxldCBuZXdQYXRoID0gcGF0aC5yZXNvbHZlKGF3YWl0IHRlbXBEaXIub3BlbkRpcigpLCAnZnMtc3BlY3MuanMnKTtcbiAgICAgIGF3YWl0IGZzLmNvcHlGaWxlKGV4aXN0aW5nUGF0aCwgbmV3UGF0aCk7XG4gICAgICAoYXdhaXQgZnMucmVhZEZpbGUobmV3UGF0aCwgJ3V0ZjgnKSkuc2hvdWxkLmNvbnRhaW4oJ3JlYWRGaWxlJyk7XG4gICAgfSk7XG5cbiAgICBpdCgnc2hvdWxkIHRocm93IGFuIGVycm9yIGlmIHRoZSBzb3VyY2UgZG9lcyBub3QgZXhpc3QnLCBhc3luYyBmdW5jdGlvbiAoKSB7XG4gICAgICBhd2FpdCBmcy5jb3B5RmlsZSgnL3NkZnNkZnNkZnNkZicsICcvdG1wL2JsYScpLnNob3VsZC5ldmVudHVhbGx5LmJlLnJlamVjdGVkO1xuICAgIH0pO1xuICB9KTtcblxuICBpdCgncmltcmFmJywgYXN5bmMgZnVuY3Rpb24gKCkge1xuICAgIGxldCBuZXdQYXRoID0gcGF0aC5yZXNvbHZlKGF3YWl0IHRlbXBEaXIub3BlbkRpcigpLCAnZnMtc3BlY3MuanMnKTtcbiAgICBhd2FpdCBmcy5jb3B5RmlsZShleGlzdGluZ1BhdGgsIG5ld1BhdGgpO1xuICAgIChhd2FpdCBmcy5leGlzdHMobmV3UGF0aCkpLnNob3VsZC5iZS50cnVlO1xuICAgIGF3YWl0IGZzLnJpbXJhZihuZXdQYXRoKTtcbiAgICAoYXdhaXQgZnMuZXhpc3RzKG5ld1BhdGgpKS5zaG91bGQuYmUuZmFsc2U7XG4gIH0pO1xuICBpdCgnc2FuaXRpemVOYW1lJywgZnVuY3Rpb24gKCkge1xuICAgIGZzLnNhbml0aXplTmFtZSgnOmZpbGU/LnR4dCcsIHtcbiAgICAgIHJlcGxhY2VtZW50OiAnLScsXG4gICAgfSkuc2hvdWxkLmVxbCgnLWZpbGUtLnR4dCcpO1xuICB9KTtcbiAgaXQoJ3JpbXJhZlN5bmMnLCBhc3luYyBmdW5jdGlvbiAoKSB7XG4gICAgbGV0IG5ld1BhdGggPSBwYXRoLnJlc29sdmUoYXdhaXQgdGVtcERpci5vcGVuRGlyKCksICdmcy1zcGVjcy5qcycpO1xuICAgIGF3YWl0IGZzLmNvcHlGaWxlKGV4aXN0aW5nUGF0aCwgbmV3UGF0aCk7XG4gICAgKGF3YWl0IGZzLmV4aXN0cyhuZXdQYXRoKSkuc2hvdWxkLmJlLnRydWU7XG4gICAgZnMucmltcmFmU3luYyhuZXdQYXRoKTtcbiAgICAoYXdhaXQgZnMuZXhpc3RzKG5ld1BhdGgpKS5zaG91bGQuYmUuZmFsc2U7XG4gIH0pO1xuICBkZXNjcmliZSgnbWQ1JywgZnVuY3Rpb24gKCkge1xuICAgIHRoaXMudGltZW91dCgxMjAwMDAwKTtcbiAgICBsZXQgc21hbGxGaWxlUGF0aDtcbiAgICBsZXQgYmlnRmlsZVBhdGg7XG4gICAgYmVmb3JlKGFzeW5jIGZ1bmN0aW9uICgpIHtcbiAgICAgIC8vIGdldCB0aGUgcGF0aCBvZiBhIHNtYWxsIGZpbGUgKHRoaXMgc291cmNlIGZpbGUpXG4gICAgICBzbWFsbEZpbGVQYXRoID0gZXhpc3RpbmdQYXRoO1xuXG4gICAgICAvLyBjcmVhdGUgYSBsYXJnZSBmaWxlIHRvIHRlc3QsIGFib3V0IDE2Mzg0MDAwMCBieXRlc1xuICAgICAgYmlnRmlsZVBhdGggPSBwYXRoLnJlc29sdmUoYXdhaXQgdGVtcERpci5vcGVuRGlyKCksICdlbm9ybW91cy50eHQnKTtcbiAgICAgIGxldCBmaWxlID0gYXdhaXQgZnMub3BlbihiaWdGaWxlUGF0aCwgJ3cnKTtcbiAgICAgIGxldCBmaWxlRGF0YSA9ICcnO1xuICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCA0MDk2OyBpKyspIHtcbiAgICAgICAgZmlsZURhdGEgKz0gJzEnO1xuICAgICAgfVxuICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCA0MDAwMDsgaSsrKSB7XG4gICAgICAgIGF3YWl0IGZzLndyaXRlKGZpbGUsIGZpbGVEYXRhKTtcbiAgICAgIH1cbiAgICAgIGF3YWl0IGZzLmNsb3NlKGZpbGUpO1xuICAgIH0pO1xuICAgIGFmdGVyKGFzeW5jIGZ1bmN0aW9uICgpIHtcbiAgICAgIGF3YWl0IGZzLnVubGluayhiaWdGaWxlUGF0aCk7XG4gICAgfSk7XG4gICAgaXQoJ3Nob3VsZCBjYWxjdWxhdGUgaGFzaCBvZiBjb3JyZWN0IGxlbmd0aCcsIGFzeW5jIGZ1bmN0aW9uICgpIHtcbiAgICAgIChhd2FpdCBmcy5tZDUoc21hbGxGaWxlUGF0aCkpLnNob3VsZC5oYXZlLmxlbmd0aCgzMik7XG4gICAgfSk7XG4gICAgaXQoJ3Nob3VsZCBiZSBhYmxlIHRvIHJ1biBvbiBodWdlIGZpbGUnLCBhc3luYyBmdW5jdGlvbiAoKSB7XG4gICAgICAoYXdhaXQgZnMubWQ1KGJpZ0ZpbGVQYXRoKSkuc2hvdWxkLmhhdmUubGVuZ3RoKDMyKTtcbiAgICB9KTtcbiAgfSk7XG4gIGRlc2NyaWJlKCdoYXNoJywgZnVuY3Rpb24gKCkge1xuICAgIGl0KCdzaG91bGQgY2FsY3VsYXRlIHNoYTEgaGFzaCcsIGFzeW5jIGZ1bmN0aW9uICgpIHtcbiAgICAgIChhd2FpdCBmcy5oYXNoKGV4aXN0aW5nUGF0aCwgJ3NoYTEnKSkuc2hvdWxkLmhhdmUubGVuZ3RoKDQwKTtcbiAgICB9KTtcbiAgICBpdCgnc2hvdWxkIGNhbGN1bGF0ZSBtZDUgaGFzaCcsIGFzeW5jIGZ1bmN0aW9uICgpIHtcbiAgICAgIChhd2FpdCBmcy5oYXNoKGV4aXN0aW5nUGF0aCwgJ21kNScpKS5zaG91bGQuaGF2ZS5sZW5ndGgoMzIpO1xuICAgIH0pO1xuICB9KTtcbiAgaXQoJ3N0YXQnLCBhc3luYyBmdW5jdGlvbiAoKSB7XG4gICAgbGV0IHN0YXQgPSBhd2FpdCBmcy5zdGF0KGV4aXN0aW5nUGF0aCk7XG4gICAgc3RhdC5zaG91bGQuaGF2ZS5wcm9wZXJ0eSgnYXRpbWUnKTtcbiAgfSk7XG4gIGRlc2NyaWJlKCd3aGljaCcsIGZ1bmN0aW9uICgpIHtcbiAgICBpdCgnc2hvdWxkIGZpbmQgY29ycmVjdCBleGVjdXRhYmxlJywgYXN5bmMgZnVuY3Rpb24gKCkge1xuICAgICAgbGV0IHN5c3RlbU5wbVBhdGggPSAoYXdhaXQgZXhlYygnd2hpY2gnLCBbJ25wbSddKSkuc3Rkb3V0LnRyaW0oKTtcbiAgICAgIGxldCBucG1QYXRoID0gYXdhaXQgZnMud2hpY2goJ25wbScpO1xuICAgICAgbnBtUGF0aC5zaG91bGQuZXF1YWwoc3lzdGVtTnBtUGF0aCk7XG4gICAgfSk7XG4gICAgaXQoJ3Nob3VsZCBmYWlsIGdyYWNlZnVsbHknLCBhc3luYyBmdW5jdGlvbiAoKSB7XG4gICAgICBhd2FpdCBmcy53aGljaCgnc29tZXRoaW5nX3RoYXRfZG9lc19ub3RfZXhpc3QnKVxuICAgICAgICAuc2hvdWxkLmV2ZW50dWFsbHkuYmUucmVqZWN0ZWQ7XG4gICAgfSk7XG4gIH0pO1xuICAvLyBpdCgnZ2xvYicsIGFzeW5jIGZ1bmN0aW9uICgpIHtcbiAgLy8gICBsZXQgZ2xvYiA9ICd0ZXN0Lyotc3BlY3MuanMnO1xuICAvLyAgIGxldCB0ZXN0cyA9IGF3YWl0IGZzLmdsb2IoZ2xvYik7XG4gIC8vICAgdGVzdHMuc2hvdWxkLmJlLmFuKCdhcnJheScpO1xuICAvLyAgIHRlc3RzLnNob3VsZC5oYXZlLmxlbmd0aC5hYm92ZSgyKTtcbiAgLy8gfSk7XG4gIGRlc2NyaWJlKCd3YWxrRGlyJywgZnVuY3Rpb24gKCkge1xuICAgIGl0KCd3YWxrRGlyIHJlY3Vyc2l2ZScsIGFzeW5jIGZ1bmN0aW9uICgpIHtcbiAgICAgIGxldCBpbkNhbGxiYWNrID0gMDtcbiAgICAgIGNvbnN0IGZpbGVQYXRoID0gYXdhaXQgZnMud2Fsa0RpcihfX2Rpcm5hbWUsIHRydWUsIGFzeW5jIChpdGVtKSA9PiB7XG4gICAgICAgIGlmIChpdGVtLmVuZHNXaXRoKCdsb2dnZXIvaGVscGVycy5qcycpKSB7XG4gICAgICAgICAgKytpbkNhbGxiYWNrO1xuICAgICAgICAgIC8vIFRoaXMgaXMgdG8gdmVyaWZ5IHByb3BlciBhd2FpdCBmdW5jdGlvbmFsaXR5IG9mIHRoZVxuICAgICAgICAgIC8vIGNhbGxiYWNrIGludm9jYXRpb24gaW5zaWRlIHRoZSBmaWxlIHN5c3RlbSB3YWxrZXJcbiAgICAgICAgICBhd2FpdCBCLmRlbGF5KDUwMCk7XG4gICAgICAgICAgLS1pbkNhbGxiYWNrO1xuICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIGluQ2FsbGJhY2suc2hvdWxkLmVxdWFsKDApO1xuICAgICAgZmlsZVBhdGguc2hvdWxkLm5vdC5iZS5udWxsO1xuICAgIH0pO1xuICAgIGl0KCdzaG91bGQgd2FsayBhbGwgZWxlbWVudHMgcmVjdXJzaXZlJywgYXN5bmMgZnVuY3Rpb24gKCkge1xuICAgICAgbGV0IGluQ2FsbGJhY2sgPSAwO1xuICAgICAgY29uc3QgZmlsZVBhdGggPSBhd2FpdCBmcy53YWxrRGlyKF9fZGlybmFtZSwgdHJ1ZSwgYXN5bmMgKCkgPT4ge1xuICAgICAgICArK2luQ2FsbGJhY2s7XG4gICAgICAgIGF3YWl0IEIuZGVsYXkoNTAwKTtcbiAgICAgICAgLS1pbkNhbGxiYWNrO1xuXG4gICAgICB9KTtcbiAgICAgIGluQ2FsbGJhY2suc2hvdWxkLmVxdWFsKDApO1xuICAgICAgXy5pc05pbChmaWxlUGF0aCkuc2hvdWxkLmJlLnRydWU7XG4gICAgfSk7XG4gICAgaXQoJ3Nob3VsZCB0aHJvdyBlcnJvciB0aHJvdWdoIGNhbGxiYWNrJywgYXN5bmMgZnVuY3Rpb24gKCkge1xuICAgICAgbGV0IHByb2Nlc3NlZCA9IDA7XG4gICAgICBhd2FpdCBjaGFpLmV4cGVjdChmcy53YWxrRGlyKF9fZGlybmFtZSwgdHJ1ZSxcbiAgICAgICAgKCkgPT4ge1xuICAgICAgICAgICsrcHJvY2Vzc2VkO1xuICAgICAgICAgIHRocm93ICdDYWxsYmFjayBlcnJvcic7XG4gICAgICAgIH0pKS50by5iZS5yZWplY3RlZFdpdGgoJ0NhbGxiYWNrIGVycm9yJyk7XG4gICAgICBwcm9jZXNzZWQuc2hvdWxkLmVxdWFsKDEpO1xuICAgIH0pO1xuICAgIGl0KCdzaG91bGQgdHJhdmVyc2Ugbm9uLXJlY3Vyc2l2ZWx5JywgYXN5bmMgZnVuY3Rpb24gKCkge1xuICAgICAgY29uc3QgZmlsZVBhdGggPSBhd2FpdCBmcy53YWxrRGlyKF9fZGlybmFtZSwgZmFsc2UsIChpdGVtKSA9PiBpdGVtLmVuZHNXaXRoKCdsb2dnZXIvaGVscGVycy5qcycpKTtcbiAgICAgIF8uaXNOaWwoZmlsZVBhdGgpLnNob3VsZC5iZS50cnVlO1xuICAgIH0pO1xuICB9KTtcbn0pO1xuIl0sIm1hcHBpbmdzIjoiOzs7O0FBQUEsSUFBQUEsTUFBQSxHQUFBQyxPQUFBO0FBQ0EsSUFBQUMsS0FBQSxHQUFBQyxzQkFBQSxDQUFBRixPQUFBO0FBQ0EsSUFBQUcsS0FBQSxHQUFBRCxzQkFBQSxDQUFBRixPQUFBO0FBQ0EsSUFBQUksV0FBQSxHQUFBSixPQUFBO0FBQ0EsSUFBQUssU0FBQSxHQUFBSCxzQkFBQSxDQUFBRixPQUFBO0FBQ0EsSUFBQU0sT0FBQSxHQUFBSixzQkFBQSxDQUFBRixPQUFBO0FBR0EsTUFBTU8sTUFBTSxHQUFHQyxhQUFJLENBQUNELE1BQU0sQ0FB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
