const {CONFIG} = require("../game/mapGenerator");

function isColliding(x, y, grid, tileSize, radius = 12) {
    const points = [
        {x: x - radius, y: y - radius},
        {x: x + radius, y: y - radius},
        {x: x - radius, y: y + radius},
        {x: x + radius, y: y + radius},
    ];
    return points.some((p) => {
        const col = Math.floor(p.x / tileSize);
        const row = Math.floor(p.y / tileSize);
        if (row < 0 || row >= grid.length || col < 0 || col >= grid[0].length) return true;
        return grid[row][col] === 1;
    });
}

module.exports = (socket, io, rooms) => {
    // Player movement
    socket.on("player_move", ({x, y}) => {
        const room = rooms.get(socket.currentRoom);
        if (!room || room.status !== "IN_PROGRESS") return;

        const player = room.players.get(socket.id);
        if (!player || !player.alive) return;

        const {grid, tileSize} = room.mapData;

        // Wall collision check
        if (isColliding(x, y, grid, tileSize)) return;

        const maxMove = (CONFIG.PLAYER_SPEED / 60) * 5;
        const dx = Math.abs(x - player.x);
        const dy = Math.abs(y - player.y);
        if (dx > maxMove || dy > maxMove) return;

        // Try full movement
        if (!isColliding(x, y, grid, tileSize)) {
            player.x = x;
            player.y = y;
            return;
        }

        // Slide horizontally
        if (!isColliding(x, player.y, grid, tileSize)) {
            player.x = x;
            return;
        }

        // Slide vertically
        if (!isColliding(player.x, y, grid, tileSize)) {
            player.y = y;
            return;
        }
    });

    // Player shoots
    socket.on("player_shoot", ({dirX, dirY}) => {
        const room = rooms.get(socket.currentRoom);
        if (!room || room.status !== "IN_PROGRESS") return;

        const player = room.players.get(socket.id);
        if (!player || !player.alive) return;
        if (player.ammo <= 0) return;

        player.ammo--;

        const bullet = {
            id: `${socket.id}_${Date.now()}`,
            owner_id: socket.id,
            owner_team: player.team,
            x: player.x,
            y: player.y,
            dirX,
            dirY,
            speed: CONFIG.BULLET_SPEED,
        };

        room.bullets.push(bullet);
    });

    // Pickup ammo
    socket.on("pickup_ammo", ({ammo_id}) => {
        const room = rooms.get(socket.currentRoom);
        if (!room || room.status !== "IN_PROGRESS") return;

        const player = room.players.get(socket.id);
        if (!player || !player.alive) return;

        const pickup = room.mapData.ammo_pickups.find((a) => a.id === ammo_id && a.active);
        if (!pickup) return;

        player.ammo += pickup.amount;
        pickup.active = false;

        // Respawn ammo pack at new random location after 10 seconds
        setTimeout(() => {
            const {grid, tileSize, cols, rows} = room.mapData;
            let placed = false;
            while (!placed) {
                const r = Math.floor(Math.random() * (rows - 2)) + 1;
                const c = Math.floor(Math.random() * (cols - 2)) + 1;
                if (grid[r][c] === 0) {
                    pickup.x = c * tileSize;
                    pickup.y = r * tileSize;
                    pickup.active = true;
                    placed = true;
                }
            }
            io.to(room.code).emit("ammo_spawned", pickup);
        }, 10000);
    });

    // Handle disconnect mid-game
    socket.on("disconnect", () => {
        const room = rooms.get(socket.currentRoom);
        if (!room) return;

        room.players.delete(socket.id);
        io.to(socket.currentRoom).emit("player_left", {id: socket.id});

        if (room.players.size === 0) {
            clearTimeout(room.timer);
            rooms.delete(socket.currentRoom);
            return;
        }

        // Transfer creator to next player
        if (room.creator_id === socket.id) {
            const nextPlayer = [...room.players.values()][0];
            room.creator_id = nextPlayer.id;
            io.to(socket.currentRoom).emit("room_updated", {
                players: [...room.players.values()],
                room: {
                    code: room.code,
                    game_mode: room.game_mode,
                    map_type: room.map_type,
                    max_players: room.max_players,
                    time_limit: room.time_limit,
                    creator_id: room.creator_id,
                },
            });
        }
    });
};
