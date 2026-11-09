# TEAM MS

This repository contains the ServicePortal project (Online Professional-Service Portal) by Team MS.

- **Live DApp:** https://teamms.didlab.org
- **Chain:** DIDLab, chain ID 252501, RPC https://eth.didlab.org
- **Checkpoint report:** [docs/CHECKPOINT_REPORT.md](docs/CHECKPOINT_REPORT.md)

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
blockchain_folder_2/  Next.js frontend source (wallet connection, provider verification, escrow panel)
frontend/           Built static site plus a small Express server, as deployed to DIDLab
deployments/        Deployed contract addresses per network
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

Expected result: 44 passing tests (ProviderVerify 12, EngagementEscrow 28, ProjectAnchor 4), including unauthorized-caller and invalid-input failure cases.

## Verify the DIDLab Connection

The DIDLab network connection can be checked without a private key:

npx hardhat run scripts/check-network.js --network didlab

Expected Chain ID:

252501n

This is a read-only network check and does not require a private key.

## Contracts

- **ProviderVerify.sol**: provider registry. Accounts with `VERIFIER_ROLE` mark provider wallets as verified, with an expiry, or revoke them. Emits `ProviderVerified`, `ProviderSuspended` and `ProviderRevoked`.
- **EngagementEscrow.sol**: a client creates an engagement with a verified provider and escrows TRUST. The lifecycle runs requested, accepted, delivered, completed, then the provider withdraws. It reads verification status from ProviderVerify and uses custom errors for every rejected call.
- **ProjectAnchor.sol**: M1 scaffold that stores a `bytes32` commitment. Kept for its tests.

### Deployed on DIDLab (chain 252501)

| Contract | Address | Deployment tx |
|---|---|---|
| ProviderVerify | `0x74483FA46Fc8ee453E0fE03485254dB6D24B1080` | `0x47c0ce3d4f697c4d67a7579bc7fc9f70e7bd37ccceb09e6add87707a465e5745` |
| EngagementEscrow | `0x3fbeE1dBC1929620cAcdcc3C0DA4F2B60f473C88` | `0x39ff8edfe087d5f57a4eb5a44bf948042f19c7ca021a71b9583e4307fbf2d194` |

Addresses are also recorded in `deployments/didlab-252501.json`. Evidence for every claimed transaction is in `docs/evidence/CP2_serviceportal_evidence.md`.

## Deploy the Contracts

Fill in `.env` (never commit it):

| Variable | Purpose |
|---|---|
| `DIDLAB_RPC` | RPC URL, `https://eth.didlab.org` |
| `DEPLOYER_KEY` | Deployer wallet's private key (local only) |
| `ADMIN_ADDRESS`, `VERIFIER_ADDRESS` | Roles for a new ProviderVerify; default to the deployer |
| `ADMIN_DELAY_SECONDS` | Admin transfer delay for ProviderVerify; default 0 |
| `REGISTRY_ADDRESS` | Set to reuse an existing ProviderVerify and deploy only the escrow |
| `VERIFIER_KEY`, `CLIENT_KEY`, `PROVIDER_KEY` | Optional local test wallets |

Then deploy both contracts and write the addresses to `deployments/`:

npm run deploy:didlab

## Run and Deploy the Frontend

The frontend source is in `blockchain_folder_2/`. It uses Next.js with static export and viem, and reads contract state from the DIDLab RPC. Users sign with MetaMask; the site never handles private keys.

cd blockchain_folder_2
npm install
npm run dev      # local development at http://localhost:3000
npm run build    # static site written to blockchain_folder_2/out/

If the contracts are redeployed, update the addresses before building: the escrow address is in `blockchain_folder_2/app/escrowConfig.ts`, and the ProviderVerify address appears in `VerifyProviderForm.tsx`, `ProviderVerification.tsx` and `BlockchainStatus.tsx` under `blockchain_folder_2/app/components/`.

**Hosting on DIDLab.** The domain root serves the files in `/srv/www`. A Node app in `/srv/app` on port 3000 is reachable only under `/api/`, so the static build must go in `/srv/www`:

1. Zip the contents of `blockchain_folder_2/out/` so that `index.html` and `_next/` are at the top level of the zip, with no wrapper folder.
2. In the DIDLab panel, open **Files**, then **www**, delete the old `index.html`, and use **Upload zip**. The panel's shell user cannot overwrite files in `/srv/www`; the Files tab can.
3. Open the site and hard-refresh (`Cmd + Shift + R`). Check that the wallet connects, the network is detected as 252501, and both contract addresses are shown.

`frontend/` holds the same build with a small Express server (`server.js`, entry point `index.js`) for the panel's Node app.

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
