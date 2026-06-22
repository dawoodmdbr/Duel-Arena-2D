import {useState} from "react";
import {Sounds} from "../game/sound";

function LoginPage() {
    const [showUsernameModal, setShowUsernameModal] = useState(false);
    const [pendingUsername, setPendingUsername] = useState("");
    const [pendingToken, setPendingToken] = useState("");
    const [usernameError, setUsernameError] = useState("");

    const handleGuestLogin = async () => {
        const res = await fetch(`${import.meta.env.VITE_SERVER_URL}/auth/guest`, {
            method: "POST",
        });
        const data = await res.json();
        if (data.token) {
            localStorage.setItem("token", data.token);
            localStorage.setItem("user", JSON.stringify(data.user));
            window.location.href = "/home";
        }
    };

    return (
        <div className='login-page'>
            <h1>Duel Arena 2D</h1>
            <p>Top-down multiplayer battle arena</p>
            <div className='login-buttons'>
                <button
                    onClick={() => {
                        Sounds.click();
                        handleGuestLogin();
                    }}>
                    Play as Guest
                </button>
            </div>
        </div>
    );
}

export default LoginPage;
