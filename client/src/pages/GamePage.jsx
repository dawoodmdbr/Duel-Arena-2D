import {useEffect, useReducer, useRef, useState} from "react";
import {useNavigate, useLocation} from "react-router-dom";
import Phaser from "phaser";
import socket from "../socket/socket";
import GameScene from "../game/scenes/GameScene";

function GamePage() {
    const gameRef = useRef(null);
    const phaserRef = useRef(null);
    const pendingMatchData = useRef(null);
    const navigate = useNavigate();
    const location = useLocation();

    const [respawnCount, setRespawnCount] = useState(null);
    const [errorMsg, setErrorMsg] = useState(null);
    const [roomInfo, setRoomInfo] = useState(null);
    const [players, setPlayers] = useState([]);
    const [myPlayer, setMyPlayer] = useState(null);
    const [timeLeft, setTimeLeft] = useState(null);
    const [matchResult, setMatchResult] = useState(null);
    const [showScoreboard, setShowScoreboard] = useState(false);
    const [isCreator, setIsCreator] = useState(false);
    const [gameStarted, setGameStarted] = useState(false);

    const user = JSON.parse(localStorage.getItem("user"));

    useEffect(() => {
        socket.on("error", (err) => {
            setErrorMsg(err.message);
            setTimeout(() => setErrorMsg(null), 3000); // auto-dismiss after 3 seconds
        });

        if (location.state) {
            const data = location.state;
            setRoomInfo(data.room);
            setPlayers(data.players || []);
            setIsCreator(data.room?.creator_id === socket.id);
            const me = (data.players || []).find((p) => p.id === socket.id);
            setMyPlayer(me);
        }

        // Socket events
        socket.on("room_updated", (data) => {
            setRoomInfo(data.room);
            setPlayers([...data.players]);
            setIsCreator(data.room.creator_id === socket.id);
            const me = data.players.find((p) => p.id === socket.id);
            setMyPlayer(me);
        });

        socket.on("match_started", (data) => {
            pendingMatchData.current = data;
            setGameStarted(true);
            setTimeLeft(data.time_limit);

            const interval = setInterval(() => {
                setTimeLeft((prev) => {
                    if (prev <= 1) {
                        clearInterval(interval);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        });

        socket.on("player_died", (data) => {
            if (data.id === socket.id) {
                setRespawnCount(3);
                const interval = setInterval(() => {
                    setRespawnCount((prev) => {
                        if (prev <= 1) {
                            clearInterval(interval);
                            return null;
                        }
                        return prev - 1;
                    });
                }, 1000);
            }
        });

        socket.on("player_respawn", (data) => {
            if (data.id === socket.id) setRespawnCount(null);
        });

        socket.on("game_state", (data) => {
            const me = data.players.find((p) => p.id === socket.id);
            setMyPlayer(me);
            setPlayers(data.players);

            // Pass to phaser scene
            if (phaserRef.current) {
                const scene = phaserRef.current.scene.getScene("GameScene");
                if (scene) scene.updateState(data);
            }
        });

        socket.on("match_end", (data) => {
            setMatchResult(data);
            if (phaserRef.current) phaserRef.current.destroy(true);
        });

        // Keyboard scoreboard toggle
        const handleKey = (e) => {
            if (e.key === "Tab") {
                e.preventDefault();
                setShowScoreboard((prev) => !prev);
            }
        };
        window.addEventListener("keydown", handleKey);

        return () => {
            socket.off("error");
            socket.off("room_updated");
            socket.off("match_started");
            socket.off("game_state");
            socket.off("match_end");
            window.removeEventListener("keydown", handleKey);
            if (phaserRef.current) phaserRef.current.destroy(true);
        };
    }, []);

    useEffect(() => {
        if (!gameStarted || !gameRef.current || !pendingMatchData.current) return;

        const data = pendingMatchData.current;

        const config = {
            type: Phaser.AUTO,
            width: window.innerWidth,
            height: window.innerHeight - 100,
            parent: gameRef.current,
            backgroundColor: "#1a1a2e",
            scene: [],
        };

        phaserRef.current = new Phaser.Game(config);

        phaserRef.current.events.once("ready", () => {
            phaserRef.current.scene.add("GameScene", GameScene, true, {
                matchData: data,
                socket,
            });
        });
    }, [gameStarted]);

    const handleSwitchTeam = () => socket.emit("switch_team");
    const handleStartGame = () => socket.emit("start_game");

    const formatTime = (s) => {
        const m = Math.floor(s / 60);
        const sec = s % 60;
        return `${m}:${sec.toString().padStart(2, "0")}`;
    };

    const handleLeave = () => {
        if (phaserRef.current) phaserRef.current.destroy(true);
        socket.disconnect();
        window.location.href = "/home";
    };

    // LOBBY VIEW
    if (!gameStarted) {
        return (
            <div className='lobby-page'>
                {errorMsg && (
                    <div
                        style={{
                            position: "fixed",
                            top: "20px",
                            left: "50%",
                            transform: "translateX(-50%)",
                            background: "#ff4444",
                            color: "#fff",
                            padding: "12px 24px",
                            zIndex: 999,
                            fontFamily: "Courier New",
                            fontSize: "14px",
                        }}>
                        ⚠ {errorMsg}
                    </div>
                )}
                <h2>Lobby — {roomInfo?.code}</h2>
                <p>
                    Mode: {roomInfo?.game_mode} | Map: {roomInfo?.map_type}
                </p>

                <div className='player-list'>
                    {players.map((p) => (
                        <div key={p.id} className={`player-entry ${p.team?.toLowerCase()}`}>
                            <span>{p.username}</span>
                            {roomInfo?.game_mode === "TEAM" && (
                                <span className={`team-badge ${p.team?.toLowerCase()}`}>{p.team}</span>
                            )}
                            {p.id === roomInfo?.creator_id && <span>👑</span>}
                        </div>
                    ))}
                </div>

                <div className='lobby-actions'>
                    {roomInfo?.game_mode === "TEAM" && <button onClick={handleSwitchTeam}>Switch Team</button>}
                    {isCreator && <button onClick={handleStartGame}>Start Game</button>}
                    <button onClick={handleLeave}>Leave</button>
                </div>
            </div>
        );
    }

    // GAME VIEW
    return (
        <div className='game-page'>
            {errorMsg && (
                <div
                    style={{
                        position: "fixed",
                        top: "20px",
                        left: "50%",
                        transform: "translateX(-50%)",
                        background: "#ff4444",
                        color: "#fff",
                        padding: "12px 24px",
                        zIndex: 999,
                        fontFamily: "Courier New",
                        fontSize: "14px",
                    }}>
                    ⚠ {errorMsg}
                </div>
            )}

            {respawnCount !== null && (
                <div
                    style={{
                        position: "fixed",
                        inset: 0,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        background: "rgba(0,0,0,0.6)",
                        pointerEvents: "none",
                        zIndex: 50,
                    }}>
                    <h2 style={{color: "#ff4444", fontSize: "36px"}}>You Died</h2>
                    <p style={{color: "#ffffff", fontSize: "20px", marginTop: "12px"}}>
                        Respawning in <span style={{color: "#ffdd00", fontWeight: "bold"}}>{respawnCount}</span>
                    </p>
                </div>
            )}

            {/* Top bar */}
            <div className='game-top-bar'>
                <span>Room: {roomInfo?.code}</span>
                <span className='timer'>{timeLeft !== null ? formatTime(timeLeft) : ""}</span>
                <div style={{display: "flex", gap: "12px", alignItems: "center"}}>
                    <span style={{color: "#888", fontSize: "13px"}}>Tab: Scoreboard</span>
                    <button onClick={handleLeave} style={{padding: "4px 12px", fontSize: "12px"}}>
                        Leave
                    </button>
                </div>
            </div>

            {/* Phaser canvas */}
            <div ref={gameRef} className='game-canvas' />

            {/* Bottom HUD */}
            {myPlayer && (
                <div className='game-hud'>
                    <div className='hud-health'>
                        <span>❤ {myPlayer.health}/100</span>
                        <div className='health-bar'>
                            <div className='health-fill' style={{width: `${myPlayer.health}%`}} />
                        </div>
                    </div>
                    <div className='hud-stats'>
                        <span>🔫 {myPlayer.ammo} ammo</span>
                        <span>☠ {myPlayer.kills} kills</span>
                        <span>💀 {myPlayer.deaths} deaths</span>
                    </div>
                </div>
            )}

            {/* Scoreboard overlay */}
            {showScoreboard && (
                <div className='scoreboard-overlay'>
                    <h3>Scoreboard</h3>
                    <table>
                        <thead>
                            <tr>
                                <th>Player</th>
                                <th>Kills</th>
                                <th>Deaths</th>
                                {roomInfo?.game_mode === "TEAM" && <th>Team</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {[...players]
                                .sort((a, b) => b.kills - a.kills)
                                .map((p) => (
                                    <tr key={p.id}>
                                        <td>{p.username}</td>
                                        <td>{p.kills}</td>
                                        <td>{p.deaths}</td>
                                        {roomInfo?.game_mode === "TEAM" && <td>{p.team}</td>}
                                    </tr>
                                ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Match result overlay */}
            {matchResult && (
                <div className='modal-overlay'>
                    <div className='modal'>
                        <h2>Match Over</h2>
                        <p>Winner: {matchResult.winner}</p>
                        <table>
                            <thead>
                                <tr>
                                    <th>Player</th>
                                    <th>Kills</th>
                                    <th>Deaths</th>
                                </tr>
                            </thead>
                            <tbody>
                                {matchResult.players
                                    .sort((a, b) => b.kills - a.kills)
                                    .map((p) => (
                                        <tr key={p.id}>
                                            <td>{p.username}</td>
                                            <td>{p.kills}</td>
                                            <td>{p.deaths}</td>
                                        </tr>
                                    ))}
                            </tbody>
                        </table>
                        <button onClick={handleLeave}>Back to Menu</button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default GamePage;
