/* eslint-disable require-await */
// @ts-check

import path from 'path';
import {rewiremock} from '../helpers';
import {initMocks} from '../mocks';

const {expect} = chai;

describe('env', function () {
  /** @type {typeof import('../../lib/env')} */
  let env;

  /** @type {sinon.SinonSandbox} */
  let sandbox;

  /** @type {import('../mocks').MockPkgDir} */
  let MockPkgDir;

  /** @type {import('../mocks').MockReadPkg} */
  let MockReadPkg;

  /** @type {import('../mocks').MockTeenProcess} */
  let MockTeenProcess;

  /** @type {string|undefined} */
  let envArmorHome;

  beforeEach(function () {
    let overrides;

    ({MockPkgDir, MockReadPkg, MockTeenProcess, sandbox, overrides} = initMocks());

    // ensure an ARMOR_HOME in the environment does not befoul our tests
    envArmorHome = process.env.ARMOR_HOME;
    delete process.env.ARMOR_HOME;

    env = rewiremock.proxy(() => require('../../lib/env'), overrides);

    env.findArmorDependencyPackage.cache = new Map();
    env.resolveManifestPath.cache = new Map();
    env.resolveArmorHome.cache = new Map();
  });

  describe('resolveManifestPath()', function () {
    describe('when armor is not resolvable from cwd', function () {
      beforeEach(function () {
        MockPkgDir.throws();
      });

      it('should return a path relative to the default ARMOR_HOME', async function () {
        expect(await env.resolveManifestPath()).to.equal(
          path.join(env.DEFAULT_ARMOR_HOME, env.MANIFEST_RELATIVE_PATH)
        );
      });
    });

    describe('when provided an explicit ARMOR_HOME', function () {
      describe('when a manifest file exists there', function () {
        it('it should return the existing path', async function () {
          expect(await env.resolveManifestPath('/somewhere/over/the/rainbow')).to.equal(
            path.join('/somewhere/over/the/rainbow', env.MANIFEST_RELATIVE_PATH)
          );
        });
      });
    });
  });

  describe('resolveArmorHome()', function () {
    describe('when param is not absolute', function () {
      it('should reject', async function () {
        await expect(env.resolveArmorHome('foo')).to.be.rejectedWith(TypeError, /absolute/i);
      });
    });

    describe('when ARMOR_HOME is set in env', function () {
      describe('when ARMOR_HOME is absolute', function () {
        beforeEach(function () {
          process.env.ARMOR_HOME = path.resolve(path.sep, 'some', 'armor-home');
        });

        it('should resolve ARMOR_HOME from env', async function () {
          await expect(env.resolveArmorHome()).to.eventually.equal(process.env.ARMOR_HOME);
        });
      });

      describe('when ARMOR_HOME is relative', function () {
        beforeEach(function () {
          process.env.ARMOR_HOME = path.join('some', 'armor-home');
        });
        it('should resolve to an absolute path', async function () {
          await expect(env.resolveArmorHome()).to.eventually.equal(
            path.join(process.cwd(), /** @type {string} */ (process.env.ARMOR_HOME))
          );
        });
      });
    });

    describe('when ARMOR_HOME is not set in env', function () {
      describe('when Armor is not resolvable from cwd', function () {
        describe('when `armor` is not a dependency of the package in the cwd', function () {
          beforeEach(function () {
            // this is needed because the default behavior is `resolvesArg(0)`; `.resolves()`
            // does not override this behavior! I don't know why!
            // .resetBehavior();
            MockReadPkg.resolves();
          });

          it('should resolve with DEFAULT_ARMOR_HOME', async function () {
            await expect(env.resolveArmorHome('/somewhere')).to.eventually.equal(
              env.DEFAULT_ARMOR_HOME
            );
          });
        });

        describe('when `armor` is a dependency of the package in the cwd', function () {
          const armorHome = path.resolve(path.sep, 'somewhere');

          describe('when the `armor` dependency spec begins with `file:`', function () {
            beforeEach(function () {
              MockReadPkg.resolves({devDependencies: {armor: 'file:../armor'}});
            });

            it('should resolve with the identity', async function () {
              await expect(env.resolveArmorHome(armorHome)).to.eventually.equal(armorHome);
            });
          });

          describe('when `armor` is a dependency which does not resolve to a file path`', function () {
            beforeEach(function () {
              MockReadPkg.resolves({devDependencies: {armor: '2.0.0-beta.25'}});
            });

            it('should resolve with the identity', async function () {
              await expect(env.resolveArmorHome(armorHome)).to.eventually.equal(armorHome);
            });
          });

          describe('when `armor` is a dependency for version 0.x', function () {
            beforeEach(function () {
              MockReadPkg.resolves({devDependencies: {armor: '0.9.0'}});
            });
            it('should resolve with DEFAULT_ARMOR_HOME', async function () {
              await expect(env.resolveArmorHome(armorHome)).to.eventually.equal(
                env.DEFAULT_ARMOR_HOME
              );
            });
          });

          describe('when `armor` is a dependency for version 1.x', function () {
            beforeEach(function () {
              MockReadPkg.resolves({devDependencies: {armor: '1.2.3'}});
            });

            it('should resolve with DEFAULT_ARMOR_HOME', async function () {
              await expect(env.resolveArmorHome(armorHome)).to.eventually.equal(
                env.DEFAULT_ARMOR_HOME
              );
            });
          });
        });

        describe('when `armor` is a dependency of the workspace root of cwd', function () {
          const armorHome = path.resolve(path.sep, 'somewhere');

          beforeEach(function () {
            MockTeenProcess.exec.resolves({
              stdout: JSON.stringify({
                path: armorHome,
              }),
            });
            MockReadPkg.resolves({devDependencies: {armor: '2.x'}});
          });

          it('should resolve with the workspace root', async function () {
            await expect(env.resolveArmorHome(path.join(armorHome, 'else'))).to.eventually.equal(
              armorHome
            );
          });
        });
      });

      describe('when reading `package.json` causes an exception', function () {
        beforeEach(function () {
          // unclear if this is even possible
          MockReadPkg.rejects(new Error('on the fritz'));
        });

        it('should resolve with DEFAULT_ARMOR_HOME', async function () {
          await expect(env.resolveArmorHome('/somewhere')).to.eventually.equal(
            env.DEFAULT_ARMOR_HOME
          );
        });
      });

      describe('when `package.json` not found', function () {
        beforeEach(function () {
          MockPkgDir.resolves();
        });

        it('should resolve with DEFAULT_ARMOR_HOME', async function () {
          await expect(env.resolveArmorHome('/somewhere')).to.eventually.equal(
            env.DEFAULT_ARMOR_HOME
          );
        });
      });
    });
  });

  describe('readPackageInDir()', function () {
    it('should delegate to `read-pkg`', async function () {
      await env.readPackageInDir('/somewhere');
      expect(MockReadPkg).to.have.been.calledWithExactly({
        cwd: '/somewhere',
        normalize: true,
      });
    });
  });

  describe('hasArmorDependency()', function () {
    describe('when Armor is not resolvable from cwd', function () {
      describe('when `armor` is not a dependency of the local package', function () {
        beforeEach(function () {
          // this is needed because the default behavior is `resolvesArg(0)`; `.resolves()`
          // does not override this behavior! I don't know why!
          MockPkgDir.resetBehavior();
          MockPkgDir.resolves();
        });

        it('should resolve `false`', async function () {
          await expect(env.hasArmorDependency('/somewhere')).to.eventually.equal(false);
        });

        describe('when it is installed, but extraneous', function () {
          beforeEach(function () {
            MockTeenProcess.exec.resolves({
              stdout: JSON.stringify({
                version: '0.0.0',
                name: 'some-pkg',
                dependencies: {
                  armor: {
                    extraneous: true,
                    version: '2.0.0-beta.25',
                    resolved: 'https://some/armor-tarball.tgz',
                  },
                },
              }),
              stderr: '',
              code: 0,
            });
          });

          it('should resolve `false`', async function () {
            await expect(env.hasArmorDependency('/somewhere')).to.eventually.equal(false);
          });
        });
      });

      describe('when `armor` is a dependency of the local package', function () {
        // the tests in here are pretty barebones, since there are many variations we haven't covered (despite the LoC coverage). might be a good application for property testing.
        describe('when `armor` is not yet actually installed', function () {
          beforeEach(function () {
            MockTeenProcess.exec.rejects();
          });

          describe('when the `armor` dependency spec begins with `file:`', function () {
            beforeEach(function () {
              MockReadPkg.resolves({
                dependencies: {armor: 'file:packges/armor'},
              });
            });

            it('should resolve `true`', async function () {
              await expect(env.hasArmorDependency('/somewhere')).to.eventually.equal(true);
            });
          });

          describe('when `armor` dep is current`', function () {
            beforeEach(function () {
              MockReadPkg.resolves({
                devDependencies: {armor: '2.0.0'},
              });
            });

            it('should resolve `true`', async function () {
              await expect(env.hasArmorDependency('/somewhere')).to.eventually.equal(true);
            });
          });

          describe('when `armor` dep is v1.x', function () {
            beforeEach(function () {
              MockReadPkg.resolves({
                optionalDependencies: {armor: '1.x'},
              });
            });
            it('should resolve `false`', async function () {
              await expect(env.hasArmorDependency('/somewhere')).to.eventually.equal(false);
            });
          });

          describe('when `armor` dep is v0.x', function () {
            beforeEach(function () {
              MockReadPkg.resolves({
                dependencies: {armor: '0.x'},
              });
            });

            it('should resolve `false`', async function () {
              await expect(env.hasArmorDependency('/somewhere')).to.eventually.equal(false);
            });
          });
        });

        describe('when `armor` is installed', function () {
          describe('when `armor` is a dependency for version 0.x', function () {
            beforeEach(function () {
              MockTeenProcess.exec.resolves({
                stdout: JSON.stringify({
                  version: '0.0.0',
                  name: 'some-pkg',
                  dependencies: {
                    armor: {
                      version: '0.1.2',
                      resolved: 'https://whatever',
                    },
                  },
                }),
                stderr: '',
                code: 0,
              });
            });
            it('should resolve `false`', async function () {
              await expect(env.hasArmorDependency('/somewhere')).to.eventually.equal(false);
            });
          });

          describe('when `armor` is a dependency for version 1.x', function () {
            beforeEach(function () {
              MockTeenProcess.exec.resolves({
                stdout: JSON.stringify({
                  version: '0.0.0',
                  name: 'some-pkg',
                  dependencies: {
                    armor: {
                      version: '1.x',
                      resolved: 'https://whatever',
                    },
                  },
                }),
                stderr: '',
                code: 0,
              });
            });

            it('should resolve `false`', async function () {
              await expect(env.hasArmorDependency('/somewhere')).to.eventually.equal(false);
            });
          });
        });
      });
    });
  });

  afterEach(function () {
    sandbox.restore();
    process.env.ARMOR_HOME = envArmorHome;
  });
});
