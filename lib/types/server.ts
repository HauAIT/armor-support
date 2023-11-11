import type {Express} from 'express';
import type {Server as WSServer} from 'ws';
import type {Server as HTTPServer} from 'node:http';
import type {Socket} from 'node:net';
import {ServerArgs} from './config';

/**
 * Armor's slightly-modified {@linkcode HTTPServer http.Server}.
 */
export type ArmorServer = Omit<HTTPServer, 'close'> & ArmorServerExtension;

export interface ArmorServerExtension {
  close(): Promise<void>;
  /**
   * Adds websocket handler to an {@linkcode ArmorServer}.
   * @param handlerPathname - Web socket endpoint path starting with a single slash character. It is recommended to always prepend `/ws` to all web socket pathnames.
   * @param handlerServer - WebSocket server instance. See https://github.com/websockets/ws/pull/885 for more details on how to configure the handler properly.
   */
  addWebSocketHandler(
    this: ArmorServer,
    handlerPathname: string,
    handlerServer: WSServer
  ): Promise<void>;
  /**
   * Removes existing WebSocket handler from the server instance.
   *
   * The call is ignored if the given `handlerPathname` handler is not present in the handlers list.
   * @param handlerPathname - WebSocket endpoint path
   * @returns `true` if the `handlerPathname` was found and deleted; `false` otherwise.
   */
  removeWebSocketHandler(this: ArmorServer, handlerPathname: string): Promise<boolean>;
  /**
   * Removes all existing WebSocket handlers from the server instance.
   * @returns `true` if at least one handler was deleted; `false` otherwise.
   */
  removeAllWebSocketHandlers(this: ArmorServer): Promise<boolean>;
  /**
   * Returns web socket handlers registered for the given server
   * instance.
   * @param keysFilter - Only include pathnames with given value if set. All pairs will be included by default.
   * @returns Pathnames to WS server instances mapping matching the search criteria, if any found.
   */
  getWebSocketHandlers(
    this: ArmorServer,
    keysFilter?: string | null
  ): Promise<Record<string, WSServer>>;
  webSocketsMapping: Record<string, WSServer>;
}

export interface ArmorServerSocket extends Socket {
  _openReqCount: number;
}

export {WSServer};

/**
 * Optionally updates an Armor express app and http server, by calling
 * methods that may mutate those objects. For example, you could call:
 *
 * `expressApp.get('/foo', handler)`
 *
 * In order to add a new route to Armor with this plugin. Or, you could add
 * new listeners to the httpServer object.
 *
 * @param expressApp - the Express 'app' object used by Armor for route handling
 * @param httpServer - the node HTTP server that hosts the app
 * @param cliArgs - Arguments from config files, CLI, etc.
 */
export type UpdateServerCallback = (
  expressApp: Express,
  httpServer: ArmorServer,
  cliArgs: Partial<ServerArgs>
) => Promise<void>;
