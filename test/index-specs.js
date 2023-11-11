
import ArmorSupport from '../index.js';
import chai from 'chai';

chai.should();
let { system, tempDir, util } = ArmorSupport;

describe('index', function () {
  describe('default', function () {
    it('should expose an object', function () {
      ArmorSupport.should.exist;
      ArmorSupport.should.be.an.instanceof(Object);
    });
    it('should expose system object', function () {
      ArmorSupport.system.should.exist;
      ArmorSupport.system.should.be.an.instanceof(Object);
    });
    it('should expose tempDir object', function () {
      ArmorSupport.tempDir.should.exist;
      ArmorSupport.tempDir.should.be.an.instanceof(Object);
    });
    it('should expose util object', function () {
      ArmorSupport.util.should.exist;
      ArmorSupport.util.should.be.an.instanceof(Object);
    });
  });

  it('should expose an object as "system" ', function () {
    system.should.be.an.instanceof(Object);
  });

  it('should expose an object as "tempDir" ', function () {
    tempDir.should.be.an.instanceof(Object);
  });

  it('should expose an object as "util" ', function () {
    util.should.be.an.instanceof(Object);
  });
});
