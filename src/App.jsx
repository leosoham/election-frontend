import React, { useState, useEffect } from "react";
import { getFactoryContract, getElectionContract } from "./contract";
import "./App.css";

function App() {
  const [account, setAccount] = useState("");
  const [factory, setFactory] = useState(null);
  const [elections, setElections] = useState([]);
  const [selectedElection, setSelectedElection] = useState(null);
  const [loading, setLoading] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Add event listeners for account changes
  useEffect(() => {
    if (window.ethereum) {
      const handleAccountsChanged = (accounts) => {
        if (accounts.length === 0) {
          // User disconnected
          setAccount("");
          setFactory(null);
          setElections([]);
          setSelectedElection(null);
        } else if (accounts[0] !== account) {
          // User switched accounts
          setAccount(accounts[0]);
          // Reload elections for new account
          if (factory) {
            loadElections(factory);
          }
        }
      };

      window.ethereum.on('accountsChanged', handleAccountsChanged);

      return () => {
        if (window.ethereum.removeListener) {
          window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        }
      };
    }
  }, [account, factory]);

  // Connect MetaMask
  const connectWallet = async () => {
    if (!window.ethereum) {
      alert("Please install MetaMask first!");
      return;
    }
    try {
      const [acc] = await window.ethereum.request({
        method: "eth_requestAccounts",
      });
      setAccount(acc);
      const factoryContract = await getFactoryContract();
      setFactory(factoryContract);
      await loadElections(factoryContract);
    } catch (error) {
      console.error("Wallet connection failed:", error);
    }
  };

  // Load all elections from the factory
  const loadElections = async (factoryContract, forceRefresh = false) => {
    if (!factoryContract) {
      console.error("No factory contract available");
      return;
    }
    
    if (forceRefresh) {
      setIsRefreshing(true);
    }
    
    try {
      console.log("🔄 Starting election load process...", { forceRefresh });
      
      // Clear existing elections first
      if (forceRefresh) {
        setElections([]);
      }
      
      // Always use getElectionsCount method (getAllElections is unreliable)
      console.log("📋 Using getElectionsCount() method (most reliable)...");
      try {
        const electionsCount = await factoryContract.getElectionsCount();
        console.log("✅ Elections count:", electionsCount);
        
        if (Number(electionsCount) > 0) {
          const electionsList = [];
          console.log("🔍 Processing elections from getElectionsCount...");
          
          for (let i = 0; i < Number(electionsCount); i++) {
            console.log(`📝 Processing election ${i + 1}/${electionsCount}`);
            try {
              const electionData = await factoryContract.getElection(i);
              console.log(`✅ Election ${i + 1} data:`, electionData);
              
              electionsList.push({
                id: i + 1,
                address: electionData.electionAddress,
                title: electionData.title,
                admin: electionData.admin
              });
            } catch (electionErr) {
              console.error(`❌ Error fetching election ${i}:`, electionErr);
            }
          }
          
          console.log("🎯 Final elections list from getElectionsCount:", electionsList);
          setElections(electionsList);
        } else {
          console.log("⚠️ No elections found via getElectionsCount");
          setElections([]);
        }
      } catch (countError) {
        console.error("❌ getElectionsCount failed:", countError);
        setElections([]);
      }
      
    } catch (err) {
      console.error("💥 Critical error loading elections:", err);
      alert("Error loading elections: " + err.message);
    } finally {
      if (forceRefresh) {
        setIsRefreshing(false);
      }
    }
  };

  // Create new election
  const createElection = async () => {
    if (!newTitle.trim()) return alert("Please enter a title!");
    if (!factory) return alert("Factory not connected!");
    
    try {
      setLoading(true);
      console.log("🚀 Creating election:", newTitle);
      
      // Get current elections count before creation
      const electionsCountBefore = await factory.getElectionsCount();
      console.log("📊 Elections count before creation:", electionsCountBefore.toString());
      
      // Create the election
      console.log("📝 Sending createElection transaction...");
      const tx = await factory.createElection(newTitle);
      console.log("⏳ Transaction sent, waiting for confirmation...", tx.hash);
      
      // Wait for transaction confirmation
      const receipt = await tx.wait();
      console.log("✅ Transaction confirmed!", receipt);
      
      // Verify the election was created
      const electionsCountAfter = await factory.getElectionsCount();
      console.log("📊 Elections count after creation:", electionsCountAfter.toString());
      
      if (Number(electionsCountAfter) > Number(electionsCountBefore)) {
        alert("✅ Election created successfully!");
        setNewTitle("");
        // Refresh the elections list after creating a new election
        await loadElections(factory, true);
      } else {
        alert("⚠️ Election creation may have failed - no new election detected");
      }
      
    } catch (err) {
      console.error("💥 Error creating election:", err);
      
      // Provide more specific error messages
      if (err.code === 'ACTION_REJECTED') {
        alert("❌ Transaction was rejected by user");
      } else if (err.code === 'INSUFFICIENT_FUNDS') {
        alert("❌ Insufficient funds for transaction");
      } else if (err.message.includes('gas')) {
        alert("❌ Gas estimation failed: " + err.message);
      } else {
        alert("❌ Error: " + (err.reason || err.message));
      }
    } finally {
      setLoading(false);
    }
  };

  // When user selects an election → open detailed page
  const handleSelectElection = async (electionAddress) => {
    const electionContract = await getElectionContract(electionAddress);
    setSelectedElection({ address: electionAddress, contract: electionContract });
  };

  // Disconnect
  const disconnectWallet = () => {
    setAccount("");
    setFactory(null);
    setElections([]);
    setSelectedElection(null);
  };

  // Render main dashboard or election page
  return (
    <div className="app">
      <header className="app-header">
        <h1>🗳️ Decentralized Election System</h1>
        {account ? (
          <div>
            <p>
              Connected: {account.slice(0, 6)}...{account.slice(-4)}
            </p>
            <button onClick={disconnectWallet} className="action-btn">
              Disconnect
            </button>
          </div>
        ) : (
          <button onClick={connectWallet} className="action-btn primary">
            Connect Wallet
          </button>
        )}
      </header>

      {/* If no election selected → show dashboard */}
      {!selectedElection && (
        <main className="container">
          {account && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h2>Available Elections</h2>
                <button 
                  onClick={() => loadElections(factory, true)} 
                  className="action-btn small"
                  style={{ background: '#64748b' }}
                  disabled={isRefreshing}
                >
                  {isRefreshing ? '⏳ Loading...' : '🔄 Refresh'}
                </button>
              </div>
              {elections.length === 0 ? (
                <p>No elections yet.</p>
              ) : (
                <ul>
                  {elections.map((el) => (
                    <li key={el.id}>
                      <div>
                        <strong>{el.title}</strong>
                        <br />
                        <small style={{ color: '#64748b', fontSize: '0.875rem' }}>
                          Address: {el.address}
                        </small>
                      </div>
                      <button
                        onClick={() => handleSelectElection(el.address)}
                        className="action-btn small"
                      >
                        Enter
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              <div className="create-section">
                <input
                  type="text"
                  placeholder="Election Title"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                />
                <button onClick={createElection} disabled={loading} className="action-btn primary">
                  {loading ? "Creating..." : "Create Election"}
                </button>
              </div>
            </>
          )}
        </main>
      )}

      {/* If election selected → show ElectionPage */}
      {selectedElection && (
        <ElectionPage
          election={selectedElection}
          onBack={() => setSelectedElection(null)}
          account={account}
        />
      )}
    </div>
  );
}

function ElectionPage({ election, onBack, account }) {
  const [title, setTitle] = useState("");
  const [candidates, setCandidates] = useState([]);
  const [newCandidate, setNewCandidate] = useState("");
  const [newVoter, setNewVoter] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [winner, setWinner] = useState(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);

  useEffect(() => {
    loadElectionData();
  }, [election]);

  const loadElectionData = async () => {
    try {
      const title = await election.contract.title();
      setTitle(title);

      const admin = await election.contract.owner();
      setIsAdmin(admin.toLowerCase() === account.toLowerCase());

      const count = await election.contract.candidatesCount();
      const list = [];
      for (let i = 1; i <= Number(count); i++) {
        const c = await election.contract.candidates(i);
        list.push({ id: i, name: c.name, votes: Number(c.voteCount) });
      }
      setCandidates(list);

      const started = await election.contract.started();
      const ended = await election.contract.ended();
      setStatus(ended ? "Ended" : started ? "Voting" : "Idle");

      const reg = await election.contract.isRegistered(account);
      setIsRegistered(reg);

      const voted = await election.contract.hasVoted(account);
      setHasVoted(voted);

      if (ended) {
        const [id, name, votes] = await election.contract.getWinner();
        if (id > 0) setWinner({ id, name, votes: Number(votes) });
      }
    } catch (err) {
      console.error("Error loading election data:", err);
    }
  };

  // --- Admin Functions ---
  const addCandidate = async () => {
    if (!isAdmin) return alert("Only admin can add candidates!");
    if (!newCandidate.trim()) return alert("Enter candidate name!");
    try {
      setLoading(true);
      const tx = await election.contract.addCandidate(newCandidate);
      await tx.wait();
      alert("✅ Candidate added!");
      setNewCandidate("");
      await loadElectionData();
    } catch (err) {
      console.error("Error adding candidate:", err);
      alert(err.reason || err.message);
    } finally {
      setLoading(false);
    }
  };

  const registerVoter = async () => {
    if (!isAdmin) return alert("Only admin can register voters!");
    if (!newVoter.trim()) return alert("Enter voter address!");
    try {
      setLoading(true);
      const tx = await election.contract.registerVoter(newVoter);
      await tx.wait();
      alert("✅ Voter registered!");
      setNewVoter("");
    } catch (err) {
      console.error("Error registering voter:", err);
      alert(err.reason || err.message);
    } finally {
      setLoading(false);
    }
  };

  const startElection = async () => {
    if (!isAdmin) return;
    try {
      setLoading(true);
      const tx = await election.contract.startElection();
      await tx.wait();
      alert("🚀 Election started!");
      await loadElectionData();
    } catch (err) {
      console.error("Error starting election:", err);
    } finally {
      setLoading(false);
    }
  };

  const endElection = async () => {
    if (!isAdmin) return;
    try {
      setLoading(true);
      const tx = await election.contract.endElection();
      await tx.wait();
      alert("🏁 Election ended!");
      await loadElectionData();
    } catch (err) {
      console.error("Error ending election:", err);
    } finally {
      setLoading(false);
    }
  };

  // --- Voter Function ---
  const vote = async (candidateId) => {
    if (!isRegistered) return alert("You are not registered for this election!");
    if (status !== "Voting") return alert("Election not active!");
    try {
      setLoading(true);
      const tx = await election.contract.vote(candidateId);
      await tx.wait();
      alert("🗳️ Vote submitted!");
      await loadElectionData();
    } catch (err) {
      console.error("Voting error:", err);
      alert(err.reason || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="container">
      <button onClick={onBack} className="action-btn small">
        ← Back
      </button>

      <h2>{title}</h2>
      <p>Status: <strong>{status}</strong></p>

      {/* --- ADMIN PANEL --- */}
      {isAdmin && (
        <div className="admin-panel">
          <h3>🧑‍💼 Admin Panel</h3>

          <div>
            <input
              type="text"
              placeholder="New candidate name"
              value={newCandidate}
              onChange={(e) => setNewCandidate(e.target.value)}
            />
            <button onClick={addCandidate} disabled={loading} className="action-btn primary">
              Add Candidate
            </button>
          </div>

          <div>
            <input
              type="text"
              placeholder="Register voter (address)"
              value={newVoter}
              onChange={(e) => setNewVoter(e.target.value)}
            />
            <button onClick={registerVoter} disabled={loading} className="action-btn">
              Register Voter
            </button>
          </div>

          <div className="admin-controls">
            <button onClick={startElection} disabled={loading || status !== "Idle"} className="action-btn primary">
              Start Election
            </button>
            <button onClick={endElection} disabled={loading || status !== "Voting"} className="action-btn danger">
              End Election
            </button>
          </div>
        </div>
      )}

      {/* --- CANDIDATES --- */}
      <h3>🗳️ Candidates</h3>
      {candidates.length === 0 ? (
        <p>No candidates yet.</p>
      ) : (
        <div className="candidate-list">
          {candidates.map((c) => (
            <div key={c.id} className="candidate-card">
              <strong>{c.name}</strong> — Votes: {c.votes}
              {status === "Voting" && isRegistered && !hasVoted && (
                <button onClick={() => vote(c.id)} className="action-btn small">Vote</button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* --- WINNER --- */}
      {status === "Ended" && winner && (
        <div className="winner">
          <h3>🏆 Winner</h3>
          <p>{winner.name} ({winner.votes} votes)</p>
        </div>
      )}
    </main>
  );
}


export default App;
