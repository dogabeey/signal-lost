import { defineServer } from 'colyseus'
import './posthog.js'

const port = Number(process.env.PORT ?? 2567)

// Multiplayer is intentionally not exposed in the game client yet. This is the
// deployable server foundation where rooms, authentication and analytics can be
// added later without coupling them to the browser build.
const server = defineServer({ rooms: {} })

server.listen(port)
console.log(`Asteroid Belt multiplayer foundation listening on ws://localhost:${port}`)
