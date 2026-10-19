import { useEffect, useState } from 'react';
import { useParams, useNavigate, useOutletContext } from 'react-router-dom';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { watchLatest } from '../lib/live';
import { status, overrideValue, formatTime } from '../lib/data';

export default function BoilerDetail() {
  const { id } = useParams();
  return <Detail key={id} id={id} />;
}
function Detail({ id }) {
  const navigate = useNavigate();
  const { scope } = useOutletContext();
  const [boiler, setBoiler] = useState(null);
  const [telemetry, setTelemetry] = useState(null);
  const [override, setOverride] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    let listeners = [];
    const constraints = [where('boiler_id', '==', id)];
    if (scope) constraints.push(where(scope[0], '==', scope[1]));
    const report = error => setError(`Unable to load live data: ${error.message}`);
    const unsubscribe = onSnapshot(query(collection(db, 'boilers'), ...constraints), snapshot => {
      listeners.forEach(stop => stop()); listeners = [];
      setTelemetry(null); setOverride(null); setError('');
      setBoiler(snapshot.empty ? null : snapshot.docs[0].data()); setLoading(false);
      if (!snapshot.empty) {
        listeners.push(watchLatest('telemetry', id, setTelemetry, report));
        listeners.push(watchLatest('override_logs', id, setOverride, report));
      }
    }, error => { report(error); setLoading(false); });
    return () => { unsubscribe(); listeners.forEach(stop => stop()); };
  }, [id, scope]);
  const currentStatus = status(telemetry, override, now);
  const currentOverride = overrideValue(telemetry, override);
  const values = [
    ['Temperature', `${telemetry?.temperature_c ?? '--'} °C`],
    ['Pressure', `${telemetry?.pressure_bar ?? '--'} bar`],
    ['Flow', `${telemetry?.flow_lpm ?? '--'} L/min`],
    ['TDS', `${telemetry?.tds_ppm ?? '--'} ppm`],
    ['Override', currentOverride === null ? 'Unknown' : currentOverride ? 'ON' : 'OFF'],
    ['Timestamp', formatTime(telemetry)],
  ];
  return <main style={styles.container}>
    <button onClick={() => navigate('/dashboard')} style={styles.backButton}>← Back to Dashboard</button>
    {error && <p role="alert" className="error">{error}</p>}
    {loading ? <p>Loading boiler details…</p> : !boiler ? <p>Boiler {id} was not found or is not assigned to your account.</p> : <>
      <header style={styles.header}><h1 style={styles.title}>Boiler Details - {boiler.boiler_id}</h1>
        <div style={{ ...styles.statusBadge, color: currentStatus.color }}>{currentStatus.text}</div>
      </header>
      <section style={styles.card}><h2 style={styles.sectionTitle}>Boiler Information</h2>
        <div style={styles.infoGrid}>{['company', 'district', 'state', 'address'].map(field => <div key={field}><strong style={{ textTransform: 'capitalize' }}>{field}:</strong> {boiler[field] || '--'}</div>)}</div>
      </section>
      <section style={styles.card}><h2 style={styles.sectionTitle}>Latest Telemetry</h2>
        {!telemetry && <p>No telemetry available for this boiler.</p>}
        <div style={styles.telemetryGrid}>{values.map(([label, value]) => <div key={label} style={styles.telemetryBox}><span style={styles.label}>{label}</span><span style={styles.value}>{value}</span></div>)}</div>
      </section>
    </>}
  </main>;
}

const styles = {
  container: {
    padding: "2rem",
    minHeight: "100vh",
    backgroundColor: "#0f172a",
    color: "#f8fafc",
    fontFamily: "'Inter', sans-serif",
  },
  backButton: {
    padding: "10px 16px",
    backgroundColor: "transparent",
    border: "1px solid #334155",
    color: "#94a3b8",
    borderRadius: "8px",
    cursor: "pointer",
    marginBottom: "2rem",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "1rem",
    flexWrap: "wrap",
    marginBottom: "2rem",
  },
  title: {
    fontSize: "2.5rem",
    fontWeight: "800",
    margin: 0,
  },
  statusBadge: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "8px 16px",
    borderRadius: "20px",
    fontWeight: "600",
    border: "1px solid",
  },
  statusDot: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
  },
  card: {
    background: "rgba(30, 41, 59, 0.7)",
    border: "1px solid #334155",
    borderRadius: "16px",
    padding: "1.5rem",
    marginBottom: "1.5rem",
  },
  sectionTitle: {
    color: "#38bdf8",
    marginBottom: "1rem",
    fontSize: "1.2rem",
  },
  infoGrid: {
    display: "grid",
    gap: "0.75rem",
  },
  telemetryGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: "1rem",
  },
  telemetryBox: {
    background: "#0b1226",
    borderRadius: "12px",
    padding: "1rem",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  label: {
    color: "#94a3b8",
    fontSize: "0.85rem",
  },
  value: {
    color: "#38bdf8",
    fontSize: "1.2rem",
    fontWeight: "700",
  },
  loading: {
    height: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0f172a",
    color: "#38bdf8",
    fontSize: "1.2rem",
  },
  empty: {
    height: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0f172a",
    color: "#ef4444",
    fontSize: "1.2rem",
  },
};