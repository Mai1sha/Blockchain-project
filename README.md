# Team Repo — DIDLab Blockchain Project

Milestone M1 scaffold from the Week 4 Guided Activity (Suitability Analysis, Solidity Primer, and Project Kickoff).

## Structure

```
contracts/          Solidity contracts
test/                Hardhat/chai tests
scripts/             Deployment and utility scripts
docs/
  TEAM_CHARTER.md     Roles, communication norms, accountability
  PROPOSAL.md         Activities 2–7: candidate problems, suitability analysis, verdict
  architecture/       Diagrams (trust boundary map, etc.)
  decisions/          One file per architectural decision
frontend/            Empty for now
.gitignore
.env.example         Variable names only, no values
AI_RECORD.md         Log of AI assistant usage on this project
```

## Setup

```bash
npm install
cp .env.example .env   # fill in your own values locally; .env is gitignored
npx hardhat compile
npx hardhat test
```

Expected: `Compiled 1 Solidity file successfully` (or more), and 4 passing tests in `test/ProjectAnchor.test.js`.

## Verify the DIDLab connection (read-only, no key required)

```bash
npx hardhat console --network didlab
```

```js
(await ethers.provider.getNetwork()).chainId   // expect 252501n
await ethers.provider.getBlockNumber()          // should increase on repeat calls
```

## Contracts

- **SimpleStorage.sol** — minimal example: stores a `uint256`, emits `ValueChanged` on write.
- **ProjectAnchor.sol** — stores a `bytes32` commitment + timestamp, owner-only writes, rejects an all-zero commitment, emits `CommitmentAnchored`. This is the anchoring pattern: hash off-chain content and store only the hash on chain.

No private key is needed this week — no deployment happens yet, only compiling and testing against the in-memory Hardhat network, plus a read-only check against DIDLab.

## Team

See `docs/TEAM_CHARTER.md` for roles and `docs/PROPOSAL.md` for the problem selection and suitability analysis (Activities 2–7).
