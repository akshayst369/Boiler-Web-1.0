import { useEffect, useState } from 'react';
import { auth, db } from '../firebase';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { watchLatest } from '../lib/live';
import { status } from '../lib/data';

export default function Dashboard() {
  const { profile: userInfo, scope } = useOutletContext();
  const [boilers, setBoilers] = useState([]);
  const [telemetryMap, setTelemetryMap] = useState({});
  const [overrideMap, setOverrideMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [now, setNow] = useState(Date.now);
  const navigate = useNavigate();
  const handleSignOut = () => signOut(auth).catch(error => setError(error.message));
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    let listeners = [];
    const boilerQuery = scope ? query(collection(db, 'boilers'), where(...[scope[0], '==', scope[1]])) : collection(db, 'boilers');
    const report = error => setError(`Unable to load live data: ${error.message}`);
    const unsubscribe = onSnapshot(boilerQuery, snapshot => {
      listeners.forEach(stop => stop());
      listeners = [];
      setTelemetryMap({}); setOverrideMap({}); setError('');
      const entries = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })).filter(boiler => typeof boiler.boiler_id === 'string' && boiler.boiler_id);
      setBoilers(entries); setLoading(false);
      for (const boiler of entries) {
        const id = boiler.boiler_id;
        listeners.push(watchLatest('telemetry', id, data => setTelemetryMap(map => ({ ...map, [id]: data })), report));
        listeners.push(watchLatest('override_logs', id, data => setOverrideMap(map => ({ ...map, [id]: data })), report));
      }
    }, error => { report(error); setLoading(false); });
    return () => { unsubscribe(); listeners.forEach(stop => stop()); };
  }, [scope]);
  const getStatusColor = (data, event) => status(data, event, now).color;
  const getStatusText = (data, event) => status(data, event, now).text;

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>
            Smart Boiler Monitoring And Safety Management System
          </h1>
          {userInfo && (
            <div style={{ marginTop: "10px", color: "#fcfdffff" }}>
              <div>
                <strong>User:</strong> {userInfo.name}
              </div>
              <div>
                <strong>Role:</strong> {userInfo.role}
              </div>
              {userInfo.company && (
                <div>
                  <strong>Company:</strong> {userInfo.company}
                </div>
              )}
              {userInfo.district && (
                <div>
                  <strong>District:</strong> {userInfo.district}
                </div>
              )}
            </div>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={styles.badge}>Monitoring</div>
          <button onClick={handleSignOut} style={styles.signOutButton}>
            Sign Out
          </button>
        </div>
      </header>

      {error && <p role="alert" className="error">{error}</p>}
      {loading ? (
        <div style={styles.loading}>Loading telemetry data...</div>
      ) : boilers.length === 0 ? (
        <div style={styles.empty}>No registered boilers found.</div>
      ) : (
        <div style={styles.grid}>
          {boilers.map((boiler) => {
            const telemetry = telemetryMap[boiler.boiler_id];
            const overrideEvent = overrideMap[boiler.boiler_id];

            return (
              <div
                key={boiler.id}
                style={styles.card}
                role="link"
                tabIndex={0}
                onKeyDown={(event) => { if (event.key === "Enter") navigate(`/boiler/${encodeURIComponent(boiler.boiler_id)}`); }}
                onClick={() => navigate(`/boiler/${encodeURIComponent(boiler.boiler_id)}`)}
              >
                <div style={styles.cardHeader}>
                  <div
                    style={{
                      ...styles.statusIndicator,
                      backgroundColor: getStatusColor(
                        telemetry,
                        overrideEvent
                      ),
                      boxShadow: `0 0 10px ${getStatusColor(
                        telemetry,
                        overrideEvent
                      )}`,
                    }}
                  />
                  <h3 style={styles.boilerId}>
                    ID: {boiler.boiler_id || "Unknown"}
                  </h3>
                </div>

                <div style={styles.content}>
                  <div style={styles.infoRow}>
                    <span style={styles.label}>Company:</span>
                    <span style={styles.value}>{boiler.company || "--"}</span>
                  </div>
                  <div style={styles.infoRow}>
                    <span style={styles.label}>District:</span>
                    <span style={styles.value}>{boiler.district || "--"}</span>
                  </div>
                  <div style={styles.infoRow}>
                    <span style={styles.label}>State:</span>
                    <span style={styles.value}>{boiler.state || "--"}</span>
                  </div>
                  <div style={styles.infoRow}>
                    <span style={styles.label}>Address:</span>
                    <span style={styles.value}>{boiler.address || "--"}</span>
                  </div>
                  <div style={styles.infoRow}>
                    <span style={styles.label}>Status:</span>
                    <span style={styles.value}>
                      {getStatusText(telemetry, overrideEvent)}
                    </span>
                  </div>
                </div>

                <div style={styles.telemetry}>
                  <div style={styles.stat}>
                    <span style={styles.statLabel}>Temp</span>
                    <span style={styles.statValue}>
                      {telemetry?.temperature_c ?? "--"}°C
                    </span>
                  </div>

                  <div style={styles.stat}>
                    <span style={styles.statLabel}>Pressure</span>
                    <span style={styles.statValue}>
                      {telemetry?.pressure_bar ?? "--"} bar
                    </span>
                  </div>

                  <div style={styles.stat}>
                    <span style={styles.statLabel}>Flow</span>
                    <span style={styles.statValue}>
                      {telemetry?.flow_lpm ?? "--"} L/min
                    </span>
                  </div>

                  <div style={styles.stat}>
                    <span style={styles.statLabel}>TDS</span>
                    <span style={styles.statValue}>
                      {telemetry?.tds_ppm ?? "--"} ppm
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    padding: "2rem",
    minHeight: "100vh",
    backgroundColor: "#0f172a",
    color: "#f8fafc",
    fontFamily: "'Inter', sans-serif",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "3rem",
    borderBottom: "1px solid #1e293b",
    paddingBottom: "1.5rem",
    gap: "1rem",
    flexWrap: "wrap",
  },
  title: {
    fontSize: "2rem",
    fontWeight: "800",
    background: "linear-gradient(to right, #38bdf8, #818cf8)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    margin: 0,
  },
  badge: {
    padding: "6px 12px",
    borderRadius: "20px",
    backgroundColor: "rgba(56, 189, 248, 0.1)",
    color: "#38bdf8",
    fontSize: "0.85rem",
    fontWeight: "600",
    letterSpacing: "0.05em",
    border: "1px solid rgba(56, 189, 248, 0.2)",
  },
  loading: {
    textAlign: "center",
    padding: "4rem",
    fontSize: "1.2rem",
    color: "#94a3b8",
  },
  empty: {
    textAlign: "center",
    padding: "4rem",
    background: "#1e293b",
    borderRadius: "16px",
    color: "#94a3b8",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 320px), 1fr))",
    gap: "1.5rem",
  },
  card: {
    background: "rgba(30, 41, 59, 0.7)",
    backdropFilter: "blur(12px)",
    borderRadius: "16px",
    border: "1px solid #334155",
    padding: "1.5rem",
    cursor: "pointer",
  },
  cardHeader: {
    display: "flex",
    alignItems: "center",
    marginBottom: "1.5rem",
    gap: "10px",
  },
  statusIndicator: {
    width: "10px",
    height: "10px",
    borderRadius: "50%",
  },
  boilerId: {
    margin: 0,
    fontSize: "1.2rem",
    fontWeight: "700",
    color: "#e2e8f0",
  },
  content: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  infoRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    fontSize: "0.95rem",
    gap: "1rem",
  },
  label: {
    color: "#94a3b8",
    fontWeight: "500",
  },
  value: {
    color: "#f1f5f9",
    fontWeight: "600",
    textAlign: "right",
    maxWidth: "60%",
    wordBreak: "break-word",
  },
  telemetry: {
    marginTop: "1.5rem",
    paddingTop: "1.5rem",
    borderTop: "1px solid #334155",
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: "12px",
  },
  stat: {
    background: "#0f172a",
    padding: "12px",
    borderRadius: "12px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  statLabel: {
    fontSize: "0.75rem",
    color: "#64748b",
    textTransform: "uppercase",
    marginBottom: "4px",
  },
  statValue: {
    fontSize: "1.1rem",
    fontWeight: "700",
    color: "#38bdf8",
  },
  signOutButton: {
    padding: "6px 12px",
    borderRadius: "20px",
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    color: "#ef4444",
    fontSize: "0.85rem",
    fontWeight: "600",
    letterSpacing: "0.05em",
    border: "1px solid rgba(239, 68, 68, 0.2)",
    cursor: "pointer",
  },
};