import React, { useState } from 'react';

const VoterAuthentication = ({ electionContract, onAuthenticated, account }) => {
  const [uniqueId, setUniqueId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [voterInfo, setVoterInfo] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const authenticateVoter = async () => {
    if (!uniqueId.trim()) {
      setError('Please enter your unique ID');
      return;
    }

    setLoading(true);
    setError('');
    setVoterInfo(null);

    try {
      const [name, isValid] = await electionContract.authenticateVoter(uniqueId);
      
      if (isValid) {
        setVoterInfo({ name, uniqueId });
        setIsAuthenticated(true);
        setError('');
        onAuthenticated && onAuthenticated({ name, uniqueId });
      } else {
        setError('Invalid unique ID. You are not registered for this election.');
        setVoterInfo(null);
        setIsAuthenticated(false);
      }
    } catch (err) {
      setError('Error authenticating voter: ' + err.message);
      setVoterInfo(null);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  const resetAuthentication = () => {
    setUniqueId('');
    setVoterInfo(null);
    setIsAuthenticated(false);
    setError('');
  };

  return (
    <div className="voter-auth-section">
      <h3>🔐 Voter Authentication</h3>
      
      {!isAuthenticated ? (
        <div className="auth-form">
          <div className="input-group">
            <input
              type="text"
              placeholder="Enter your unique ID"
              value={uniqueId}
              onChange={(e) => setUniqueId(e.target.value)}
              disabled={loading}
              className="auth-input"
            />
            <button
              onClick={authenticateVoter}
              disabled={loading || !uniqueId.trim()}
              className="action-btn primary"
            >
              {loading ? 'Authenticating...' : 'Authenticate'}
            </button>
          </div>
          
          {error && <div className="error-message">{error}</div>}
        </div>
      ) : (
        <div className="auth-success">
          <div className="success-card">
            <h4>✅ Authentication Successful!</h4>
            <p><strong>Name:</strong> {voterInfo.name}</p>
            <p><strong>Unique ID:</strong> {voterInfo.uniqueId}</p>
            <p><strong>Wallet:</strong> {account.slice(0, 6)}...{account.slice(-4)}</p>
          </div>
          
          <button
            onClick={resetAuthentication}
            className="action-btn small"
          >
            Use Different ID
          </button>
        </div>
      )}
    </div>
  );
};

export default VoterAuthentication;
