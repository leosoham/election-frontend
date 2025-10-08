import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import './App.css';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from './config';

function App() {
  const [account, setAccount] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [electionStatus, setElectionStatus] = useState('Idle');
  const [round, setRound] = useState(0);
  const [candidates, setCandidates] = useState([]);
  const [newCandidate, setNewCandidate] = useState('');
  const [newVoter, setNewVoter] = useState('');
  const [contract, setContract] = useState(null);
  const [loading, setLoading] = useState(false);
  const [provider, setProvider] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(Date.now());

  // Initialize contract when component mounts
  useEffect(() => {
    if (window.ethereum) {
      const initializeContract = async () => {
        try {
          const web3Provider = new ethers.BrowserProvider(window.ethereum);
          setProvider(web3Provider);
          const signer = await web3Provider.getSigner();
          const electionContract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
          setContract(electionContract);
          console.log("Contract initialized successfully");
          
          // Set up event listeners for real-time updates
          setupEventListeners(electionContract);
        } catch (error) {
          console.error("Error initializing contract:", error);
        }
      };
      initializeContract();
    }
  }, []);

  // Set up event listeners for real-time updates
  const setupEventListeners = (contractInstance) => {
    if (!contractInstance) return;

    try {
      // Listen for new candidates
      contractInstance.on('CandidateAdded', (id, name) => {
        console.log('New candidate added:', { id: id.toString(), name });
        refreshData();
      });

      // Listen for election start
      contractInstance.on('ElectionStarted', (round) => {
        console.log('Election started for round:', round.toString());
        refreshData();
      });

      // Listen for election end
      contractInstance.on('ElectionEnded', (round) => {
        console.log('Election ended for round:', round.toString());
        refreshData();
      });

      // Listen for votes
      contractInstance.on('Voted', (voter, candidateId, round) => {
        console.log('New vote:', { voter, candidateId: candidateId.toString(), round: round.toString() });
        refreshData();
      });

      // Listen for voter registration
      contractInstance.on('VoterRegistered', (voter) => {
        console.log('Voter registered:', voter);
        refreshData();
      });

      // Listen for reset
      contractInstance.on('ResetAll', (roundCleared) => {
        console.log('Election reset, round cleared:', roundCleared.toString());
        refreshData();
      });

      console.log("Event listeners set up successfully");
    } catch (error) {
      console.error("Error setting up event listeners:", error);
    }
  };

  // Refresh all data
  const refreshData = async () => {
    if (account && contract) {
      console.log("Refreshing data...");
      await loadContractData(account);
      setLastUpdate(Date.now());
    }
  };

  // Auto-refresh every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      refreshData();
    }, 10000); // Refresh every 10 seconds

    return () => clearInterval(interval);
  }, [account, contract]);

  // Connect to wallet and load contract data
  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        setLoading(true);
        const accounts = await window.ethereum.request({ 
          method: 'eth_requestAccounts' 
        });
        const connectedAccount = accounts[0];
        setAccount(connectedAccount);
        
        // Re-initialize contract with connected account
        const web3Provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await web3Provider.getSigner();
        const electionContract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
        setContract(electionContract);
        
        // Set up event listeners
        setupEventListeners(electionContract);
        
        // Load contract data
        await loadContractData(connectedAccount, electionContract);
        
        console.log("Wallet connected successfully!");
      } catch (error) {
        console.error("Error connecting to wallet:", error);
        alert("Error connecting to wallet: " + error.message);
      } finally {
        setLoading(false);
      }
    } else {
      alert("Please install MetaMask!");
    }
  };

  // Load all contract data
  const loadContractData = async (address, contractInstance = contract) => {
    if (!contractInstance) {
      console.log("Contract not available yet");
      return;
    }

    try {
      console.log("Loading contract data...");
      
      // Check if user is admin
      const admin = await contractInstance.owner();
      setIsAdmin(admin.toLowerCase() === address.toLowerCase());
      console.log("Admin status:", admin.toLowerCase() === address.toLowerCase());

      // Check if user is registered voter
      const registered = await contractInstance.registeredVoters(address);
      setIsRegistered(registered);
      console.log("Registration status:", registered);

      // Get election status
      const started = await contractInstance.electionStarted();
      const ended = await contractInstance.electionEnded();
      
      let status = 'Idle';
      if (started && !ended) status = 'Voting';
      if (ended) status = 'Ended';
      
      setElectionStatus(status);
      console.log("Election status:", status);

      // Get current round
      const currentRound = await contractInstance.round();
      setRound(Number(currentRound));
      console.log("Current round:", Number(currentRound));

      // Load candidates
      await loadCandidates(contractInstance);

    } catch (error) {
      console.error("Error loading contract data:", error);
    }
  };

  // Load candidates from contract
  const loadCandidates = async (contractInstance = contract) => {
    if (!contractInstance) return;

    try {
      const candidateCount = await contractInstance.candidatesCount();
      const count = Number(candidateCount);
      console.log("Total candidates:", count);

      const candidatesArray = [];

      for (let i = 1; i <= count; i++) {
        try {
          const candidate = await contractInstance.candidates(i);
          const votes = await contractInstance.getVotes(i);
          candidatesArray.push({
            id: i,
            name: candidate.name,
            votes: Number(votes)
          });
        } catch (error) {
          console.error(`Error loading candidate ${i}:`, error);
        }
      }

      setCandidates(candidatesArray);
      console.log("Candidates loaded:", candidatesArray);
    } catch (error) {
      console.error("Error loading candidates:", error);
    }
  };

  // Add candidate (Admin only)
  const addCandidate = async () => {
    if (!newCandidate.trim()) {
      alert("Please enter a candidate name!");
      return;
    }

    if (!contract) {
      alert("Contract not connected!");
      return;
    }

    try {
      setLoading(true);
      console.log("Adding candidate:", newCandidate);
      
      const transaction = await contract.addCandidate(newCandidate);
      console.log("Transaction sent:", transaction.hash);
      
      await transaction.wait();
      console.log("Transaction confirmed");
      
      setNewCandidate('');
      // Data will auto-refresh via event listener
      alert("Candidate added successfully!");
    } catch (error) {
      console.error("Error adding candidate:", error);
      alert("Error adding candidate: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Register voter (Admin only)
  const registerVoter = async () => {
    if (!newVoter.trim()) {
      alert("Please enter a voter address!");
      return;
    }

    if (!contract) {
      alert("Contract not connected!");
      return;
    }

    // Basic address validation
    if (!newVoter.startsWith('0x') || newVoter.length !== 42) {
      alert("Please enter a valid wallet address (should start with 0x and be 42 characters long)");
      return;
    }

    try {
      setLoading(true);
      console.log("Registering voter:", newVoter);
      
      const transaction = await contract.registerVoter(newVoter);
      console.log("Transaction sent:", transaction.hash);
      
      await transaction.wait();
      console.log("Transaction confirmed");
      
      setNewVoter('');
      // Data will auto-refresh via event listener
      alert("Voter registered successfully!");
    } catch (error) {
      console.error("Error registering voter:", error);
      alert("Error registering voter: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Start election (Admin only)
  const startElection = async () => {
    if (!contract) {
      alert("Contract not connected!");
      return;
    }

    try {
      setLoading(true);
      console.log("Starting election...");
      
      const transaction = await contract.startElection();
      console.log("Transaction sent:", transaction.hash);
      
      await transaction.wait();
      console.log("Transaction confirmed");
      
      // Data will auto-refresh via event listener
      alert("Election started successfully!");
    } catch (error) {
      console.error("Error starting election:", error);
      alert("Error starting election: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // End election (Admin only)
  const endElection = async () => {
    if (!contract) {
      alert("Contract not connected!");
      return;
    }

    try {
      setLoading(true);
      console.log("Ending election...");
      
      const transaction = await contract.endElection();
      console.log("Transaction sent:", transaction.hash);
      
      await transaction.wait();
      console.log("Transaction confirmed");
      
      // Data will auto-refresh via event listener
      alert("Election ended successfully!");
    } catch (error) {
      console.error("Error ending election:", error);
      alert("Error ending election: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Reset election (Admin only)
  const resetAll = async () => {
    if (!contract) {
      alert("Contract not connected!");
      return;
    }

    if (window.confirm("Are you sure you want to reset the election? This will remove all candidates and votes.")) {
      try {
        setLoading(true);
        console.log("Resetting election...");
        
        const transaction = await contract.resetAll();
        console.log("Transaction sent:", transaction.hash);
        
        await transaction.wait();
        console.log("Transaction confirmed");
        
        setNewCandidate('');
        setNewVoter('');
        // Data will auto-refresh via event listener
        alert("Election reset successfully!");
      } catch (error) {
        console.error("Error resetting election:", error);
        alert("Error resetting election: " + error.message);
      } finally {
        setLoading(false);
      }
    }
  };

  // Vote for candidate
  const vote = async (candidateId) => {
    if (!contract) {
      alert("Contract not connected!");
      return;
    }

    if (!isRegistered) {
      alert("You are not registered to vote!");
      return;
    }

    if (electionStatus !== 'Voting') {
      alert("Voting is not active right now!");
      return;
    }

    try {
      setLoading(true);
      console.log("Voting for candidate:", candidateId);
      
      const transaction = await contract.vote(candidateId);
      console.log("Transaction sent:", transaction.hash);
      
      await transaction.wait();
      console.log("Transaction confirmed");
      
      // Data will auto-refresh via event listener
      alert("Vote cast successfully!");
    } catch (error) {
      console.error("Error voting:", error);
      alert("Error voting: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const disconnectWallet = () => {
    setAccount('');
    setIsAdmin(false);
    setIsRegistered(false);
    setCandidates([]);
    setElectionStatus('Idle');
    setContract(null);
    
    // Remove event listeners
    if (contract) {
      contract.removeAllListeners();
    }
  };

  // Format time for last update
  const formatLastUpdate = () => {
    const diff = Date.now() - lastUpdate;
    const seconds = Math.floor(diff / 1000);
    if (seconds < 60) return `${seconds} seconds ago`;
    return `${Math.floor(seconds / 60)} minutes ago`;
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
              <button className="connect-wallet-btn" onClick={connectWallet} disabled={loading}>
                {loading ? 'Connecting...' : 'Connect Wallet'}
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
            <div style={{ marginTop: '1rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              🔄 Auto-updating • Last updated: {formatLastUpdate()}
            </div>
          </div>

          {/* Connection Status */}
          {!contract && (
            <div className="status-card" style={{ borderLeft: '4px solid var(--error-color)' }}>
              <h3>⚠️ Contract Not Connected</h3>
              <p>Connect your wallet to interact with the election contract.</p>
            </div>
          )}

          {/* Admin Panel */}
          {isAdmin && contract && (
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
                      disabled={loading}
                    />
                    <button onClick={addCandidate} className="action-btn primary" disabled={loading}>
                      {loading ? 'Adding...' : 'Add Candidate'}
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
                      disabled={loading}
                    />
                    <button onClick={registerVoter} className="action-btn primary" disabled={loading}>
                      {loading ? 'Registering...' : 'Register Voter'}
                    </button>
                  </div>
                </div>

                <div className="election-controls">
                  <h3>Election Controls</h3>
                  <div className="control-buttons">
                    <button 
                      onClick={startElection} 
                      className="control-btn start"
                      disabled={loading || electionStatus === 'Voting'}
                    >
                      {loading ? 'Starting...' : 'Start Election'}
                    </button>
                    <button 
                      onClick={endElection} 
                      className="control-btn end"
                      disabled={loading || electionStatus !== 'Voting'}
                    >
                      {loading ? 'Ending...' : 'End Election'}
                    </button>
                    <button onClick={resetAll} className="control-btn reset" disabled={loading}>
                      {loading ? 'Resetting...' : 'Reset All'}
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
                        disabled={loading}
                      >
                        {loading ? 'Voting...' : 'Vote'}
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
                {isAdmin && contract && (
                  <p>Use the admin panel above to add candidates.</p>
                )}
              </div>
            )}
          </div>

          {/* Voter Instructions */}
          {!isAdmin && contract && (
            <div className="status-card">
              <h3>Voter Instructions</h3>
              <p>
                {electionStatus === 'Idle' && "🏛️ Election is idle. Wait for admin to start voting."}
                {electionStatus === 'Voting' && "🗳️ Voting is active! Click the Vote button for your preferred candidate."}
                {electionStatus === 'Ended' && "🏁 Election has ended. View the results above."}
              </p>
              {!isRegistered && (
                <p style={{ color: 'var(--error-color)', marginTop: '0.5rem' }}>
                  ❌ You are not registered to vote. Contact the admin to get registered.
                </p>
              )}
            </div>
          )}
        </div>
      </main>

      <footer className="app-footer">
        <div className="container">
          <p>Decentralized Election System • Secure • Transparent • Trustless</p>
          <p style={{ fontSize: '0.875rem', opacity: 0.8, marginTop: '0.5rem' }}>
            Contract: {contract ? '✅ Connected' : '❌ Not Connected'} | 
            Network: Sepolia | 
            Round: {round} |
            🔄 Auto-update enabled
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;