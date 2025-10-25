import { ethers } from "ethers";
import { electionFactoryAddress, factoryContractAddress } from "./config"; // this should come from your new deploy script
import ElectionFactoryABI from "./abi/ElectionFactory.json"; // ✅ Factory ABI
import ElectionABI from "./abi/ElectionSystem.json"; // ✅ Individual Election ABI

// ---- Basic setup ----
function getProvider() {
  if (!window.ethereum) {
    alert("Please install MetaMask!");
    throw new Error("MetaMask not found");
  }
  return new ethers.BrowserProvider(window.ethereum);
}

async function getSigner() {
  const provider = getProvider();
  return await provider.getSigner();
}

// ---- Factory Contract ----
export async function getFactoryContract() {
  const signer = await getSigner();
  return new ethers.Contract(factoryContractAddress, ElectionFactoryABI.abi, signer);
}

// ---- Election Contract ----
export async function getElectionContract(electionAddress) {
  const signer = await getSigner();
  return new ethers.Contract(electionAddress, ElectionABI.abi, signer);
}

// ---- Helper: Create new election ----
export async function createNewElection(title) {
  const factory = await getFactoryContract();
  const tx = await factory.createElection(title);
  await tx.wait();
  alert(`✅ Election "${title}" created successfully!`);
}

// ---- Helper: Get all elections ----
export async function getAllElections() {
  const factory = await getFactoryContract();
  return await factory.getAllElections(); // returns list of addresses
}
