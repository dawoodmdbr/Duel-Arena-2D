const { verifyToken } = require('./utils')
const handleMatchmaking = require('./matchmaking')
const handleLobby = require('./lobby')
const handleGame = require('./game')

// In-memory game state
const rooms = new Map()

module.exports = (io) => {
  io.on('connection', (socket) => {
    console.log(`Player connected: ${socket.id}`)

    // Attach user to socket from JWT
    const token = socket.handshake.auth.token
    const user = verifyToken(token)
    if (!user) {
      socket.emit('error', { message: 'Invalid token' })
      socket.disconnect()
      return
    }
    socket.user = user

    handleMatchmaking(socket, io, rooms)
    handleLobby(socket, io, rooms)
    handleGame(socket, io, rooms)

    socket.on('disconnect', () => {
      console.log(`Player disconnected: ${socket.id}`)
      // handle player leaving rooms
    })
  })
}