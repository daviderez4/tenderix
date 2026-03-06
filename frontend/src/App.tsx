import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { Login } from './components/Login';
import { Dashboard } from './pages/Dashboard';
import { GatesPage } from './pages/GatesPage';
import { CompanyProfilePage } from './pages/CompanyProfilePage';
import './index.css';

function AppLayout() {
  const location = useLocation();
  const isLoginPage = location.pathname === '/login';

  if (isLoginPage) return null;

  return (
    <div className="app">
      <Sidebar />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/gates" element={<GatesPage />} />
          <Route path="/company" element={<CompanyProfilePage />} />
          {/* Placeholder routes for future modules */}
          <Route path="/sow" element={<PlaceholderPage title="SOW & Hidden Work" subtitle="ניתוח תכולות ועבודות נסתרות - בפיתוח" />} />
          <Route path="/boq" element={<PlaceholderPage title="BOQ Pricing Heatmap" subtitle="מפת חום תמחור - בפיתוח" />} />
          <Route path="/contract" element={<PlaceholderPage title="Contract Advantage" subtitle="ניתוח חוזה - בפיתוח" />} />
          <Route path="/competitors" element={<PlaceholderPage title="Competitive Intelligence" subtitle="מודיעין תחרותי - בפיתוח" />} />
        </Routes>
      </main>
    </div>
  );
}

function PlaceholderPage({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div>
      <div className="page-header">
        <div className="page-header-right">
          <h1 className="page-title">{title}</h1>
          <p className="page-subtitle">{subtitle}</p>
        </div>
      </div>
      <div className="card">
        <div className="empty-state">
          <div className="empty-state-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
            </svg>
          </div>
          <div className="empty-state-title">מודול בפיתוח</div>
          <div className="empty-state-text">{subtitle}</div>
        </div>
      </div>
    </div>
  );
}

function App() {
  const isDev = import.meta.env.DEV;
  const initialAuth = isDev || localStorage.getItem('tenderix_auth') === 'true';
  const [isAuthenticated, setIsAuthenticated] = useState(initialAuth);

  useEffect(() => {
    if (!isAuthenticated && localStorage.getItem('tenderix_auth') === 'true') {
      setIsAuthenticated(true);
    }
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return <Login onLogin={() => setIsAuthenticated(true)} />;
  }

  return (
    <BrowserRouter>
      <AppLayout />
    </BrowserRouter>
  );
}

export default App;
