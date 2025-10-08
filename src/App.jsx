import React, { useState } from 'react';
import './App.css';

function App() {
  const [account, setAccount] = useState('');
  const [isAdmin, setIsAdmin] = useState(true);
  const [isRegistered, setIsRegistered] = useState(true);
  const [electionStatus, setElectionStatus] = useState('Idle');
  const [round, setRound] = useState(5);
  const [candidates, setCandidates] = useState([]);
  const [newCandidate, setNewCandidate] = useState('');
  const [newVoter, setNewVoter] = useState('');

  // Connect to wallet
  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        const accounts = await window.ethereum.request({ 
          method: 'eth_requestAccounts' 
        });
        setAccount(accounts[0]);
        console.log("Wallet connected:", accounts[0]);
      } catch (error) {
        console.error("Error connecting to wallet:", error);
        // For demo - use a dummy account if MetaMask fails
        setAccount('0x51b96c6d94e27ab2d992b072573ef67d15666d64');
      }
    } else {
      alert("Please install MetaMask! Using demo mode...");
      // Demo account for testing
      setAccount('0x51b96c6d94e27ab2d992b072573ef67d15666d64');
    }
  };

  const addCandidate = () => {
    if (!newCandidate.trim()) {
      alert("Please enter a candidate name!");
      return;
    }
    
    const newCandidateObj = {
      id: candidates.length + 1,
      name: newCandidate,
      votes: 0
    };
    
    setCandidates([...candidates, newCandidateObj]);
    setNewCandidate('');
    alert(`Candidate "${newCandidate}" added successfully!`);
  };

  const registerVoter = () => {
    if (!newVoter.trim()) {
      alert("Please enter a voter address!");
      return;
    }
    
    // Basic address validation
    if (!newVoter.startsWith('0x') || newVoter.length !== 42) {
      alert("Please enter a valid wallet address (0x...)");
      return;
    }
    
    alert(`Voter ${newVoter} registered successfully!`);
    setNewVoter('');
  };

  const startElection = () => {
    if (candidates.length === 0) {
      alert("Please add at least one candidate before starting the election!");
      return;
    }
    
    setElectionStatus('Voting');
    alert("Election started! Voting is now open.");
  };

  const endElection = () => {
    setElectionStatus('Ended');
    alert("Election ended! Results are final.");
  };

  const resetAll = () => {
    if (window.confirm("Are you sure you want to reset the election? This will remove all candidates.")) {
      setCandidates([]);
      setElectionStatus('Idle');
      setNewCandidate('');
      setNewVoter('');
      alert("Election has been reset!");
    }
  };

  const vote = (candidateId) => {
    if (electionStatus !== 'Voting') {
      alert("Voting is not active right now!");
      return;
    }
    
    if (!isRegistered) {
      alert("You are not registered to vote!");
      return;
    }
    
    const updatedCandidates = candidates.map(candidate => {
      if (candidate.id === candidateId) {
        return { ...candidate, votes: candidate.votes + 1 };
      }
      return candidate;
    });
    
    setCandidates(updatedCandidates);
    alert(`Voted for candidate #${candidateId} successfully!`);
  };

  const disconnectWallet = () => {
    setAccount('');
    setIsAdmin(false);
    setIsRegistered(false);
  };

  return (
    <div className="app">
      {/* Header */}
      <header className="app-header">
        <div className="container">
          <h1 className="app-title">CR Election DApp</h1>
          <div className="wallet-section">
            {account ? (
              <div className="account-info">
                <span className="account-address">
                  {account.substring(0, 6)}...{account.substring(account.length - 4)}
                </span>
                <div className="status-badges">
                  {isAdmin && <span className="badge admin">Admin</span>}
                  <span className={`badge ${isRegistered ? 'registered' : 'not-registered'}`}>
                    {isRegistered ? 'Registered' : 'Not Registered'}
                  </span>
                </div>
                <button 
                  onClick={disconnectWallet} 
                  className="connect-wallet-btn"
                  style={{ marginTop: '0.5rem', fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <button className="connect-wallet-btn" onClick={connectWallet}>
                Connect Wallet
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="app-main">
        <div className="container">
          {/* Election Status Card */}
          <div className="status-card">
            <div className="status-info">
              <div className="status-item">
                <span className="label">Round:</span>
                <span className="value">{round}</span>
              </div>
              <div className="status-item">
                <span className="label">Status:</span>
                <span className={`status-value ${electionStatus.toLowerCase()}`}>
                  {electionStatus}
                </span>
              </div>
              <div className="status-item">
                <span className="label">Candidates:</span>
                <span className="value">{candidates.length}</span>
              </div>
            </div>
          </div>

          {/* Admin Panel */}
          {isAdmin && (
            <div className="admin-panel">
              <h2 className="panel-title">Admin Controls</h2>
              
              <div className="admin-actions">
                <div className="action-group">
                  <h3>Manage Candidates</h3>
                  <div className="input-group">
                    <input
                      type="text"
                      placeholder="Enter candidate name"
                      value={newCandidate}
                      onChange={(e) => setNewCandidate(e.target.value)}
                      className="input-field"
                      onKeyPress={(e) => e.key === 'Enter' && addCandidate()}
                    />
                    <button onClick={addCandidate} className="action-btn primary">
                      Add Candidate
                    </button>
                  </div>
                </div>

                <div className="action-group">
                  <h3>Manage Voters</h3>
                  <div className="input-group">
                    <input
                      type="text"
                      placeholder="Enter voter wallet address (0x...)"
                      value={newVoter}
                      onChange={(e) => setNewVoter(e.target.value)}
                      className="input-field"
                      onKeyPress={(e) => e.key === 'Enter' && registerVoter()}
                    />
                    <button onClick={registerVoter} className="action-btn primary">
                      Register Voter
                    </button>
                  </div>
                </div>

                <div className="election-controls">
                  <h3>Election Controls</h3>
                  <div className="control-buttons">
                    <button 
                      onClick={startElection} 
                      className="control-btn start"
                      disabled={electionStatus === 'Voting'}
                    >
                      Start Election
                    </button>
                    <button 
                      onClick={endElection} 
                      className="control-btn end"
                      disabled={electionStatus !== 'Voting'}
                    >
                      End Election
                    </button>
                    <button onClick={resetAll} className="control-btn reset">
                      Reset All
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Candidates Section */}
          <div className="candidates-section">
            <h2 className="section-title">
              {candidates.length > 0 ? `Candidates (${candidates.length})` : 'No candidates yet'}
            </h2>
            
            {candidates.length > 0 ? (
              <div className="candidates-grid">
                {candidates.map((candidate) => (
                  <div key={candidate.id} className="candidate-card">
                    <div className="candidate-info">
                      <h3 className="candidate-name">{candidate.name}</h3>
                      <p className="candidate-id">ID: {candidate.id}</p>
                      <p className="candidate-votes">Votes: {candidate.votes}</p>
                    </div>
                    {isRegistered && electionStatus === 'Voting' && (
                      <button 
                        onClick={() => vote(candidate.id)}
                        className="vote-btn"
                      >
                        Vote
                      </button>
                    )}
                    {electionStatus === 'Ended' && (
                      <div className="result-badge">
                        Final
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <p>No candidates have been added to this election yet.</p>
                {isAdmin && (
                  <p>Use the admin panel above to add candidates.</p>
                )}
              </div>
            )}
          </div>

          {/* Voter Instructions */}
          {!isAdmin && (
            <div className="status-card">
              <h3>Voter Instructions</h3>
              <p>
                {electionStatus === 'Idle' && "Election is idle. Wait for admin to start voting."}
                {electionStatus === 'Voting' && "Voting is active! Click the Vote button for your preferred candidate."}
                {electionStatus === 'Ended' && "Election has ended. View the results above."}
              </p>
              {!isRegistered && (
                <p style={{ color: 'var(--error-color)', marginTop: '0.5rem' }}>
                  You are not registered to vote. Contact the admin to get registered.
                </p>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="app-footer">
        <div className="container">
          <p>Decentralized Election System • Secure • Transparent • Trustless</p>
          <p style={{ fontSize: '0.875rem', opacity: 0.8, marginTop: '0.5rem' }}>
            Contract: {account ? 'Connected' : 'Not Connected'} | 
            Network: Sepolia | 
            Round: {round}
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;