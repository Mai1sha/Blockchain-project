
"use client";

import { useEffect, useState } from "react";
import { keccak256, stringToHex } from "viem";
import { readEngagement } from "../lib/escrow";
import { supabase } from "../lib/supabase";

const ENGAGEMENT_ID = 6;
const ORIGINAL_DESCRIPTION = "web design";
const DIDLAB_CHAIN_ID = "0x3da55";

type ChallengeResponse = {
  message: string;
  expiresAt: string;
};

type ReadSpecResponse = {
  description: string;
  storedHash: string;
  calculatedHash: string;
  onChainHash: string;
  matchesBlockchain: boolean;
};

type EthereumProvider = {
  request: (args: {
    method: string;
    params?: unknown[];
  }) => Promise<unknown>;
  on?: (event: string, callback: (value: unknown) => void) => void;
  removeListener?: (
    event: string,
    callback: (value: unknown) => void
  ) => void;
};

function getProvider(): EthereumProvider {
  const ethereum = (
    window as Window & { ethereum?: EthereumProvider }
  ).ethereum;

  if (!ethereum) {
    throw new Error("MetaMask is not detected.");
  }

  return ethereum;
}

async function getErrorMessage(error: {
  message: string;
  context?: unknown;
}): Promise<string> {
  if (error.context instanceof Response) {
    const body = await error.context.text();
    return `HTTP ${error.context.status}: ${body || error.message}`;
  }

  return error.message;
}

export default function EngagementSpecification() {
  const [specHash, setSpecHash] =
    useState<`0x${string}` | null>(null);
  const [clientWallet, setClientWallet] = useState("");
  const [providerWallet, setProviderWallet] = useState("");
  const [connectedWallet, setConnectedWallet] = useState("");

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [description, setDescription] = useState("");
  const [result, setResult] =
    useState<"match" | "mismatch" | null>(null);

  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [saveError, setSaveError] = useState("");

  const [retrieving, setRetrieving] = useState(false);
  const [retrieveError, setRetrieveError] = useState("");
  const [storedDescription, setStoredDescription] = useState("");
  const [databaseMatch, setDatabaseMatch] =
    useState<boolean | null>(null);

  const [hasRetrieved, setHasRetrieved] = useState(false);

  const isClient =
    !!connectedWallet &&
    !!clientWallet &&
    connectedWallet.toLowerCase() === clientWallet.toLowerCase();

  const isProvider =
    !!connectedWallet &&
    !!providerWallet &&
    connectedWallet.toLowerCase() === providerWallet.toLowerCase();

  // Read engagement information from DIDLab.
  useEffect(() => {
    async function loadEngagement() {
      try {
        const engagement = await readEngagement(
          BigInt(ENGAGEMENT_ID)
        );

        setSpecHash(engagement.specHash);
        setClientWallet(engagement.client);
        setProviderWallet(engagement.provider);
      } catch (error) {
        setLoadError(
          error instanceof Error
            ? error.message
            : "Failed to read engagement."
        );
      } finally {
        setLoading(false);
      }
    }

    loadEngagement();
  }, []);

  // Track the connected MetaMask account.
  useEffect(() => {
    const ethereum = (
      window as Window & { ethereum?: EthereumProvider }
    ).ethereum;

    if (!ethereum) return;

    const updateWallet = (value: unknown) => {
      const accounts = Array.isArray(value) ? value : [];
      setConnectedWallet(
        typeof accounts[0] === "string" ? accounts[0] : ""
      );

      // Clear private information when accounts change.
      setStoredDescription("");
      setDatabaseMatch(null);
      setHasRetrieved(false);
      setSaveMessage("");
      setRetrieveError("");
    };

    ethereum
      .request({ method: "eth_accounts" })
      .then(updateWallet)
      .catch(() => setConnectedWallet(""));

    ethereum.on?.("accountsChanged", updateWallet);

    return () => {
      ethereum.removeListener?.("accountsChanged", updateWallet);
    };
  }, []);

  // Compare manually entered text with the blockchain.
  function verifyDescription() {
    if (!specHash) return;

    const hash = keccak256(
      stringToHex(description.trim())
    );

    setResult(
      hash.toLowerCase() === specHash.toLowerCase()
        ? "match"
        : "mismatch"
    );
  }

  // Authenticate an operation through MetaMask and Supabase.
  async function signedRequest<T>(
    operation: "save_spec" | "read_spec",
    requestedDescription?: string
  ): Promise<T> {
    const ethereum = getProvider();

    const accounts = (await ethereum.request({
      method: "eth_requestAccounts",
    })) as string[];

    const wallet = accounts[0];

    if (!wallet) {
      throw new Error("Please connect your MetaMask wallet.");
    }

    const chainId = await ethereum.request({
      method: "eth_chainId",
    });

    if (chainId !== DIDLAB_CHAIN_ID) {
      throw new Error("Switch MetaMask to DIDLab network 252501.");
    }

    // Refresh the currently connected wallet.
    setConnectedWallet(wallet);

    const requestDetails = {
      operation,
      wallet,
      engagementId: ENGAGEMENT_ID,
      ...(operation === "save_spec"
        ? { description: requestedDescription }
        : {}),
    };

    // Request an operation-specific challenge.
    const { data: challenge, error: challengeError } =
      await supabase.functions.invoke<ChallengeResponse>(
        "engagement-data",
        {
          body: {
            action: "challenge",
            ...requestDetails,
          },
        }
      );

    if (challengeError) {
      throw new Error(await getErrorMessage(challengeError));
    }

    if (!challenge?.message) {
      throw new Error("Authentication challenge was not returned.");
    }

    // The backend must bind this challenge to the operation,
    // wallet, engagement ID and, for saving, the description.
    // Review the displayed message before signing.
    const signature = (await ethereum.request({
      method: "personal_sign",
      params: [challenge.message, wallet],
    })) as string;

    const nonce =
      challenge.message.match(/Nonce: (.+)$/m)?.[1]?.trim();

    if (!nonce || !signature) {
      throw new Error("Invalid authentication challenge or signature.");
    }

    // Execute the protected database operation.
    const { data, error } =
      await supabase.functions.invoke<T>(
        "engagement-data",
        {
          body: {
            action: operation,
            ...requestDetails,
            nonce,
            signature,
          },
        }
      );

    if (error) {
      throw new Error(await getErrorMessage(error));
    }

    if (!data) {
      throw new Error("No response was returned by Supabase.");
    }

    return data;
  }

  // Client-only specification save.
  async function saveSpecification() {
    setSaving(true);
    setSaveMessage("");
    setSaveError("");

    try {
      if (!specHash || !clientWallet) {
        throw new Error("Blockchain engagement data is unavailable.");
      }

      const ethereum = getProvider();

      const accounts = (await ethereum.request({
        method: "eth_requestAccounts",
      })) as string[];

      if (
        !accounts[0] ||
        accounts[0].toLowerCase() !== clientWallet.toLowerCase()
      ) {
        throw new Error(
          "Only the client of Engagement #6 can save its specification."
        );
      }

      const hash = keccak256(
        stringToHex(ORIGINAL_DESCRIPTION.trim())
      );

      if (hash.toLowerCase() !== specHash.toLowerCase()) {
        throw new Error(
          "Description does not match the on-chain specification hash."
        );
      }

      await signedRequest<unknown>(
        "save_spec",
        ORIGINAL_DESCRIPTION
      );

      setSaveMessage(
        "Specification saved successfully to Supabase."
      );
    } catch (error) {
      setSaveError(
        error instanceof Error ? error.message : "Save failed."
      );
    } finally {
      setSaving(false);
    }
  }

  // Retrieve the specification and verify its integrity.
  async function retrieveSpecification() {
    setRetrieving(true);
    setRetrieveError("");
    setStoredDescription("");
    setDatabaseMatch(null);
    setHasRetrieved(false);

    try {
      if (!specHash) {
        throw new Error("Blockchain hash has not loaded.");
      }

      const data = await signedRequest<ReadSpecResponse>(
        "read_spec"
      );

      if (
        typeof data.description !== "string" ||
        typeof data.storedHash !== "string" ||
        typeof data.calculatedHash !== "string" ||
        typeof data.onChainHash !== "string" ||
        typeof data.matchesBlockchain !== "boolean"
      ) {
        throw new Error("Invalid specification response from Supabase.");
      }

      // Independently calculate the retrieved description hash.
      const localHash = keccak256(
        stringToHex(data.description.trim())
      );

      const matches =
        localHash.toLowerCase() === specHash.toLowerCase() &&
        data.storedHash.toLowerCase() === localHash.toLowerCase() &&
        data.calculatedHash.toLowerCase() === localHash.toLowerCase() &&
        data.onChainHash.toLowerCase() === specHash.toLowerCase() &&
        data.matchesBlockchain === true;

      setStoredDescription(data.description);
      setDatabaseMatch(matches);
      setHasRetrieved(true);
    } catch (error) {
      setRetrieveError(
        error instanceof Error
          ? error.message
          : "Unable to retrieve specification."
      );
    } finally {
      setRetrieving(false);
    }
  }

  return (
    <section className="mt-6 rounded-xl border border-indigo-200 bg-white p-6">
      <h2 className="text-xl font-semibold">
        Engagement Specification — #{ENGAGEMENT_ID}
      </h2>

      {loading && (
        <p className="mt-3">Loading blockchain information...</p>
      )}

      {loadError && (
        <p role="alert" className="mt-3 text-red-600">
          {loadError}
        </p>
      )}

      {specHash && (
        <div className="mt-4 space-y-2 text-sm">
          <p className="break-all">
            <strong>On-chain specification hash:</strong> {specHash}
          </p>
          <p>
            <strong>Connected role:</strong>{" "}
            {isClient
              ? "Client"
              : isProvider
                ? "Provider"
                : connectedWallet
                  ? "Unrelated wallet"
                  : "Wallet not connected"}
          </p>
        </div>
      )}

      <div className="mt-6">
        <h3 className="text-lg font-semibold">
          Manual Description Verification
        </h3>

        <p className="mt-2 text-sm text-slate-600">
          Compare a description with the blockchain commitment.
        </p>

        <input
          type="text"
          value={description}
          onChange={(event) => {
            setDescription(event.target.value);
            setResult(null);
          }}
          placeholder="Enter service description"
          className="mt-4 w-full rounded-lg border p-3"
        />

        <button
          type="button"
          onClick={verifyDescription}
          disabled={!description.trim() || !specHash}
          className="mt-3 rounded-lg bg-indigo-700 px-4 py-2 text-white disabled:opacity-50"
        >
          Verify Description
        </button>

        {result && (
          <p
            role="status"
            className={`mt-3 font-medium ${
              result === "match" ? "text-green-700" : "text-red-700"
            }`}
          >
            {result === "match"
              ? "Match — description matches the blockchain."
              : "Mismatch — description differs from the blockchain."}
          </p>
        )}
      </div>

      <div className="mt-6 border-t pt-4">
        <h3 className="text-lg font-semibold">
          Supabase Specification
        </h3>

        <p className="mt-2 text-sm text-slate-600">
          Specifications are stored privately in Supabase.
          The blockchain stores their cryptographic commitment.
        </p>

        <div className="mt-4 flex flex-wrap gap-3">
          {isClient && (
            <button
              type="button"
              onClick={saveSpecification}
              disabled={saving || retrieving || loading || !specHash}
              className="rounded-lg bg-green-600 px-4 py-2 text-white disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Specification"}
            </button>
          )}

          <button
            type="button"
            onClick={retrieveSpecification}
            disabled={retrieving || saving || loading || !specHash}
            className="rounded-lg bg-indigo-700 px-4 py-2 text-white disabled:opacity-50"
          >
            {retrieving ? "Retrieving..." : "Retrieve from Supabase"}
          </button>
        </div>

        {isClient && (
          <p className="mt-2 text-xs text-slate-500">
            Save is restricted to the engagement client.
            Save only once for this demonstration.
          </p>
        )}

        {saveMessage && (
          <p role="status" className="mt-3 text-green-700">
            {saveMessage}
          </p>
        )}

        {saveError && (
          <p role="alert" className="mt-3 text-red-600">
            {saveError}
          </p>
        )}

        {retrieveError && (
          <p role="alert" className="mt-3 text-red-600">
            {retrieveError}
          </p>
        )}

        {hasRetrieved && (
          <div className="mt-4 rounded-lg border p-4">
            <p>
              <strong>Engagement ID:</strong> #{ENGAGEMENT_ID}
            </p>

            <p className="mt-2">
              <strong>Stored description:</strong>{" "}
              {storedDescription}
            </p>

            <p
              role="status"
              className={`mt-3 font-medium ${
                databaseMatch
                  ? "text-green-700"
                  : "text-red-700"
              }`}
            >
              {databaseMatch
                ? "Match — verified against blockchain."
                : "Mismatch — database and blockchain hashes differ."}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
