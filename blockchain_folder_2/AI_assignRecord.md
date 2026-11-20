
# AI Usage Record — Blockchain Assignment 2

Student-Maisha Islam

I added the articatc verification section on my existing page

## Blockchain Assignment 2 — Anchoring and Authorization

### Tools Used
ChatGPT (OpenAI).

### What I Asked For
I used ChatGPT to help understand the assignment requirements, develop and test the `ServiceRegistry.sol` smart contract, and implement an encrypted artifact anchoring and verification workflow.

AI assistance included Solidity role-based authorization, deployment to DIDLab, IPFS ciphertext hashing, transaction inspection, unauthorized-action testing, frontend integration, TypeScript debugging, Git commands, and privacy-audit documentation.

### What AI Produced
ChatGPT provided explanations, example Solidity and JavaScript code, Hardhat testing guidance, terminal commands, React/Next.js code for the Artifact Verification interface, and suggested wording for the privacy audit.

The AI also helped troubleshoot TypeScript compilation errors and integrate the verification interface into the existing ServicePortal homepage.

### How I Verified the Results
I independently executed the commands and reviewed the results.

- Compiled and tested `ServiceRegistry.sol` using Hardhat, obtaining 17 passing tests.
- Deployed the contract to DIDLab blockchain (Chain ID 252501).
- Encrypted a service completion report using DIDLab Secure IPFS and verified the downloaded ciphertext's SHA-256 digest.
- Anchored the ciphertext digest and CID on-chain using an authorized provider wallet.
- Connected a separate client wallet, retrieved the encrypted artifact, and confirmed that its calculated SHA-256 matched the on-chain commitment.
- Submitted and confirmed a successful client-verification transaction.
- Tested self-verification rejection and unauthorized anchoring rejection.
- Modified one bit in a local ciphertext copy and confirmed that its SHA-256 digest no longer matched.
- Built the Next.js application successfully and tested the integrated Artifact Verification interface in the browser.

### Limitations and Corrections
During development, I corrected TypeScript compatibility issues in the React frontend and resolved a type-checking error in the existing escrow utility.

The unauthorized anchoring rejection was demonstrated through a simulated contract call rather than a mined failed transaction.

The artifact-integrity check proves that the retrieved encrypted file matches the recorded blockchain commitment. It does not establish the real-world authorship, accuracy, or quality of the underlying service deliverable.

I reviewed the AI-generated guidance and verified the demonstrated behavior using actual test outputs, blockchain transactions, and browser results.