
"use client";

import { useEffect, useState } from "react";
import {
  BrowserProvider,
  Contract,
  sha256,
  randomBytes,
  hexlify,
} from "ethers";


const CONTRACT_ADDRESS =
  "0x6d10ea2912505E6e00C76510bACCFa5819d57C10";

const CHAIN_ID = BigInt(252501);
const CHAIN_HEX = "0x3da55";

const ABI = [
  "function get(bytes32 recordId) view returns ((bytes32 digest, string cid, address submitter, uint64 submittedAt, address verifier, uint64 verifiedAt))",
  "function verify(bytes32 recordId)",
  "function anchor(bytes32 recordId, bytes32 digest, string cid)",
  "function PROVIDER() view returns (bytes32)",
  "function CLIENT() view returns (bytes32)",
  "function hasRole(bytes32 role, address account) view returns (bool)",
];



export default function ArtifactVerificationPage() {
  const [recordId, setRecordId] = useState("");
  const [account, setAccount] = useState("");
  const [status, setStatus] = useState("");
  const [cid, setCid] = useState("");
  const [expectedHash, setExpectedHash] = useState("");
  const [calculatedHash, setCalculatedHash] = useState("");

  const [recordSubmitter, setRecordSubmitter] = useState("");
  const [recordSubmittedAt, setRecordSubmittedAt] = useState("");
  const [recordVerifier, setRecordVerifier] = useState("");
  const [recordVerifiedAt, setRecordVerifiedAt] = useState("");
  const [integrityPassed, setIntegrityPassed] = useState(false);
  const [busy, setBusy] = useState(false);


  const [isProvider, setIsProvider] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [roleStatus, setRoleStatus] = useState("");

  const [anchorDigest, setAnchorDigest] = useState("");
const [anchorCid, setAnchorCid] = useState("");
const [anchorResult, setAnchorResult] = useState("");


  useEffect(() => {
  if (!window.ethereum) return;

  const handleWalletChange = () => {
    setAccount("");
    setIsProvider(false);
    setIsClient(false);
    setRoleStatus("");
    setIntegrityPassed(false);
    setCid("");
    setExpectedHash("");
    setCalculatedHash("");
    setStatus("Wallet or network changed. Reconnect MetaMask.");
  };

  const ethereum = window.ethereum as typeof window.ethereum & {
  on?: (event: string, listener: (...args: unknown[]) => void) => void;
  removeListener?: (
    event: string,
    listener: (...args: unknown[]) => void
  ) => void;
};

ethereum.on?.("accountsChanged", handleWalletChange);
ethereum.on?.("chainChanged", handleWalletChange);

return () => {
  ethereum.removeListener?.("accountsChanged", handleWalletChange);
  ethereum.removeListener?.("chainChanged", handleWalletChange);
};

}, []);

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

  async function checkWalletRole(walletAddress: string) {
  const contract = await getContract();

  const providerRole = await contract.PROVIDER();
  const clientRole = await contract.CLIENT();

  const [providerAllowed, clientAllowed] = await Promise.all([
    contract.hasRole(providerRole, walletAddress),
    contract.hasRole(clientRole, walletAddress),
  ]);

  setIsProvider(providerAllowed);
  setIsClient(clientAllowed);

  if (providerAllowed && clientAllowed) {
    setRoleStatus("Connected wallet has PROVIDER and CLIENT roles.");
  } else if (providerAllowed) {
    setRoleStatus("Connected as PROVIDER — anchoring is permitted.");
  } else if (clientAllowed) {
    setRoleStatus("Connected as CLIENT — verification is permitted.");
  } else {
    setRoleStatus(
      "No authorized role found. Anchoring and verification are restricted."
    );
  }
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

      const connectedAccount = accounts[0] ?? "";

setAccount(connectedAccount);
setIntegrityPassed(false);
setIsProvider(false);
setIsClient(false);
setRoleStatus("");

if (!connectedAccount) {
  throw new Error("No MetaMask account selected.");
}

await checkWalletRole(connectedAccount);

setStatus("Wallet connected to DIDLab. Permissions checked.");
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
    setRecordSubmitter("");
    setRecordSubmittedAt("");
    setRecordVerifier("");
    setRecordVerifiedAt("");

    try {
      if (!/^0x[a-fA-F0-9]{64}$/.test(recordId.trim())) {
        throw new Error("Enter a valid 32-byte record ID.");
      }

      setStatus("Reading the record from the blockchain...");

      const contract = await getContract();
      const record = await contract.get(recordId.trim());

      const onChainDigest = String(record.digest);
      const storedCid = String(record.cid);


      const submittedAt = Number(record.submittedAt);
      const verifiedAt = Number(record.verifiedAt);

setRecordSubmitter(String(record.submitter));

setRecordSubmittedAt(
  submittedAt > 0
    ? new Date(submittedAt * 1000).toLocaleString()
    : "Not submitted"
);

setRecordVerifier(
  verifiedAt > 0
    ? String(record.verifier)
    : "Not yet verified"
);

setRecordVerifiedAt(
  verifiedAt > 0
    ? new Date(verifiedAt * 1000).toLocaleString()
    : "Not yet verified"
);


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


async function anchorRecord() {
  setBusy(true);
  setAnchorResult("");

  try {
    const digest = anchorDigest.trim();
    const cid = anchorCid.trim();

    // Validate the ciphertext SHA-256 digest.
    if (!/^0x[a-fA-F0-9]{64}$/.test(digest)) {
      throw new Error("Enter a valid SHA-256 digest beginning with 0x.");
    }

    if (!cid) {
      throw new Error("Enter the encrypted artifact's IPFS CID.");
    }

    const contract = await getContract();

    // Check the actual connected wallet's permission on-chain.
    const signerAddress = await (
  await new BrowserProvider(window.ethereum!).getSigner()
  ).getAddress();
    if (!signerAddress) {
      throw new Error("Connect a MetaMask wallet first.");
    }

    if (signerAddress.toLowerCase() !== account.toLowerCase()) {
      throw new Error("Wallet changed. Reconnect MetaMask.");
    }

    const providerRole = await contract.PROVIDER();
    const authorized = await contract.hasRole(
      providerRole,
      signerAddress
    );

    if (!authorized) {
      throw new Error("NotAuthorized: PROVIDER role required.");
    }

    // Create a random 32-byte record identifier.
    const newRecordId = hexlify(randomBytes(32));

    setAnchorResult("Checking transaction before submission...");

    // Simulate the contract call first.
    await contract.anchor.staticCall(newRecordId, digest, cid);

    setAnchorResult("Requesting MetaMask transaction approval...");

    const tx = await contract.anchor(newRecordId, digest, cid);

    setAnchorResult(`Transaction submitted: ${tx.hash}`);

    const receipt = await tx.wait();

    if (!receipt || receipt.status !== 1) {
      throw new Error("Anchoring transaction failed.");
    }

    setAnchorResult(
      `ANCHOR SUCCESSFUL!\nRecord ID: ${newRecordId}\nTransaction: ${tx.hash}`
    );

    // Display the newly anchored record.
    setRecordId(newRecordId);
    setIntegrityPassed(false);
  } catch (error) {
    setAnchorResult(
      error instanceof Error ? error.message : String(error)
    );
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

        {account && roleStatus && (
  <div className="mt-4 rounded-lg border border-indigo-200 bg-indigo-50 p-4">
    <p className="text-sm font-semibold text-indigo-900">
      Wallet Authorization Status
    </p>

    <p className="mt-2 text-sm text-indigo-700">
      {roleStatus}
    </p>
  </div>
)}


{/* Provider-only anchoring section */}
{isProvider && (
  <section className="mt-8 rounded-xl border border-indigo-200 bg-indigo-50 p-6">
    <h2 className="text-xl font-bold text-slate-900">
      Anchor an Encrypted Artifact
    </h2>

    <p className="mt-2 text-sm text-slate-600">
      Enter the SHA-256 digest and IPFS CID of an artifact
      already encrypted and uploaded through DIDLab Secure IPFS.
    </p>

    <label className="mt-5 block text-sm font-semibold">
      Ciphertext SHA-256 Digest
    </label>

    <input
      type="text"
      value={anchorDigest}
      onChange={(event) => setAnchorDigest(event.target.value)}
      placeholder="0x..."
      className="mt-2 w-full rounded-lg border border-slate-300 bg-white p-3 font-mono text-sm"
    />

    <label className="mt-5 block text-sm font-semibold">
      IPFS CID
    </label>

    <input
      type="text"
      value={anchorCid}
      onChange={(event) => setAnchorCid(event.target.value)}
      placeholder="Qm... or bafy..."
      className="mt-2 w-full rounded-lg border border-slate-300 bg-white p-3 text-sm"
    />

    <button
      type="button"
      onClick={anchorRecord}
      disabled={busy || !account}
      className="mt-5 rounded-lg bg-indigo-700 px-5 py-3 font-medium text-white disabled:opacity-50"
    >
      Anchor Record On-Chain
    </button>

    {anchorResult && (
      <p
        role="status"
        className="mt-4 whitespace-pre-wrap break-all text-sm text-slate-800"
      >
        {anchorResult}
      </p>
    )}
  </section>
)}


        <label className="mt-8 block text-sm font-semibold">
          Record ID
        </label>


        <input
          value={recordId}
          onChange={(event) => {
  setRecordId(event.target.value);
  setIntegrityPassed(false);
  setCid("");
  setExpectedHash("");
  setCalculatedHash("");
  setRecordSubmitter("");
  setRecordSubmittedAt("");
  setRecordVerifier("");
  setRecordVerifiedAt("");
  setStatus("");
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


{/* On-chain record information */}
{recordSubmitter && (
  <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-5">
    <h2 className="text-lg font-bold text-slate-900">
      On-Chain Record Status
    </h2>

    <div className="mt-4 space-y-3 text-sm text-slate-700">
      <p className="break-all">
        <strong>Submitted by:</strong> {recordSubmitter}
      </p>

      <p>
        <strong>Submitted at:</strong> {recordSubmittedAt}
      </p>

      <p>
        <strong>Verification Status:</strong>{" "}
        {recordVerifiedAt === "Not yet verified"
          ? "Pending Verification"
          : "Verified"}
      </p>

      <p className="break-all">
        <strong>Verified by:</strong> {recordVerifier}
      </p>

      <p>
        <strong>Verified at:</strong> {recordVerifiedAt}
      </p>
    </div>
  </div>
)}


        <p
          role="status"
          aria-live="polite"
          className="mt-5 break-words font-medium"
        >
          {status}
        </p>

       {isClient && (
  <button
    onClick={verifyRecord}
    disabled={
  !integrityPassed ||
  busy ||
  recordVerifiedAt !== "Not yet verified"
}
    className="mt-6 rounded-lg bg-emerald-700 px-5 py-3 font-medium text-white disabled:opacity-50"
  >
    Verify Record On-Chain
  </button>
)}
      </div>
    </main>
  );
}
