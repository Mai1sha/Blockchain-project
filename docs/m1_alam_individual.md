# M1 Individual Statement — Sadia Alam

# 1. What did I personally contribute this week?
I contributed to explaining our problem statement, evaluating whether our selected problem passed the qualifying questions, developing the on-chain/off-chain data split, and completing the D3 verification and evidence. I also contributed to the final suitability verdict and the milestone plan with my teammate. I independently compiled the Solidity contract and ran the tests to confirm that all four tests passed. I added the DIDLab read-only network verification script (48d845b), collected and added the D3 terminal evidence (4ff2b3d), and updated the README with the M1 project description and setup instructions (a689c96).

## 2. What part of the suitability analysis did you most disagree with, and how was it resolved?
The most difficult part was deciding whether the system could claim that a registered seller was the original creator. We determined that the blockchain can verify the registered file commitment and recorded ownership history, but it cannot independently verify who is the original author. We resolved this by explicitly placing original authorship outside the project's scope.

# 3. What is the single biggest technical risk to this project, in your judgment?
The biggest technical risk is protecting ownership transfers from unauthorized users. Only the current owner's wallet should be able to transfer ownership, but if someone steals the owner's private key, they could make an unauthorized transfer that would still appear valid on the blockchain

# 4. What do you not yet understand well enough to build?
I do not fully understand how does smart contracts work and how to implement the complete Solidity contract for registering multiple products and maintaining ownership-transfer history. I also don't have enough knowledge about Solidity and how wallet signatures and private keys are used to authorize smart-contract transactions while keeping the private key secure.