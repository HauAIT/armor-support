// @ts-check

import path from 'path';
import {fs, tempDir} from '../../lib';
import {
  DEFAULT_ARMOR_HOME,
  readPackageInDir,
  resolveArmorHome,
  resolveManifestPath,
  findArmorDependencyPackage,
} from '../../lib/env';

const {expect} = chai;

describe('environment', function () {
  /** @type {string} */
  let cwd;
  /** @type {string|undefined} */
  let oldEnvArmorHome;

  before(async function () {
    cwd = await tempDir.openDir();
  });

  beforeEach(function () {
    // all of these functions are memoized, so we need to reset them before each test.
    resolveManifestPath.cache = new Map();
    resolveArmorHome.cache = new Map();
    findArmorDependencyPackage.cache = new Map();
    readPackageInDir.cache = new Map();
  });

  after(async function () {
    await fs.rimraf(cwd);
  });

  beforeEach(function () {
    oldEnvArmorHome = process.env.ARMOR_HOME;
    delete process.env.ARMOR_HOME;
  });

  afterEach(function () {
    process.env.ARMOR_HOME = oldEnvArmorHome;
  });

  describe('resolution of ARMOR_HOME', function () {
    describe('when `armor` is not a package nor can be resolved from the CWD', function () {
      describe('when `ARMOR_HOME` is not present in the environment', function () {
        describe('when providing no `cwd` parameter', function () {
          /**
           * **IMPORTANT:** If no `cwd` is provided, {@linkcode resolveManifestPath} call {@linkcode resolveArmorHome}.
           * `resolveArmorHome` depends on the value of the current working directory ({@linkcode process.cwd }).
           * In order to isolate these tests properly, we must create a temp dir and `chdir` to it.
           * For our purposes, we can just use the `cwd` we set already.
           *
           * @type {string}
           */
          let oldCwd;

          beforeEach(function () {
            oldCwd = process.cwd();
            process.chdir(cwd);
          });

          afterEach(function () {
            process.chdir(oldCwd);
          });

          it('should resolve to the default `ARMOR_HOME`', async function () {
            await expect(resolveArmorHome()).to.eventually.equal(DEFAULT_ARMOR_HOME);
          });
        });

        describe('when providing a `cwd` parameter', function () {
          it('should resolve to the default `ARMOR_HOME`', async function () {
            await expect(resolveArmorHome(cwd)).to.eventually.equal(DEFAULT_ARMOR_HOME);
          });
        });
      });

      describe('when `ARMOR_HOME` is present in the environment', function () {
        beforeEach(function () {
          process.env.ARMOR_HOME = cwd;
        });

        describe('when providing no `cwd` parameter', function () {
          it('should resolve with `ARMOR_HOME` from env', async function () {
            await expect(resolveArmorHome()).to.eventually.equal(process.env.ARMOR_HOME);
          });
        });

        describe('when providing an `cwd` parameter', function () {
          it('should resolve with `ARMOR_HOME` from env', async function () {
            await expect(resolveArmorHome('/root')).to.eventually.equal(process.env.ARMOR_HOME);
          });
        });
      });
    });

    describe('when `armor` is not a dependency', function () {
      it('should resolve with `DEFAULT_ARMOR_HOME`', async function () {
        await expect(resolveArmorHome(cwd)).to.eventually.equal(DEFAULT_ARMOR_HOME);
      });
    });
    describe('when `armor` is a dependency and ARMOR_HOME is unset', function () {
      beforeEach(function () {
        delete process.env.ARMOR_HOME;
      });
      describe('when `armor` is installed', function () {
        before(async function () {
          await fs.mkdirp(path.join(cwd, 'node_modules'));
        });

        after(async function () {
          await fs.rimraf(path.join(cwd, 'node_modules'));
        });

        describe('when `armor` is at the current version', function () {
          beforeEach(async function () {
            await fs.copyFile(
              path.join(__dirname, 'fixture', 'armor-v2-dependency.package.json'),
              path.join(cwd, 'package.json')
            );
            // await fs.symlink(path.join(__dirname, '..', 'armor'), path.join(cwd, 'node_modules', 'armor'), 'junction');
            await fs.copyFile(
              path.join(__dirname, 'fixture', 'armor-v2-package'),
              path.join(cwd, 'node_modules', 'armor')
            );
          });

          afterEach(async function () {
            await fs.unlink(path.join(cwd, 'package.json'));
          });

          it('should resolve with `cwd`', async function () {
            // NOTE: resolveArmorHome() can resolve w/ a _real_ path by way of output from npm.
            // on macOS, /var/whatever is really /private/var/whatever.
            if (process.platform === 'darwin' && cwd.startsWith('/var/')) {
              await expect(resolveArmorHome(cwd)).to.eventually.equal(path.join('/private', cwd));
            } else {
              await expect(resolveArmorHome(cwd)).to.eventually.equal(cwd);
            }
          });
        });
        describe('when `armor` is an old version', function () {
          beforeEach(async function () {
            await fs.copyFile(
              path.join(__dirname, 'fixture', 'armor-v1-dependency.package.json'),
              path.join(cwd, 'package.json')
            );
            await fs.copyFile(
              path.join(__dirname, 'fixture', 'armor-v1-package'),
              path.join(cwd, 'node_modules', 'armor')
            );
          });

          afterEach(async function () {
            await fs.unlink(path.join(cwd, 'package.json'));
          });

          it('should resolve with `DEFAULT_ARMOR_HOME`', async function () {
            await expect(resolveArmorHome(cwd)).to.eventually.equal(DEFAULT_ARMOR_HOME);
          });
        });
      });

      describe('when `armor` has not been installed', function () {
        describe('when `armor` dep requested is current version', function () {
          before(async function () {
            await fs.copyFile(
              path.join(__dirname, 'fixture', 'armor-v2-dependency.package.json'),
              path.join(cwd, 'package.json')
            );
          });

          after(async function () {
            await fs.unlink(path.join(cwd, 'package.json'));
          });
          it('should resolve with `cwd`', async function () {
            await expect(resolveArmorHome(cwd)).to.eventually.equal(cwd);
          });
        });

        describe('when `armor` dep requested is an old version', function () {
          before(async function () {
            await fs.copyFile(
              path.join(__dirname, 'fixture', 'armor-v1-dependency.package.json'),
              path.join(cwd, 'package.json')
            );
          });

          after(async function () {
            await fs.unlink(path.join(cwd, 'package.json'));
          });
          it('should resolve with `DEFAULT_ARMOR_HOME`', async function () {
            await expect(resolveArmorHome(cwd)).to.eventually.equal(DEFAULT_ARMOR_HOME);
          });
        });
      });
    });
  });
});
