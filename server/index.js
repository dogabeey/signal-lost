import { WebSocketServer } from 'ws'
import { randomUUID } from 'node:crypto'

const server = new WebSocketServer({ port: 3001 })
const rooms = new Map()
const characterIds = ['steward', 'knight', 'jester', 'alchemist', 'noble']
function sendState(room, roleForSocket) {
  room.clients.forEach((client) => client.readyState === 1 && client.send(JSON.stringify({ type: 'state', players: Object.fromEntries(room.players), status: room.started ? 'Ziyafet başladı. Kimin kadehi zehirli?' : `${room.players.size}/8 misafir hazır`, roleHint: roleForSocket?.(client) || (room.started ? 'Rolünü gizli tut.' : 'Konuklar bekleniyor.') })))
}
server.on('connection', (socket) => {
  let room; let id
  socket.on('message', (raw) => {
    const message = JSON.parse(raw)
    if (message.type === 'join') {
      const key = String(message.room || 'toast').replace(/[^a-z0-9-]/gi, '').slice(0, 12) || 'toast'
      room = rooms.get(key) || { key, clients: new Set(), players: new Map(), started: false }; rooms.set(key, room)
      id = randomUUID(); room.clients.add(socket)
      const player = { id, characterId: characterIds[room.players.size % characterIds.length], x: -5 + room.players.size * 2, z: 1, rotation: 0 }
      room.players.set(id, player); socket.send(JSON.stringify({ type: 'joined', player })); sendState(room)
    }
    if (!room || !id) return
    if (message.type === 'move') { const player = room.players.get(id); player.x = Math.max(-12, Math.min(12, Number(message.x) || 0)); player.z = Math.max(-8, Math.min(8, Number(message.z) || 0)); player.rotation = Number(message.rotation) || 0; sendState(room) }
    if (message.type === 'start' && room.players.size) { room.started = true; const assassin = [...room.players.keys()][Math.floor(Math.random() * room.players.size)]; sendState(room, (client) => client === [...room.clients].find((item) => room.players.has(assassin) && item === client) ? 'GİZLİ ROL: KRALIN SUİKASTÇISI' : 'GİZLİ ROL: ZİYAFET MİSAFİRİ') }
  })
  socket.on('close', () => { if (!room || !id) return; room.clients.delete(socket); room.players.delete(id); if (!room.clients.size) rooms.delete(room.key); else sendState(room) })
})
console.log('The Last Toast server: ws://localhost:3001')
