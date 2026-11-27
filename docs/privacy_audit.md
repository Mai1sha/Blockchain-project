
# Privacy Audit — ServicePortal

## 1. Overview

The application, ServicePortal uses a hybrid on-chain and off-chain architecture to protect service-deliverable information while maintaining a tamper-evident verification history.

The `ServiceRegistry.sol` smart contract records commitments to encrypted deliverables stored through DIDLab Secure IPFS. The actual plaintext documents are not written to the blockchain.

## 2. On-Chain Data Inventory

| Data field | Purpose | Privacy consideration |
|---|---|---|
| `recordId` | Uniquely identifies a deliverable record | Must be randomly generated and not derived from personal information |
| `digest` | Stores the SHA-256 hash of the encrypted ciphertext | Does not directly reveal the plaintext, but remains publicly visible |
| `cid` | Identifies the encrypted artifact stored on IPFS | Reveals a publicly retrievable content reference |
| `submitter` | Identifies the wallet that anchored the deliverable | Public wallet activity may be linked across transactions |
| `submittedAt` | Records when the deliverable was anchored | Reveals timing information |
| `verifier` | Identifies the wallet that verified the record | May reveal an association between wallets |
| `verifiedAt` | Records the verification timestamp | Reveals when verification occurred |

The contract also exposes role assignments through `hasRole()` and emits events for role grants, role revocations, record anchoring, and verification.


### Field-by-Field Privacy Verdicts

The following assessment covers the data written to contract storage, included in transaction calldata, or emitted in blockchain events. All on-chain data and transaction metadata should be treated as publicly observable.

| Field or value | Location | Could identify or link a person? | Privacy verdict |
|---|---|---|---|
| `recordId` | Storage, `anchor()` calldata, `RecordAnchored` and `RecordVerified` events | Indirectly, if associated with a known person or transaction | Acceptable with safeguards: generate a cryptographically random identifier, never derive it from personal information |
| `digest` | Storage, `anchor()` calldata, `RecordAnchored` event | Potentially; a known file can be compared against its digest | Acceptable with safeguards: hash encrypted ciphertext, not sensitive plaintext |
| `cid` | Storage, `anchor()` calldata, `RecordAnchored` event | Potentially; reveals a link to the encrypted artifact | Acceptable with safeguards: encrypt before uploading and protect decryption keys |
| `submitter` | Storage, `RecordAnchored` event, transaction sender | Yes, indirectly; wallet activity can be linked to an identity | Privacy-sensitive but necessary: disclose that wallet participation is public |
| `submittedAt` | Storage and related transaction/block metadata | Indirectly; reveals timing and supports activity correlation | Acceptable with safeguards: retain only required timestamps |
| `verifier` | Storage, `RecordVerified` event, transaction sender | Yes, indirectly; reveals the verifying wallet and its association with a record | Privacy-sensitive but necessary: avoid linking wallets to personal identifiers on-chain |
| `verifiedAt` | Storage and related transaction/block metadata | Indirectly; reveals when verification occurred | Acceptable with safeguards: store only the timestamp needed for auditability |
| Role identifier (`ADMIN`, `PROVIDER`, `CLIENT`) | Role-mapping storage, role-management calldata and events | Indirectly; reveals a wallet's authorization or participation category | Acceptable with safeguards: use roles rather than public personal-identity records |
| Role holder address | Role-mapping storage, grant/revoke calldata and events | Yes, indirectly; may reveal a provider, client, or administrator | Privacy-sensitive: do not publish real-world identity mappings |
| Role administrator/transaction sender | Transaction metadata and role-management events where emitted | Yes, indirectly; reveals who performed administrative actions | Privacy-sensitive but necessary for accountability |
| Role assignment or revocation action | `grantRole()` / `revokeRole()` calldata and corresponding events | Indirectly; reveals authorization history | Acceptable with safeguards: avoid including personal information in event data |

### Overall Privacy Verdict

**Acceptable with safeguards for this demonstration.** ServicePortal stores public commitments and authorization metadata rather than plaintext deliverables or KYC information. However, wallet addresses, timestamps, role assignments, and IPFS references can reveal relationships or activity patterns.

Encryption protects artifact contents only while the encryption keys remain secure. Blockchain integrity checks establish correspondence with a recorded ciphertext digest; they do not independently prove the deliverable's authorship, correctness, or quality.

Personal identifiers, plaintext documents, encryption keys, and confidential service details should remain off-chain.

## 3. Off-Chain Data

The following information should remain outside the blockchain:

- Original plaintext deliverables and service documents.
- Client and provider personal information.
- KYC documents and identity-verification records.
- Private messages, proposals, and service descriptions.
- Encryption keys and wallet signatures used for encryption-key derivation.

For the demonstrated workflow, the service completion report was encrypted locally using AES-256-GCM before being uploaded to DIDLab Secure IPFS.

The blockchain stores the ciphertext digest and CID rather than the original report.

## 4. Privacy Risks and Mitigations

### Risk 1 — Wallet Linkability

Although blockchain addresses are pseudonymous, transactions are publicly visible. Observers may correlate repeated activity involving provider and client wallets.

**Mitigation:** Avoid storing personal identifiers alongside wallet addresses. Keep identity mapping and KYC information off-chain with appropriate access controls.

### Risk 2 — CID Exposure

The IPFS CID is publicly recorded, allowing anyone who discovers it to attempt retrieval of the encrypted artifact.

**Mitigation:** Encrypt deliverables before uploading them. Do not store plaintext files or encryption secrets in publicly accessible storage.

### Risk 3 — Metadata Leakage

Submission and verification timestamps reveal information about when service activities occurred.

**Mitigation:** Store only necessary lifecycle metadata on-chain and avoid including detailed personal information in event logs.

### Risk 4 — Weak Record Identifiers

A record ID derived from an email, name, or customer identifier could reveal or facilitate linking to personal information.

**Mitigation:** Generate cryptographically random 32-byte record identifiers independently of personal data.

### Risk 5 — Encryption and Key Management

Encrypted files remain confidential only while encryption keys are protected. Compromised keys or unsafe recovery procedures could expose deliverables.

**Mitigation:** Use authenticated encryption, protect recovery information, and never commit wallet private keys, encryption secrets, or sensitive recovery bundles to GitHub.

## 5. Integrity and Verification Evidence

The ServicePortal workflow demonstrates the following protections:

**Encrypted storage:** A service completion report was encrypted locally using AES-256-GCM and stored through DIDLab Secure IPFS.

**On-chain anchoring:** The provider anchored the ciphertext SHA-256 digest and CID through `ServiceRegistry.sol`.

**Independent verification:** A separate client wallet retrieved the ciphertext, calculated its SHA-256 digest, compared the result with the on-chain commitment, and successfully submitted a verification transaction.

**Tampering detection:** A separate copy of the encrypted ciphertext was modified by flipping exactly one bit. Although the file size remained 1,364 bytes, its SHA-256 digest changed and the comparison failed.

**Authorization enforcement:** The contract rejected provider self-verification and unauthorized anchoring attempts.

These demonstrations establish integrity verification and role-based restrictions. They do not, by themselves, prove the absence of all privacy vulnerabilities.

## 6. Limitations

Several privacy and security considerations remain:

- On-chain records, events, wallet addresses, and CIDs are publicly observable.
- Encryption does not hide file size, retrieval patterns, or transaction metadata.
- A successful hash comparison proves that retrieved ciphertext matches the anchored commitment, not that the delivered work is correct or satisfactory.
- The contract's `verify()` function records an authorized client's attestation; it cannot independently determine whether the client actually inspected the file.
- The contract's role-management process relies on trusted administrators.
- A leaked or compromised encryption key could undermine confidentiality.
- Access permissions in the smart contract do not automatically restrict public retrieval of IPFS ciphertext.

## 7. Conclusion

The application separates confidential deliverable content from publicly verifiable blockchain commitments.

The design minimizes direct exposure of plaintext service documents while allowing providers and clients to establish an auditable record of submission and verification.

However, blockchain transparency creates metadata and linkability risks. The system therefore depends on secure encryption, careful key management, random record identifiers, appropriate off-chain access controls, and responsible handling of publicly visible information.