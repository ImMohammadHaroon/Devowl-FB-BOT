import React, { useEffect, useRef } from 'react';
import { FiTrash2, FiDownload } from 'react-icons/fi';

export default function Logs({ logs, setLogs }) {
  const logBodyRef = useRef(null);

  // Auto-scroll to bottom on new logs
  useEffect(() => {
    if (logBodyRef.current) {
      logBodyRef.current.scrollTop = logBodyRef.current.scrollHeight;
    }
  }, [logs]);

  const clearLogs = () => setLogs([]);

  const exportLogs = () => {
    const text = logs
      .map((l) => `[${new Date(l.timestamp).toLocaleString()}] [${l.level.toUpperCase()}] ${l.message}`)
      .join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `marketplace-bot-logs-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fade-in log-page">
      <div className="page-header">
        <h1 className="page-title">Logs</h1>
        <p className="page-subtitle">Real-time bot activity and status messages</p>
      </div>

      <div className="log-container">
        <div className="log-header">
          <div className="log-title">
            Activity Log ({logs.length} entries)
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-secondary btn-sm" onClick={exportLogs} disabled={logs.length === 0}>
              <FiDownload style={{ marginRight: '4px' }} /> Export
            </button>
            <button className="btn btn-danger btn-sm" onClick={clearLogs} disabled={logs.length === 0}>
              <FiTrash2 style={{ marginRight: '4px' }} /> Clear
            </button>
          </div>
        </div>
        <div className="log-body" ref={logBodyRef}>
          {logs.length === 0 ? (
            <div className="empty-state" style={{ padding: '40px' }}>
              <div className="empty-state-icon">📜</div>
              <div className="empty-state-text">No logs yet</div>
              <div className="empty-state-hint">Activity will appear here when the bot starts</div>
            </div>
          ) : (
            logs.map((log, i) => (
              <div key={i} className="log-entry">
                <span className="log-timestamp">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
                <span className={`log-level ${log.level}`}>
                  {log.level}
                </span>
                <span className="log-message">{log.message}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
