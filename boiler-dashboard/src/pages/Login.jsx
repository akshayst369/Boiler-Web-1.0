import { useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';
import { useNavigate } from 'react-router-dom';
export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  useEffect(() => onAuthStateChanged(auth, user => { if (user) navigate('/dashboard', { replace: true }); }), [navigate]);
  const handleLogin = async event => {
    event.preventDefault(); setLoading(true); setError('');
    try { await signInWithEmailAndPassword(auth, email.trim(), password); }
    catch (error) {
      setError(error.code === 'auth/network-request-failed' ? 'Unable to connect. Check your connection and try again.' : error.code === 'auth/too-many-requests' ? 'Too many attempts. Please try again later.' : 'Unable to sign in. Check your email and password, or contact your administrator.');
    } finally { setLoading(false); }
  };
  return <main className="login-card"><p className="eyebrow">SMART BOILER</p><h1>Monitoring & Safety</h1><p>Sign in to view your boilers and live readings.</p>
    <form onSubmit={handleLogin}>
      <label htmlFor="email">Email</label><input id="email" type="email" autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} required disabled={loading} />
      <label htmlFor="password">Password</label><input id="password" type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} required disabled={loading} />
      {error && <p role="alert" className="error">{error}</p>}
      <button type="submit" disabled={loading}>{loading ? 'Signing in…' : 'Sign in'}</button>
    </form>
  </main>;
}
