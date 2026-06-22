const express = require("express");
const http = require("http");
const {Server} = require("socket.io");
const cors = require("cors");
require("dotenv").config();

const app = express();
const server = http.createServer(app);
// Source - https://stackoverflow.com/a/65918792
// Posted by Rohit M
// Retrieved 2026-06-22, License - CC BY-SA 4.0

const io = require('socket.io')(server, {
    cors: {
        origin: process.env.CLIENT_URL,
        methods: ["GET", "POST"],
        transports: ['websocket', 'polling'],
        credentials: true
    },
    allowEIO3: true
});


app.use(
    cors({
        origin: process.env.CLIENT_URL,
    }),
);
app.use(express.json());

const authRoutes = require("./routes/auth");
app.use("/auth", authRoutes);

const leaderboardRoutes = require("./routes/leaderboard");
app.use("/leaderboard", leaderboardRoutes);

app.get("/", (req, res) => {
    res.send("Duel Arena 2D Server Running");
});

const initSocket = require("./socket/index");
initSocket(io);

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
