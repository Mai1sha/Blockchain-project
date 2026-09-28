# Team MS 

This repository contains the Milestone M1 work for our Digital Product Provenance project.

The project explores a blockchain-based approach for allowing users to verify a digital file's integrity and view its recorded ownership-transfer history without relying entirely on a marketplace's private records. The system does not verify the real-world identity or original authorship of the registrant.

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
- **ProjectAnchor.sol** — Stores a `bytes32` commitment and timestamp. Writes are restricted to the owner, an all-zero commitment is rejected, and successful anchoring emits `CommitmentAnchored`.

`ProjectAnchor.sol` demonstrates the anchoring pattern used by the project: digital content remains off-chain while its cryptographic commitment is stored on-chain.

## Project Scope

The proposed system is designed to support digital-product file commitment registration and recorded ownership transfers.

Digital files, personal information, marketplace listings, and payment information remain off-chain. The project does not claim to verify the original real-world creator of a digital product.

## Team

See `docs/TEAM_CHARTER.md` for team roles and working agreements.

See `docs/PROPOSAL.md` for the Milestone M1 problem statement, blockchain suitability analysis, technical scope, repository evidence, and milestone plan.