"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
require("source-map-support/register");
var _2 = require("..");
var _chai = _interopRequireDefault(require("chai"));
var _chaiAsPromised = _interopRequireDefault(require("chai-as-promised"));
var _bluebird = _interopRequireDefault(require("bluebird"));
var _sinon = _interopRequireDefault(require("sinon"));
var _os = _interopRequireDefault(require("os"));
var _path = _interopRequireDefault(require("path"));
var _lodash = _interopRequireDefault(require("lodash"));
const {
  W3C_WEB_ELEMENT_IDENTIFIER
} = _2.util;
const should = _chai.default.should();
_chai.default.use(_chaiAsPromised.default);
describe('util', function () {
  describe('hasValue', function () {
    it('should exist', function () {
      should.exist(_2.util.hasValue);
    });
    it('should handle undefined', function () {
      _2.util.hasValue(undefined).should.be.false;
    });
    it('should handle not a number', function () {
      _2.util.hasValue(NaN).should.be.false;
    });
    it('should handle null', function () {
      _2.util.hasValue(null).should.be.false;
    });
    it('should handle functions', function () {
      _2.util.hasValue(function () {}).should.be.true;
    });
    it('should handle empty arrays', function () {
      _2.util.hasValue({}).should.be.true;
    });
    it('should handle zero', function () {
      _2.util.hasValue(0).should.be.true;
    });
    it('should handle simple string', function () {
      _2.util.hasValue('string').should.be.true;
    });
    it('should handle booleans', function () {
      _2.util.hasValue(false).should.be.true;
    });
    it('should handle empty strings', function () {
      _2.util.hasValue('').should.be.true;
    });
  });
  describe('hasContent', function () {
    it('should exist', function () {
      should.exist(_2.util.hasContent);
    });
    it('should handle undefined', function () {
      _2.util.hasContent(undefined).should.be.false;
    });
    it('should handle not a number', function () {
      _2.util.hasContent(NaN).should.be.false;
    });
    it('should handle null', function () {
      _2.util.hasContent(null).should.be.false;
    });
    it('should handle functions', function () {
      _2.util.hasContent(function () {}).should.be.false;
    });
    it('should handle empty arrays', function () {
      _2.util.hasContent({}).should.be.false;
    });
    it('should handle zero', function () {
      _2.util.hasContent(0).should.be.false;
    });
    it('should handle simple string', function () {
      _2.util.hasContent('string').should.be.true;
    });
    it('should handle booleans', function () {
      _2.util.hasContent(false).should.be.false;
    });
    it('should handle empty strings', function () {
      _2.util.hasContent('').should.be.false;
    });
  });
  describe('escapeSpace', function () {
    it('should do nothing to a string without space', function () {
      let actual = 'armor';
      let expected = 'armor';
      _2.util.escapeSpace(actual).should.equal(expected);
    });
    it('should do escape spaces', function () {
      let actual = '/Applications/ Xcode 6.1.1.app/Contents/Developer';
      let expected = '/Applications/\\ Xcode\\ 6.1.1.app/Contents/Developer';
      _2.util.escapeSpace(actual).should.equal(expected);
    });
    it('should escape consecutive spaces', function () {
      let actual = 'armor   space';
      let expected = 'armor\\ \\ \\ space';
      _2.util.escapeSpace(actual).should.equal(expected);
    });
  });
  describe('localIp', function () {
    it('should find a local ip address', function () {
      let ifConfigOut = {
        lo0: [{
          address: '::1',
          netmask: 'ffff:ffff:ffff:ffff:ffff:ffff:ffff:ffff',
          family: 'IPv6',
          mac: '00:00:00:00:00:00',
          scopeid: 0,
          internal: true
        }, {
          address: '127.0.0.1',
          netmask: '255.0.0.0',
          family: 'IPv4',
          mac: '00:00:00:00:00:00',
          internal: true
        }, {
          address: 'fe80::1',
          netmask: 'ffff:ffff:ffff:ffff::',
          family: 'IPv6',
          mac: '00:00:00:00:00:00',
          scopeid: 1,
          internal: true
        }],
        en0: [{
          address: 'xxx',
          netmask: 'ffff:ffff:ffff:ffff::',
          family: 'IPv6',
          mac: 'd0:e1:40:93:56:9a',
          scopeid: 4,
          internal: false
        }, {
          address: '123.123.123.123',
          netmask: '255.255.254.0',
          family: 'IPv4',
          mac: 'xxx',
          internal: false
        }],
        awdl0: [{
          address: 'xxx',
          netmask: 'ffff:ffff:ffff:ffff::',
          family: 'IPv6',
          mac: 'xxx',
          scopeid: 7,
          internal: false
        }]
      };
      let osMock = _sinon.default.mock(_os.default);
      osMock.expects('networkInterfaces').returns(ifConfigOut);
      ifConfigOut = '';
      let ip = _2.util.localIp();
      ip.should.eql('123.123.123.123');
      osMock.verify();
    });
  });
  describe('cancellableDelay', function () {
    it('should delay', async function () {
      await _2.util.cancellableDelay('10');
    });
    it('cancel should work', async function () {
      let delay = _2.util.cancellableDelay('1000');
      await _bluebird.default.delay(10);
      delay.cancel();
      await delay.should.eventually.be.rejectedWith(/cancellation error/);
    });
  });
  describe('safeJsonParse', function () {
    it('should pass object through', function () {
      const obj = {
        a: 'a',
        b: 'b'
      };
      _2.util.safeJsonParse(obj).should.equal(obj);
    });
    it('should correctly parse json string', function () {
      const obj = {
        a: 'a',
        b: 'b'
      };
      _2.util.safeJsonParse(JSON.stringify(obj)).should.eql(obj);
    });
    it('should pass an array through', function () {
      const arr = ['a', 'b'];
      _2.util.safeJsonParse(arr).should.eql(arr);
    });
    it('should correctly parse json array', function () {
      const arr = ['a', 'b'];
      _2.util.safeJsonParse(JSON.stringify(arr)).should.eql(arr);
    });
    it('should pass null through', function () {
      const obj = null;
      _lodash.default.isNull(_2.util.safeJsonParse(obj)).should.be.true;
    });
    it('should pass simple string through', function () {
      const str = 'str';
      _2.util.safeJsonParse(str).should.eql(str);
    });
    it('should pass a number through', function () {
      const num = 42;
      _2.util.safeJsonParse(num).should.eql(num);
    });
    it('should make a number from a string representation', function () {
      const num = 42;
      _2.util.safeJsonParse(String(num)).should.eql(num);
    });
  });
  describe('jsonStringify', function () {
    it('should use JSON.stringify if no Buffer involved', function () {
      const obj = {
        k1: 'v1',
        k2: 'v2',
        k3: 'v3'
      };
      const jsonString = JSON.stringify(obj, null, 2);
      _2.util.jsonStringify(obj).should.eql(jsonString);
    });
    it('should serialize a Buffer', function () {
      const obj = {
        k1: 'v1',
        k2: 'v2',
        k3: Buffer.from('hi how are you today')
      };
      _2.util.jsonStringify(obj).should.include('hi how are you today');
    });
    it('should use the replacer function on non-buffer values', function () {
      const obj = {
        k1: 'v1',
        k2: 'v2',
        k3: 'v3'
      };
      function replacer(key, value) {
        return _lodash.default.isString(value) ? value.toUpperCase() : value;
      }
      const jsonString = _2.util.jsonStringify(obj, replacer);
      jsonString.should.include('V1');
      jsonString.should.include('V2');
      jsonString.should.include('V3');
    });
    it('should use the replacer function on buffers', function () {
      const obj = {
        k1: 'v1',
        k2: 'v2',
        k3: Buffer.from('hi how are you today')
      };
      function replacer(key, value) {
        return _lodash.default.isString(value) ? value.toUpperCase() : value;
      }
      const jsonString = _2.util.jsonStringify(obj, replacer);
      jsonString.should.include('V1');
      jsonString.should.include('V2');
      jsonString.should.include('HI HOW ARE YOU TODAY');
    });
    it('should use the replacer function recursively', function () {
      const obj = {
        k1: 'v1',
        k2: 'v2',
        k3: Buffer.from('hi how are you today'),
        k4: {
          k5: 'v5'
        }
      };
      function replacer(key, value) {
        return _lodash.default.isString(value) ? value.toUpperCase() : value;
      }
      const jsonString = _2.util.jsonStringify(obj, replacer);
      jsonString.should.include('V1');
      jsonString.should.include('V2');
      jsonString.should.include('HI HOW ARE YOU TODAY');
      jsonString.should.include('V5');
    });
  });
  describe('unwrapElement', function () {
    it('should pass through an unwrapped element', function () {
      let el = 4;
      _2.util.unwrapElement(el).should.equal(el);
    });
    it('should pass through an element that is an object', function () {
      let el = {
        RANDOM: 4
      };
      _2.util.unwrapElement(el).should.equal(el);
    });
    it('should unwrap a wrapped element', function () {
      let el = {
        ELEMENT: 4
      };
      _2.util.unwrapElement(el).should.eql(4);
    });
    it('should unwrap a wrapped element that uses W3C element identifier', function () {
      let el = {
        [W3C_WEB_ELEMENT_IDENTIFIER]: 5
      };
      _2.util.unwrapElement(el).should.eql(5);
    });
    it('should unwrap a wrapped element and prioritize W3C element identifier', function () {
      let el = {
        ELEMENT: 7,
        [W3C_WEB_ELEMENT_IDENTIFIER]: 6
      };
      _2.util.unwrapElement(el).should.eql(6);
    });
  });
  describe('wrapElement', function () {
    it('should include ELEMENT and w3c element', function () {
      _2.util.wrapElement(123).should.eql({
        [_2.util.W3C_WEB_ELEMENT_IDENTIFIER]: 123,
        ELEMENT: 123
      });
    });
  });
  describe('toReadableSizeString', function () {
    it('should fail if cannot convert to Bytes', function () {
      (() => _2.util.toReadableSizeString('asdasd')).should.throw(/Cannot convert/);
    });
    it('should properly convert to Bytes', function () {
      _2.util.toReadableSizeString(0).should.equal('0 B');
    });
    it('should properly convert to KBytes', function () {
      _2.util.toReadableSizeString(2048 + 12).should.equal('2.01 KB');
    });
    it('should properly convert to MBytes', function () {
      _2.util.toReadableSizeString(1024 * 1024 * 3 + 1024 * 10).should.equal('3.01 MB');
    });
    it('should properly convert to GBytes', function () {
      _2.util.toReadableSizeString(1024 * 1024 * 1024 * 5).should.equal('5.00 GB');
    });
  });
  describe('filterObject', function () {
    describe('with undefined predicate', function () {
      it('should filter out undefineds', function () {
        let obj = {
          a: 'a',
          b: 'b',
          c: undefined
        };
        _2.util.filterObject(obj).should.eql({
          a: 'a',
          b: 'b'
        });
      });
      it('should leave nulls alone', function () {
        let obj = {
          a: 'a',
          b: 'b',
          c: null
        };
        _2.util.filterObject(obj).should.eql({
          a: 'a',
          b: 'b',
          c: null
        });
      });
    });
    describe('with value predicate', function () {
      it('should filter elements by their value', function () {
        let obj = {
          a: 'a',
          b: 'b',
          c: 'c',
          d: 'a'
        };
        _2.util.filterObject(obj, 'a').should.eql({
          a: 'a',
          d: 'a'
        });
      });
    });
    describe('with function predicate', function () {
      it('should filter elements', function () {
        let obj = {
          a: 'a',
          b: 'b',
          c: 'c'
        };
        _2.util.filterObject(obj, v => v === 'a' || v === 'c').should.eql({
          a: 'a',
          c: 'c'
        });
      });
    });
  });
  describe('isSubPath', function () {
    it('should detect simple subpath', function () {
      _2.util.isSubPath('/root/some', '/root').should.be.true;
    });
    it('should detect complex subpath', function () {
      _2.util.isSubPath('/root/some/other/../../.', '/root').should.be.true;
    });
    it('should detect subpath ending with a slash', function () {
      _2.util.isSubPath('/root/some/', '/root').should.be.true;
    });
    it('should detect if a path is not a subpath', function () {
      _2.util.isSubPath('/root/some//../..', '/root').should.be.false;
    });
    it('should throw if any of the given paths is not absolute', function () {
      should.throw(() => _2.util.isSubPath('some/..', '/root'), /absolute/);
    });
  });
  describe('isSameDestination', function () {
    let path1;
    let path2;
    let tmpDir;
    before(async function () {
      tmpDir = await _2.tempDir.openDir();
      path1 = _path.default.resolve(tmpDir, 'path1.txt');
      path2 = _path.default.resolve(tmpDir, 'path2.txt');
      for (const p of [path1, path2]) {
        await _2.fs.writeFile(p, p, 'utf8');
      }
    });
    after(async function () {
      await _2.fs.rimraf(tmpDir);
    });
    it('should match paths to the same file/folder', async function () {
      (await _2.util.isSameDestination(path1, _path.default.resolve(tmpDir, '..', _path.default.basename(tmpDir), _path.default.basename(path1)))).should.be.true;
    });
    it('should not match paths if they point to non existing items', async function () {
      (await _2.util.isSameDestination(path1, 'blabla')).should.be.false;
    });
    it('should not match paths to different files', async function () {
      (await _2.util.isSameDestination(path1, path2)).should.be.false;
    });
  });
  describe('compareVersions', function () {
    it('should compare two correct version numbers', function () {
      _2.util.compareVersions('10.0', '<', '11.0').should.eql(true);
      _2.util.compareVersions('11.0', '>=', '11.0').should.eql(true);
      _2.util.compareVersions('11.0', '==', '11.0').should.eql(true);
      _2.util.compareVersions('13.10', '>', '13.5').should.eql(true);
      _2.util.compareVersions('11.1', '!=', '11.10').should.eql(true);
      _2.util.compareVersions('12.0', '<', 10).should.eql(false);
    });
    it('should throw if any of version arguments is invalid', function () {
      should.throw(() => _2.util.compareVersions(undefined, '<', '11.0'));
      should.throw(() => _2.util.compareVersions('11.0', '==', null));
    });
    it('should throw if comparison operator is unsupported', function () {
      should.throw(() => _2.util.compareVersions('12.0', 'abc', 10));
    });
  });
  describe('quote', function () {
    it('should quote a string with a space', function () {
      _2.util.quote(['a', 'b', 'c d']).should.eql('a b \'c d\'');
    });
    it('should escape double quotes', function () {
      _2.util.quote(['a', 'b', `it's a "neat thing"`]).should.eql(`a b "it's a \\"neat thing\\""`);
    });
    it("should escape $ ` and '", function () {
      _2.util.quote(['$', '`', `'`]).should.eql('\\$ \\` "\'"');
    });
    it('should handle empty array', function () {
      _2.util.quote([]).should.eql('');
    });
    it('should quote a string with newline', function () {
      _2.util.quote(['a\nb']).should.eql(`'a\nb'`);
    });
    it('should stringify booleans', function () {
      _2.util.quote(['a', 1, true, false]).should.eql('a 1 true false');
    });
    it('should stringify null and undefined', function () {
      _2.util.quote(['a', 1, null, undefined]).should.eql('a 1 null undefined');
    });
  });
  describe('unleakString', function () {
    it('should unleak a string', function () {
      _2.util.unleakString('yolo').should.eql('yolo');
    });
    it('should unleak a multiline string', function () {
      _2.util.unleakString(' yolo\nbolo ').should.eql(' yolo\nbolo ');
    });
    it('should convert an object to a string', function () {
      for (const obj of [{}, null, undefined, [], 0]) {
        _2.util.unleakString(obj).should.eql(`${obj}`);
      }
    });
  });
  describe('pluralize', function () {
    it('should pluralize a string', function () {
      _2.util.pluralize('word', 2).should.eql('words');
    });
    it('should pluralize a string and prepend the number through boolean', function () {
      _2.util.pluralize('word', 2, true).should.eql('2 words');
    });
    it('should pluralize a string and prepend the number through options', function () {
      _2.util.pluralize('word', 2, {
        inclusive: true
      }).should.eql('2 words');
    });
  });
});require('source-map-support').install();


//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdC91dGlsLXNwZWNzLmpzIiwibmFtZXMiOlsiXzIiLCJyZXF1aXJlIiwiX2NoYWkiLCJfaW50ZXJvcFJlcXVpcmVEZWZhdWx0IiwiX2NoYWlBc1Byb21pc2VkIiwiX2JsdWViaXJkIiwiX3Npbm9uIiwiX29zIiwiX3BhdGgiLCJfbG9kYXNoIiwiVzNDX1dFQl9FTEVNRU5UX0lERU5USUZJRVIiLCJ1dGlsIiwic2hvdWxkIiwiY2hhaSIsInVzZSIsImNoYWlBc1Byb21pc2VkIiwiZGVzY3JpYmUiLCJpdCIsImV4aXN0IiwiaGFzVmFsdWUiLCJ1bmRlZmluZWQiLCJiZSIsImZhbHNlIiwiTmFOIiwidHJ1ZSIsImhhc0NvbnRlbnQiLCJhY3R1YWwiLCJleHBlY3RlZCIsImVzY2FwZVNwYWNlIiwiZXF1YWwiLCJpZkNvbmZpZ091dCIsImxvMCIsImFkZHJlc3MiLCJuZXRtYXNrIiwiZmFtaWx5IiwibWFjIiwic2NvcGVpZCIsImludGVybmFsIiwiZW4wIiwiYXdkbDAiLCJvc01vY2siLCJzaW5vbiIsIm1vY2siLCJvcyIsImV4cGVjdHMiLCJyZXR1cm5zIiwiaXAiLCJsb2NhbElwIiwiZXFsIiwidmVyaWZ5IiwiY2FuY2VsbGFibGVEZWxheSIsImRlbGF5IiwiQiIsImNhbmNlbCIsImV2ZW50dWFsbHkiLCJyZWplY3RlZFdpdGgiLCJvYmoiLCJhIiwiYiIsInNhZmVKc29uUGFyc2UiLCJKU09OIiwic3RyaW5naWZ5IiwiYXJyIiwiXyIsImlzTnVsbCIsInN0ciIsIm51bSIsIlN0cmluZyIsImsxIiwiazIiLCJrMyIsImpzb25TdHJpbmciLCJqc29uU3RyaW5naWZ5IiwiQnVmZmVyIiwiZnJvbSIsImluY2x1ZGUiLCJyZXBsYWNlciIsImtleSIsInZhbHVlIiwiaXNTdHJpbmciLCJ0b1VwcGVyQ2FzZSIsIms0IiwiazUiLCJlbCIsInVud3JhcEVsZW1lbnQiLCJSQU5ET00iLCJFTEVNRU5UIiwid3JhcEVsZW1lbnQiLCJ0b1JlYWRhYmxlU2l6ZVN0cmluZyIsInRocm93IiwiYyIsImZpbHRlck9iamVjdCIsImQiLCJ2IiwiaXNTdWJQYXRoIiwicGF0aDEiLCJwYXRoMiIsInRtcERpciIsImJlZm9yZSIsInRlbXBEaXIiLCJvcGVuRGlyIiwicGF0aCIsInJlc29sdmUiLCJwIiwiZnMiLCJ3cml0ZUZpbGUiLCJhZnRlciIsInJpbXJhZiIsImlzU2FtZURlc3RpbmF0aW9uIiwiYmFzZW5hbWUiLCJjb21wYXJlVmVyc2lvbnMiLCJxdW90ZSIsInVubGVha1N0cmluZyIsInBsdXJhbGl6ZSIsImluY2x1c2l2ZSJdLCJzb3VyY2VSb290IjoiLi4vLi4iLCJzb3VyY2VzIjpbInRlc3QvdXRpbC1zcGVjcy5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyJcbmltcG9ydCB7IHV0aWwsIGZzLCB0ZW1wRGlyIH0gZnJvbSAnLi4nO1xuaW1wb3J0IGNoYWkgZnJvbSAnY2hhaSc7XG5pbXBvcnQgY2hhaUFzUHJvbWlzZWQgZnJvbSAnY2hhaS1hcy1wcm9taXNlZCc7XG5pbXBvcnQgQiBmcm9tICdibHVlYmlyZCc7XG5pbXBvcnQgc2lub24gZnJvbSAnc2lub24nO1xuaW1wb3J0IG9zIGZyb20gJ29zJztcbmltcG9ydCBwYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IF8gZnJvbSAnbG9kYXNoJztcblxuY29uc3Qge1czQ19XRUJfRUxFTUVOVF9JREVOVElGSUVSfSA9IHV0aWw7XG5cblxuY29uc3Qgc2hvdWxkID0gY2hhaS5zaG91bGQoKTtcbmNoYWkudXNlKGNoYWlBc1Byb21pc2VkKTtcblxuZGVzY3JpYmUoJ3V0aWwnLCBmdW5jdGlvbiAoKSB7XG4gIGRlc2NyaWJlKCdoYXNWYWx1ZScsIGZ1bmN0aW9uICgpIHtcbiAgICBpdCgnc2hvdWxkIGV4aXN0JywgZnVuY3Rpb24gKCkge1xuICAgICAgc2hvdWxkLmV4aXN0KHV0aWwuaGFzVmFsdWUpO1xuICAgIH0pO1xuXG4gICAgaXQoJ3Nob3VsZCBoYW5kbGUgdW5kZWZpbmVkJywgZnVuY3Rpb24gKCkge1xuICAgICAgdXRpbC5oYXNWYWx1ZSh1bmRlZmluZWQpLnNob3VsZC5iZS5mYWxzZTtcbiAgICB9KTtcblxuICAgIGl0KCdzaG91bGQgaGFuZGxlIG5vdCBhIG51bWJlcicsIGZ1bmN0aW9uICgpIHtcbiAgICAgIHV0aWwuaGFzVmFsdWUoTmFOKS5zaG91bGQuYmUuZmFsc2U7XG4gICAgfSk7XG5cbiAgICBpdCgnc2hvdWxkIGhhbmRsZSBudWxsJywgZnVuY3Rpb24gKCkge1xuICAgICAgdXRpbC5oYXNWYWx1ZShudWxsKS5zaG91bGQuYmUuZmFsc2U7XG4gICAgfSk7XG5cbiAgICBpdCgnc2hvdWxkIGhhbmRsZSBmdW5jdGlvbnMnLCBmdW5jdGlvbiAoKSB7XG4gICAgICB1dGlsLmhhc1ZhbHVlKGZ1bmN0aW9uICgpIHt9KS5zaG91bGQuYmUudHJ1ZTtcbiAgICB9KTtcblxuICAgIGl0KCdzaG91bGQgaGFuZGxlIGVtcHR5IGFycmF5cycsIGZ1bmN0aW9uICgpIHtcbiAgICAgIHV0aWwuaGFzVmFsdWUoe30pLnNob3VsZC5iZS50cnVlO1xuICAgIH0pO1xuXG4gICAgaXQoJ3Nob3VsZCBoYW5kbGUgemVybycsIGZ1bmN0aW9uICgpIHtcbiAgICAgIHV0aWwuaGFzVmFsdWUoMCkuc2hvdWxkLmJlLnRydWU7XG4gICAgfSk7XG5cbiAgICBpdCgnc2hvdWxkIGhhbmRsZSBzaW1wbGUgc3RyaW5nJywgZnVuY3Rpb24gKCkge1xuICAgICAgdXRpbC5oYXNWYWx1ZSgnc3RyaW5nJykuc2hvdWxkLmJlLnRydWU7XG4gICAgfSk7XG5cbiAgICBpdCgnc2hvdWxkIGhhbmRsZSBib29sZWFucycsIGZ1bmN0aW9uICgpIHtcbiAgICAgIHV0aWwuaGFzVmFsdWUoZmFsc2UpLnNob3VsZC5iZS50cnVlO1xuICAgIH0pO1xuXG4gICAgaXQoJ3Nob3VsZCBoYW5kbGUgZW1wdHkgc3RyaW5ncycsIGZ1bmN0aW9uICgpIHtcbiAgICAgIHV0aWwuaGFzVmFsdWUoJycpLnNob3VsZC5iZS50cnVlO1xuICAgIH0pO1xuICB9KTtcblxuICBkZXNjcmliZSgnaGFzQ29udGVudCcsIGZ1bmN0aW9uICgpIHtcbiAgICBpdCgnc2hvdWxkIGV4aXN0JywgZnVuY3Rpb24gKCkge1xuICAgICAgc2hvdWxkLmV4aXN0KHV0aWwuaGFzQ29udGVudCk7XG4gICAgfSk7XG5cbiAgICBpdCgnc2hvdWxkIGhhbmRsZSB1bmRlZmluZWQnLCBmdW5jdGlvbiAoKSB7XG4gICAgICB1dGlsLmhhc0NvbnRlbnQodW5kZWZpbmVkKS5zaG91bGQuYmUuZmFsc2U7XG4gICAgfSk7XG5cbiAgICBpdCgnc2hvdWxkIGhhbmRsZSBub3QgYSBudW1iZXInLCBmdW5jdGlvbiAoKSB7XG4gICAgICB1dGlsLmhhc0NvbnRlbnQoTmFOKS5zaG91bGQuYmUuZmFsc2U7XG4gICAgfSk7XG5cbiAgICBpdCgnc2hvdWxkIGhhbmRsZSBudWxsJywgZnVuY3Rpb24gKCkge1xuICAgICAgdXRpbC5oYXNDb250ZW50KG51bGwpLnNob3VsZC5iZS5mYWxzZTtcbiAgICB9KTtcblxuICAgIGl0KCdzaG91bGQgaGFuZGxlIGZ1bmN0aW9ucycsIGZ1bmN0aW9uICgpIHtcbiAgICAgIHV0aWwuaGFzQ29udGVudChmdW5jdGlvbiAoKSB7fSkuc2hvdWxkLmJlLmZhbHNlO1xuICAgIH0pO1xuXG4gICAgaXQoJ3Nob3VsZCBoYW5kbGUgZW1wdHkgYXJyYXlzJywgZnVuY3Rpb24gKCkge1xuICAgICAgdXRpbC5oYXNDb250ZW50KHt9KS5zaG91bGQuYmUuZmFsc2U7XG4gICAgfSk7XG5cbiAgICBpdCgnc2hvdWxkIGhhbmRsZSB6ZXJvJywgZnVuY3Rpb24gKCkge1xuICAgICAgdXRpbC5oYXNDb250ZW50KDApLnNob3VsZC5iZS5mYWxzZTtcbiAgICB9KTtcblxuICAgIGl0KCdzaG91bGQgaGFuZGxlIHNpbXBsZSBzdHJpbmcnLCBmdW5jdGlvbiAoKSB7XG4gICAgICB1dGlsLmhhc0NvbnRlbnQoJ3N0cmluZycpLnNob3VsZC5iZS50cnVlO1xuICAgIH0pO1xuXG4gICAgaXQoJ3Nob3VsZCBoYW5kbGUgYm9vbGVhbnMnLCBmdW5jdGlvbiAoKSB7XG4gICAgICB1dGlsLmhhc0NvbnRlbnQoZmFsc2UpLnNob3VsZC5iZS5mYWxzZTtcbiAgICB9KTtcblxuICAgIGl0KCdzaG91bGQgaGFuZGxlIGVtcHR5IHN0cmluZ3MnLCBmdW5jdGlvbiAoKSB7XG4gICAgICB1dGlsLmhhc0NvbnRlbnQoJycpLnNob3VsZC5iZS5mYWxzZTtcbiAgICB9KTtcbiAgfSk7XG5cbiAgZGVzY3JpYmUoJ2VzY2FwZVNwYWNlJywgZnVuY3Rpb24gKCkge1xuICAgIGl0KCdzaG91bGQgZG8gbm90aGluZyB0byBhIHN0cmluZyB3aXRob3V0IHNwYWNlJywgZnVuY3Rpb24gKCkge1xuICAgICAgbGV0IGFjdHVhbCA9ICdhcm1vcic7XG4gICAgICBsZXQgZXhwZWN0ZWQgPSAnYXJtb3InO1xuICAgICAgdXRpbC5lc2NhcGVTcGFjZShhY3R1YWwpLnNob3VsZC5lcXVhbChleHBlY3RlZCk7XG4gICAgfSk7XG5cbiAgICBpdCgnc2hvdWxkIGRvIGVzY2FwZSBzcGFjZXMnLCBmdW5jdGlvbiAoKSB7XG4gICAgICBsZXQgYWN0dWFsID0gJy9BcHBsaWNhdGlvbnMvIFhjb2RlIDYuMS4xLmFwcC9Db250ZW50cy9EZXZlbG9wZXInO1xuICAgICAgbGV0IGV4cGVjdGVkID0gJy9BcHBsaWNhdGlvbnMvXFxcXCBYY29kZVxcXFwgNi4xLjEuYXBwL0NvbnRlbnRzL0RldmVsb3Blcic7XG4gICAgICB1dGlsLmVzY2FwZVNwYWNlKGFjdHVhbCkuc2hvdWxkLmVxdWFsKGV4cGVjdGVkKTtcbiAgICB9KTtcblxuICAgIGl0KCdzaG91bGQgZXNjYXBlIGNvbnNlY3V0aXZlIHNwYWNlcycsIGZ1bmN0aW9uICgpIHtcbiAgICAgIGxldCBhY3R1YWwgPSAnYXJtb3IgICBzcGFjZSc7XG4gICAgICBsZXQgZXhwZWN0ZWQgPSAnYXJtb3JcXFxcIFxcXFwgXFxcXCBzcGFjZSc7XG4gICAgICB1dGlsLmVzY2FwZVNwYWNlKGFjdHVhbCkuc2hvdWxkLmVxdWFsKGV4cGVjdGVkKTtcbiAgICB9KTtcbiAgfSk7XG5cbiAgZGVzY3JpYmUoJ2xvY2FsSXAnLCBmdW5jdGlvbiAoKSB7XG4gICAgaXQoJ3Nob3VsZCBmaW5kIGEgbG9jYWwgaXAgYWRkcmVzcycsIGZ1bmN0aW9uICgpIHtcbiAgICAgIGxldCBpZkNvbmZpZ091dCA9IHtcbiAgICAgICAgbG8wOlxuICAgICAgICAgIFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgYWRkcmVzczogJzo6MScsXG4gICAgICAgICAgICAgIG5ldG1hc2s6ICdmZmZmOmZmZmY6ZmZmZjpmZmZmOmZmZmY6ZmZmZjpmZmZmOmZmZmYnLFxuICAgICAgICAgICAgICBmYW1pbHk6ICdJUHY2JyxcbiAgICAgICAgICAgICAgbWFjOiAnMDA6MDA6MDA6MDA6MDA6MDAnLFxuICAgICAgICAgICAgICBzY29wZWlkOiAwLFxuICAgICAgICAgICAgICBpbnRlcm5hbDogdHJ1ZSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIGFkZHJlc3M6ICcxMjcuMC4wLjEnLFxuICAgICAgICAgICAgICBuZXRtYXNrOiAnMjU1LjAuMC4wJyxcbiAgICAgICAgICAgICAgZmFtaWx5OiAnSVB2NCcsXG4gICAgICAgICAgICAgIG1hYzogJzAwOjAwOjAwOjAwOjAwOjAwJyxcbiAgICAgICAgICAgICAgaW50ZXJuYWw6IHRydWUsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBhZGRyZXNzOiAnZmU4MDo6MScsXG4gICAgICAgICAgICAgIG5ldG1hc2s6ICdmZmZmOmZmZmY6ZmZmZjpmZmZmOjonLFxuICAgICAgICAgICAgICBmYW1pbHk6ICdJUHY2JyxcbiAgICAgICAgICAgICAgbWFjOiAnMDA6MDA6MDA6MDA6MDA6MDAnLFxuICAgICAgICAgICAgICBzY29wZWlkOiAxLFxuICAgICAgICAgICAgICBpbnRlcm5hbDogdHJ1ZSxcbiAgICAgICAgICAgIH1cbiAgICAgICAgICBdLFxuICAgICAgICBlbjA6XG4gICAgICAgICAgW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBhZGRyZXNzOiAneHh4JyxcbiAgICAgICAgICAgICAgbmV0bWFzazogJ2ZmZmY6ZmZmZjpmZmZmOmZmZmY6OicsXG4gICAgICAgICAgICAgIGZhbWlseTogJ0lQdjYnLFxuICAgICAgICAgICAgICBtYWM6ICdkMDplMTo0MDo5Mzo1Njo5YScsXG4gICAgICAgICAgICAgIHNjb3BlaWQ6IDQsXG4gICAgICAgICAgICAgIGludGVybmFsOiBmYWxzZSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIGFkZHJlc3M6ICcxMjMuMTIzLjEyMy4xMjMnLFxuICAgICAgICAgICAgICBuZXRtYXNrOiAnMjU1LjI1NS4yNTQuMCcsXG4gICAgICAgICAgICAgIGZhbWlseTogJ0lQdjQnLFxuICAgICAgICAgICAgICBtYWM6ICd4eHgnLFxuICAgICAgICAgICAgICBpbnRlcm5hbDogZmFsc2UsXG4gICAgICAgICAgICB9XG4gICAgICAgICAgXSxcbiAgICAgICAgYXdkbDA6XG4gICAgICAgICAgW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBhZGRyZXNzOiAneHh4JyxcbiAgICAgICAgICAgICAgbmV0bWFzazogJ2ZmZmY6ZmZmZjpmZmZmOmZmZmY6OicsXG4gICAgICAgICAgICAgIGZhbWlseTogJ0lQdjYnLFxuICAgICAgICAgICAgICBtYWM6ICd4eHgnLFxuICAgICAgICAgICAgICBzY29wZWlkOiA3LFxuICAgICAgICAgICAgICBpbnRlcm5hbDogZmFsc2UsXG4gICAgICAgICAgICB9XG4gICAgICAgICAgXSxcbiAgICAgIH07XG4gICAgICBsZXQgb3NNb2NrID0gc2lub24ubW9jayhvcyk7XG4gICAgICBvc01vY2suZXhwZWN0cygnbmV0d29ya0ludGVyZmFjZXMnKS5yZXR1cm5zKGlmQ29uZmlnT3V0KTtcbiAgICAgIGlmQ29uZmlnT3V0ID0gJyc7XG4gICAgICBsZXQgaXAgPSB1dGlsLmxvY2FsSXAoKTtcbiAgICAgIGlwLnNob3VsZC5lcWwoJzEyMy4xMjMuMTIzLjEyMycpO1xuICAgICAgb3NNb2NrLnZlcmlmeSgpO1xuICAgIH0pO1xuICB9KTtcblxuICBkZXNjcmliZSgnY2FuY2VsbGFibGVEZWxheScsIGZ1bmN0aW9uICgpIHtcbiAgICBpdCgnc2hvdWxkIGRlbGF5JywgYXN5bmMgZnVuY3Rpb24gKCkge1xuICAgICAgYXdhaXQgdXRpbC5jYW5jZWxsYWJsZURlbGF5KCcxMCcpO1xuICAgIH0pO1xuICAgIGl0KCdjYW5jZWwgc2hvdWxkIHdvcmsnLCBhc3luYyBmdW5jdGlvbiAoKSB7XG4gICAgICBsZXQgZGVsYXkgPSB1dGlsLmNhbmNlbGxhYmxlRGVsYXkoJzEwMDAnKTtcbiAgICAgIGF3YWl0IEIuZGVsYXkoMTApO1xuICAgICAgZGVsYXkuY2FuY2VsKCk7XG4gICAgICBhd2FpdCBkZWxheS5zaG91bGQuZXZlbnR1YWxseS5iZS5yZWplY3RlZFdpdGgoL2NhbmNlbGxhdGlvbiBlcnJvci8pO1xuICAgIH0pO1xuICB9KTtcblxuICBkZXNjcmliZSgnc2FmZUpzb25QYXJzZScsIGZ1bmN0aW9uICgpIHtcbiAgICBpdCgnc2hvdWxkIHBhc3Mgb2JqZWN0IHRocm91Z2gnLCBmdW5jdGlvbiAoKSB7XG4gICAgICBjb25zdCBvYmogPSB7YTogJ2EnLCBiOiAnYid9O1xuICAgICAgdXRpbC5zYWZlSnNvblBhcnNlKG9iaikuc2hvdWxkLmVxdWFsKG9iaik7XG4gICAgfSk7XG4gICAgaXQoJ3Nob3VsZCBjb3JyZWN0bHkgcGFyc2UganNvbiBzdHJpbmcnLCBmdW5jdGlvbiAoKSB7XG4gICAgICBjb25zdCBvYmogPSB7YTogJ2EnLCBiOiAnYid9O1xuICAgICAgdXRpbC5zYWZlSnNvblBhcnNlKEpTT04uc3RyaW5naWZ5KG9iaikpLnNob3VsZC5lcWwob2JqKTtcbiAgICB9KTtcbiAgICBpdCgnc2hvdWxkIHBhc3MgYW4gYXJyYXkgdGhyb3VnaCcsIGZ1bmN0aW9uICgpIHtcbiAgICAgIGNvbnN0IGFyciA9IFsnYScsICdiJ107XG4gICAgICB1dGlsLnNhZmVKc29uUGFyc2UoYXJyKS5zaG91bGQuZXFsKGFycik7XG4gICAgfSk7XG4gICAgaXQoJ3Nob3VsZCBjb3JyZWN0bHkgcGFyc2UganNvbiBhcnJheScsIGZ1bmN0aW9uICgpIHtcbiAgICAgIGNvbnN0IGFyciA9IFsnYScsICdiJ107XG4gICAgICB1dGlsLnNhZmVKc29uUGFyc2UoSlNPTi5zdHJpbmdpZnkoYXJyKSkuc2hvdWxkLmVxbChhcnIpO1xuICAgIH0pO1xuICAgIGl0KCdzaG91bGQgcGFzcyBudWxsIHRocm91Z2gnLCBmdW5jdGlvbiAoKSB7XG4gICAgICBjb25zdCBvYmogPSBudWxsO1xuICAgICAgXy5pc051bGwodXRpbC5zYWZlSnNvblBhcnNlKG9iaikpLnNob3VsZC5iZS50cnVlO1xuICAgIH0pO1xuICAgIGl0KCdzaG91bGQgcGFzcyBzaW1wbGUgc3RyaW5nIHRocm91Z2gnLCBmdW5jdGlvbiAoKSB7XG4gICAgICBjb25zdCBzdHIgPSAnc3RyJztcbiAgICAgIHV0aWwuc2FmZUpzb25QYXJzZShzdHIpLnNob3VsZC5lcWwoc3RyKTtcbiAgICB9KTtcbiAgICBpdCgnc2hvdWxkIHBhc3MgYSBudW1iZXIgdGhyb3VnaCcsIGZ1bmN0aW9uICgpIHtcbiAgICAgIGNvbnN0IG51bSA9IDQyO1xuICAgICAgdXRpbC5zYWZlSnNvblBhcnNlKG51bSkuc2hvdWxkLmVxbChudW0pO1xuICAgIH0pO1xuICAgIGl0KCdzaG91bGQgbWFrZSBhIG51bWJlciBmcm9tIGEgc3RyaW5nIHJlcHJlc2VudGF0aW9uJywgZnVuY3Rpb24gKCkge1xuICAgICAgY29uc3QgbnVtID0gNDI7XG4gICAgICB1dGlsLnNhZmVKc29uUGFyc2UoU3RyaW5nKG51bSkpLnNob3VsZC5lcWwobnVtKTtcbiAgICB9KTtcbiAgfSk7XG5cbiAgZGVzY3JpYmUoJ2pzb25TdHJpbmdpZnknLCBmdW5jdGlvbiAoKSB7XG4gICAgaXQoJ3Nob3VsZCB1c2UgSlNPTi5zdHJpbmdpZnkgaWYgbm8gQnVmZmVyIGludm9sdmVkJywgZnVuY3Rpb24gKCkge1xuICAgICAgY29uc3Qgb2JqID0ge1xuICAgICAgICBrMTogJ3YxJyxcbiAgICAgICAgazI6ICd2MicsXG4gICAgICAgIGszOiAndjMnLFxuICAgICAgfTtcbiAgICAgIGNvbnN0IGpzb25TdHJpbmcgPSBKU09OLnN0cmluZ2lmeShvYmosIG51bGwsIDIpO1xuICAgICAgdXRpbC5qc29uU3RyaW5naWZ5KG9iaikuc2hvdWxkLmVxbChqc29uU3RyaW5nKTtcbiAgICB9KTtcbiAgICBpdCgnc2hvdWxkIHNlcmlhbGl6ZSBhIEJ1ZmZlcicsIGZ1bmN0aW9uICgpIHtcbiAgICAgIGNvbnN0IG9iaiA9IHtcbiAgICAgICAgazE6ICd2MScsXG4gICAgICAgIGsyOiAndjInLFxuICAgICAgICBrMzogQnVmZmVyLmZyb20oJ2hpIGhvdyBhcmUgeW91IHRvZGF5JyksXG4gICAgICB9O1xuICAgICAgdXRpbC5qc29uU3RyaW5naWZ5KG9iaikuc2hvdWxkLmluY2x1ZGUoJ2hpIGhvdyBhcmUgeW91IHRvZGF5Jyk7XG4gICAgfSk7XG4gICAgaXQoJ3Nob3VsZCB1c2UgdGhlIHJlcGxhY2VyIGZ1bmN0aW9uIG9uIG5vbi1idWZmZXIgdmFsdWVzJywgZnVuY3Rpb24gKCkge1xuICAgICAgY29uc3Qgb2JqID0ge1xuICAgICAgICBrMTogJ3YxJyxcbiAgICAgICAgazI6ICd2MicsXG4gICAgICAgIGszOiAndjMnLFxuICAgICAgfTtcbiAgICAgIGZ1bmN0aW9uIHJlcGxhY2VyIChrZXksIHZhbHVlKSB7XG4gICAgICAgIHJldHVybiBfLmlzU3RyaW5nKHZhbHVlKSA/IHZhbHVlLnRvVXBwZXJDYXNlKCkgOiB2YWx1ZTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IGpzb25TdHJpbmcgPSB1dGlsLmpzb25TdHJpbmdpZnkob2JqLCByZXBsYWNlcik7XG4gICAgICBqc29uU3RyaW5nLnNob3VsZC5pbmNsdWRlKCdWMScpO1xuICAgICAganNvblN0cmluZy5zaG91bGQuaW5jbHVkZSgnVjInKTtcbiAgICAgIGpzb25TdHJpbmcuc2hvdWxkLmluY2x1ZGUoJ1YzJyk7XG4gICAgfSk7XG4gICAgaXQoJ3Nob3VsZCB1c2UgdGhlIHJlcGxhY2VyIGZ1bmN0aW9uIG9uIGJ1ZmZlcnMnLCBmdW5jdGlvbiAoKSB7XG4gICAgICBjb25zdCBvYmogPSB7XG4gICAgICAgIGsxOiAndjEnLFxuICAgICAgICBrMjogJ3YyJyxcbiAgICAgICAgazM6IEJ1ZmZlci5mcm9tKCdoaSBob3cgYXJlIHlvdSB0b2RheScpLFxuICAgICAgfTtcbiAgICAgIGZ1bmN0aW9uIHJlcGxhY2VyIChrZXksIHZhbHVlKSB7XG4gICAgICAgIHJldHVybiBfLmlzU3RyaW5nKHZhbHVlKSA/IHZhbHVlLnRvVXBwZXJDYXNlKCkgOiB2YWx1ZTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IGpzb25TdHJpbmcgPSB1dGlsLmpzb25TdHJpbmdpZnkob2JqLCByZXBsYWNlcik7XG4gICAgICBqc29uU3RyaW5nLnNob3VsZC5pbmNsdWRlKCdWMScpO1xuICAgICAganNvblN0cmluZy5zaG91bGQuaW5jbHVkZSgnVjInKTtcbiAgICAgIGpzb25TdHJpbmcuc2hvdWxkLmluY2x1ZGUoJ0hJIEhPVyBBUkUgWU9VIFRPREFZJyk7XG4gICAgfSk7XG4gICAgaXQoJ3Nob3VsZCB1c2UgdGhlIHJlcGxhY2VyIGZ1bmN0aW9uIHJlY3Vyc2l2ZWx5JywgZnVuY3Rpb24gKCkge1xuICAgICAgY29uc3Qgb2JqID0ge1xuICAgICAgICBrMTogJ3YxJyxcbiAgICAgICAgazI6ICd2MicsXG4gICAgICAgIGszOiBCdWZmZXIuZnJvbSgnaGkgaG93IGFyZSB5b3UgdG9kYXknKSxcbiAgICAgICAgazQ6IHtcbiAgICAgICAgICBrNTogJ3Y1JyxcbiAgICAgICAgfSxcbiAgICAgIH07XG4gICAgICBmdW5jdGlvbiByZXBsYWNlciAoa2V5LCB2YWx1ZSkge1xuICAgICAgICByZXR1cm4gXy5pc1N0cmluZyh2YWx1ZSkgPyB2YWx1ZS50b1VwcGVyQ2FzZSgpIDogdmFsdWU7XG4gICAgICB9XG4gICAgICBjb25zdCBqc29uU3RyaW5nID0gdXRpbC5qc29uU3RyaW5naWZ5KG9iaiwgcmVwbGFjZXIpO1xuICAgICAganNvblN0cmluZy5zaG91bGQuaW5jbHVkZSgnVjEnKTtcbiAgICAgIGpzb25TdHJpbmcuc2hvdWxkLmluY2x1ZGUoJ1YyJyk7XG4gICAgICBqc29uU3RyaW5nLnNob3VsZC5pbmNsdWRlKCdISSBIT1cgQVJFIFlPVSBUT0RBWScpO1xuICAgICAganNvblN0cmluZy5zaG91bGQuaW5jbHVkZSgnVjUnKTtcbiAgICB9KTtcbiAgfSk7XG5cbiAgZGVzY3JpYmUoJ3Vud3JhcEVsZW1lbnQnLCBmdW5jdGlvbiAoKSB7XG4gICAgaXQoJ3Nob3VsZCBwYXNzIHRocm91Z2ggYW4gdW53cmFwcGVkIGVsZW1lbnQnLCBmdW5jdGlvbiAoKSB7XG4gICAgICBsZXQgZWwgPSA0O1xuICAgICAgdXRpbC51bndyYXBFbGVtZW50KGVsKS5zaG91bGQuZXF1YWwoZWwpO1xuICAgIH0pO1xuICAgIGl0KCdzaG91bGQgcGFzcyB0aHJvdWdoIGFuIGVsZW1lbnQgdGhhdCBpcyBhbiBvYmplY3QnLCBmdW5jdGlvbiAoKSB7XG4gICAgICBsZXQgZWwgPSB7UkFORE9NOiA0fTtcbiAgICAgIHV0aWwudW53cmFwRWxlbWVudChlbCkuc2hvdWxkLmVxdWFsKGVsKTtcbiAgICB9KTtcbiAgICBpdCgnc2hvdWxkIHVud3JhcCBhIHdyYXBwZWQgZWxlbWVudCcsIGZ1bmN0aW9uICgpIHtcbiAgICAgIGxldCBlbCA9IHtFTEVNRU5UOiA0fTtcbiAgICAgIHV0aWwudW53cmFwRWxlbWVudChlbCkuc2hvdWxkLmVxbCg0KTtcbiAgICB9KTtcbiAgICBpdCgnc2hvdWxkIHVud3JhcCBhIHdyYXBwZWQgZWxlbWVudCB0aGF0IHVzZXMgVzNDIGVsZW1lbnQgaWRlbnRpZmllcicsIGZ1bmN0aW9uICgpIHtcbiAgICAgIGxldCBlbCA9IHtcbiAgICAgICAgW1czQ19XRUJfRUxFTUVOVF9JREVOVElGSUVSXTogNVxuICAgICAgfTtcbiAgICAgIHV0aWwudW53cmFwRWxlbWVudChlbCkuc2hvdWxkLmVxbCg1KTtcbiAgICB9KTtcbiAgICBpdCgnc2hvdWxkIHVud3JhcCBhIHdyYXBwZWQgZWxlbWVudCBhbmQgcHJpb3JpdGl6ZSBXM0MgZWxlbWVudCBpZGVudGlmaWVyJywgZnVuY3Rpb24gKCkge1xuICAgICAgbGV0IGVsID0ge1xuICAgICAgICBFTEVNRU5UOiA3LFxuICAgICAgICBbVzNDX1dFQl9FTEVNRU5UX0lERU5USUZJRVJdOiA2LFxuICAgICAgfTtcbiAgICAgIHV0aWwudW53cmFwRWxlbWVudChlbCkuc2hvdWxkLmVxbCg2KTtcbiAgICB9KTtcbiAgfSk7XG5cbiAgZGVzY3JpYmUoJ3dyYXBFbGVtZW50JywgZnVuY3Rpb24gKCkge1xuICAgIGl0KCdzaG91bGQgaW5jbHVkZSBFTEVNRU5UIGFuZCB3M2MgZWxlbWVudCcsIGZ1bmN0aW9uICgpIHtcbiAgICAgIHV0aWwud3JhcEVsZW1lbnQoMTIzKS5zaG91bGQuZXFsKHtcbiAgICAgICAgW3V0aWwuVzNDX1dFQl9FTEVNRU5UX0lERU5USUZJRVJdOiAxMjMsXG4gICAgICAgIEVMRU1FTlQ6IDEyMyxcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9KTtcblxuICBkZXNjcmliZSgndG9SZWFkYWJsZVNpemVTdHJpbmcnLCBmdW5jdGlvbiAoKSB7XG4gICAgaXQoJ3Nob3VsZCBmYWlsIGlmIGNhbm5vdCBjb252ZXJ0IHRvIEJ5dGVzJywgZnVuY3Rpb24gKCkge1xuICAgICAgKCgpID0+IHV0aWwudG9SZWFkYWJsZVNpemVTdHJpbmcoJ2FzZGFzZCcpKS5zaG91bGQudGhyb3coL0Nhbm5vdCBjb252ZXJ0Lyk7XG4gICAgfSk7XG4gICAgaXQoJ3Nob3VsZCBwcm9wZXJseSBjb252ZXJ0IHRvIEJ5dGVzJywgZnVuY3Rpb24gKCkge1xuICAgICAgdXRpbC50b1JlYWRhYmxlU2l6ZVN0cmluZygwKS5zaG91bGQuZXF1YWwoJzAgQicpO1xuICAgIH0pO1xuICAgIGl0KCdzaG91bGQgcHJvcGVybHkgY29udmVydCB0byBLQnl0ZXMnLCBmdW5jdGlvbiAoKSB7XG4gICAgICB1dGlsLnRvUmVhZGFibGVTaXplU3RyaW5nKDIwNDggKyAxMikuc2hvdWxkLmVxdWFsKCcyLjAxIEtCJyk7XG4gICAgfSk7XG4gICAgaXQoJ3Nob3VsZCBwcm9wZXJseSBjb252ZXJ0IHRvIE1CeXRlcycsIGZ1bmN0aW9uICgpIHtcbiAgICAgIHV0aWwudG9SZWFkYWJsZVNpemVTdHJpbmcoMTAyNCAqIDEwMjQgKiAzICsgMTAyNCAqIDEwKS5zaG91bGQuZXF1YWwoJzMuMDEgTUInKTtcbiAgICB9KTtcbiAgICBpdCgnc2hvdWxkIHByb3Blcmx5IGNvbnZlcnQgdG8gR0J5dGVzJywgZnVuY3Rpb24gKCkge1xuICAgICAgdXRpbC50b1JlYWRhYmxlU2l6ZVN0cmluZygxMDI0ICogMTAyNCAqIDEwMjQgKiA1KS5zaG91bGQuZXF1YWwoJzUuMDAgR0InKTtcbiAgICB9KTtcbiAgfSk7XG5cbiAgZGVzY3JpYmUoJ2ZpbHRlck9iamVjdCcsIGZ1bmN0aW9uICgpIHtcbiAgICBkZXNjcmliZSgnd2l0aCB1bmRlZmluZWQgcHJlZGljYXRlJywgZnVuY3Rpb24gKCkge1xuICAgICAgaXQoJ3Nob3VsZCBmaWx0ZXIgb3V0IHVuZGVmaW5lZHMnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGxldCBvYmogPSB7XG4gICAgICAgICAgYTogJ2EnLFxuICAgICAgICAgIGI6ICdiJyxcbiAgICAgICAgICBjOiB1bmRlZmluZWQsXG4gICAgICAgIH07XG4gICAgICAgIHV0aWwuZmlsdGVyT2JqZWN0KG9iaikuc2hvdWxkLmVxbCh7XG4gICAgICAgICAgYTogJ2EnLFxuICAgICAgICAgIGI6ICdiJyxcbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICAgIGl0KCdzaG91bGQgbGVhdmUgbnVsbHMgYWxvbmUnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGxldCBvYmogPSB7XG4gICAgICAgICAgYTogJ2EnLFxuICAgICAgICAgIGI6ICdiJyxcbiAgICAgICAgICBjOiBudWxsLFxuICAgICAgICB9O1xuICAgICAgICB1dGlsLmZpbHRlck9iamVjdChvYmopLnNob3VsZC5lcWwoe1xuICAgICAgICAgIGE6ICdhJyxcbiAgICAgICAgICBiOiAnYicsXG4gICAgICAgICAgYzogbnVsbCxcbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICB9KTtcbiAgICBkZXNjcmliZSgnd2l0aCB2YWx1ZSBwcmVkaWNhdGUnLCBmdW5jdGlvbiAoKSB7XG4gICAgICBpdCgnc2hvdWxkIGZpbHRlciBlbGVtZW50cyBieSB0aGVpciB2YWx1ZScsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgbGV0IG9iaiA9IHtcbiAgICAgICAgICBhOiAnYScsXG4gICAgICAgICAgYjogJ2InLFxuICAgICAgICAgIGM6ICdjJyxcbiAgICAgICAgICBkOiAnYScsXG4gICAgICAgIH07XG4gICAgICAgIHV0aWwuZmlsdGVyT2JqZWN0KG9iaiwgJ2EnKS5zaG91bGQuZXFsKHtcbiAgICAgICAgICBhOiAnYScsXG4gICAgICAgICAgZDogJ2EnLFxuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgIH0pO1xuICAgIGRlc2NyaWJlKCd3aXRoIGZ1bmN0aW9uIHByZWRpY2F0ZScsIGZ1bmN0aW9uICgpIHtcbiAgICAgIGl0KCdzaG91bGQgZmlsdGVyIGVsZW1lbnRzJywgZnVuY3Rpb24gKCkge1xuICAgICAgICBsZXQgb2JqID0ge1xuICAgICAgICAgIGE6ICdhJyxcbiAgICAgICAgICBiOiAnYicsXG4gICAgICAgICAgYzogJ2MnLFxuICAgICAgICB9O1xuICAgICAgICB1dGlsLmZpbHRlck9iamVjdChvYmosICh2KSA9PiB2ID09PSAnYScgfHwgdiA9PT0gJ2MnKS5zaG91bGQuZXFsKHtcbiAgICAgICAgICBhOiAnYScsXG4gICAgICAgICAgYzogJ2MnLFxuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9KTtcblxuICBkZXNjcmliZSgnaXNTdWJQYXRoJywgZnVuY3Rpb24gKCkge1xuICAgIGl0KCdzaG91bGQgZGV0ZWN0IHNpbXBsZSBzdWJwYXRoJywgZnVuY3Rpb24gKCkge1xuICAgICAgdXRpbC5pc1N1YlBhdGgoJy9yb290L3NvbWUnLCAnL3Jvb3QnKS5zaG91bGQuYmUudHJ1ZTtcbiAgICB9KTtcbiAgICBpdCgnc2hvdWxkIGRldGVjdCBjb21wbGV4IHN1YnBhdGgnLCBmdW5jdGlvbiAoKSB7XG4gICAgICB1dGlsLmlzU3ViUGF0aCgnL3Jvb3Qvc29tZS9vdGhlci8uLi8uLi8uJywgJy9yb290Jykuc2hvdWxkLmJlLnRydWU7XG4gICAgfSk7XG4gICAgaXQoJ3Nob3VsZCBkZXRlY3Qgc3VicGF0aCBlbmRpbmcgd2l0aCBhIHNsYXNoJywgZnVuY3Rpb24gKCkge1xuICAgICAgdXRpbC5pc1N1YlBhdGgoJy9yb290L3NvbWUvJywgJy9yb290Jykuc2hvdWxkLmJlLnRydWU7XG4gICAgfSk7XG4gICAgaXQoJ3Nob3VsZCBkZXRlY3QgaWYgYSBwYXRoIGlzIG5vdCBhIHN1YnBhdGgnLCBmdW5jdGlvbiAoKSB7XG4gICAgICB1dGlsLmlzU3ViUGF0aCgnL3Jvb3Qvc29tZS8vLi4vLi4nLCAnL3Jvb3QnKS5zaG91bGQuYmUuZmFsc2U7XG4gICAgfSk7XG4gICAgaXQoJ3Nob3VsZCB0aHJvdyBpZiBhbnkgb2YgdGhlIGdpdmVuIHBhdGhzIGlzIG5vdCBhYnNvbHV0ZScsIGZ1bmN0aW9uICgpIHtcbiAgICAgIHNob3VsZC50aHJvdygoKSA9PiB1dGlsLmlzU3ViUGF0aCgnc29tZS8uLicsICcvcm9vdCcpLCAvYWJzb2x1dGUvKTtcbiAgICB9KTtcbiAgfSk7XG5cbiAgZGVzY3JpYmUoJ2lzU2FtZURlc3RpbmF0aW9uJywgZnVuY3Rpb24gKCkge1xuICAgIGxldCBwYXRoMTtcbiAgICBsZXQgcGF0aDI7XG4gICAgbGV0IHRtcERpcjtcbiAgICBiZWZvcmUoYXN5bmMgZnVuY3Rpb24gKCkge1xuICAgICAgdG1wRGlyID0gYXdhaXQgdGVtcERpci5vcGVuRGlyKCk7XG4gICAgICBwYXRoMSA9IHBhdGgucmVzb2x2ZSh0bXBEaXIsICdwYXRoMS50eHQnKTtcbiAgICAgIHBhdGgyID0gcGF0aC5yZXNvbHZlKHRtcERpciwgJ3BhdGgyLnR4dCcpO1xuICAgICAgZm9yIChjb25zdCBwIG9mIFtwYXRoMSwgcGF0aDJdKSB7XG4gICAgICAgIGF3YWl0IGZzLndyaXRlRmlsZShwLCBwLCAndXRmOCcpO1xuICAgICAgfVxuICAgIH0pO1xuICAgIGFmdGVyKGFzeW5jIGZ1bmN0aW9uICgpIHtcbiAgICAgIGF3YWl0IGZzLnJpbXJhZih0bXBEaXIpO1xuICAgIH0pO1xuICAgIGl0KCdzaG91bGQgbWF0Y2ggcGF0aHMgdG8gdGhlIHNhbWUgZmlsZS9mb2xkZXInLCBhc3luYyBmdW5jdGlvbiAoKSB7XG4gICAgICAoYXdhaXQgdXRpbC5pc1NhbWVEZXN0aW5hdGlvbihwYXRoMSwgcGF0aC5yZXNvbHZlKHRtcERpciwgJy4uJywgcGF0aC5iYXNlbmFtZSh0bXBEaXIpLCBwYXRoLmJhc2VuYW1lKHBhdGgxKSkpKVxuICAgICAgICAuc2hvdWxkLmJlLnRydWU7XG4gICAgfSk7XG4gICAgaXQoJ3Nob3VsZCBub3QgbWF0Y2ggcGF0aHMgaWYgdGhleSBwb2ludCB0byBub24gZXhpc3RpbmcgaXRlbXMnLCBhc3luYyBmdW5jdGlvbiAoKSB7XG4gICAgICAoYXdhaXQgdXRpbC5pc1NhbWVEZXN0aW5hdGlvbihwYXRoMSwgJ2JsYWJsYScpKS5zaG91bGQuYmUuZmFsc2U7XG4gICAgfSk7XG4gICAgaXQoJ3Nob3VsZCBub3QgbWF0Y2ggcGF0aHMgdG8gZGlmZmVyZW50IGZpbGVzJywgYXN5bmMgZnVuY3Rpb24gKCkge1xuICAgICAgKGF3YWl0IHV0aWwuaXNTYW1lRGVzdGluYXRpb24ocGF0aDEsIHBhdGgyKSkuc2hvdWxkLmJlLmZhbHNlO1xuICAgIH0pO1xuICB9KTtcblxuICBkZXNjcmliZSgnY29tcGFyZVZlcnNpb25zJywgZnVuY3Rpb24gKCkge1xuICAgIGl0KCdzaG91bGQgY29tcGFyZSB0d28gY29ycmVjdCB2ZXJzaW9uIG51bWJlcnMnLCBmdW5jdGlvbiAoKSB7XG4gICAgICB1dGlsLmNvbXBhcmVWZXJzaW9ucygnMTAuMCcsICc8JywgJzExLjAnKS5zaG91bGQuZXFsKHRydWUpO1xuICAgICAgdXRpbC5jb21wYXJlVmVyc2lvbnMoJzExLjAnLCAnPj0nLCAnMTEuMCcpLnNob3VsZC5lcWwodHJ1ZSk7XG4gICAgICB1dGlsLmNvbXBhcmVWZXJzaW9ucygnMTEuMCcsICc9PScsICcxMS4wJykuc2hvdWxkLmVxbCh0cnVlKTtcbiAgICAgIHV0aWwuY29tcGFyZVZlcnNpb25zKCcxMy4xMCcsICc+JywgJzEzLjUnKS5zaG91bGQuZXFsKHRydWUpO1xuICAgICAgdXRpbC5jb21wYXJlVmVyc2lvbnMoJzExLjEnLCAnIT0nLCAnMTEuMTAnKS5zaG91bGQuZXFsKHRydWUpO1xuICAgICAgdXRpbC5jb21wYXJlVmVyc2lvbnMoJzEyLjAnLCAnPCcsIDEwKS5zaG91bGQuZXFsKGZhbHNlKTtcbiAgICB9KTtcbiAgICBpdCgnc2hvdWxkIHRocm93IGlmIGFueSBvZiB2ZXJzaW9uIGFyZ3VtZW50cyBpcyBpbnZhbGlkJywgZnVuY3Rpb24gKCkge1xuICAgICAgc2hvdWxkLnRocm93KCgpID0+IHV0aWwuY29tcGFyZVZlcnNpb25zKHVuZGVmaW5lZCwgJzwnLCAnMTEuMCcpKTtcbiAgICAgIHNob3VsZC50aHJvdygoKSA9PiB1dGlsLmNvbXBhcmVWZXJzaW9ucygnMTEuMCcsICc9PScsIG51bGwpKTtcbiAgICB9KTtcbiAgICBpdCgnc2hvdWxkIHRocm93IGlmIGNvbXBhcmlzb24gb3BlcmF0b3IgaXMgdW5zdXBwb3J0ZWQnLCBmdW5jdGlvbiAoKSB7XG4gICAgICBzaG91bGQudGhyb3coKCkgPT4gdXRpbC5jb21wYXJlVmVyc2lvbnMoJzEyLjAnLCAnYWJjJywgMTApKTtcbiAgICB9KTtcbiAgfSk7XG5cbiAgZGVzY3JpYmUoJ3F1b3RlJywgZnVuY3Rpb24gKCkge1xuICAgIGl0KCdzaG91bGQgcXVvdGUgYSBzdHJpbmcgd2l0aCBhIHNwYWNlJywgZnVuY3Rpb24gKCkge1xuICAgICAgdXRpbC5xdW90ZShbJ2EnLCAnYicsICdjIGQnXSkuc2hvdWxkLmVxbCgnYSBiIFxcJ2MgZFxcJycpO1xuICAgIH0pO1xuICAgIGl0KCdzaG91bGQgZXNjYXBlIGRvdWJsZSBxdW90ZXMnLCBmdW5jdGlvbiAoKSB7XG4gICAgICB1dGlsLnF1b3RlKFsnYScsICdiJywgYGl0J3MgYSBcIm5lYXQgdGhpbmdcImBdKS5zaG91bGQuZXFsKGBhIGIgXCJpdCdzIGEgXFxcXFwibmVhdCB0aGluZ1xcXFxcIlwiYCk7XG4gICAgfSk7XG4gICAgaXQoXCJzaG91bGQgZXNjYXBlICQgYCBhbmQgJ1wiLCBmdW5jdGlvbiAoKSB7XG4gICAgICB1dGlsLnF1b3RlKFsnJCcsICdgJywgYCdgXSkuc2hvdWxkLmVxbCgnXFxcXCQgXFxcXGAgXCJcXCdcIicpO1xuICAgIH0pO1xuICAgIGl0KCdzaG91bGQgaGFuZGxlIGVtcHR5IGFycmF5JywgZnVuY3Rpb24gKCkge1xuICAgICAgdXRpbC5xdW90ZShbXSkuc2hvdWxkLmVxbCgnJyk7XG4gICAgfSk7XG4gICAgaXQoJ3Nob3VsZCBxdW90ZSBhIHN0cmluZyB3aXRoIG5ld2xpbmUnLCBmdW5jdGlvbiAoKSB7XG4gICAgICB1dGlsLnF1b3RlKFsnYVxcbmInXSkuc2hvdWxkLmVxbChgJ2FcXG5iJ2ApO1xuICAgIH0pO1xuICAgIGl0KCdzaG91bGQgc3RyaW5naWZ5IGJvb2xlYW5zJywgZnVuY3Rpb24gKCkge1xuICAgICAgdXRpbC5xdW90ZShbJ2EnLCAxLCB0cnVlLCBmYWxzZV0pLnNob3VsZC5lcWwoJ2EgMSB0cnVlIGZhbHNlJyk7XG4gICAgfSk7XG4gICAgaXQoJ3Nob3VsZCBzdHJpbmdpZnkgbnVsbCBhbmQgdW5kZWZpbmVkJywgZnVuY3Rpb24gKCkge1xuICAgICAgdXRpbC5xdW90ZShbJ2EnLCAxLCBudWxsLCB1bmRlZmluZWRdKS5zaG91bGQuZXFsKCdhIDEgbnVsbCB1bmRlZmluZWQnKTtcbiAgICB9KTtcbiAgfSk7XG5cbiAgZGVzY3JpYmUoJ3VubGVha1N0cmluZycsIGZ1bmN0aW9uICgpIHtcbiAgICBpdCgnc2hvdWxkIHVubGVhayBhIHN0cmluZycsIGZ1bmN0aW9uICgpIHtcbiAgICAgIHV0aWwudW5sZWFrU3RyaW5nKCd5b2xvJykuc2hvdWxkLmVxbCgneW9sbycpO1xuICAgIH0pO1xuICAgIGl0KCdzaG91bGQgdW5sZWFrIGEgbXVsdGlsaW5lIHN0cmluZycsIGZ1bmN0aW9uICgpIHtcbiAgICAgIHV0aWwudW5sZWFrU3RyaW5nKCcgeW9sb1xcbmJvbG8gJykuc2hvdWxkLmVxbCgnIHlvbG9cXG5ib2xvICcpO1xuICAgIH0pO1xuICAgIGl0KCdzaG91bGQgY29udmVydCBhbiBvYmplY3QgdG8gYSBzdHJpbmcnLCBmdW5jdGlvbiAoKSB7XG4gICAgICBmb3IgKGNvbnN0IG9iaiBvZiBbe30sIG51bGwsIHVuZGVmaW5lZCwgW10sIDBdKSB7XG4gICAgICAgIHV0aWwudW5sZWFrU3RyaW5nKG9iaikuc2hvdWxkLmVxbChgJHtvYmp9YCk7XG4gICAgICB9XG4gICAgfSk7XG4gIH0pO1xuXG4gIGRlc2NyaWJlKCdwbHVyYWxpemUnLCBmdW5jdGlvbiAoKSB7XG4gICAgLypcbiAgICAgKiBUaGUgcGx1cmFsaXplIGxpYnJhcnkgKGh0dHBzOi8vZ2l0aHViLmNvbS9ibGFrZWVtYnJleS9wbHVyYWxpemUpXG4gICAgICogaGFzIGEgcm9idXN0IHNldCBvZiB0ZXN0cy4gSGVyZSB3ZSBqdXN0IG5lZWQgdG8gdmVyaWZ5IHRoYXQgaXRcbiAgICAgKiBpcyB1c2FibGUgdGhyb3VnaCB0aGUgZXhwb3J0ZWQgcGFja2FnZSwgYW5kIHRoZSBhcmd1bWVudHMgYXJlIGNvcnJlY3RcbiAgICAgKi9cbiAgICBpdCgnc2hvdWxkIHBsdXJhbGl6ZSBhIHN0cmluZycsIGZ1bmN0aW9uICgpIHtcbiAgICAgIHV0aWwucGx1cmFsaXplKCd3b3JkJywgMikuc2hvdWxkLmVxbCgnd29yZHMnKTtcbiAgICB9KTtcbiAgICBpdCgnc2hvdWxkIHBsdXJhbGl6ZSBhIHN0cmluZyBhbmQgcHJlcGVuZCB0aGUgbnVtYmVyIHRocm91Z2ggYm9vbGVhbicsIGZ1bmN0aW9uICgpIHtcbiAgICAgIHV0aWwucGx1cmFsaXplKCd3b3JkJywgMiwgdHJ1ZSkuc2hvdWxkLmVxbCgnMiB3b3JkcycpO1xuICAgIH0pO1xuICAgIGl0KCdzaG91bGQgcGx1cmFsaXplIGEgc3RyaW5nIGFuZCBwcmVwZW5kIHRoZSBudW1iZXIgdGhyb3VnaCBvcHRpb25zJywgZnVuY3Rpb24gKCkge1xuICAgICAgdXRpbC5wbHVyYWxpemUoJ3dvcmQnLCAyLCB7aW5jbHVzaXZlOiB0cnVlfSkuc2hvdWxkLmVxbCgnMiB3b3JkcycpO1xuICAgIH0pO1xuICB9KTtcbn0pO1xuIl0sIm1hcHBpbmdzIjoiOzs7O0FBQ0EsSUFBQUEsRUFBQSxHQUFBQyxPQUFBO0FBQ0EsSUFBQUMsS0FBQSxHQUFBQyxzQkFBQSxDQUFBRixPQUFBO0FBQ0EsSUFBQUcsZUFBQSxHQUFBRCxzQkFBQSxDQUFBRixPQUFBO0FBQ0EsSUFBQUksU0FBQSxHQUFBRixzQkFBQSxDQUFBRixPQUFBO0FBQ0EsSUFBQUssTUFBQSxHQUFBSCxzQkFBQSxDQUFBRixPQUFBO0FBQ0EsSUFBQU0sR0FBQSxHQUFBSixzQkFBQSxDQUFBRixPQUFBO0FBQ0EsSUFBQU8sS0FBQSxHQUFBTCxzQkFBQSxDQUFBRixPQUFBO0FBQ0EsSUFBQVEsT0FBQSxHQUFBTixzQkFBQSxDQUFBRixPQUFBO0FBRUEsTUFBTTtFQUFDUztBQUEwQixDQUFDLEdBQUdDLE9BQUk7QUFHekMsTUFBTUMsTUFBTSxHQUFHQyxhQUFJLENBQUNELE1BQU0sQ0FBQyxDQUFDO0FBQzVCQyxhQUFJLENBQUNDLEdBQUcsQ0FBQ0MsdUJBQWMsQ0FBQztBQUV4QkMsUUFBUSxDQUFDLE1BQU0sRUFBRSxZQUFZO0VBQzNCQSxRQUFRLENBQUMsVUFBVSxFQUFFLFlBQVk7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
