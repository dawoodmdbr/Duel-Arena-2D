import {useGoogleLogin} from "@react-oauth/google";
import {useNavigate} from "react-router-dom";
import {useState} from "react";

function LoginPage() {
    const navigate = useNavigate();

    const [showUsernameModal, setShowUsernameModal] = useState(false);
    const [pendingUsername, setPendingUsername] = useState("");
    const [pendingToken, setPendingToken] = useState("");
    const [usernameError, setUsernameError] = useState("");

    const handleGoogleLogin = useGoogleLogin({
        onSuccess: async (tokenResponse) => {
            // Send Google access token to our backend
            const res = await fetch(`${import.meta.env.VITE_SERVER_URL}/auth/google`, {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({token: tokenResponse.access_token}),
            });
            const data = await res.json();
            if (data.token) {
                localStorage.setItem("token", data.token);
                localStorage.setItem("user", JSON.stringify(data.user));
                if (data.isNew) {
                    setPendingToken(data.token);
                    setPendingUsername(data.user.username);
                    setShowUsernameModal(true);
                } else {
                    window.location.href = "/home";
                }
            }
        },
        onError: () => console.error("Google login failed"),
    });

    const handleUsernameSubmit = async () => {
        if (!pendingUsername.trim()) return;
        const res = await fetch(`${import.meta.env.VITE_SERVER_URL}/auth/username`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${pendingToken}`,
            },
            body: JSON.stringify({username: pendingUsername.trim()}),
        });
        const data = await res.json();
        if (res.ok) {
            localStorage.setItem("token", data.token);
            localStorage.setItem("user", JSON.stringify(data.user));
            window.location.href = "/home";
        } else {
            setUsernameError(data.error);
        }
    };

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
                <button onClick={() => handleGoogleLogin()}>Sign in with Google</button>
                <button onClick={handleGuestLogin}>Play as Guest</button>
            </div>
            {showUsernameModal && (
                <div className='modal-overlay'>
                    <div className='modal'>
                        <h2>Choose your username</h2>
                        <p style={{color: "#888", fontSize: "13px"}}>This is how other players will see you</p>
                        <input
                            value={pendingUsername}
                            onChange={(e) => {
                                setPendingUsername(e.target.value);
                                setUsernameError("");
                            }}
                            placeholder='Username'
                            maxLength={20}
                        />
                        {usernameError && <p style={{color: "#ff4444", fontSize: "13px"}}>{usernameError}</p>}
                        <button onClick={handleUsernameSubmit}>Continue →</button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default LoginPage;
