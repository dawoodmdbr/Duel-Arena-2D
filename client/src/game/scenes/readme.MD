# Duel Arena 2D

A fast-paced **top-down multiplayer battle arena** built with React, Phaser.js, Node.js, and SQLite.

## Features

- ⚔️ **Real-time Multiplayer** — 2-16 players per match
- 🎮 **Two Game Modes** — Free For All & Team Battle
- 💥 **Fast-paced Combat** — Instant shooting, ammo pickups, respawn mechanics
- 🏆 **Global Leaderboard** — Track wins, kills, deaths
- 🎯 **Dynamic Map Generation** — Procedural obstacles, randomized spawns
- 🛡️ **Invincibility Frames** — 3-second protection after respawn
- 🎊 **Easter Egg** — Konami Code (↑↑↓↓←→←→BA)

## Tech Stack

- **Frontend:** React 18, Phaser.js 3, Socket.io Client
- **Backend:** Node.js, Express, Socket.io
- **Database:** SQLite with Prisma ORM
- **Styling:** CSS Grid, Flexbox

## Getting Started

### Prerequisites
- Node.js v25+
- npm

### Installation

```bash
# Clone repo
git clone https://github.com/dawoodmdbr/Duel-Arena-2D.git
cd Duel-Arena-2D

# Server setup
cd server
npm install
npm run dev

# Client setup (new terminal)
cd client
npm install
npm run dev
```

### Access
Open **http://localhost:5173** in your browser

## How to Play

### Controls
- **WASD** — Move
- **Arrow Keys** — Aim & Shoot
- **Tab** — Toggle Scoreboard
- **Click Leave** — Exit match

### Game Modes
- **Free For All** — Every player vs everyone. Highest kills wins.
- **Team** — Red vs Blue teams. Team with most combined kills wins.

### Mechanics
- **Health:** 100 HP, no regeneration
- **Ammo:** Start with 60, pickups grant +30/+50
- **Respawn:** 3 seconds after death with invincibility
- **Map:** Procedurally generated with walls, obstacles, ammo spawns

## Architecture

### Server Flow
Socket Connection → Matchmaking → Lobby → Game Loop → Match End → Leaderboard Save

### Game State (60 FPS)
- Player positions validated server-side
- Bullet collisions calculated server-side
- State broadcasted to all clients every 16ms

### Database Schema
- **User** — Login, username, guest flag
- **Match** — Room code, game mode, duration, status
- **Stat** — Per-player match stats (kills, deaths, wins)

## Project Structure
Duel-Arena-2D/

├── server/

│   ├── src/

│   │   ├── routes/       # HTTP endpoints (auth, leaderboard)

│   │   ├── socket/       # Socket.io events (matchmaking, game)

│   │   ├── game/         # Game logic (map gen, collisions, bullets)

│   │   ├── middleware/   # Auth verification

│   │   └── db.js         # Prisma client

│   ├── prisma/

│   │   ├── schema.prisma # Database schema

│   │   └── dev.db        # SQLite database

│   └── package.json

│

└── client/

├── src/

│   ├── pages/        # Login, Home, Game, Leaderboard pages

│   ├── game/         # Phaser scenes, game rendering

│   ├── components/   # React UI components

│   ├── socket/       # Socket connection setup

│   └── index.css     # Global styles

└── package.json

## Key Features Explained

### Matchmaking
- Click **Play** → Auto-finds/creates public room
- If match in progress → Shows countdown, auto-joins when ends
- Click **Create/Join Room** → Private room with custom settings

### Creator Transfer
- If room creator leaves, next player becomes creator
- Only creator can start the match

### Collision System
- **Server-side validation** — Prevents wall clipping
- **Diagonal slide** — Move along obstacle if blocked diagonally
- **Bullet collision** — Hitscan with 16px radius per player

### Invincibility
- Players flash for 3 seconds after respawn
- Bullets ignore invincible players
- Prevents spawn camping

### Leaderboard
- Ranked by: **Wins → Kills → Deaths (ascending)**
- Shows: Player, Wins, Kills, Deaths, K/D ratio
- Data persists in SQLite

## Performance

- **Frame Rate:** 60 FPS client-side rendering
- **Tick Rate:** 60 Hz server-side game loop
- **Concurrent Players:** 2-16 per match
- **Network:** WebSocket + Polling fallback

## Notes

- Designed for local/LAN play
- Tested on same network (low latency)
- Input lag is inherent to networked games (~50-200ms depending on connection)

## Author

**Mian Dawood bin Rafay**
- [GitHub](https://github.com/dawoodmdbr)
- [LinkedIn](https://www.linkedin.com/in/dawoodmdbr/)
- [Instagram](https://instagram.com/dawood.mdbr)

## License

MIT — Feel free to use, modify, and distribute.

---

**Enjoy the arena! 🎮**