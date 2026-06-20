const { generateRoomCode, createPlayer } = require('./utils')
const prisma = require('../db')

module.exports = (socket, io, rooms) => {

  // Find a public match
  socket.on('find_match', () => {
    // Look for a waiting public room
    const availableRoom = [...rooms.values()].find(
      r => r.is_public && r.status === 'WAITING' && 
      r.players.size < r.max_players
    )

    if (availableRoom) {
      joinRoom(socket, io, rooms, availableRoom.code)
      return
    }

    // Look for in-progress public match
    const inProgressRoom = [...rooms.values()].find(
      r => r.is_public && r.status === 'IN_PROGRESS'
    )

    if (inProgressRoom) {
      const elapsed = (Date.now() - inProgressRoom.started_at) / 1000
      const remaining = Math.max(0, inProgressRoom.time_limit - elapsed)
      socket.emit('matchmaking_status', {
        status: 'in_progress',
        remaining: Math.floor(remaining)
      })
      return
    }

    // No rooms exist, create one
    const code = generateRoomCode()
    const room = {
      code,
      game_mode: Math.random() > 0.5 ? 'FFA' : 'TEAM',
      map_type: 'SMALL',
      status: 'WAITING',
      max_players: 8,
      time_limit: 180,
      is_public: true,
      creator_id: socket.id,
      players: new Map(),
      bullets: [],
      ammo_pickups: [],
      timer: null,
      started_at: null,
      match_id: null
    }
    rooms.set(code, room)
    joinRoom(socket, io, rooms, code)
  })

  // Create private room
  socket.on('create_room', (config) => {
    const code = generateRoomCode()
    const room = {
      code,
      game_mode: config.game_mode || 'FFA',
      map_type: 'SMALL',
      status: 'WAITING',
      max_players: config.max_players || 8,
      time_limit: config.time_limit || 180,
      is_public: false,
      creator_id: socket.id,
      players: new Map(),
      bullets: [],
      ammo_pickups: [],
      timer: null,
      started_at: null,
      match_id: null
    }
    rooms.set(code, room)
    joinRoom(socket, io, rooms, code)
    socket.emit('room_created', { code })
  })

  // Join private room by code
  socket.on('join_room', ({ code }) => {
    const room = rooms.get(code)
    if (!room) {
      socket.emit('error', { message: 'Room not found' })
      return
    }
    if (room.status !== 'WAITING') {
      socket.emit('error', { message: 'Match already started' })
      return
    }
    if (room.players.size >= room.max_players) {
      socket.emit('error', { message: 'Room is full' })
      return
    }
    joinRoom(socket, io, rooms, code)
  })

  // Cancel matchmaking
  socket.on('cancel_matchmaking', () => {
    socket.emit('matchmaking_status', { status: 'cancelled' })
  })
}

function joinRoom(socket, io, rooms, code) {
  const room = rooms.get(code)
  const player = createPlayer(socket)

  // Assign team if TEAM mode
  if (room.game_mode === 'TEAM') {
    const redCount = [...room.players.values()].filter(p => p.team === 'RED').length
    const blueCount = [...room.players.values()].filter(p => p.team === 'BLUE').length
    player.team = redCount <= blueCount ? 'RED' : 'BLUE'
  }

  room.players.set(socket.id, player)
  socket.join(code)
  socket.currentRoom = code

  // Tell everyone in room a player joined
  io.to(code).emit('room_updated', {
    players: [...room.players.values()],
    room: {
      code: room.code,
      game_mode: room.game_mode,
      map_type: room.map_type,
      max_players: room.max_players,
      time_limit: room.time_limit,
      creator_id: room.creator_id
    }
  })
}

module.exports.joinRoom = joinRoom