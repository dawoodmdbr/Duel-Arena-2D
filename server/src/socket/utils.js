const jwt = require('jsonwebtoken')

function verifyToken(token) {
  try {
    return jwt.verify(token, process.env.JWT_SECRET)
  } catch {
    return null
  }
}

function generateRoomCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

function createPlayer(socket) {
  return {
    id: socket.id,
    user_id: socket.user.id,
    username: socket.user.username,
    is_guest: socket.user.is_guest || false,
    x: 0,
    y: 0,
    health: 100,
    ammo: 60,
    kills: 0,
    deaths: 0,
    team: null,
    alive: true
  }
}

module.exports = { verifyToken, generateRoomCode, createPlayer }