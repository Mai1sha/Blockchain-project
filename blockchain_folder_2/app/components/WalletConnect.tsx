"use client";

import { useState } from "react";
import {
  createWalletClient,
  custom,
  defineChain,
} from "viem";

const didlab = defineChain({
  id: 252501,
  name: "DIDLab",
  nativeCurrency: {
    name: "TRUST",
    symbol: "TRUST",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ["https://eth.didlab.org"],
    },
  },
  blockExplorers: {
    default: {
      name: "DIDLab Explorer",
      url: "https://explorer.didlab.org",
    },
  },
});

export default function WalletConnect() {
  const [account, setAccount] = useState("");
  const [status, setStatus] = useState("Wallet not connected");

  async function connectWallet() {
    const ethereum = (
      window as Window & { ethereum?: any }
    ).ethereum;

    if (!ethereum) {
      setStatus("MetaMask not detected");
      return;
    }

    try {
      const walletClient = createWalletClient({
        chain: didlab,
        transport: custom(ethereum),
      });

      const [address] = await walletClient.requestAddresses();

      const chainId = await walletClient.getChainId();

      if (chainId !== 252501) {
        setStatus("Wrong network. Switching to DIDLab...");

        try {
          await walletClient.switchChain({ id: 252501 });
        } catch (error: any) {
          if (error.code === 4902) {
            await walletClient.addChain({ chain: didlab });
            await walletClient.switchChain({ id: 252501 });
          } else {
            setStatus("Please switch to DIDLab network");
            return;
          }
        }
      }

      const confirmedChainId = await walletClient.getChainId();

      if (confirmedChainId !== 252501) {
        setStatus("Wrong network. Please select DIDLab.");
        return;
      }

      setAccount(address);
      setStatus("Connected to DIDLab");
    } catch (error) {
      console.error(error);
      setStatus("Wallet connection failed or was rejected");
    }
  }

  return (
    <div className="rounded-xl border border-purple-300 bg-white p-6 shadow-md text-gray-900">
      <h2 className="text-xl font-bold mb-4">
        MetaMask Wallet
      </h2>

      <button
        onClick={connectWallet}
        className="rounded-lg bg-purple-600 px-5 py-3 text-white hover:bg-purple-700"
      >
        Connect MetaMask
      </button>

      <p className="mt-4">
        <strong>Status:</strong> {status}
      </p>

      {account && (
        <p className="mt-2 break-all">
          <strong>Wallet Address:</strong> {account}
        </p>
      )}
    </div>
  );
}