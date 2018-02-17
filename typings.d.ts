interface State {
  /** Mapping tokens to the WebSockets so the their information can be queried.
   * @type {Map<string, ExpressWsSocket>}
   * @memberof State
   */
  slaveSockets: Map<string, WebSocket>,
  /** List of unclaimed tokens. Master adds a token to it upon generating it. 
   * When a slave tries to identify itself with a token, it is only accepted 
   * in case it is in this list. This way, master is generating its IDs, and 
   * clients cannot take over already taken ones.
   * 
   * It is a Set so that it can hold primite types (... stings)
   * @type {Set<string>}
   * @memberof State
   */
  pendingTokens: Set<string>,
  /** Connection to the master.
   * @type {WebSocket}
   * @memberof State
   */
  masterSocket: WebSocket,
  /** Maps request IDs to Express Requests. 
   * When a HTTP request is received, a request is sent to the referenced websocket.
   * Upon return, the websocket will include this request ID so that it can be 
   * connected with the original request.
   * 
   * @type {Map<string, Express.Request>}
   * @memberof State
   */
  pendingRequests: Map<string, Express.Request>,
  /** Keeps track on connections from browsers. When asynchronous information arrives 
   * from slaves on a requestId, it is sent to the respective browserSocket.
   * @type {Map<string, WebSocket>}
   * @memberof State
   */
  browserSockets: Map<string, WebSocket>
}

interface Config {
  port: number,
  shareRoot: string,
  master: string,
  folders: Array<Folder>
}

interface Folder {
  path: string,
  permissions: string,
  visibility: string,
  include?: Array<string>,
  exclude?: Array<string>
}