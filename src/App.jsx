import { useEffect, useState } from "react";
import { connectWallet, switchToSepolia } from "./wallet";
import { getContract } from "./contract";
import { CONTRACT_ADDRESS } from "./config";

function App() {
  const [account, setAccount] = useState(null);
  const [isSepolia, setIsSepolia] = useState(false);
  const [isOwner, setIsOwner] = useState(false);

  const [candidates, setCandidates] = useState([]);
  const [electionActive, setElectionActive] = useState(false);
  const [winner, setWinner] = useState(null);
  const [round, setRound] = useState(0);
  const [isRegistered, setIsRegistered] = useState(false);

  const [newCandidate, setNewCandidate] = useState("");
  const [registerAddr, setRegisterAddr] = useState("");

  useEffect(() => {
    if (!window.ethereum) return;
    checkNetwork();

    window.ethereum.on("accountsChanged", async (accounts) => {
      const acc = accounts[0] || null;
      setAccount(acc);
      if (acc) {
        await postConnectLoad(acc);
      } else {
        resetUI();
      }
    });

    window.ethereum.on("chainChanged", () => {
      checkNetwork();
      // Hard reload is often required after network change
      window.location.reload();
    });
  }, []);

  function resetUI() {
    setIsOwner(false);
    setCandidates([]);
    setElectionActive(false);
    setWinner(null);
    setRound(0);
    setIsRegistered(false);
  }

  async function checkNetwork() {
    const cid = await window.ethereum.request({ method: "eth_chainId" });
    setIsSepolia(cid === "0xaa36a7");
  }

  async function handleConnect() {
    const acc = await connectWallet();
    if (acc) {
      setAccount(acc);
      await postConnectLoad(acc);
    }
  }

  async function postConnectLoad(acc) {
    await Promise.all([
      checkOwner(acc),
      fetchElectionStatus(),
      fetchCandidates(),
      checkRegistration(acc),
    ]);
  }

  async function checkOwner(addr) {
    const c = await getContract();
    const owner = await c.owner();
    setIsOwner(owner.toLowerCase() === addr.toLowerCase());
  }

  async function checkRegistration(addr) {
    const c = await getContract();
    const reg = await c.registeredVoters(addr);
    setIsRegistered(Boolean(reg));
  }

  async function fetchElectionStatus() {
    const c = await getContract();
    const started = await c.electionStarted();
    const ended = await c.electionEnded();
    const r = await c.round();
    setElectionActive(Boolean(started) && !Boolean(ended));
    setRound(Number(r));

    if (ended) {
      try {
        const w = await c.getWinner();
        setWinner({
          id: Number(w[0]),
          name: w[1],
          votes: Number(w[2]),
        });
      } catch (e) {
        console.error("getWinner error:", e);
      }
    } else {
      setWinner(null);
    }
  }

  async function fetchCandidates() {
    const c = await getContract();
    const count = await c.candidatesCount();
    const list = [];
    for (let i = 1; i <= Number(count); i++) {
      const cand = await c.candidates(i); // { id, name }
      let votes = 0;
      try {
        votes = await c.getVotes(i);
      } catch {}
      list.push({
        id: Number(cand.id ?? cand[0]),
        name: cand.name ?? cand[1],
        votes: Number(votes),
      });
    }
    setCandidates(list);
  }

  // ------- Admin Actions -------
  async function addCandidate() {
    if (!newCandidate.trim()) return alert("Enter a candidate name");
    const c = await getContract();
    const tx = await c.addCandidate(newCandidate.trim());
    await tx.wait();
    setNewCandidate("");
    await fetchCandidates();
  }

  async function registerVoter() {
    if (!registerAddr.trim()) return alert("Enter wallet address");
    const c = await getContract();
    const tx = await c.registerVoter(registerAddr.trim());
    await tx.wait();
    setRegisterAddr("");
    if (account && registerAddr.trim().toLowerCase() === account.toLowerCase()) {
      setIsRegistered(true);
    }
    alert("Voter registered!");
  }

  async function startElection() {
    const c = await getContract();
    const tx = await c.startElection();
    await tx.wait();
    await fetchElectionStatus();
    await fetchCandidates();
  }

  async function endElection() {
    try {
      const c = await getContract();
      const tx = await c.endElection();
      await tx.wait();
      await fetchElectionStatus();
      await fetchCandidates();
    } catch (e) {
      alert(e?.reason || "End failed");
    }
  }

  async function resetAll() {
    if (!confirm("This will clear candidates and stop the election. Continue?")) return;
    const c = await getContract();
    const tx = await c.resetAll();
    await tx.wait();
    await fetchElectionStatus();
    await fetchCandidates();
  }

  // ------- Voting -------
  async function vote(id) {
    if (!isRegistered) {
      return alert("You are not registered to vote.");
    }
    try {
      const c = await getContract();
      const tx = await c.vote(id);
      await tx.wait();
      alert("Vote submitted!");
      await fetchCandidates();
    } catch (e) {
      alert(e?.reason || "Vote failed");
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 flex flex-col items-center">
      <div className="w-full max-w-3xl">
        <header className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold"> CR Election DApp</h1>
          {!account ? (
            <button
              onClick={handleConnect}
              className="px-4 py-2 rounded bg-blue-600 text-white"
            >
              Connect Wallet
            </button>
          ) : (
            <div className="text-sm">
              <div className="font-mono truncate max-w-xs">{account}</div>
              {!isSepolia && (
                <button
                  onClick={switchToSepolia}
                  className="mt-1 text-yellow-700 underline"
                >
                  Switch to Sepolia
                </button>
              )}
            </div>
          )}
        </header>

        <section className="mb-4">
          <div className="p-4 bg-white rounded shadow">
            <div className="flex flex-wrap items-center gap-4">
              <span className="text-sm">Round: <b>{round}</b></span>
              <span className="text-sm">
                Status:{" "}
                {electionActive ? (
                  <b className="text-green-600">Active</b>
                ) : winner ? (
                  <b className="text-purple-600">Ended</b>
                ) : (
                  <b className="text-gray-500">Idle</b>
                )}
              </span>
              {account && (
                <span className="text-sm">
                  You are {isRegistered ? <b className="text-green-700">Registered</b> : <b className="text-red-600">Not Registered</b>}
                </span>
              )}
              {isOwner && <span className="text-sm bg-black/5 px-2 py-1 rounded">Admin</span>}
            </div>
          </div>
        </section>

        {isOwner && (
          <section className="mb-6 grid gap-4">
            <div className="p-4 bg-white rounded shadow grid gap-3">
              <h2 className="font-semibold">Admin: Manage</h2>
              <div className="flex gap-2">
                <input
                  value={newCandidate}
                  onChange={(e) => setNewCandidate(e.target.value)}
                  placeholder="Candidate name"
                  className="flex-1 border rounded px-3 py-2"
                />
                <button onClick={addCandidate} className="px-3 py-2 rounded bg-gray-800 text-white">
                  Add Candidate
                </button>
              </div>
              <div className="flex gap-2">
                <input
                  value={registerAddr}
                  onChange={(e) => setRegisterAddr(e.target.value)}
                  placeholder="Voter wallet (0x...)"
                  className="flex-1 border rounded px-3 py-2"
                />
                <button onClick={registerVoter} className="px-3 py-2 rounded bg-gray-800 text-white">
                  Register Voter
                </button>
              </div>
              <div className="flex gap-2">
                <button onClick={startElection} className="px-3 py-2 rounded bg-green-600 text-white">
                  Start Election (new round)
                </button>
                <button onClick={endElection} className="px-3 py-2 rounded bg-red-600 text-white">
                  End Election
                </button>
                <button onClick={resetAll} className="px-3 py-2 rounded bg-yellow-500 text-white">
                  Reset All (clear candidates)
                </button>
              </div>
            </div>
          </section>
        )}

        {/* Winner */}
        {!electionActive && winner && (
          <section className="mb-6">
            <div className="p-4 bg-green-100 border border-green-300 rounded">
               Winner: <b>{winner.name || "—"}</b> with <b>{winner.votes}</b> votes (Round {round})
            </div>
          </section>
        )}

        {/* Candidates & vote */}
        <section className="grid gap-3">
          {candidates.length === 0 ? (
            <div className="p-4 bg-white rounded shadow text-gray-500">No candidates yet.</div>
          ) : (
            candidates.map((c) => (
              <div key={c.id} className="p-4 bg-white rounded shadow flex items-center justify-between">
                <div>
                  <div className="font-semibold">{c.name}</div>
                  <div className="text-sm text-gray-600">Votes: {c.votes}</div>
                </div>
                {electionActive ? (
                  <button
                    onClick={() => vote(c.id)}
                    className="px-3 py-2 rounded bg-blue-600 text-white"
                    disabled={!isRegistered}
                  >
                    Vote
                  </button>
                ) : (
                  <span className="text-sm text-gray-500">Voting closed</span>
                )}
              </div>
            ))
          )}
        </section>
      </div>
    </div>
  );
}

export default App;
