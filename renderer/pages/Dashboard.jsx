import React from 'react';
import { FiPlay, FiPause, FiSquare, FiZap, FiCheckCircle, FiClock, FiAlertTriangle } from 'react-icons/fi';

export default function Dashboard({ stats, botStatus, logs, onStart, onPause, onResume, onStop, isLoggedIn }) {
  const progressPercent = stats.total > 0 ? Math.round((stats.posted / stats.total) * 100) : 0;

  const recentLogs = logs.slice(-8);

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">Monitor your marketplace posting activity</p>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card total">
          <span className="stat-icon"><FiZap /></span>
          <div className="stat-label">Total Listings</div>
          <div className="stat-value">{stats.total}</div>
        </div>
        <div className="stat-card posted">
          <span className="stat-icon"><FiCheckCircle /></span>
          <div className="stat-label">Posted</div>
          <div className="stat-value">{stats.posted}</div>
        </div>
        <div className="stat-card remaining">
          <span className="stat-icon"><FiClock /></span>
          <div className="stat-label">Remaining</div>
          <div className="stat-value">{stats.remaining}</div>
        </div>
        <div className="stat-card failed">
          <span className="stat-icon"><FiAlertTriangle /></span>
          <div className="stat-label">Failed</div>
          <div className="stat-value">{stats.failed}</div>
        </div>
      </div>

      {/* Progress Bar */}
      {stats.total > 0 && (
        <div className="progress-container">
          <div className="progress-header">
            <span>Progress</span>
            <span>{progressPercent}% complete</span>
          </div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progressPercent}%` }}></div>
          </div>
        </div>
      )}

      {/* Bot Controls */}
      <div className="bot-controls">
        {botStatus === 'idle' && (
          <button className="btn btn-primary" onClick={onStart} disabled={!isLoggedIn || stats.total === 0}>
            <FiPlay className="btn-icon" />
            Start Bot
          </button>
        )}
        {botStatus === 'running' && (
          <>
            <button className="btn btn-warning" onClick={onPause}>
              <FiPause className="btn-icon" />
              Pause Bot
            </button>
            <button className="btn btn-danger" onClick={onStop}>
              <FiSquare className="btn-icon" />
              Stop Bot
            </button>
          </>
        )}
        {botStatus === 'paused' && (
          <>
            <button className="btn btn-success" onClick={onResume}>
              <FiPlay className="btn-icon" />
              Resume Bot
            </button>
            <button className="btn btn-danger" onClick={onStop}>
              <FiSquare className="btn-icon" />
              Stop Bot
            </button>
          </>
        )}

        {!isLoggedIn && (
          <span style={{ color: 'var(--color-warning)', fontSize: '13px', alignSelf: 'center', marginLeft: '8px' }}>
            ⚠️ Please login to Facebook in Settings first
          </span>
        )}
      </div>

      {/* Recent Logs */}
      <div className="glass-card">
        <div className="glass-card-header">
          <span className="glass-card-title">Recent Activity</span>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            {botStatus === 'running' ? '● Live' : botStatus === 'paused' ? '● Paused' : '● Idle'}
          </span>
        </div>
        {recentLogs.length === 0 ? (
          <div className="empty-state" style={{ padding: '30px' }}>
            <div className="empty-state-icon">📋</div>
            <div className="empty-state-text">No activity yet</div>
            <div className="empty-state-hint">Start the bot to see logs here</div>
          </div>
        ) : (
          <div style={{ fontFamily: "'JetBrains Mono', 'Cascadia Code', monospace", fontSize: '12.5px' }}>
            {recentLogs.map((log, i) => (
              <div key={i} className="log-entry">
                <span className="log-timestamp">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
                <span className={`log-level ${log.level}`}>{log.level}</span>
                <span className="log-message">{log.message}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
