import type {Logger} from 'npmlog';

/**
 * A log prefix for {@linkcode ArmorLogger}
 *
 * If a function, the function will return the prefix.  Log messages will be prefixed with this value.
 */
export type ArmorLoggerPrefix = string | (() => string);

/**
 * Possible "log levels" for {@linkcode ArmorLogger}.
 *
 * Extracted from `npmlog`.
 */
export type ArmorLoggerLevel = 'silly' | 'verbose' | 'debug' | 'info' | 'http' | 'warn' | 'error';

/**
 * Describes the `npmlog`-based internal logger.
 *
 * @see https://npm.im/npmlog
 */
export interface ArmorLogger {
  /**
   * Returns the underlying `npmlog` {@link Logger}.
   */
  unwrap(): Logger;
  level: ArmorLoggerLevel;
  levels: ArmorLoggerLevel[];
  /**
   * Log prefix, if applicable.
   */
  prefix?: ArmorLoggerPrefix;
  debug(...args: any[]): void;
  info(...args: any[]): void;
  warn(...args: any[]): void;
  error(...args: any[]): void;
  verbose(...args: any[]): void;
  silly(...args: any[]): void;
  http(...args: any[]): void;
  errorAndThrow(...args: any[]): never;
}
