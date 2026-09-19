# Project Proposal

## Activity 2: Candidate Problem

**Primary candidate problem: Blockchain-Based Digital Product Provenance**

When a buyer buys digital products such as images, videos, or files online, it can't verify if the product is original or if it has been altered. Creators need to depend on centralized platforms to maintain registrations, and buyers need to rely on centralized platforms for verifying the product's integrity. The selected problem focuses on providing shared and tamper-evident records so that participants can independently verify if a specific digital-file hash was registered by a particular blockchain address at a particular time and whether a presented digital file matches the originally registered hash. Participants can also check whether the recorded ownership and transfer history is associated with that digital product. But the system doesn't claim to verify the original author. It does not prove that the registering address is the original creator of the digital product.

**Backup candidate problem: Software Integrity Verification**

When users download software, they need to rely on a publisher or a centralized platform to check if the downloaded software is the original released version. If a system provides a tamper-evident record that could allow participants to compare a downloaded software file's hash and a previously registered release hash to verify the downloaded software independently.

## Activity 3: Stakeholder / Asset Map

| Element | Answer |
|---|---|
| **Stakeholders** | **Creator/original author** — registers their digital work. **Buyer.** **Platform** — where registering happens (e.g., marketplace). |
| **Assets** | Digital product (digital file — image/video). The hash anchored on chain. The transfer record. |
| **Transactions** | Verifier attests a creator's address is identity-checked. Creator registers the digital product. Buyer gets the product from creator. Transfer ownership. |
| **Records** | Today: marketplace listing page, maybe a "Verified" badge issued at the platform's discretion — all held, decided, and controlled by the platform. |
| **Current intermediary** | Platform/marketplace. Sellers register their product here, and the platform decides if the seller's identity is valid. It privately holds all sale and transfer history. |
| **What goes wrong** | The verified badge can only check the legitimacy of the seller's identity — it does not confirm the seller actually created the listed work. A buyer can't know if the product is a stolen copy. Ownership/resale history lives only in the platform's private database. |

## Activity 4: Trust Boundary Map



## Activity 5: Qualifiers

| Qualifier | Answer | Notes |
|---|---|---|
| **1. Multiple parties** | Yes | Three parties (artist, buyer, and platform/marketplace). None trusts each other completely — that's when blockchain helps. |
| **2. Shared rights** | Yes | A buyer can be a seller later, so writing is not confined to one single party. Ownership will change hands — a shared-write problem. |
| **3. Intermediary cost** | Yes | Today's marketplace is the trusted intermediary. It can misrepresent listings or alter transfer history, and buyers have no way to independently check any of it — the risk is serious. |
| **4. Independent verification** | Yes | A buyer does not need word-for-word assurance from the seller about the product's authenticity. By recomputing the file hash and comparing it to the publicly recorded on-chain commitment, the buyer verifies the claim entirely independently. |
| **5. Durable, tamper-evident record** | Yes | A dishonest seller or platform might benefit from changing or deleting evidence later. Records must remain verifiable for future owners to confirm a digital file's authenticity and ownership history years later. |

## Activity 6: Disqualifiers

| Disqualifier | Answer | Notes |
|---|---|---|
| **D1 — Confidential content on chain** | No | The design doesn't require putting the actual digital file, or any private content, on chain. Only the hash/fingerprint and the ownership/transfer records go on chain — these contain no information about the file's content. |
| **D2 — Throughput or latency beyond the chain** | No | Registrations and transfers depend on the pace of a creator's publishing work and sales — not thousands of writes per second or sub-second finality. |
| **D3 — Large data on chain** | No, by design | Rather than storing files on chain, the system stores only a cryptographic hash. Anyone can re-hash the file and check it against the anchored value to see if it's been altered. The problem passes via the anchoring pattern already built into the design. |
| **D4 — The oracle problem is fatal** | No fatal dependency | The system only asserts facts verifiable from the blockchain: that a specific hash was anchored by a specific address at a particular time, and that recorded ownership has moved through a particular sequence of addresses. The system does not claim the registered product belongs to the original creator. The oracle problem is not fatal to the design. |
| **D5 — Mistakes must be reversible** | Partial — needs an explicit design decision | Once ownership is recorded, it can't be removed or deleted. If a fraudulent transaction or mistake occurs, a corrected transaction can be appended, but the previous transaction history remains on chain. Keeping the permanent transaction history is important since it ensures transparency. |

## Activity 7: Verdict

**PROCEED WITH REDESIGN.** All five qualifiers pass, and four disqualifiers pass cleanly. D5 passes with a trade-off: blockchain records can't be deleted, but if a mistake happens, a corrected transaction can be added, and it's also important to maintain transaction history — therefore D5 is not fatal to the design. D4 doesn't block the design because the system mainly guarantees file integrity and ownership history; the system doesn't claim it can verify the real creator, and that limitation is explicitly outside its scope.

### Data Split

| Element | On chain | Off chain | Justification |
|---|---|---|---|
| Digital file | | Yes | D3 — don't store large data on chain |
| Hash of the file | Yes | | Small and tamper-evident fingerprint |
| Ownership / transfer history | Yes | | Durable, tamper-evident record should be publicly verifiable |
| Marketplace listing (price, images) | | Yes | Large, frequently changes, and doesn't need protection |
| Registering address and timestamp | Yes | | Can be cryptographically checked |
| Seller's identity | | Yes | D4 — out of scope |

### Verifier Check

A third party with no access to any participant's private systems can verify that a digital file matches an originally registered file, and can see its complete ownership history since then, by re-hashing the file and reading the public on-chain records — without trusting the seller's claims or the platform's private database. But the system doesn't guarantee that the registered creator is the original creator of the digital product.
