import React, { useState, useEffect, useCallback } from 'react';
import { FiGrid, FiList, FiSettings, FiTerminal, FiMinus, FiSquare, FiX } from 'react-icons/fi';
import Dashboard from './pages/Dashboard';
import Listings from './pages/Listings';
import Settings from './pages/Settings';
import Logs from './pages/Logs';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: FiGrid },
  { id: 'listings', label: 'Listings', icon: FiList },
  { id: 'settings', label: 'Settings', icon: FiSettings },
  { id: 'logs', label: 'Logs', icon: FiTerminal },
];

export default function App() {
  const [activePage, setActivePage] = useState('dashboard');
  const [listings, setListings] = useState([]);
  const [logs, setLogs] = useState([]);
  const [botStatus, setBotStatus] = useState('idle'); // idle, running, paused
  const [settings, setSettings] = useState({
    postDelay: 60,
    postingOrder: 'sequential',
  });
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Check session on mount
  useEffect(() => {
    window.electronAPI?.checkSession().then((result) => {
      setIsLoggedIn(result);
    });
  }, []);

  // Listen for log messages
  useEffect(() => {
    const cleanup = window.electronAPI?.onLogMessage((data) => {
      setLogs((prev) => [...prev, data]);
    });
    return cleanup;
  }, []);

  // Listen for listing status updates
  useEffect(() => {
    const cleanup = window.electronAPI?.onListingStatusUpdate(({ listingId, status }) => {
      setListings((prev) =>
        prev.map((l) => (l.id === listingId ? { ...l, status } : l))
      );
    });
    return cleanup;
  }, []);

  // Listen for bot complete
  useEffect(() => {
    const cleanup = window.electronAPI?.onBotComplete(() => {
      setBotStatus('idle');
    });
    return cleanup;
  }, []);

  const addLog = useCallback((level, message) => {
    setLogs((prev) => [
      ...prev,
      { level, message, timestamp: new Date().toISOString() },
    ]);
  }, []);

  const handleStartBot = async () => {
    if (listings.length === 0) {
      addLog('error', 'No listings to post. Add listings first.');
      return;
    }
    if (!isLoggedIn) {
      addLog('error', 'Not logged in to Facebook. Please login first.');
      return;
    }

    const pendingListings = listings.filter((l) => l.status === 'Pending' || l.status === 'Failed');
    if (pendingListings.length === 0) {
      addLog('warning', 'No pending listings to post.');
      return;
    }

    setBotStatus('running');
    await window.electronAPI?.startBot({
      listings: pendingListings,
      settings,
    });
  };

  const handlePauseBot = async () => {
    setBotStatus('paused');
    await window.electronAPI?.pauseBot();
  };

  const handleResumeBot = async () => {
    setBotStatus('running');
    await window.electronAPI?.resumeBot();
  };

  const handleStopBot = async () => {
    setBotStatus('idle');
    await window.electronAPI?.stopBot();
  };

  const handleLogin = async () => {
    addLog('info', 'Opening Facebook login...');
    const result = await window.electronAPI?.facebookLogin();
    if (result?.success) {
      setIsLoggedIn(true);
    }
  };

  const stats = {
    total: listings.length,
    posted: listings.filter((l) => l.status === 'Posted').length,
    remaining: listings.filter((l) => l.status === 'Pending').length,
    failed: listings.filter((l) => l.status === 'Failed').length,
  };

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard':
        return (
          <Dashboard
            stats={stats}
            botStatus={botStatus}
            logs={logs}
            onStart={handleStartBot}
            onPause={handlePauseBot}
            onResume={handleResumeBot}
            onStop={handleStopBot}
            isLoggedIn={isLoggedIn}
          />
        );
      case 'listings':
        return <Listings listings={listings} setListings={setListings} />;
      case 'settings':
        return (
          <Settings
            settings={settings}
            setSettings={setSettings}
            isLoggedIn={isLoggedIn}
            onLogin={handleLogin}
          />
        );
      case 'logs':
        return <Logs logs={logs} setLogs={setLogs} />;
      default:
        return null;
    }
  };

  return (
    <div className="app-container">
      {/* Custom Title Bar */}
      <div className="title-bar">
        <div className="title-bar-drag">
          <div className="title-bar-logo">
            <span className="logo-icon">🤖</span>
            <span className="logo-text">Marketplace Bot</span>
          </div>
        </div>
        <div className="title-bar-controls">
          <button className="title-btn minimize" onClick={() => window.electronAPI?.minimize()}>
            <FiMinus />
          </button>
          <button className="title-btn maximize" onClick={() => window.electronAPI?.maximize()}>
            <FiSquare />
          </button>
          <button className="title-btn close" onClick={() => window.electronAPI?.close()}>
            <FiX />
          </button>
        </div>
      </div>

      <div className="app-body">
        {/* Sidebar */}
        <nav className="sidebar">
          <div className="sidebar-nav">
            {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                className={`nav-item ${activePage === id ? 'active' : ''}`}
                onClick={() => setActivePage(id)}
              >
                <Icon className="nav-icon" />
                <span className="nav-label">{label}</span>
              </button>
            ))}
          </div>

          <div className="sidebar-footer">
            <div className={`status-indicator ${isLoggedIn ? 'online' : 'offline'}`}>
              <span className="status-dot"></span>
              <span className="status-text">{isLoggedIn ? 'Connected' : 'Not Connected'}</span>
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <main className="main-content">{renderPage()}</main>
      </div>
    </div>
  );
}
