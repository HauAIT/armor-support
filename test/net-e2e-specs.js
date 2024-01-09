import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import path from 'path';
import { downloadFile } from '../lib/net';
import { tempDir, fs } from '../index';

chai.use(chaiAsPromised);

describe('#net', function () {
  let tmpRoot;

  beforeEach(async function () {
    tmpRoot = await tempDir.openDir();
  });

  afterEach(async function () {
    await fs.rimraf(tmpRoot);
  });

  describe('downloadFile()', function () {
    it('should download file into the target folder', async function () {
      const dstPath = path.join(tmpRoot, 'download.tmp');
      await downloadFile('http://aitgroup.vn/ico/aitgroup-nhan-giai-thuong-tap-doan-cong-nghe-xuat-sac.png',
        dstPath);
      await fs.exists(dstPath).should.eventually.be.true;
    });
  });

});
