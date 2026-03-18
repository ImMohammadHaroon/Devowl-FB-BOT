import React from 'react';
import { FiClock, FiShuffle, FiLogIn, FiShield, FiActivity } from 'react-icons/fi';

export default function Settings({ settings, setSettings, isLoggedIn, onLogin, onLogout }) {
  const handleDelayChange = (value) => {
    setSettings((prev) => ({ ...prev, postDelay: parseInt(value) }));
  };

  const handleOrderChange = (order) => {
    setSettings((prev) => ({ ...prev, postingOrder: order }));
  };

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Configure bot behavior and manage your Facebook session</p>
      </div>

      <div className="settings-grid">
        {/* Post Delay */}
        <div className="setting-section">
          <div className="setting-section-title">
            <FiClock className="setting-section-icon" />
            Post Delay
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
            Time to wait between posting each listing
          </p>
          <div className="slider-current">{settings.postDelay}s</div>
          <div className="slider-container">
            <input
              type="range"
              className="slider"
              min="30"
              max="300"
              step="10"
              value={settings.postDelay}
              onChange={(e) => handleDelayChange(e.target.value)}
            />
            <div className="slider-value">
              <span>30s</span>
              <span>300s</span>
            </div>
          </div>
        </div>

        {/* Posting Order */}
        <div className="setting-section">
          <div className="setting-section-title">
            <FiShuffle className="setting-section-icon" />
            Posting Order
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
            Choose how listings are posted from the queue
          </p>
          <div className="toggle-group">
            <button
              className={`toggle-option ${settings.postingOrder === 'sequential' ? 'active' : ''}`}
              onClick={() => handleOrderChange('sequential')}
            >
              📋 Sequential
            </button>
            <button
              className={`toggle-option ${settings.postingOrder === 'random' ? 'active' : ''}`}
              onClick={() => handleOrderChange('random')}
            >
              🎲 Random
            </button>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '12px' }}>
            {settings.postingOrder === 'sequential'
              ? 'Listings will be posted in order: 1, 2, 3...'
              : 'Listings will be posted in random order from the queue.'}
          </p>
        </div>

        {/* Facebook Login */}
        <div className="setting-section" style={{ gridColumn: '1 / -1' }}>
          <div className="setting-section-title">
            <FiShield className="setting-section-icon" />
            Facebook Session
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
            Login to Facebook to enable the bot. Your session cookies are stored locally for future use.
          </p>

          <div className="session-card">
            <div className="session-avatar">
              {isLoggedIn ? '✅' : '🔒'}
            </div>
            <div className="session-info">
              <div className="session-status" style={{ color: isLoggedIn ? 'var(--color-success)' : 'var(--color-warning)' }}>
                {isLoggedIn ? 'Session Active' : 'Not Connected'}
              </div>
              <div className="session-hint">
                {isLoggedIn
                  ? 'Your Facebook session is saved. The bot can run automatically.'
                  : 'Click the button to open a browser and login manually.'}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                className={`btn ${isLoggedIn ? 'btn-success' : 'btn-primary'}`}
                onClick={onLogin}
              >
                <FiLogIn style={{ marginRight: '6px' }} />
                {isLoggedIn ? 'Re-Login' : 'Login to Facebook'}
              </button>
              {isLoggedIn && (
                <button
                  className="btn"
                  onClick={onLogout}
                  style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)' }}
                >
                  <FiLogIn style={{ marginRight: '6px', transform: 'rotate(180deg)', display: 'inline-block' }} />
                  Logout
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Bot Behavior */}
        <div className="setting-section" style={{ gridColumn: '1 / -1' }}>
          <div className="setting-section-title">
            <FiActivity className="setting-section-icon" />
            Bot Behavior
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
            The bot uses human-like interaction patterns to avoid detection:
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
            <div style={{
              padding: '16px',
              background: 'rgba(255,255,255,0.03)',
              borderRadius: 'var(--radius-md)',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: '24px', marginBottom: '8px' }}>⌨️</div>
              <div style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                Typing Delays
              </div>
              <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                50–120ms per keystroke
              </div>
            </div>
            <div style={{
              padding: '16px',
              background: 'rgba(255,255,255,0.03)',
              borderRadius: 'var(--radius-md)',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: '24px', marginBottom: '8px' }}>⏱️</div>
              <div style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                Random Pauses
              </div>
              <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                0.5–3s between actions
              </div>
            </div>
            <div style={{
              padding: '16px',
              background: 'rgba(255,255,255,0.03)',
              borderRadius: 'var(--radius-md)',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: '24px', marginBottom: '8px' }}>🖱️</div>
              <div style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                Smooth Mouse
              </div>
              <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                Natural cursor movement
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
