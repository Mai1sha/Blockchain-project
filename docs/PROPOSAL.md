# Project Proposal — Milestone M1

## Activity 2 — Candidate problems

List every candidate your team collected (6–12), then strike anything that's a product idea rather than a problem.

| # | Candidate (stated as a problem, not a product) | Kept / Discarded | Why |
|---|---|---|---|
| 1 | | | |
| 2 | | | |
| 3 | | | |
| 4 | | | |
| 5 | | | |
| 6 | | | |

**Primary candidate carried into Activities 3–7:** _name it_
**Backup candidate:** _name it_

---

## Activity 3 — Stakeholders, assets, and transactions (primary candidate)

| Element | Prompt | Your answer |
|---|---|---|
| Stakeholders | Who acts? Name every distinct party. | |
| Assets | What is owned, transferred, claimed, or attested? | |
| Transactions | What are the state-changing actions? Who initiates each? | |
| Records | What is written down today, by whom, and where does it live? | |
| Current intermediary | Who sits in the middle today? | |
| What goes wrong | The concrete failure — fraud, delay, cost, dispute, loss, capture. | |

_If your stakeholder list has one entry, stop and switch to the backup problem._

---

## Activity 4 — Trust boundary map

_Insert the diagram here (image or diagram-tool export). Each stakeholder is a box, each data flow is an arrow, a dashed line marks any place one party must trust another's claim without independent verification, and a star marks the current intermediary._

`docs/architecture/trust-boundary.png` (or equivalent)

**Which dashed lines are worth solving** (cause the failure named in Activity 3, not just present):

- ...

---

## Activity 5 — The five qualifying questions

Every answer needs a specific justification — not "yes," but *why*.

| # | Question | Answer | Justification |
|---|---|---|---|
| Q1 | Multiple parties — do two or more parties who don't fully trust each other need to act on the same data? | | |
| Q2 | Shared writes — do multiple parties need to write, not just read? | | |
| Q3 | Intermediary cost — is there a trusted intermediary today whose cost, delay, failure risk, or ability to act against participants is itself the problem? | | |
| Q4 | Independent verification — does someone need to verify a claim without trusting the claimant and without access to the claimant's private systems? | | |
| Q5 | Durable, tamper-evident record — does a record need to remain verifiable after the fact, when its creator may have an incentive to alter it? | | |

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
