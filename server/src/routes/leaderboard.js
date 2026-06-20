const express = require('express')
const prisma = require('../db')
const authMiddleware = require('../middleware/auth')

const router = express.Router()

router.get('/', authMiddleware, async (req, res) => {
  try {
    const leaderboard = await prisma.stat.groupBy({
      by: ['user_id'],
      _sum: {
        kills: true,
        deaths: true,
        won: true
      }
    })

    // Fetch usernames and format
    const result = await Promise.all(
      leaderboard.map(async (entry) => {
        const user = await prisma.user.findUnique({
          where: { id: entry.user_id },
          select: { username: true, avatar_url: true }
        })
        return {
          username: user.username,
          avatar_url: user.avatar_url,
          wins: entry._sum.won,
          kills: entry._sum.kills,
          deaths: entry._sum.deaths
        }
      })
    )

    // Sort: wins DESC, kills DESC, deaths ASC
    result.sort((a, b) => {
      if (b.wins !== a.wins) return b.wins - a.wins
      if (b.kills !== a.kills) return b.kills - a.kills
      return a.deaths - b.deaths
    })

    res.json(result)

  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch leaderboard' })
  }
})

module.exports = router