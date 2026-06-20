const express = require('express')
const http = require('http')
const { Server } = require('socket.io')
const cors = require('cors')
require('dotenv').config()

const app = express()
const server = http.createServer(app)
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:5173', // Vite default port
    methods: ['GET', 'POST']
  }
})

app.use(cors())
app.use(express.json())

const authRoutes = require('./routes/auth')
app.use('/auth', authRoutes)

const leaderboardRoutes = require('./routes/leaderboard')
app.use('/leaderboard', leaderboardRoutes)

app.get('/', (req, res) => {
  res.send('Duel Arena 2D Server Running')
})

const initSocket = require('./socket/index')
initSocket(io)

const PORT = process.env.PORT || 3001
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})