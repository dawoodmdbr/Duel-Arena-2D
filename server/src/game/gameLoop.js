const {CONFIG} = require("./mapGenerator");

function startGameLoop(io, room) {
    const TICK_RATE = 60;
    const TICK_INTERVAL = 1000 / TICK_RATE;

    const loop = setInterval(() => {
        if (room.status !== "IN_PROGRESS") {
            clearInterval(loop);
            return;
        }

        updateBullets(room);
        broadcastState(io, room);
    }, TICK_INTERVAL);

    room.gameLoop = loop;
}

function updateBullets(room) {
    const {grid, tileSize} = room.mapData;
    const dt = 1 / 60; // time per tick in seconds

    room.bullets = room.bullets.filter((bullet) => {
        // Move bullet
        bullet.x += bullet.dirX * bullet.speed * dt;
        bullet.y += bullet.dirY * bullet.speed * dt;

        // Check wall collision
        const col = Math.floor(bullet.x / tileSize);
        const row = Math.floor(bullet.y / tileSize);

        if (row < 0 || row >= grid.length || col < 0 || col >= grid[0].length || grid[row][col] === 1) {
            return false; // remove bullet
        }

        // Check player collision
        for (const [id, player] of room.players) {
            if (id === bullet.owner_id) continue;
            if (!player.alive) continue;
            if (player.invincible) continue;

            // Team mode: skip teammates
            if (room.game_mode === "TEAM" && player.team === bullet.owner_team) continue;

            const dist = Math.hypot(bullet.x - player.x, bullet.y - player.y);
            if (dist < 16) {
                // 16px hit radius
                // Hit!
                player.health -= CONFIG.BULLET_DAMAGE;

                if (player.health <= 0) {
                    player.health = 0;
                    player.alive = false;
                    player.deaths++;

                    // Credit kill to shooter
                    const shooter = room.players.get(bullet.owner_id);
                    if (shooter) shooter.kills++;

                    // Broadcast death
                    room.io_ref.to(room.code).emit("player_died", {
                        id: player.id,
                        killer_id: bullet.owner_id,
                    });

                    // Respawn after 3 seconds
                    setTimeout(() => {
                        if (!room.players.has(player.id)) return;
                        const spawn = room.mapData.spawnPoints[Math.floor(Math.random() * room.mapData.spawnPoints.length)];
                        player.x = spawn.x;
                        player.y = spawn.y;
                        player.health = 100;
                        player.alive = true;

                        room.io_ref.to(room.code).emit("player_respawn", {
                            id: player.id,
                            x: spawn.x,
                            y: spawn.y,
                        });
                        // Remove invincibility after 3 seconds
                        setTimeout(() => {
                            if (room.players.has(player.id)) player.invincible = false;
                        }, 3000);
                    }, CONFIG.RESPAWN_DELAY);
                }

                return false; // remove bullet after hit
            }
        }

        return true; // keep bullet
    });
}

function broadcastState(io, room) {
    io.to(room.code).emit("game_state", {
        players: [...room.players.values()],
        bullets: room.bullets,
        ammo_pickups: room.mapData.ammo_pickups,
    });
}

module.exports = {startGameLoop};
