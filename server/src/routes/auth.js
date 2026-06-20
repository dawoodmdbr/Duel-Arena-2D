const express = require("express");
const {OAuth2Client} = require("google-auth-library");
const jwt = require("jsonwebtoken");
const prisma = require("../db");

const router = express.Router();
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

router.post("/google", async (req, res) => {
    const {token} = req.body;

    try {
        // Use access_token to fetch user info from Google
        const googleRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
            headers: {Authorization: `Bearer ${token}`},
        });

        if (!googleRes.ok) return res.status(401).json({error: "Invalid Google token"});

        const {sub: google_id, email, name, picture} = await googleRes.json();

        // Find or create user in DB
        let user = await prisma.user.findUnique({where: {google_id}});

        let isNew = false;
        if (!user) {
            user = await prisma.user.create({
                data: {
                    google_id,
                    username: name,
                    email,
                    avatar_url: picture,
                    is_guest: false,
                },
            });
            isNew = true;
        }

        const jwtToken = jwt.sign({id: user.id, username: user.username}, process.env.JWT_SECRET, {expiresIn: "7d"});

        res.json({token: jwtToken, user, isNew});
    } catch (err) {
        console.error(err);
        res.status(401).json({error: "Invalid Google token"});
    }
});

// Gen-Z random username generator
const adjectives = ["bussin", "slay", "lowkey", "highkey", "sus", "based", "lit", "vibe", "toxic", "goated"];
const nouns = ["goblin", "baddie", "simp", "chad", "npc", "ratio", "queen", "beast", "menace", "legend"];

function randomGuestName() {
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)]
  const noun = nouns[Math.floor(Math.random() * nouns.length)]
  return `${adj}_${noun}`
}

router.post("/guest", (req, res) => {
    const username = randomGuestName();

    // No DB storage for guests
    const jwtToken = jwt.sign({id: `guest_${Date.now()}`, username, is_guest: true}, process.env.JWT_SECRET, {expiresIn: "1d"});

    res.json({token: jwtToken, user: {username, is_guest: true}});
});

router.patch('/username', async (req, res) => {
  const { username } = req.body
  const authHeader = req.headers.authorization
  if (!authHeader) return res.status(401).json({ error: 'No token' })

  try {
    const decoded = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET)

    const existing = await prisma.user.findUnique({ where: { username } })
    if (existing && existing.id !== decoded.id)
      return res.status(400).json({ error: 'Username already taken' })

    const user = await prisma.user.update({
      where: { id: decoded.id },
      data: { username }
    })

    const newToken = jwt.sign(
      { id: user.id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    )

    res.json({ token: newToken, user })
  } catch (err) {
    res.status(500).json({ error: 'Failed to update username' })
  }
})

module.exports = router;
