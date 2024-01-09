import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { node } from '..';


chai.should();
chai.use(chaiAsPromised);

describe('node utilities', function () {
  describe('requirePackage', function () {
    it('should be able to require a local package', async function () {
      await node.requirePackage('ait-process').should.not.be.rejected;
    });
    it('should be able to require a global package', async function () {
      await node.requirePackage('npm').should.not.be.rejected;
    });
  });
});
