
"use client";

import { useState } from "react";
import { supabase } from "../lib/supabase";

type EthereumProvider = {
  request(args: {
    method: string;
    params?: unknown[];
  }): Promise<unknown>;
};

type Challenge = {
  message: string;
  nonce: string;
  expiresAt: string;
  operation: string;
};

type Verification = {
  authenticated: boolean;
  wallet: string;
};

type Authorization = {
  authenticated: boolean;
  authorized: boolean;
  wallet: string;
  engagementId: string;
  role: string;
};

type SaveResponse = {
  success: boolean;
  engagementId: string;
  specHash: string;
  message: string;
};

type ReadResponse = {
  success: boolean;
  engagementId: string;
  description: string;
  clientWallet: string;
  providerWallet: string;
  storedHash: string;
  calculatedHash: string;
  onChainHash: string;
  matchesBlockchain: boolean;
};

type Operation =
  | "verify"
  | "authorize"
  | "save_spec"
  | "read_spec";

const ENGAGEMENT_ID = 6;
const DESCRIPTION = "web design";

const CLIENT_WALLET =
  "0x55133ee946875c12c1bd7232c5cf6697aa724d61";

const PROVIDER_WALLET =
  "0xaea4ef37a02a3db6e2d8d71c68e3941064c59ec1";

export default function WalletAuthTest() {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState("");

  // ========================================
  // METAMASK HELPERS
  // ========================================

  function getProvider(): EthereumProvider {
    const provider = (
      window as Window & {
        ethereum?: EthereumProvider;
      }
    ).ethereum;

    if (!provider) {
      throw new Error(
        "MetaMask not detected. Open this page with MetaMask."
      );
    }

    return provider;
  }

  async function getConnectedWallet(
    provider: EthereumProvider
  ): Promise<string> {
    const accounts = await provider.request({
      method: "eth_requestAccounts",
    });

    if (
      !Array.isArray(accounts) ||
      typeof accounts[0] !== "string"
    ) {
      throw new Error("No MetaMask account selected.");
    }

    const wallet = accounts[0];

    const chain = await provider.request({
      method: "eth_chainId",
    });

    if (chain !== "0x3da55") {
      throw new Error(
        "Switch MetaMask to DIDLab (chain 252501)."
      );
    }

    return wallet;
  }

  // ========================================
  // SUPABASE ERROR HELPER
  // ========================================

  async function getFunctionError(
    error: unknown
  ): Promise<string> {
    if (
      error &&
      typeof error === "object" &&
      "context" in error
    ) {
      const response = (
        error as { context?: Response }
      ).context;

      if (response) {
        try {
          const body = await response.clone().json();

          if (typeof body?.error === "string") {
            return body.error;
          }
        } catch {
          // Fall back to original error.
        }
      }
    }

    return error instanceof Error
      ? error.message
      : "Edge Function request failed.";
  }

  function getErrorStatus(error: unknown): number | undefined {
    if (
      error &&
      typeof error === "object" &&
      "context" in error
    ) {
      return (
        error as { context?: Response }
      ).context?.status;
    }

    return undefined;
  }

  // ========================================
  // SIGNED REQUEST HELPER
  // ========================================

  async function createSignedRequest(
    operation: Operation,
    engagementId?: number,
    description?: string
  ) {
    const provider = getProvider();
    const wallet = await getConnectedWallet(provider);

    const challengeBody: Record<string, unknown> = {
      action: "challenge",
      operation,
      wallet,
    };

    if (engagementId !== undefined) {
      challengeBody.engagementId = engagementId;
    }

    if (description !== undefined) {
      challengeBody.description = description;
    }

    const {
      data: challenge,
      error: challengeError,
    } = await supabase.functions.invoke<Challenge>(
      "engagement-data",
      {
        body: challengeBody,
      }
    );

    if (
      challengeError ||
      !challenge?.message ||
      !challenge?.nonce
    ) {
      throw new Error(
        challengeError
          ? await getFunctionError(challengeError)
          : "Challenge request failed."
      );
    }

    const signature = await provider.request({
      method: "personal_sign",
      params: [challenge.message, wallet],
    });

    if (typeof signature !== "string") {
      throw new Error(
        "MetaMask did not return a signature."
      );
    }

    const requestBody: Record<string, unknown> = {
      action: operation,
      wallet,
      nonce: challenge.nonce,
      signature,
    };

    if (engagementId !== undefined) {
      requestBody.engagementId = engagementId;
    }

    if (description !== undefined) {
      requestBody.description = description;
    }

    return {
      wallet,
      requestBody,
    };
  }

  // ========================================
  // TEST 1: WALLET AUTHENTICATION
  // ========================================

  async function testAuthentication() {
    setBusy(true);
    setResult("");

    try {
      const { requestBody } =
        await createSignedRequest("verify");

      const { data, error } =
        await supabase.functions.invoke<Verification>(
          "engagement-data",
          { body: requestBody }
        );

      if (error || !data?.authenticated) {
        throw new Error(
          error
            ? await getFunctionError(error)
            : "Signature verification failed."
        );
      }

      setResult(
        `PASS: Wallet signature verified: ${data.wallet}`
      );
    } catch (error) {
      setResult(
        error instanceof Error
          ? `Authentication failed: ${error.message}`
          : "Authentication test failed."
      );
    } finally {
      setBusy(false);
    }
  }

  // ========================================
  // TEST 2: UNAUTHORIZED ACCESS
  // ========================================

  async function testUnauthorizedAccess() {
    setBusy(true);
    setResult("");

    try {
      const { wallet, requestBody } =
        await createSignedRequest(
          "authorize",
          ENGAGEMENT_ID
        );

      const { data, error } =
        await supabase.functions.invoke<Authorization>(
          "engagement-data",
          { body: requestBody }
        );

      if (error) {
        const status = getErrorStatus(error);
        const message = await getFunctionError(error);

        if (
          status === 403 &&
          message ===
            "Wallet is not an engagement participant"
        ) {
          setResult(
            "PASS: Unauthorized wallet correctly rejected (HTTP 403)."
          );
          return;
        }

        throw new Error(
          `Unexpected response (${status ?? "unknown"}): ${message}`
        );
      }

      if (data?.authorized) {
        setResult(
          `Authorization granted: ${wallet} is ${data.role} for Engagement #${ENGAGEMENT_ID}. This is expected for a participant wallet.`
        );
      } else {
        throw new Error(
          "Unexpected authorization response."
        );
      }
    } catch (error) {
      setResult(
        error instanceof Error
          ? error.message
          : "Authorization test failed."
      );
    } finally {
      setBusy(false);
    }
  }

  // ========================================
  // TEST 3: NONCE REPLAY PROTECTION
  // ========================================

  async function testNonceReplay() {
    setBusy(true);
    setResult("");

    try {
      const { requestBody } =
        await createSignedRequest("verify");

      const { data: first, error: firstError } =
        await supabase.functions.invoke<Verification>(
          "engagement-data",
          { body: requestBody }
        );

      if (firstError || !first?.authenticated) {
        throw new Error(
          firstError
            ? await getFunctionError(firstError)
            : "First verification failed."
        );
      }

      const { data: second, error: secondError } =
        await supabase.functions.invoke(
          "engagement-data",
          { body: requestBody }
        );

      if (!secondError) {
        console.error(
          "Unexpected replay response:",
          second
        );
        throw new Error(
          "FAIL: Replayed signature was accepted."
        );
      }

      const status = getErrorStatus(secondError);
      const message = await getFunctionError(secondError);

      if (
        status === 401 &&
        (
          message === "Challenge expired or already used" ||
          message === "Challenge already used or expired"
        )
      ) {
        setResult(
          "PASS: First signature accepted; replay rejected (HTTP 401)."
        );
      } else {
        throw new Error(
          `Unexpected replay response (${status ?? "unknown"}): ${message}`
        );
      }
    } catch (error) {
      setResult(
        error instanceof Error
          ? error.message
          : "Nonce replay test failed."
      );
    } finally {
      setBusy(false);
    }
  }

  // ========================================
  // TEST 4: SPECIFICATION SAVE SECURITY
  // ========================================

  async function testSaveSecurity() {
    setBusy(true);
    setResult("");

    try {
      const { wallet, requestBody } =
        await createSignedRequest(
          "save_spec",
          ENGAGEMENT_ID,
          DESCRIPTION
        );

      // This button is a negative security test.
      // Never save if a participant wallet is connected.
      const normalizedWallet = wallet.toLowerCase();

      if (
        normalizedWallet === CLIENT_WALLET ||
        normalizedWallet === PROVIDER_WALLET
      ) {
        throw new Error(
          "Connect a nonparticipant wallet for this security test."
        );
      }

      const { data, error } =
        await supabase.functions.invoke<SaveResponse>(
          "engagement-data",
          { body: requestBody }
        );

      if (error) {
        const status = getErrorStatus(error);
        const message = await getFunctionError(error);

        console.log("Save security test:", {
          status,
          message,
        });

        if (
          status === 403 &&
          message ===
            "Wallet is not an engagement participant"
        ) {
          setResult(
            "PASS: Unauthorized specification saving rejected (HTTP 403)."
          );
          return;
        }

        throw new Error(
          `Unexpected response (${status ?? "unknown"}): ${message}`
        );
      }

      console.error("Unexpected save:", data);

      throw new Error(
        "FAIL: Nonparticipant wallet was allowed to save."
      );
    } catch (error) {
      setResult(
        error instanceof Error
          ? error.message
          : "Save security test failed."
      );
    } finally {
      setBusy(false);
    }
  }

  // ========================================
  // TEST 5: SPECIFICATION READ SECURITY
  // ========================================

  async function testReadSecurity() {
    setBusy(true);
    setResult("");

    try {
      const { wallet, requestBody } =
        await createSignedRequest(
          "read_spec",
          ENGAGEMENT_ID
        );

      const normalizedWallet = wallet.toLowerCase();

      if (
        normalizedWallet === CLIENT_WALLET ||
        normalizedWallet === PROVIDER_WALLET
      ) {
        throw new Error(
          "Connect a nonparticipant wallet for this security test."
        );
      }

      const { data, error } =
        await supabase.functions.invoke<ReadResponse>(
          "engagement-data",
          { body: requestBody }
        );

      if (error) {
        const status = getErrorStatus(error);
        const message = await getFunctionError(error);

        console.log("Read security test:", {
          status,
          message,
        });

        if (
          status === 403 &&
          message ===
            "Wallet is not an engagement participant"
        ) {
          setResult(
            "PASS: Unauthorized specification retrieval rejected (HTTP 403)."
          );
          return;
        }

        throw new Error(
          `Unexpected response (${status ?? "unknown"}): ${message}`
        );
      }

      console.error("Unexpected read:", data);

      throw new Error(
        "FAIL: Nonparticipant wallet was allowed to read."
      );
    } catch (error) {
      setResult(
        error instanceof Error
          ? error.message
          : "Read security test failed."
      );
    } finally {
      setBusy(false);
    }
  }

  // ========================================
  // TEST 6: AUTHORIZED SPECIFICATION SAVE
  // USE CLIENT WALLET
  // ========================================

  async function testAuthorizedSave() {
    setBusy(true);
    setResult("");

    try {
      const provider = getProvider();
      const wallet = await getConnectedWallet(provider);

      if (wallet.toLowerCase() !== CLIENT_WALLET) {
        throw new Error(
          "This test requires the Engagement #6 client wallet."
        );
      }

      const { requestBody } =
        await createSignedRequest(
          "save_spec",
          ENGAGEMENT_ID,
          DESCRIPTION
        );

      const { data, error } =
        await supabase.functions.invoke<SaveResponse>(
          "engagement-data",
          { body: requestBody }
        );

      if (error) {
        const status = getErrorStatus(error);
        const message = await getFunctionError(error);

        if (
          status === 409 &&
          message === "Specification already exists"
        ) {
          setResult(
            "Specification already exists. Use the authorized read test to verify it."
          );
          return;
        }

        throw new Error(
          `Save failed (${status ?? "unknown"}): ${message}`
        );
      }

      if (!data?.success) {
        throw new Error(
          "Save did not return success."
        );
      }

      setResult(
        `PASS: Engagement #${ENGAGEMENT_ID} specification saved. Hash: ${data.specHash}`
      );
    } catch (error) {
      setResult(
        error instanceof Error
          ? error.message
          : "Authorized save test failed."
      );
    } finally {
      setBusy(false);
    }
  }

  // ========================================
  // TEST 7: AUTHORIZED READ + HASH CHECK
  // USE CLIENT OR PROVIDER WALLET
  // ========================================

  async function testAuthorizedRead() {
    setBusy(true);
    setResult("");

    try {
      const provider = getProvider();
      const wallet = await getConnectedWallet(provider);

      const normalizedWallet = wallet.toLowerCase();

      if (
        normalizedWallet !== CLIENT_WALLET &&
        normalizedWallet !== PROVIDER_WALLET
      ) {
        throw new Error(
          "This test requires the Engagement #6 client or provider wallet."
        );
      }

      const { requestBody } =
        await createSignedRequest(
          "read_spec",
          ENGAGEMENT_ID
        );

      const { data, error } =
        await supabase.functions.invoke<ReadResponse>(
          "engagement-data",
          { body: requestBody }
        );

      if (error) {
        const status = getErrorStatus(error);
        const message = await getFunctionError(error);

        throw new Error(
          `Read failed (${status ?? "unknown"}): ${message}`
        );
      }

      if (!data?.success) {
        throw new Error(
          "Read did not return success."
        );
      }

      console.log(
        "Retrieved specification:",
        data
      );

      const descriptionMatches =
        data.description === DESCRIPTION;

      const calculatedMatchesStored =
        data.calculatedHash.toLowerCase() ===
        data.storedHash.toLowerCase();

      const calculatedMatchesOnChain =
        data.calculatedHash.toLowerCase() ===
        data.onChainHash.toLowerCase();

      if (
        data.matchesBlockchain &&
        descriptionMatches &&
        calculatedMatchesStored &&
        calculatedMatchesOnChain
      ) {
        setResult(
          `PASS: Engagement #${ENGAGEMENT_ID} specification retrieved. Description "${data.description}" matches the stored and blockchain hashes.`
        );
      } else {
        setResult(
          "FAIL: Specification retrieved, but description or hash verification did not match."
        );
      }
    } catch (error) {
      setResult(
        error instanceof Error
          ? error.message
          : "Authorized read test failed."
      );
    } finally {
      setBusy(false);
    }
  }

  // ========================================
  // USER INTERFACE
  // ========================================

  return (
    <section className="rounded-xl border border-indigo-200 bg-white p-6">
      <h3 className="text-lg font-semibold text-slate-900">
        Wallet Authentication & Security Tests
      </h3>

      <p className="mt-2 text-sm text-slate-600">
        Test MetaMask authentication, blockchain-based
        authorization, nonce replay protection, and
        protected Supabase specification operations.
        These tests require MetaMask signatures but
        do not create blockchain transactions.
      </p>

      <p className="mt-2 text-sm text-slate-600">
        Engagement #{ENGAGEMENT_ID} —
        Description: <strong>{DESCRIPTION}</strong>
      </p>

      <h4 className="mt-5 font-semibold text-slate-900">
        Authentication & Security Tests
      </h4>

      <div className="mt-3 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={testAuthentication}
          disabled={busy}
          className="rounded-lg bg-indigo-700 px-4 py-2 font-medium text-white disabled:opacity-50"
        >
          {busy ? "Testing..." : "1. Verify Wallet"}
        </button>

        <button
          type="button"
          onClick={testUnauthorizedAccess}
          disabled={busy}
          className="rounded-lg bg-slate-800 px-4 py-2 font-medium text-white disabled:opacity-50"
        >
          {busy ? "Testing..." : "2. Unauthorized Access"}
        </button>

        <button
          type="button"
          onClick={testNonceReplay}
          disabled={busy}
          className="rounded-lg bg-emerald-700 px-4 py-2 font-medium text-white disabled:opacity-50"
        >
          {busy ? "Testing..." : "3. Nonce Replay"}
        </button>

        <button
          type="button"
          onClick={testSaveSecurity}
          disabled={busy}
          className="rounded-lg bg-rose-700 px-4 py-2 font-medium text-white disabled:opacity-50"
        >
          {busy ? "Testing..." : "4. Save Security"}
        </button>

        <button
          type="button"
          onClick={testReadSecurity}
          disabled={busy}
          className="rounded-lg bg-amber-700 px-4 py-2 font-medium text-white disabled:opacity-50"
        >
          {busy ? "Testing..." : "5. Read Security"}
        </button>
      </div>

      <h4 className="mt-6 font-semibold text-slate-900">
        Authorized Operations — Participant Wallets
      </h4>

      <p className="mt-2 text-sm text-slate-600">
        The save test requires the Engagement #6
        client wallet. The read test requires
        either the client or provider wallet.
        Save only once, then test retrieval.
      </p>

      <div className="mt-3 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={testAuthorizedSave}
          disabled={busy}
          className="rounded-lg bg-indigo-700 px-4 py-2 font-medium text-white disabled:opacity-50"
        >
          {busy ? "Testing..." : "6. Authorized Save"}
        </button>

        <button
          type="button"
          onClick={testAuthorizedRead}
          disabled={busy}
          className="rounded-lg bg-teal-700 px-4 py-2 font-medium text-white disabled:opacity-50"
        >
          {busy ? "Testing..." : "7. Authorized Read + Hash"}
        </button>
      </div>

      {result && (
        <p
          role="status"
          className="mt-5 break-all rounded-lg bg-slate-50 p-4 text-sm text-slate-700"
        >
          {result}
        </p>
      )}
    </section>
  );
}
