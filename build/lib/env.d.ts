/**
 * Resolves `true` if an `armor` dependency can be found somewhere in the given `cwd`.
 *
 * @param {string} cwd
 * @returns {Promise<boolean>}
 */
export function hasArmorDependency(cwd: string): Promise<boolean>;
/**
 * Path to the default `ARMOR_HOME` dir (`~/.armor`).
 * @type {string}
 */
export const DEFAULT_ARMOR_HOME: string;
/**
 * Basename of extension manifest file.
 * @type {string}
 */
export const MANIFEST_BASENAME: string;
/**
 * Relative path to extension manifest file from `ARMOR_HOME`.
 * @type {string}
 */
export const MANIFEST_RELATIVE_PATH: string;
/**
 * Given `cwd`, use `npm` to find the closest package _or workspace root_, and return the path if the root depends upon `armor`.
 *
 * Looks at `dependencies` and `devDependencies` for `armor`.
 */
export const findArmorDependencyPackage: ((cwd?: string | undefined) => Promise<string | undefined>) & _.MemoizedFunction;
/**
 * Read a `package.json` in dir `cwd`.  If none found, return `undefined`.
 */
export const readPackageInDir: ((cwd: string) => Promise<import('read-pkg').NormalizedPackageJson | undefined>) & _.MemoizedFunction;
/**
 * Determines location of Armor's "home" dir
 *
 * - If `ARMOR_HOME` is set in the environment, use that
 * - If we find a `package.json` in or above `cwd` and it has an `armor` dependency, use that.
 *
 * All returned paths will be absolute.
 */
export const resolveArmorHome: ((cwd?: string | undefined) => Promise<string>) & _.MemoizedFunction;
/**
 * Figure out manifest path based on `armorHome`.
 *
 * The assumption is that, if `armorHome` has been provided, it was resolved via {@link resolveArmorHome `resolveArmorHome()`}!  If unsure,
 * don't pass a parameter and let `resolveArmorHome()` handle it.
 */
export const resolveManifestPath: ((armorHome?: string | undefined) => Promise<string>) & _.MemoizedFunction;
export type NormalizedPackageJson = import('read-pkg').NormalizedPackageJson;
import _ from 'lodash';
//# sourceMappingURL=env.d.ts.map