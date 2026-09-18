Project Proposal

Activity 2:
Primary candidate problem: Blockchain-Based Digital Product Provenance
When a buyer buys digital products such as images, videos, or files online it can’t verify if the product is original or if it has been altered. Creators need to depend on centralized platforms to maintain registrations, and buyers need to rely on centralized platforms for verifying the product’s integrity. The selected problem focuses on providing shared and tamper-evident records so that participants can independently verify if a specific digital-file hash was registered by a particular blockchain address at a particular time and whether a presented digital file matches the originally registered hash. Participants can also check whether the recorded ownership and transfer history is associated with that digital product. But the system doesn’t claim to verify the original author. It does not prove that the registering address is the original creator of the digital product. 
Backup candidate problem: Software integrity verification
When users download software, they need to rely on a publisher or a centralized platform to check if the downloaded software is the original released version. If a system provides a tamper-evident record that could allow participants to compare a downloaded software file's hash and a previously registered release hash to verify the downloaded software independently.
Activity 3:
Element	Answer
Stakeholder	Creator/original author: registers their digital work
Buyer
Platform: where registering happens. For example, marketplace
Assets 	Digital product – digital file (image/video)
The hash anchored on chain
The transfer record. 
Transactions 	Verifier attests a creator's address is identity-checked 
Creator registers the digital product
Buyer gets the product from creator
Transfer ownership
Records	Today: Marketplace listing page maybe a "Verified” badge issued at the platform's discretion and all are held, decided, and controlled by the platform
Current intermediary	Platform/marketplace. Sellers registers their product here and decided if the seller’s identity is valid. it privately holds all sale and transfer history
What goes wrong	The verified badge can only check the legitimacy of the seller’s identity. it does not confirm the seller actually created the listed work. Buyer can’t know if the product is a stolen copy. Ownership/resale history lives only in the platform's private database

Activity 4
Trust Boundary Map: 

Activity 5: Qualifiers 
Qualifiers	Answer	Notes
1. Multiple parties	Yes	We have decided on three parties (artist, buyer, and platform/marketplace).
Here, none trusts each other completely and that’s when blockchain comes in help
2. Shared Rights	Yes	Here, a buyer can be a seller later. So writing is not confined to one single party. Ownership will change hands. Thus, there will be shared-write problem
3. Intermediate
cost	Yes	Today's marketplace is the trusted intermediary. it can misrepresent listings or alter transfer history and buyers have no way to independently check any of it. Thus, the risk is serious. 
4. Independent verification	Yes	A buyer does not need to have word-to-word assurance from the seller about the product’s authenticity. By recomputing file hash and comparing it to the publicly recorded on-chain commitment, the buyer verifies the claim entirely independently.
5. Durable tamper-evident record	Yes	There is a chance of people looking back, and a dishonest seller or platform might benefit from changing or deleting evidence. Thus, records must remain verifiable for future owners to confirm a digital file’s authenticity and ownership history years later.

Activity 6: Disqualifiers
Disqualifiers	Answer	Notes
D1 — Confidential content on chain	No	The design doesn’t require putting the actual digital file, or any private content, on chain. Only the hash/a fingerprint and the ownership/transfer records go on chain. These don’t contain any information about the file 
D2 — Throughput or latency beyond the chain	No	Registrations and transfers depend on pace of the creator’s publishing work and the sales. It doesn’t require thousands of write per second or sub-second finality.
D3 — Large data on chain	No, by design	Rather than storing the files on chain, the system stores only its cryptographic hash. Anyone can re-hash the file and check with the anchored value to see if it’s been altered or not. So, the candidate problem passes with the anchoring pattern already built into the design
D4 — The oracle problem is fatal	No fatal dependency	The system only asserts facts that can be verified from the blockchain: that a specific hash was anchored by a specific blockchain address at a particular time, and that the recorded ownership has moved through a particular sequence of addresses. The system does not claim that the registered product belongs to the original creator.. The oracle problem is not fatal to the proposed design
D5 — Mistakes must be reversible.	Partial — needs an explicit design decision	If an ownership is recorded, it can’t be removed or deleted. If a fraud transaction or mistake occurs in that case another corrected transaction can be appended but the previous transaction history remains on the chain. Keeping the permanent transaction history is important since it ensures transparency. 

Activity 7: 
Verdict:
PROCEED WITH REDESIGN: All five qualifications pass, and four disqualifiers pass. D5 passes with a trade-off. Blockchain records can’t be deleted, but if any mistake happens, a corrected transaction can be added, and it’s also important to maintain transaction history. Therefore, D5 is not fatal to the design. D4 doesn’t block the design because the system mainly guarantees file integrity and ownership history. Our system doesn’t claim that it can verify the real creator. This limitation is outside the scope of our system.
Data Split
Element	On chain	Off chain	Justification
Digital file 		Yes	D3-  don’t store large data on chain
Hash of the file	Yes		Small and tamper-evident fingerprint
Ownership / transfer history	Yes		Durable and tamper evident record should be publicly verifiable
Marketplace listing such as price, image		Yes	Large and frequently changes and no need for protection
Registering address and timestamp	Yes		Can be cryptographically checked
Seller’s identity		Yes	D4 – out of scope

Verifier Check:
A third party with no access to any participant's private systems can verify that a digital file is an original registered file, and can see its complete ownership history since then, by re-hashing the file and reading the public on-chain records — without trusting the seller's claims or the platform's private database. But the system doesn’t guarantee the fact that the registered creator is the original creator of the digital product. 

_All five must be a defensible yes. Four of five is not a pass._

---

## Activity 6 — The five disqualifiers

A "yes" here is a problem for the design, not automatically a kill — but it must be addressed.

| # | Disqualifier | Applies? (Y/N) | If yes, how is it designed around? |
|---|---|---|---|
| D1 | Confidential content on chain | | |
| D2 | Throughput or latency beyond the chain | | |
| D3 | Large data on chain | | |
| D4 | The oracle problem — do all facts originate in the physical world through a single reporter? | | |
| D5 | Mistakes must be reversible/erasable | | |

---

## Activity 7 — Verdict and the on-chain / off-chain split

### Step 1 — Verdict

- [ ] PROCEED — all five qualifiers pass, no disqualifier is fatal
- [ ] PROCEED WITH REDESIGN — a disqualifier applies but can be designed around (state exactly how, above)
- [ ] REJECT — move to backup problem and rerun Activities 3–7

**Verdict:** _______________

**Reasoning:** _______________

### Step 2 — On-chain / off-chain split

| Element (from Activity 3) | On chain | Off chain | Justification |
|---|---|---|---|
| | | | |
| | | | |
| | | | |

Rules:
- **On chain:** commitments (hashes proving something existed in a particular form), state transitions, authorizations, ownership, and events that must be publicly verifiable.
- **Off chain:** content, files, documents, anything personal, anything large, anything confidential.
- **Never on chain:** names, student IDs, emails, health data, any personal identifier — including hashed. Hashing does not anonymize a value drawn from a small, predictable set.

### Step 3 — Verifier sentence

> A third party with no access to any participant's private systems can verify **______** by **______**.

If this sentence cannot be completed, the verdict is not PROCEED.
