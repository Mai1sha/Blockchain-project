# TEAM MS

This repository contains the Milestone M1 work for our Online Professional-Service Portal project.

The project explores a blockchain-supported professional-service marketplace where clients can engage verified service providers such as tutors, designers, writers, developers, and consultants. The conventional application handles user accounts, provider profiles, KYC, service discovery, communication, and digital deliverables off-chain. Blockchain is used only for the trust-critical layer, including provider-verification status, service-engagement lifecycle records, and escrow/payment state. The system does not claim that a blockchain wallet proves a person's real-world identity. Identity verification is performed off-chain, while the blockchain records the verification status associated with a provider wallet.

## Structure

contracts/          Solidity contracts
test/               Hardhat/Chai tests
scripts/            Deployment and utility scripts
docs/
  TEAM_CHARTER.md   Roles, communication norms, and accountability
  PROPOSAL.md       Milestone M1 project proposal and suitability analysis
  architecture/     Architecture and trust-boundary diagrams
  decisions/        Architectural decision records
  evidence/         Milestone evidence and terminal screenshots
frontend/           Frontend application work
.gitignore
.env.example        Environment variable names only; no secret values
AI_RECORD.md        Record of AI assistant usage on this project

## Setup

Install the project dependencies:

npm install

Create a local environment file:

cp .env.example .env

Fill in any required values locally. The `.env` file is gitignored and must not be committed.

Compile the Solidity contracts:

npx hardhat compile

Run the tests:

npx hardhat test

Expected results include successful contract compilation and four passing tests in `test/ProjectAnchor.test.js`.

## Verify the DIDLab Connection

The DIDLab network connection can be checked without a private key:

npx hardhat run scripts/check-network.js --network didlab

Expected Chain ID:

252501n

This is a read-only network check and does not require a private key.

## Contracts

- **SimpleStorage.sol** — Minimal example contract that stores a `uint256` and emits `ValueChanged` when the value changes.
- **ProjectAnchor.sol** — Milestone M1 scaffold contract that stores a `bytes32` commitment and timestamp. Writes are restricted to the owner, an all-zero commitment is rejected, and successful anchoring emits `CommitmentAnchored`.

These contracts establish the Solidity, Hardhat, access-control, event, custom-error, testing, and deployment foundation for the project. They are not the final application contracts.

The planned application design includes contracts for provider-verification status and service-engagement/escrow management.

## Project Scope

The proposed system supports a professional-service marketplace in which clients can engage verified service providers.

### Off-chain

The conventional application handles:

- User registration and authentication
- KYC and identity documents
- Provider profiles, skills, and service listings
- Search and discovery
- Job requirements and proposals
- Client-provider communications
- Digital deliverables
- Reviews and other private application data

### On-chain

The blockchain trust layer is designed to support:

- Provider-verification status
- Verification 
- Client and provider wallet authorization
- Service-engagement creation
- Engagement lifecycle state
- Provider acceptance
- Delivery attestation
- Client acceptance
- Engagement completion
- Escrow funding and payment state
- Provider payment withdrawal

Personal identity information, KYC documents, messages, job details, and professional deliverables are not stored on-chain.

The blockchain records which authorized wallets performed trust-critical actions, but it does not determine the quality or correctness of professional work and does not independently prove the real-world identity of a wallet holder.

Refunds, engagement cancellation, and dispute resolution are outside the initial project scope.
