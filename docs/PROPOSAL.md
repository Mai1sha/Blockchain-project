# Milestone 1

## Part A

### A1: Problem Statement

Online professional-service platforms connect clients with independent tutors, designers, writers, developers, consultants, and other digital professionals. These parties may have no previous relationship and must rely heavily on the platform operator to establish the identity and legitimacy of service providers and maintain the authoritative history of their engagements. A client needs assurance that a provider has passed the platform's required verification process. Both parties also need reliable evidence of whether an engagement was accepted, work was submitted, the client accepted the delivery, and the engagement was completed. They must also trust the platform to manage payments fairly, ensuring that providers are paid for accepted work while clients' funds are protected until agreed conditions are met. In conventional platforms, these trust-critical records and payment processes are controlled by the platform's private infrastructure. Participants and external verifiers cannot independently verify historical actions without relying on the platform operator, while sensitive identity information, communications, and professional work must remain private


This dependency can make independent verification difficult when disputes occur or when records need to be checked outside the platform.

### A2: Stakeholder, Asset, and Transaction Map

 Element | Answer |
|---|---|
| **1. Stakeholder** | Clients, service providers, platform operators, external verifiers, payment processors. A client requests services, receives work and approves delivery. Service providers create professional profiles, accept engagements and submit work. The platform operator manages accounts, profiles, messaging, files, reviews and more. The identity-verification provider examines identity evidence and reports whether a provider passed verification. The payment processor processes payments and refunds. Platform support investigates disagreements between clients and providers. External verifiers may need to confirm whether a provider was verified or whether an engagement event occurred. |
| **2. Asset** | Provider identities and verification status, profiles, skills, service listings, proposals, agreements, messages, submitted work, delivery approvals, reviews, payment records, and engagement history. |
| **3. Transaction** | Every action is counted as a transaction. A provider creates a profile and completes identity verification. A client finds a provider and sends a service request. The provider accepts or declines it. They communicate, and the client pays. The provider submits the work, and the client accepts it. Either party can cancel or open a dispute. After completion, the client can leave a review, and a payment is processed. |
| **4. Records** | The platform records profiles, listings, engagement statuses, reviews and uploaded deliverables in its private databases and file-storage systems. The KYC provider stores identity documents and verification results in its private systems. |
| **5. Intermediary** | The professional-services platform is the principal intermediary because it controls user accounts, provider profiles and the authoritative engagement history. The KYC company acts as the identity-verification intermediary, alongside one payment intermediary. Clients and providers must look to these organizations' records when verifying what happened. |
| **6. What goes wrong** | A client may not be able to independently confirm that a provider completed verification. The platform can change, remove or lose engagement records. One party may deny accepting an engagement, submitting work or approving delivery. Records stored by the platform, KYC provider and payment processor may conflict or be difficult to combine. Dispute resolution may be slow because participants depend on the platform's private records. Fraudulent profiles, false qualifications, and disagreements about delivery or acceptance may cause financial loss and reduced trust. |

### A3: Trust Boundary Diagram

![Trust boundary diagram](images/trust_boundary_map.png)

## Part B

### B1: Qualifiers
| # | Question | Answer | Justification |
|---|---|---|---|
| Q1 | Multiple parties who do not fully trust each other act on the same data | **Yes** | Clients, service providers, and the verification authority interact with trust-critical information related to provider verification and service engagements. Clients and providers may not trust each other's claims about engagement acceptance, delivery, completion, or payment. Both parties need access to a consistent record of the engagement state and payment status. |
| Q2 | Multiple parties need to write, not only read | **Yes** | Multiple parties are responsible for different state-changing actions. The verification authority records provider verification, the client creates and funds an engagement and accepts delivery, and the service provider accepts the engagement and attests that work has been delivered. Therefore, no single party is recording the entire engagement history. |
| Q3 | A trusted intermediary's cost, delay, failure risk, or power is itself the problem | **Yes** | In a professional-service platform, the platform operator usually maintains the authoritative records of provider verification, engagement status, and payment activity. Clients, providers, and external verifiers must therefore rely on the platform's private database. This gives the platform significant control over trust-critical records and makes it a central point of dependence. |
| Q4 | Someone must verify a claim without trusting the claimant | **Yes** | Clients need to verify that a service provider has successfully completed the required verification process without relying only on the provider's own claim. An independent verifier may also need to verify provider-verification status and recorded engagement actions without access to the platform's private database. The verification evidence must therefore be independently checkable rather than being controlled solely by the party making the claim. |
| Q5 | The record must remain tamper-evident after the fact | **Yes** | Provider verification status, engagement creation, provider acceptance, delivery attestation, client acceptance, completion, and payment-related state are trust-critical historical actions. Participants may need to establish later what actions occurred and which party authorized them, particularly when disagreements arise. These records therefore need to remain tamper-evident so that one participant or the platform operator cannot silently alter the historical sequence. |

### B2: Disqualifiers

| # | Disqualifier | Applies? | How the design handles it |
|---|---|---|---|
| D1 | Requires confidential content readable on chain | **No** | The system does not require confidential content to be stored or readable on-chain. The blockchain stores only trust-critical information such as wallet addresses, provider-verification status, engagement state, state-transition events, and escrow/payment state. |
| D2 | Requires throughput or finality beyond ~2s blocks | **No** | The system does not require high transaction throughput or sub-second finality. Blockchain transactions occur only at significant lifecycle events, such as provider verification, engagement creation, funding, provider acceptance, delivery attestation, client acceptance, completion, and escrow settlement. |
| D3 | Requires large data on chain | **No** | The system does not require large files or professional work to be stored on-chain. Completed services such as digital deliverables, designs, documents, and other large application data remain off-chain. The blockchain stores only engagement, verification, and payment state necessary for independent verification and settlement. |
| D4 | All critical facts enter through a single unverifiable reporter | **No** | Trust-critical facts do not enter the system through a single reporter. Different authorized parties are responsible for different state changes, and blockchain transactions identify the wallet that authorized each on-chain action. However, blockchain verifies that an authorized party made a recorded claim; it does not independently prove the truth of off-chain facts such as the accuracy of a KYC decision or the quality of delivered work. |
| D5 | Business process requires reversible or erasable records | **No** | The business process does not require historical records to be erased or reversed. Changes such as credential revocation are represented as new state transitions while preserving the previous history. |

### B3: Verdict and Verifier Sentence

### B3 — Verdict: **PROCEED**

The project passes all of the qualifiers and none of the disqualifiers apply. It is suitable because multiple independent parties perform trust-critical actions, including provider verification, engagement creation and funding, provider acceptance, delivery attestation, client acceptance, and payment settlement. Blockchain is used for provider-verification status, engagement lifecycle records, and escrow/payment state.

#### Verifier Check

A third party with no access to any participant's private systems can verify a provider wallet's recorded verification status and the recorded lifecycle and payment state of a service engagement by inspecting the smart contract state, transactions, and emitted events on the blockchain.

## Part C

### C1: On-Chain/Off-Chain Split

| Data / Record | On-chain | Off-chain | Justification |
|---|:---:|:---:|---|
| KYC/identity information | | ✔ | Sensitive personal information; not required for public verification. |
| Provider profile/skills/listings | | ✔ | Ordinary marketplace information that can change frequently. |
| Provider verification status | ✔ | | Allows independent verification that a wallet has valid provider status. |
| Engagement ID & state | ✔ | | Identifies the engagement without exposing private job details. |
| Client/provider wallets | ✔ | | Identify and authorize the blockchain actors responsible for engagement actions. |
| Requirements/proposals and reviews | | ✔ | Private communications and application data. Ordinary marketplace content like reviews is not required for trust-critical contract execution. |
| Digital deliverables | | ✔ | Potentially large, confidential and proprietary professional work. |
| Escrow amount/payment state | ✔ | | Required for smart-contract escrow and independently verifiable settlement state. |

### C2: Contract Sketch

#### 1. ProviderVerify Contract

**States held:** Authorized verification authority address, provider wallet address.

**State changing functions:**

- `verificationAuthority (address)`: the authorized account allowed to issue, renew, or revoke provider-verification status.
- `providerStatus (mapping(address => bool))`: maps each provider wallet address to whether it currently has valid provider-verification status.
- `verifiedAt (mapping(address => uint256))`: stores the block timestamp when each provider wallet was verified.

**Events:**

- `ProviderVerified` — announces that a provider wallet received valid verification status.

**Deliberately does not do:** Store names, government IDs, email addresses, KYC documents, or other personal identifiers, provider profiles, skills, qualifications, or reviews. Claim that a wallet address alone proves a person's legal identity.

#### 2. ServiceEngagementEscrow Contract

**States held:** Manages the trust-critical lifecycle of a service engagement and holds/releases cryptocurrency payment through escrow.

**State changing functions:**

- `engagementId (uint256)`: a unique identifier assigned to each service engagement.
- `client (address)`: the wallet address of the client who created the engagement.
- `provider (address)`: the wallet address of the verified service provider assigned to the engagement.
- `engagementState (enum)`: records the current lifecycle state of the engagement, such as `CREATED`, `ACCEPTED`, `DELIVERED`, or `COMPLETED`.
- `engagements (mapping(uint256 => Engagement))`: maps each engagement ID to its corresponding engagement record.

**Events:** The contract could emit: `EngagementCreated`, `EngagementFunded`, `EngagementAccepted`, `DeliveryAttested`, `DeliveryAccepted`, `EngagementCompleted`.

**Deliberately does not do:** Store job descriptions, proposals, messages, source code, designs, documents, or other professional deliverables. It does not determine the quality or correctness of delivered work, perform identity/KYC verification, maintain provider profiles or reviews, or provide search and messaging functionality.

### C3: Scope Commitment


| Scope | Commitment |
|---|---|
| **Minimum viable version** — must exist by week 12 | Wallet connection, provider verification, create and accept engagements, record delivery, accept completed work, store engagement status on-chain, and test the smart contract. |
| **Target version** — intended by week 14 | Add provider search, profiles, messaging, private file submission, reviews, cancellation/dispute status, payment, and an improved interface. |
| **Explicitly out of scope** (something we won't be building) | On-chain personal information, video/audio calls, automatic dispute resolution, mobile apps. |

## Part D

### D2: Individual Contributions

| Member Name | Number of Commits | Contributions |
| --- | ---: | --- |
| Maisha Islam | 8 | Codeveloped PROPOSAL.md. Implemented the initial Solidity contract and test suite, contributed to the repository setup and configuration, and updated the AI record|
| Sadia Alam | 7 | Codeveloped PROPOSAL.md. Added DIDlab read-only network verification script, performed contract compilation/testing, added D3 evidence, and updated the README>|

### D3: Compiled Contract and Passing Tests

- **Contract source:** `contracts/ProjectAnchor.sol`
- **Test file:** `test/ProjectAnchor.test.js`

#### Successful Hardhat Compilation

![Successful Hardhat compilation](evidence/d3_compile.png)

#### Passing Hardhat Tests

![Hardhat tests passing](evidence/d3_test.png)

#### DIDLab Chain ID Verification

![DIDLab Chain ID](evidence/d3_chain_id.png)

## Part E

### E1: Milestone Plan

| Gate | Week | What your team will have | Owner |
|---|:---:|---|---|
| **M2 — Deployed contract** | 6 | Deploy initial ProviderVerification and ServiceEngagementEscrow contracts with provider-verification state, engagement creation, and basic escrow funding on the required network. | Maisha |
| **M3 — Vertical slice + data architecture** | 8 | Complete an end-to-end flow. Connect the frontend/backend to the contracts while keeping KYC, messages, and deliverables off-chain. | Sadia |
| **M4 — Security review + feature complete** | 12 | Complete provider verification, engagement lifecycle, escrow funding and withdrawal, authorization checks, custom errors/events, contract tests, and security review. | Sadia & Maisha |
| **M5 — Release candidate + freeze** | 14 | Final integrated application with stable contracts, frontend/backend integration, deployment configuration, documentation, final tests, demo workflow, and no further feature additions. | Sadia & Maisha |

### E2: Team Charter
Our team charter, including team roles, communication expectations, meeting schedule, and accountability procedures, is available here:
[View TEAM_CHARTER.md](TEAM_CHARTER.md)
