import { ethers } from "ethers";
import { CONTRACT_ADDRESS } from "./config";
import ElectionABI from "./abi/Election.json"; // path to your ABI

// Get Ethereum provider from MetaMask
function getProvider() {
  if (!window.ethereum) {
    alert("Please install MetaMask!");
    throw new Error("MetaMask not found");
  }
  return new ethers.BrowserProvider(window.ethereum);
}

// Get signer (the connected wallet)
async function getSigner() {
  const provider = getProvider();
  return await provider.getSigner();
}

// Create contract instance for reading/writing
export async function getContract() {
  const signer = await getSigner();
  return new ethers.Contract(CONTRACT_ADDRESS, ElectionABI.abi, signer);
}
