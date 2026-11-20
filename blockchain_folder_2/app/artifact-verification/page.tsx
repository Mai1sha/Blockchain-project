
"use client";

import { useState } from "react";
import { BrowserProvider, Contract, sha256 } from "ethers";


const CONTRACT_ADDRESS =
  "0x6d10ea2912505E6e00C76510bACCFa5819d57C10";

const CHAIN_ID = BigInt(252501);
const CHAIN_HEX = "0x3da55";

const ABI = [
  "function get(bytes32 recordId) view returns ((bytes32 digest, string cid, address submitter, uint64 submittedAt, address verifier, uint64 verifiedAt))",
  "function verify(bytes32 recordId)",
];



export default function ArtifactVerificationPage() {
  const [recordId, setRecordId] = useState("");
  const [account, setAccount] = useState("");
  const [status, setStatus] = useState("");
  const [cid, setCid] = useState("");
  const [expectedHash, setExpectedHash] = useState("");
  const [calculatedHash, setCalculatedHash] = useState("");
  const [integrityPassed, setIntegrityPassed] = useState(false);
  const [busy, setBusy] = useState(false);

  async function getContract() {
    if (!window.ethereum) {
      throw new Error("MetaMask is not installed.");
    }

    const provider = new BrowserProvider(window.ethereum);
    const network = await provider.getNetwork();

    if (network.chainId !== CHAIN_ID) {
      throw new Error("Wrong network. Switch MetaMask to DIDLab.");
    }

    const signer = await provider.getSigner();

    return new Contract(CONTRACT_ADDRESS, ABI, signer);
  }

  async function connectWallet() {
    try {
      if (!window.ethereum) {
        throw new Error("Install MetaMask first.");
      }

      const accounts = (await window.ethereum.request({
        method: "eth_requestAccounts",
      })) as string[];

      const chainId = (await window.ethereum.request({
        method: "eth_chainId",
      })) as string;

      if (chainId.toLowerCase() !== CHAIN_HEX) {
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: CHAIN_HEX }],
        });
      }

      setAccount(accounts[0] ?? "");
      setIntegrityPassed(false);
      setStatus("Wallet connected to DIDLab.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error));
    }
  }

  async function checkIntegrity() {
    setBusy(true);
    setIntegrityPassed(false);
    setCid("");
    setExpectedHash("");
    setCalculatedHash("");

    try {
      if (!/^0x[a-fA-F0-9]{64}$/.test(recordId.trim())) {
        throw new Error("Enter a valid 32-byte record ID.");
      }

      setStatus("Reading the record from the blockchain...");

      const contract = await getContract();
      const record = await contract.get(recordId.trim());

      const onChainDigest = String(record.digest);
      const storedCid = String(record.cid);

      if (!storedCid) {
        throw new Error("No IPFS CID found for this record.");
      }

      setCid(storedCid);
      setExpectedHash(onChainDigest);

      setStatus("Downloading encrypted ciphertext from IPFS...");

      const response = await fetch(
        `https://gateway.didlab.org/ipfs/${encodeURIComponent(storedCid)}`,
        { cache: "no-store" }
      );

      if (!response.ok) {
        throw new Error(`IPFS download failed: HTTP ${response.status}`);
      }

      const ciphertext = new Uint8Array(await response.arrayBuffer());

      const actualDigest = sha256(ciphertext);
      setCalculatedHash(actualDigest);

      if (actualDigest.toLowerCase() !== onChainDigest.toLowerCase()) {
        throw new Error("INTEGRITY FAILED: SHA-256 does not match.");
      }

      setIntegrityPassed(true);
      setStatus(
        `INTEGRITY PASSED: ${ciphertext.length} bytes match the blockchain digest.`
      );
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  async function verifyRecord() {
    if (!integrityPassed) return;

    setBusy(true);

    try {
      setStatus("Requesting client verification transaction...");

      const contract = await getContract();
      const tx = await contract.verify(recordId.trim());

      setStatus(`Transaction submitted: ${tx.hash}`);

      await tx.wait();

      setStatus(`Record verified successfully! Transaction: ${tx.hash}`);
      setIntegrityPassed(false);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-12 text-slate-900">
      <div className="mx-auto max-w-2xl rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <a href="/" className="text-sm font-medium text-indigo-700">
          ← Back to ServicePortal
        </a>

        <h1 className="mt-5 text-3xl font-bold">
          Artifact Verification
        </h1>

        <p className="mt-3 text-slate-600">
          Verify an encrypted service deliverable against its
          SHA-256 commitment on the DIDLab blockchain.
        </p>

        <button
          onClick={connectWallet}
          disabled={busy}
          className="mt-7 rounded-lg bg-indigo-700 px-5 py-3 font-medium text-white disabled:opacity-50"
        >
          Connect MetaMask
        </button>

        {account && (
          <p className="mt-3 break-all text-sm text-slate-600">
            Connected wallet: {account}
          </p>
        )}

        <label className="mt-8 block text-sm font-semibold">
          Record ID
        </label>

        <input
          value={recordId}
          onChange={(event) => {
            setRecordId(event.target.value);
            setIntegrityPassed(false);
          }}
          placeholder="0x..."
          className="mt-2 w-full rounded-lg border border-slate-300 p-3 font-mono text-sm"
        />

        <button
          onClick={checkIntegrity}
          disabled={busy || !account}
          className="mt-4 rounded-lg bg-slate-800 px-5 py-3 font-medium text-white disabled:opacity-50"
        >
          Check Artifact Integrity
        </button>

        {cid && (
          <div className="mt-6 space-y-3 rounded-lg bg-slate-100 p-4 text-sm">
            <p className="break-all">
              <strong>IPFS CID:</strong> {cid}
            </p>
            <p className="break-all">
              <strong>On-chain SHA-256:</strong> {expectedHash}
            </p>
            {calculatedHash && (
              <p className="break-all">
                <strong>Calculated SHA-256:</strong> {calculatedHash}
              </p>
            )}
          </div>
        )}

        <p
          role="status"
          aria-live="polite"
          className="mt-5 break-words font-medium"
        >
          {status}
        </p>

        <button
          onClick={verifyRecord}
          disabled={!integrityPassed || busy}
          className="mt-6 rounded-lg bg-emerald-700 px-5 py-3 font-medium text-white disabled:opacity-50"
        >
          Verify Record On-Chain
        </button>
      </div>
    </main>
  );
}
