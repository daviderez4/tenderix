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
import './index.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const auth = localStorage.getItem('tenderix_auth');
    if (auth === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

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
            <Route path="/gates" element={<GatesPage />} />
            <Route path="/analysis" element={<AnalysisPage />} />
            <Route path="/competitors" element={<CompetitorsPage />} />
            <Route path="/decision" element={<DecisionPage />} />
            <Route path="/company" element={<CompanyProfilePage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
