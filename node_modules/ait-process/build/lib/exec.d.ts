export default exec;
/**
 * Options on top of `SpawnOptions`, unique to `ait-process.`
 */
export type AITProcessProps = {
    /**
     * - Ignore & discard all output
     */
    ignoreOutput?: boolean | undefined;
    /**
     * - Return output as a Buffer
     */
    isBuffer?: boolean | undefined;
    /**
     * - Logger to use for debugging
     */
    logger?: AITProcessLogger | undefined;
    /**
     * - Maximum size of `stdout` buffer
     */
    maxStdoutBufferSize?: number | undefined;
    /**
     * - Maximum size of `stderr` buffer
     */
    maxStderrBufferSize?: number | undefined;
    /**
     * - Encoding to use for output
     */
    encoding?: BufferEncoding | undefined;
};
/**
 * A logger object understood by {@link exec ait-process.exec}.
 */
export type AITProcessLogger = {
    debug: (...args: any[]) => void;
};
/**
 * Options for {@link exec ait-process.exec}.
 */
export type AITProcessExecOptions = import('child_process').SpawnOptions & AITProcessProps;
/**
 * The value {@link exec ait-process.exec} resolves to when `isBuffer` is `false`
 */
export type AITProcessExecStringResult = {
    /**
     * - Stdout
     */
    stdout: string;
    /**
     * - Stderr
     */
    stderr: string;
    /**
     * - Exit code
     */
    code: number | null;
};
/**
 * The value {@link exec ait-process.exec} resolves to when `isBuffer` is `true`
 */
export type AITProcessExecBufferResult = {
    /**
     * - Stdout
     */
    stdout: Buffer;
    /**
     * - Stderr
     */
    stderr: Buffer;
    /**
     * - Exit code
     */
    code: number | null;
};
/**
 * Extra props {@link exec ait-process.exec} adds to its error objects
 */
export type AITProcessExecErrorProps = {
    /**
     * - STDOUT
     */
    stdout: string;
    /**
     * - STDERR
     */
    stderr: string;
    /**
     * - Exit code
     */
    code: number | null;
};
/**
 * Error thrown by {@link exec ait-process.exec}
 */
export type AITProcessExecError = Error & AITProcessExecErrorProps;
export type BufferProp<MaybeBuffer extends {
    isBuffer?: boolean | undefined;
}> = MaybeBuffer['isBuffer'];
/**
 * Spawns a process
 * @template {AITProcessExecOptions} T
 * @param {string} cmd - Program to execute
 * @param {string[]} [args] - Arguments to pass to the program
 * @param {T} [opts] - Options
 * @returns {Promise<BufferProp<T> extends true ? AITProcessExecBufferResult : AITProcessExecStringResult>}
 */
export function exec<T extends AITProcessExecOptions>(cmd: string, args?: string[] | undefined, opts?: T | undefined): Promise<BufferProp<T> extends true ? AITProcessExecBufferResult : AITProcessExecStringResult>;
//# sourceMappingURL=exec.d.ts.map