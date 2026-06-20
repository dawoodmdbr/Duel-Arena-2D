import {useState} from "react";
import {useNavigate} from "react-router-dom";
import socket from "../socket/socket";

function HomePage() {
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem("user"));

    const [showRoomModal, setShowRoomModal] = useState(false);
    const [activeTab, setActiveTab] = useState("join"); // 'join' or 'create'
    const [roomCode, setRoomCode] = useState("");
    const [matchmakingStatus, setMatchmakingStatus] = useState(null); // null | 'searching' | 'in_progress'
    const [remainingTime, setRemainingTime] = useState(null);

    const [roomConfig, setRoomConfig] = useState({
        game_mode: "FFA",
        max_players: 8,
        time_limit: 180,
    });

    const handlePlay = () => {
        socket.auth = {token: localStorage.getItem("token")};
        socket.connect();
        setMatchmakingStatus("searching");
        socket.emit("find_match");

        socket.on("matchmaking_status", (data) => {
            if (data.status === "in_progress") {
                setMatchmakingStatus("in_progress");
                setRemainingTime(data.remaining);
                const interval = setInterval(() => {
                    setRemainingTime((prev) => {
                        if (prev <= 1) {
                            clearInterval(interval);
                            socket.emit("find_match");
                            return 0;
                        }
                        return prev - 1;
                    });
                }, 1000);
            }
            if (data.status === "cancelled") {
                setMatchmakingStatus(null);
                socket.disconnect();
            }
        });

        socket.once("room_updated", (data) => {
            socket.off("matchmaking_status");
            navigate("/game", {state: data});
        });
    };

    const handleJoinRoom = () => {
        socket.auth = {token: localStorage.getItem("token")};
        socket.connect();
        socket.emit("join_room", {code: roomCode.toUpperCase()});

        socket.on("error", (err) => alert(err.message));
        socket.once("room_updated", (data) => {
            socket.off("error");
            navigate("/game", {state: data});
        });
    };

    const handleCreateRoom = () => {
        socket.auth = {token: localStorage.getItem("token")};
        socket.connect();

        let latestRoomData = null;

        const onRoomUpdated = (data) => {
            latestRoomData = data;
        };
        const onRoomCreated = () => {
            socket.off("room_updated", onRoomUpdated);
            socket.off("room_created", onRoomCreated);
            navigate("/game", {state: latestRoomData});
        };

        socket.on("room_updated", onRoomUpdated);
        socket.on("room_created", onRoomCreated);
        socket.emit("create_room", roomConfig);
    };

    const handleCancelMatchmaking = () => {
        socket.emit("cancel_matchmaking");
        socket.disconnect();
        setMatchmakingStatus(null);
        setRemainingTime(null);
    };

    const handleLogout = () => {
        localStorage.clear();
        window.location.href = "/";
    };

    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, "0")}`;
    };

    return (
        <div className='home-page'>
            {/* Top bar */}
            <div className='top-bar'>
                <span>Welcome, {user?.username}</span>
                <button onClick={handleLogout}>Logout</button>
            </div>

            {/* Main buttons */}
            <div className='main-menu'>
                <h1>Duel Arena 2D</h1>
                <button onClick={handlePlay}>Play</button>
                <button onClick={() => setShowRoomModal(true)}>Create / Join Room</button>
                <button onClick={() => navigate('/leaderboard')}>Leaderboard</button>
            </div>

            {/* Matchmaking popup */}
            {matchmakingStatus && (
                <div className='modal-overlay'>
                    <div className='modal'>
                        {matchmakingStatus === "searching" && (
                            <>
                                <h2>Finding Match...</h2>
                                <p>Searching for available rooms</p>
                            </>
                        )}
                        {matchmakingStatus === "in_progress" && (
                            <>
                                <h2>Match In Progress</h2>
                                <p>Current match ends in:</p>
                                <h3>{formatTime(remainingTime)}</h3>
                                <p>You will be placed automatically when it ends.</p>
                            </>
                        )}
                        <button onClick={handleCancelMatchmaking}>Cancel</button>
                    </div>
                </div>
            )}

            {/* Room modal */}
            {showRoomModal && (
                <div className='modal-overlay'>
                    <div className='modal'>
                        <div className='tabs'>
                            <button onClick={() => setActiveTab("join")}>Join Room</button>
                            <button onClick={() => setActiveTab("create")}>Create Room</button>
                        </div>

                        {activeTab === "join" && (
                            <div>
                                <input
                                    placeholder='Enter Room Code'
                                    value={roomCode}
                                    onChange={(e) => setRoomCode(e.target.value)}
                                />
                                <button onClick={handleJoinRoom}>Join</button>
                            </div>
                        )}

                        {activeTab === "create" && (
                            <div>
                                <label>Game Mode</label>
                                <select
                                    value={roomConfig.game_mode}
                                    onChange={(e) => setRoomConfig({...roomConfig, game_mode: e.target.value})}>
                                    <option value='FFA'>Free For All</option>
                                    <option value='TEAM'>Team Mode</option>
                                </select>

                                <label>Max Players</label>
                                <input
                                    type='number'
                                    min={2}
                                    max={16}
                                    value={roomConfig.max_players}
                                    onChange={(e) => setRoomConfig({...roomConfig, max_players: +e.target.value})}
                                />

                                <label>Time Limit (seconds)</label>
                                <input
                                    type='number'
                                    min={60}
                                    max={600}
                                    value={roomConfig.time_limit}
                                    onChange={(e) => setRoomConfig({...roomConfig, time_limit: +e.target.value})}
                                />

                                <button onClick={handleCreateRoom}>Create Room</button>
                            </div>
                        )}

                        <button onClick={() => setShowRoomModal(false)}>Close</button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default HomePage;
