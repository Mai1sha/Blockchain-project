"use client";

import { useState } from "react";
import { supabase } from "../lib/supabase";

type EthereumProvider = {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
};

type Challenge = { message: string; expiresAt: string };
type Verification = { authenticated: boolean; wallet: string };

export default function WalletAuthTest() {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState("");

  async function testAuthentication() {
    setBusy(true);
    setResult("");
    try {
      const provider = (window as Window & { ethereum?: EthereumProvider }).ethereum;
      if (!provider) throw new Error("MetaMask not detected. Open this page in a browser with MetaMask.");

      const accounts = await provider.request({ method: "eth_requestAccounts" });
      if (!Array.isArray(accounts) || typeof accounts[0] !== "string") {
        throw new Error("No MetaMask account selected.");
      }
      const wallet = accounts[0];
      const chain = await provider.request({ method: "eth_chainId" });
      if (chain !== "0x3da55") {
        // 252501 decimal is 0x3da55 hexadecimal.
        throw new Error("Switch MetaMask to DIDLab (chain 252501) and try again.");
      }

      const { data: challenge, error: challengeError } =
        await supabase.functions.invoke<Challenge>("engagement-data", {
          body: { action: "challenge", wallet },
        });
      if (challengeError || !challenge?.message) {
        throw new Error(challengeError?.message || "Challenge request failed.");
      }

      const signature = await provider.request({
        method: "personal_sign",
        params: [challenge.message, wallet],
      });
      if (typeof signature !== "string") throw new Error("MetaMask did not return a signature.");

      const nonce = challenge.message.match(/^Nonce: (.+)$/m)?.[1];
      if (!nonce) throw new Error("Challenge did not include a nonce.");

      const { data: verified, error: verifyError } =
        await supabase.functions.invoke<Verification>("engagement-data", {
          body: { action: "verify", wallet, nonce, signature },
        });
      if (verifyError || !verified?.authenticated) {
        throw new Error(verifyError?.message || "Signature verification failed.");
      }
      setResult(`Wallet signature verified: ${verified.wallet}`);
    } catch (error) {
      setResult(error instanceof Error ? error.message : "Authentication test failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-xl border border-indigo-200 bg-white p-6">
      <h3 className="text-lg font-semibold text-slate-900">Test Wallet Authentication</h3>
      <p className="mt-2 text-sm text-slate-600">
        Sign a temporary Supabase challenge with MetaMask. This is not a transaction and costs no gas.
      </p>
      <button
        type="button"
        onClick={testAuthentication}
        disabled={busy}
        className="mt-4 rounded-lg bg-indigo-700 px-4 py-2 font-medium text-white disabled:opacity-50"
      >
        {busy ? "Authenticating..." : "Sign and verify wallet"}
      </button>
      {result && <p role="status" className="mt-3 break-all text-sm text-slate-700">{result}</p>}
    </section>
  );
}
