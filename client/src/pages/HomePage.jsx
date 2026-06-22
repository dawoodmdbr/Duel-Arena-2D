import {useState, useEffect} from "react";
import {useNavigate} from "react-router-dom";
import socket from "../socket/socket";
import {Sounds} from "../game/sound";

const KONAMI = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];

const LinkedInIcon = () => (
    <svg viewBox='0 0 24 24' fill='currentColor' width='22' height='22'>
        <path d='M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z' />
    </svg>
);

const GitHubIcon = () => (
    <svg viewBox='0 0 24 24' fill='currentColor' width='22' height='22'>
        <path d='M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z' />
    </svg>
);

const InstagramIcon = () => (
    <svg viewBox='0 0 24 24' fill='currentColor' width='22' height='22'>
        <path d='M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z' />
    </svg>
);

function HomePage() {
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem("user"));

    const [easterEgg, setEasterEgg] = useState(false);
    const [konamiProgress, setKonamiProgress] = useState(0);
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

    useEffect(() => {
        const handleKey = (e) => {
            setKonamiProgress((prev) => {
                if (e.key === KONAMI[prev]) {
                    const next = prev + 1;
                    if (next === KONAMI.length) {
                        setEasterEgg(true);
                        return 0;
                    }
                    return next;
                }
                return e.key === KONAMI[0] ? 1 : 0;
            });
        };
        window.addEventListener("keydown", handleKey);
        return () => window.removeEventListener("keydown", handleKey);
    }, []);

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
                <button
                    onClick={() => {
                        Sounds.click();
                        handleLogout();
                    }}>
                    Logout
                </button>
            </div>

            {/* Main buttons */}
            <div className='main-menu'>
                <h1>Duel Arena 2D</h1>
                <button
                    onClick={() => {
                        Sounds.click();
                        handlePlay();
                    }}>
                    Play
                </button>
                <button
                    onClick={() => {
                        Sounds.click();
                        setShowRoomModal(true);
                    }}>
                    Create / Join Room
                </button>
                <button
                    onClick={() => {
                        Sounds.click();
                        navigate("/leaderboard");
                    }}>
                    Leaderboard
                </button>
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
                        <button
                            onClick={() => {
                                Sounds.click();
                                handleCancelMatchmaking();
                            }}>
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* Room modal */}
            {showRoomModal && (
                <div className='modal-overlay'>
                    <div className='modal'>
                        <div className='tabs'>
                            <button
                                onClick={() => {
                                    Sounds.click();
                                    setActiveTab("join");
                                }}>
                                Join Room
                            </button>
                            <button
                                onClick={() => {
                                    Sounds.click();
                                    setActiveTab("create");
                                }}>
                                Create Room
                            </button>
                        </div>

                        {activeTab === "join" && (
                            <div>
                                <input
                                    placeholder='Enter Room Code'
                                    value={roomCode}
                                    onChange={(e) => setRoomCode(e.target.value)}
                                />
                                <button
                                    onClick={() => {
                                        Sounds.click();
                                        handleJoinRoom();
                                    }}>
                                    Join
                                </button>
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
                                <button
                                    onClick={() => {
                                        Sounds.click();
                                        handleCreateRoom();
                                    }}>
                                    Create Room
                                </button>
                            </div>
                        )}
                        <button
                            onClick={() => {
                                Sounds.click();
                                setShowRoomModal(false);
                            }}>
                            Close
                        </button>
                    </div>
                </div>
            )}

            {/* Easter egg */}
            {easterEgg && (
                <div className='modal-overlay'>
                    <div className='modal' style={{textAlign: "center"}}>
                        <h2 style={{color: "#ffdd00"}}>👾 CHEAT CODE ACTIVATED</h2>
                        <p style={{color: "#00ff88"}}>↑↑↓↓←→←→BA</p>
                        <p style={{color: "#ccc", fontSize: "13px", lineHeight: "1.8"}}>
                            Wow. You actually did it.
                            <br />
                            Unfortunately there are no free wins here.
                            <br />
                            But respect for knowing the Konami Code. 🫡
                            <br />
                            <br />
                            <span style={{color: "#888"}}>— Mian Dawood, Creator</span>
                        </p>
                        <button
                            onClick={() => {
                                Sounds.click();
                                setEasterEgg(false);
                            }}>
                            ok fine whatever
                        </button>
                    </div>
                </div>
            )}

            {/* Footer */}
            <footer className='home-footer'>
                <p className='footer-credit'>
                    Designed & built by <span className='footer-name'>Mian Dawood bin Rafay</span>
                </p>
                <div className='footer-socials'>
                    <a
                        href='https://www.linkedin.com/in/dawoodmdbr/'
                        target='_blank'
                        rel='noreferrer'
                        className='social-link'
                        title='LinkedIn'>
                        <LinkedInIcon />
                    </a>
                    <a
                        href='https://github.com/dawoodmdbr'
                        target='_blank'
                        rel='noreferrer'
                        className='social-link'
                        title='GitHub'>
                        <GitHubIcon />
                    </a>
                    <a
                        href='https://instagram.com/dawood.mdbr'
                        target='_blank'
                        rel='noreferrer'
                        className='social-link'
                        title='Instagram'>
                        <InstagramIcon />
                    </a>
                </div>
                <p className='footer-copy'>© {new Date().getFullYear()} Duel Arena 2D. All rights reserved.</p>
            </footer>
        </div>
    );
}

export default HomePage;
