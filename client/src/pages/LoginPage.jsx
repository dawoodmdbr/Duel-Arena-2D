import { useGoogleLogin } from '@react-oauth/google'
import { useNavigate } from 'react-router-dom'

function LoginPage() {
  const navigate = useNavigate()

  const handleGoogleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      // Send Google access token to our backend
      const res = await fetch(`${import.meta.env.VITE_SERVER_URL}/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: tokenResponse.access_token })
      })
      const data = await res.json()
      if (data.token) {
        localStorage.setItem('token', data.token)
        localStorage.setItem('user', JSON.stringify(data.user))
        window.location.href = '/home'
      }
    },
    onError: () => console.error('Google login failed')
  })

  const handleGuestLogin = async () => {
    const res = await fetch(`${import.meta.env.VITE_SERVER_URL}/auth/guest`, {
      method: 'POST'
    })
    const data = await res.json()
    if (data.token) {
      localStorage.setItem('token', data.token)
      localStorage.setItem('user', JSON.stringify(data.user))
      window.location.href = '/home'
    }
  }

  return (
    <div className="login-page">
        <h1>Duel Arena 2D</h1>
        <p>Top-down multiplayer battle arena</p>
        <div className="login-buttons">
            <button onClick={()=> handleGoogleLogin()}>
                Sign in with Google
            </button>
            <button onClick={handleGuestLogin}>
                Play as Guest
            </button>
        </div>
    </div>
  )
}

export default LoginPage