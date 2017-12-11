/** Wrapper around WebSocket.send and JSON.stringify
 * @param {WebSocket} ws 
 * @returns 
 */
module.exports = (ws) => (data) => ws.send(JSON.stringify(data))