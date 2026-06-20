const prisma = require("../db");
const {generateMap} = require("../game/mapGenerator");
const {startGameLoop} = require("../game/gameLoop");

module.exports = (socket, io, rooms) => {
    // Switch team
    socket.on("switch_team", () => {
        const room = rooms.get(socket.currentRoom);
        if (!room || room.game_mode !== "TEAM") return;

        const player = room.players.get(socket.id);
        if (!player) return;

        // Check if switching would leave a team empty
        const currentTeam = player.team;
        const currentTeamCount = [...room.players.values()].filter((p) => p.team === currentTeam).length;

        if (currentTeamCount <= 1) {
            socket.emit("error", {message: "Cannot leave team empty"});
            return;
        }

        player.team = currentTeam === "RED" ? "BLUE" : "RED";
        room.players.set(socket.id, player);

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
    });

    // Start game (creator only)
    socket.on("start_game", async () => {
        const room = rooms.get(socket.currentRoom);
        if (!room) return;
        if (room.creator_id !== socket.id) {
            socket.emit("error", {message: "Only the creator can start the game"});
            return;
        }
        if (room.players.size < 2) {
            socket.emit("error", {message: "Need at least 2 players to start"});
            return;
        }

        // Determine map type based on player count
        room.map_type = room.players.size <= 8 ? "SMALL" : "LARGE";

        // Generate map
        const mapData = generateMap(room.map_type);
        room.mapData = mapData;

        // Set spawn positions
        const spawnPoints = mapData.spawnPoints;
        let spawnIndex = 0;
        room.players.forEach((player) => {
            const spawn = spawnPoints[spawnIndex % spawnPoints.length];
            player.x = spawn.x;
            player.y = spawn.y;
            spawnIndex++;
        });

        // Create match in DB
        let match;
        try {
            match = await prisma.match.create({
                data: {
                    room_code: room.code,
                    game_mode: room.game_mode,
                    map_type: room.map_type,
                    status: "IN_PROGRESS",
                    max_players: room.max_players,
                    time_limit: room.time_limit,
                    is_public: room.is_public,
                    started_at: new Date(),
                },
            });
        } catch (err) {
            socket.emit("error", {message: "Failed to create match. Try again."});
            return;
        }

        // Create stat entries for each player
        for (const player of room.players.values()) {
            if (!player.is_guest) {
                await prisma.stat.create({
                    data: {
                        match_id: match.id,
                        user_id: player.user_id,
                        team: player.team,
                    },
                });
            }
        }

        room.match_id = match.id;
        room.status = "IN_PROGRESS";
        room.started_at = Date.now();

        // Tell all clients match started
        io.to(room.code).emit("match_started", {
            players: [...room.players.values()],
            mapData,
            game_mode: room.game_mode,
            time_limit: room.time_limit,
        });
        room.io_ref = io;
        startGameLoop(io, room);

        // Start match timer
        room.timer = setTimeout(() => endMatch(io, rooms, room.code), room.time_limit * 1000);
    });
};

async function endMatch(io, rooms, code) {
    const room = rooms.get(code);
    if (!room) return;

    room.status = "FINISHED";
    clearTimeout(room.timer);

    let winner = null;

    if (room.game_mode === "FFA") {
        // Player with most kills wins
        let topPlayer = null;
        room.players.forEach((player) => {
            if (!topPlayer || player.kills > topPlayer.kills) topPlayer = player;
        });
        winner = topPlayer?.username;
    } else {
        // Team with most kills wins
        let redKills = 0,
            blueKills = 0;
        room.players.forEach((player) => {
            if (player.team === "RED") redKills += player.kills;
            else blueKills += player.kills;
        });
        winner = redKills >= blueKills ? "RED" : "BLUE";
    }

    // Update DB
    await prisma.match.update({
        where: {id: room.match_id},
        data: {
            status: "FINISHED",
            ended_at: new Date(),
            winner_team: room.game_mode === "TEAM" ? winner : null,
        },
    });

    // Update stats for each player
    for (const player of room.players.values()) {
        if (!player.is_guest) {
            const won = room.game_mode === "FFA" ? player.username === winner : player.team === winner;

            await prisma.stat.updateMany({
                where: {match_id: room.match_id, user_id: player.user_id},
                data: {kills: player.kills, deaths: player.deaths, won},
            });
        }
    }

    io.to(code).emit("match_end", {winner, players: [...room.players.values()]});
    rooms.delete(code);
}

module.exports.endMatch = endMatch;
