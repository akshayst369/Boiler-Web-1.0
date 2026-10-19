import { useEffect, useState } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { Navigate, Outlet } from 'react-router-dom';
import { auth, db } from '../firebase';
import { scopeFor } from './data';

export default function Session() {
  const [session, setSession] = useState({ loading: true });
  useEffect(() => {
    let generation = 0;
    let active = true;
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      const current = ++generation;
      if (!user) { setSession({ loading: false, user: null }); return; }
      setSession({ loading: true });
      try {
        const snapshot = await getDoc(doc(db, 'users', user.uid));
        if (!snapshot.exists()) throw new Error('Your account needs a user profile linked to its login. Contact your administrator.');
        const profile = snapshot.data();
        const scope = scopeFor(profile);
        if (active && current === generation) setSession({ user, profile, scope, loading: false });
      } catch (error) {
        if (active && current === generation) setSession({ user, error: error.message, loading: false });
      }
    });
    return () => { active = false; generation++; unsubscribe(); };
  }, []);
  if (session.loading) return <main className="message">Loading your account…</main>;
  if (!session.user) return <Navigate to="/" replace />;
  if (session.error) return <main className="message"><h1>Account unavailable</h1><p role="alert">{session.error}</p><button onClick={() => window.location.reload()}>Retry</button> <button onClick={() => signOut(auth).catch(() => window.location.reload())}>Sign out</button></main>;
  return <Outlet context={session} />;
}
