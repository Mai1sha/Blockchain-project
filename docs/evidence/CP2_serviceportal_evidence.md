# CP2 Evidence — ServicePortal (Team MS)

Every record below was checked against `https://eth.didlab.org` (`eth_getTransactionReceipt`) on 2026-11-08. Timestamps are block times in UTC.

## ProviderVerify deployment

```
chain_id          252501
contract_address  0x74483FA46Fc8ee453E0fE03485254dB6D24B1080
deployment_tx     0x47c0ce3d4f697c4d67a7579bc7fc9f70e7bd37ccceb09e6add87707a465e5745
block_number      6681710
gas_used          1140503
status            success
timestamp_utc     2026-10-26T07:15:35Z
what_it_proves    The provider registry exists on chain 252501, deployed by the admin wallet 0x8Cd7F85acC2c2D5bc69b448d09DB06664ef4e121.
```

## EngagementEscrow deployment

```
chain_id          252501
contract_address  0x3fbeE1dBC1929620cAcdcc3C0DA4F2B60f473C88
deployment_tx     0x39ff8edfe087d5f57a4eb5a44bf948042f19c7ca021a71b9583e4307fbf2d194
block_number      6682519
gas_used          1241796
status            success
timestamp_utc     2026-10-26T07:42:33Z
what_it_proves    The escrow contract exists on chain 252501 and is wired to the deployed ProviderVerify registry.
```

## Provider verification (authorized write)

```
chain_id          252501
contract_address  0x74483FA46Fc8ee453E0fE03485254dB6D24B1080
tx_hash           0x41b2949577d89a3b20450989a1cc93d99898a24255bd3dba6bf21b5c515a0643
block_number      6707141
gas_used          49294
status            success
event_signature   ProviderVerified (topic0 0xd989a2afd98b5ed7e09f048cc1d0031e32908110b0670fc9a373e16f166d4333)
timestamp_utc     2026-10-26T21:23:17Z
what_it_proves    The verifier wallet recorded provider 0xAEA4eF37a02A3Db6E2D8D71c68e3941064c59EC1 as verified, and the contract emitted the event.
```

## Provider verification by an unauthorized wallet

```
chain_id          252501
contract_address  0x74483FA46Fc8ee453E0fE03485254dB6D24B1080
tx_hash           0xfb6fcf03378307c8768be36cb2061eef9107bb5b949118ccc47f837d61d0829e
block_number      6710215
gas_used          25097
status            reverted
timestamp_utc     2026-10-26T23:05:45Z
what_it_proves    A wallet without VERIFIER_ROLE (0x07bFF9…E0e58B) cannot verify a provider; access control is enforced on chain.
```

## Engagement #1 created

```
chain_id          252501
contract_address  0x3fbeE1dBC1929620cAcdcc3C0DA4F2B60f473C88
tx_hash           0x04f4938182ed32ab9204b28e9bcc34ebea851d5a3e7cb546cb1adae53f9d0e71
block_number      6724639
gas_used          164893
status            success
event_signature   EngagementCreated (topic0 0x3aca8bfa4d48cb22e2164d028718a37a235cf938f4bc4d9985b2a8ff374e47c1)
timestamp_utc     2026-10-27T07:06:33Z
what_it_proves    A client wallet escrowed 0.01 TRUST for a verified provider from the browser frontend.
```

## Engagement to an unverified provider (on-chain revert)

```
chain_id          252501
contract_address  0x3fbeE1dBC1929620cAcdcc3C0DA4F2B60f473C88
tx_hash           0x0eeaafcd0daf2c19d77b7e11c2ba183cb1ee88ddf81fd8d43ee4c931be60af17
block_number      6725076
gas_used          28564
status            reverted
timestamp_utc     2026-10-27T07:21:07Z
what_it_proves    The escrow refuses a provider the registry has not verified; no event was emitted and the displayed state did not change.
```

## Engagement #4 created

```
chain_id          252501
contract_address  0x3fbeE1dBC1929620cAcdcc3C0DA4F2B60f473C88
tx_hash           0x33a339085565134554b23ec42602201a9ed6af52a9055d65e3066596d6b01cd0
block_number      6725409
gas_used          147793
status            success
event_signature   EngagementCreated
timestamp_utc     2026-10-27T07:32:13Z
what_it_proves    The frontend showed pending, then confirmed, and refreshed its panel from the event.
```

## Engagement #5 created from the deployed site

```
chain_id          252501
contract_address  0x3fbeE1dBC1929620cAcdcc3C0DA4F2B60f473C88
tx_hash           0x3a66076c55b0e21e1ff11011055982ad77d163529ce682afb44ac278e7a9e297
block_number      6727514
gas_used          147793
status            success
event_signature   EngagementCreated
timestamp_utc     2026-10-27T08:42:23Z
what_it_proves    The public HTTPS deployment completes a real escrow transaction end to end.
```

## Supporting files

- Test run (44 passing): `docs/evidence/CP2_tests.png`
- Frontend outcome screenshots: `docs/evidence/lab1_*`
- Deployment manifest: `deployments/didlab-252501.json`
