# Assignment 2 Evidence Index

Screenshots document the DIDLab ServiceRegistry demonstration. The client verification transaction in screenshots 03–04 applies to the original record; screenshots 01–02 apply to a separate newly anchored record.

| File | Evidence |
|---|---|
| 01_provider_anchor_success.png | Successful new anchor transaction through ServicePortal. |
| 02_new_record_integrity_pending.png | New ciphertext integrity passed (1364 bytes), verification pending. |
| 03_client_verification_request.png | Client MetaMask request (original record). |
| 04_client_verification_confirmed.png | Original record verification confirmed with receipt status 1. |
| 05_original_record_integrity.png | Client retrieves IPFS ciphertext and compares SHA-256 digest to original record. |
| 06_record_anchored_event.png | Decoded RecordAnchored event for original record. |
| 07_unauthorized_anchor_rejected.png | Account 3 simulated direct anchor call, NotAuthorized. |
| 08_unauthorized_anchor_and_verify_rejected.png | Account 3 simulated direct calls to anchor and verify; both NotAuthorized. |
| 09_tampering_hash_mismatch.png | Untampered ciphertext hash matches; one-bit-modified copy does not match. |
| 10_self_verification_rejected.png | Additional authorization/self-verification demonstration. |

**Evidence interpretation:** Console direct-call authorization failures were read-only simulations (`staticCall`), not mined failed transactions. Successful anchor and verification transactions were submitted on DIDLab. Do not include encryption secrets or plaintext sensitive deliverables.

**Contract:** `0x6d10ea2912505E6e00C76510bACCFa5819d57C10` on DIDLab chain ID `252501`.
**New anchor transaction:** `0x479f515946c769306e84500cdd9fbb1edd1d797d24a878eeacdf722bae4d71c9`.
**Original verification transaction:** `0x39cb0623e3c0174eabfdc022ff69f4d39f045a39b6ce3686c7645f6453098340`.
