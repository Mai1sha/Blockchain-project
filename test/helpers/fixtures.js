const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

const HOUR = 60 * 60;
const DAY = 24 * HOUR;
const ADMIN_DELAY = 3 * DAY;
const AMOUNT = ethers.parseEther("1");
const SPEC_HASH = ethers.keccak256(ethers.toUtf8Bytes("scope: logo design v1"));
const DELIVERABLE_HASH = ethers.keccak256(ethers.toUtf8Bytes("deliverable: logo.zip"));
const CREDENTIAL_HASH = ethers.keccak256(ethers.toUtf8Bytes("credential: provider-kyc-001"));

// Mirrors the Solidity enums.
const ProviderStatus = { None: 0, Verified: 1, Suspended: 2, Revoked: 3 };
const Status = {
  None: 0,
  Requested: 1,
  Accepted: 2,
  Delivered: 3,
  Completed: 4,
  Settled: 5,
  Cancelled: 6,
  Refunded: 7
};
const CancelReason = { ClientCancelled: 0, ProviderDeclined: 1, DeliveryOverdue: 2 };

async function deployFixture() {
  const [admin, verifier, client, provider, other] = await ethers.getSigners();

  const Registry = await ethers.getContractFactory("ProviderVerify");
  const registry = await Registry.deploy(ADMIN_DELAY, admin.address, verifier.address);

  const Escrow = await ethers.getContractFactory("EngagementEscrow");
  const escrow = await Escrow.deploy(await registry.getAddress());

  return { registry, escrow, admin, verifier, client, provider, other };
}

/// Deploy, then verify `provider` for 30 days.
async function verifiedFixture() {
  const f = await deployFixture();
  const expiresAt = (await time.latest()) + 30 * DAY;
  await f.registry.connect(f.verifier).verifyProvider(f.provider.address, expiresAt, CREDENTIAL_HASH);
  return { ...f, expiresAt };
}

/// Verified provider plus one Requested engagement (id 1).
async function requestedFixture() {
  const f = await verifiedFixture();
  await f.escrow
    .connect(f.client)
    .createEngagement(f.provider.address, SPEC_HASH, 2 * DAY, 3 * DAY, { value: AMOUNT });
  return { ...f, id: 1n };
}

module.exports = {
  HOUR,
  DAY,
  ADMIN_DELAY,
  AMOUNT,
  SPEC_HASH,
  DELIVERABLE_HASH,
  CREDENTIAL_HASH,
  ProviderStatus,
  Status,
  CancelReason,
  deployFixture,
  verifiedFixture,
  requestedFixture
};
