import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { Login } from './components/Login';
import { Dashboard } from './pages/Dashboard';
import { NewTenderPage } from './pages/NewTenderPage';
import { GatesPage } from './pages/GatesPage';
import { AnalysisPage } from './pages/AnalysisPage';
import { CompetitorsPage } from './pages/CompetitorsPage';
import { DecisionPage } from './pages/DecisionPage';
import { CompanyProfilePage } from './pages/CompanyProfilePage';
import { TenderIntakePage } from './pages/TenderIntakePage';
import { SimpleIntakePage } from './pages/SimpleIntakePage';
import { FeedbackWidget } from './components/FeedbackWidget';
import { FeedbackAdminPage } from './pages/FeedbackAdminPage';
import './index.css';

// Check for OAuth token in URL hash and handle it immediately
function handleOAuthHash(): boolean {
  const hash = window.location.hash;
  if (hash && hash.includes('access_token=')) {
    try {
      const params = new URLSearchParams(hash.substring(1));
      const accessToken = params.get('access_token');
      if (accessToken) {
        const payload = JSON.parse(atob(accessToken.split('.')[1]));
        const email = payload.email || payload.user_metadata?.email || 'google_user';
        console.log('App: OAuth callback detected, user:', email);
        localStorage.setItem('tenderix_auth', 'true');
        localStorage.setItem('tenderix_user', email);
        window.history.replaceState(null, '', window.location.pathname);
        return true;
      }
    } catch (e) {
      console.error('App: Error parsing OAuth token:', e);
    }
  }
  return false;
}

function App() {
  // DEV MODE: Skip authentication for local development
  const isDev = import.meta.env.DEV;

  // Check OAuth hash synchronously before first render
  const hasOAuthToken = handleOAuthHash();
  const initialAuth = isDev || hasOAuthToken || localStorage.getItem('tenderix_auth') === 'true';

  const [isAuthenticated, setIsAuthenticated] = useState(initialAuth);

  useEffect(() => {
    // Re-check in case localStorage was updated
    if (!isAuthenticated && localStorage.getItem('tenderix_auth') === 'true') {
      setIsAuthenticated(true);
    }
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return <Login onLogin={() => setIsAuthenticated(true)} />;
  }

  return (
    <BrowserRouter>
      <div className="app">
        <Sidebar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/new" element={<NewTenderPage />} />
            <Route path="/intake" element={<TenderIntakePage />} />
            <Route path="/simple" element={<SimpleIntakePage />} />
            <Route path="/gates" element={<GatesPage />} />
            <Route path="/analysis" element={<AnalysisPage />} />
            <Route path="/competitors" element={<CompetitorsPage />} />
            <Route path="/decision" element={<DecisionPage />} />
            <Route path="/company" element={<CompanyProfilePage />} />
            <Route path="/feedback-admin" element={<FeedbackAdminPage />} />
          </Routes>
        </main>
        {/* Feedback Widget - visible on all pages */}
        <FeedbackWidget />
      </div>
    </BrowserRouter>
  );
}

export default App;
