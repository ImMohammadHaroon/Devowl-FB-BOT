import React, { useState, useEffect } from 'react';

export default function Activation() {
  const [key, setKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ type: '', message: '' });
  const [expiredOn, setExpiredOn] = useState(null);

  useEffect(() => {
    // Check initial status to see if it's expired or missing
    async function checkStatus() {
      try {
        const result = await window.electronAPI.checkLicense();
        if (result && result.reason === 'expired') {
          setExpiredOn(result.expiredOn);
          setStatus({
            type: 'error',
            message: `Your license expired on ${result.expiredOn}. Please contact support to renew.`
          });
        } else if (result && result.reason === 'not_found') {
          setStatus({
            type: 'error',
            message: 'No license found. Please enter your key.'
          });
        }
      } catch (err) {
        console.error(err);
      }
    }
    checkStatus();
  }, []);

  const handleKeyChange = (e) => {
    let raw = e.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    if (raw.length > 16) {
      raw = raw.slice(0, 16);
    }
    // Auto-insert dashes
    let formatted = '';
    for (let i = 0; i < raw.length; i++) {
      if (i > 0 && i % 4 === 0) formatted += '-';
      formatted += raw[i];
    }
    setKey(formatted);
  };

  const mapReasonToMessage = (reason) => {
    switch(reason) {
      case 'invalid_format': return "Invalid format. Use XXXX-XXXX-XXXX-XXXX";
      case 'invalid_key': return "Invalid license key. Please check and try again.";
      case 'device_mismatch': return "This key is already activated on another device. Contact support to transfer your license.";
      case 'expired': return "Your license expired. Please contact support to renew.";
      case 'not_found': return "No license found. Please enter your key.";
      default: return "Activation failed. Please try again.";
    }
  };

  const handleActivate = async () => {
    if (key.length !== 19) {
      setStatus({ type: 'error', message: 'Please enter a complete 16-character key.' });
      return;
    }

    setLoading(true);
    setStatus({ type: '', message: '' });

    try {
      const response = await window.electronAPI.activateLicense(key);
      if (response.success) {
        setStatus({ type: 'success', message: 'License activated successfully!' });
        setTimeout(() => {
          window.electronAPI.openMain();
        }, 1500);
      } else {
        setStatus({ type: 'error', message: mapReasonToMessage(response.reason) });
      }
    } catch (err) {
      setStatus({ type: 'error', message: "Could not reach server. Using offline check." });
    } finally {
      setLoading(false);
    }
  };

  const isExpired = !!expiredOn;

  return (
    <div className="activation-container">
      <div className="activation-card">
        <h1 className="activation-title">FB Marketplace Bot</h1>
        <p className="activation-subtitle">Enter your license key to continue</p>
        
        <input 
          type="text" 
          className="activation-input" 
          placeholder="XXXX-XXXX-XXXX-XXXX" 
          value={key}
          onChange={handleKeyChange}
          disabled={loading || isExpired}
        />
        
        <button 
          className="activation-button"
          onClick={handleActivate}
          disabled={loading || isExpired || key.length !== 19}
        >
          {loading ? <div className="spinner"></div> : 'Activate'}
        </button>

        {status.message && (
          <div className={`activation-status status-${status.type}`}>
            {status.message}
          </div>
        )}

        <div className="activation-footer">
          Need a key? Contact: support@yourapp.com
        </div>
      </div>
    </div>
  );
}
