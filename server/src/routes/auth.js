const express = require('express')
const { OAuth2Client } = require('google-auth-library')
const jwt = require('jsonwebtoken')
const prisma = require('../db')

const router = express.Router()
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID)

router.post('/google', async (req, res) => {
  const { token } = req.body

  try {
    // 1. Verify token with Google
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID
    })

    const { sub: google_id, email, name, picture } = ticket.getPayload()

    // 2. Find or create user in DB
    let user = await prisma.user.findUnique({ where: { google_id } })

    if (!user) {
      user = await prisma.user.create({
        data: {
          google_id,
          username: name,
          email,
          avatar_url: picture,
          is_guest: false
        }
      })
    }

    // 3. Create JWT
    const jwtToken = jwt.sign(
      { id: user.id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    )

    res.json({ token: jwtToken, user })

  } catch (err) {
    console.error(err)
    res.status(401).json({ error: 'Invalid Google token' })
  }
})

// Gen-Z random username generator
const adjectives = ['bussin', 'slay', 'lowkey', 'highkey', 'sus', 'based', 'lit', 'vibe', 'toxic', 'goated']
const nouns = ['goblin', 'baddie', 'simp', 'chad', 'npc', 'ratio', 'queen', 'beast', 'menace', 'legend']

function randomGuestName() {
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)]
  const noun = nouns[Math.floor(Math.random() * nouns.length)]
  const num = Math.floor(Math.random() * 999)
  return `${adj}_${noun}_${num}`
}

router.post('/guest', (req, res) => {
  const username = randomGuestName()

  // No DB storage for guests
  const jwtToken = jwt.sign(
    { id: `guest_${Date.now()}`, username, is_guest: true },
    process.env.JWT_SECRET,
    { expiresIn: '1d' }
  )

  res.json({ token: jwtToken, user: { username, is_guest: true } })
})

module.exports = router