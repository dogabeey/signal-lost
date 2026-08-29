export class MultiplayerClient {
  constructor(handlers) { this.handlers = handlers; this.player = null; this.socket = null }
  join(room) {
    this.socket?.close()
    const protocol = location.protocol === 'https:' ? 'wss' : 'ws'
    this.socket = new WebSocket(`${protocol}://${location.hostname}:3001`)
    this.socket.addEventListener('open', () => this.send({ type: 'join', room }))
    this.socket.addEventListener('message', ({ data }) => {
      const message = JSON.parse(data)
      if (message.type === 'joined') { this.player = message.player; this.handlers.onJoined(message.player) }
      if (message.type === 'state') this.handlers.onState(message)
    })
  }
  send(message) { if (this.socket?.readyState === WebSocket.OPEN) this.socket.send(JSON.stringify(message)) }
  move(position, rotation) { this.send({ type: 'move', x: position.x, z: position.z, rotation }) }
  start() { this.send({ type: 'start' }) }
}
