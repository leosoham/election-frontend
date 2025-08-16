import { SEPOLIA } from "./config";

export async function connectWallet() {
  if (!window.ethereum) {
    alert("MetaMask is not installed!");
    return null;
  }

  try {
    const accounts = await window.ethereum.request({
      method: "eth_requestAccounts",
    });

    return accounts[0]; // first account
  } catch (err) {
    console.error(err);
    return null;
  }
}

export async function switchToSepolia() {
  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: "0xaa36a7" }], // Sepolia chainId in hex
    });
  } catch (error) {
    // If Sepolia is not added to MetaMask
    if (error.code === 4902) {
      try {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: "0xaa36a7",
              chainName: "Sepolia Test Network",
              nativeCurrency: {
                name: "SepoliaETH",
                symbol: "ETH",
                decimals: 18,
              },
              rpcUrls: ["https://sepolia.infura.io/v3/12722f05ed1a4168bd766a2d431ba1bd"], 
              blockExplorerUrls: ["https://sepolia.etherscan.io"],
            },
          ],
        });
      } catch (addError) {
        console.error("Error adding Sepolia:", addError);
      }
    } else {
      console.error("Error switching to Sepolia:", error);
    }
  }
}
