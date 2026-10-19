import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import BoilerDetail from './pages/BoilerDetail';
import Session from './lib/session';
export default function App() {
  return <BrowserRouter><Routes>
    <Route path="/" element={<Login />} />
    <Route element={<Session />}>
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/boiler/:id" element={<BoilerDetail />} />
    </Route>
    <Route path="*" element={<Navigate to="/dashboard" replace />} />
  </Routes></BrowserRouter>;
}
