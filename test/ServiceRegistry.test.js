const { expect } = require("chai");
const { ethers } = require("hardhat");

// Placeholder values for tests only. Real records use the ciphertext SHA-256
// and the CID from DIDLab Secure IPFS.
const DIGEST = "0x" + "11".repeat(32);
const CID = "bafyTESTCIDPLACEHOLDER";

// recordIds are random 32-byte values, never derived from personal data.
const newRecordId = () => ethers.hexlify(ethers.randomBytes(32));

describe("ServiceRegistry", function () {
  let reg, admin, provider, client, outsider;
  let ADMIN, PROVIDER, CLIENT, recordId;

  beforeEach(async function () {
    [admin, provider, client, outsider] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ServiceRegistry");
    reg = await Factory.deploy();
    await reg.waitForDeployment();

    ADMIN = await reg.ADMIN();
    PROVIDER = await reg.PROVIDER();
    CLIENT = await reg.CLIENT();
    recordId = newRecordId();

    await reg.grantRole(PROVIDER, provider.address);
    await reg.grantRole(CLIENT, client.address);
  });

  describe("roles", function () {
    it("gives the deployer ADMIN only", async function () {
      expect(await reg.hasRole(ADMIN, admin.address)).to.equal(true);
      expect(await reg.hasRole(PROVIDER, admin.address)).to.equal(false);
      expect(await reg.hasRole(CLIENT, admin.address)).to.equal(false);
    });

    it("emits RoleGranted and RoleRevoked", async function () {
      await expect(reg.grantRole(CLIENT, outsider.address))
        .to.emit(reg, "RoleGranted")
        .withArgs(CLIENT, outsider.address, admin.address);
      await expect(reg.revokeRole(CLIENT, outsider.address))
        .to.emit(reg, "RoleRevoked")
        .withArgs(CLIENT, outsider.address, admin.address);
    });

    it("refuses grantRole from a non-admin", async function () {
      await expect(reg.connect(provider).grantRole(CLIENT, provider.address))
        .to.be.revertedWithCustomError(reg, "NotAuthorized")
        .withArgs(ADMIN);
    });

    it("refuses granting a role to the zero address", async function () {
      await expect(reg.grantRole(PROVIDER, ethers.ZeroAddress))
        .to.be.revertedWithCustomError(reg, "ZeroAddress");
    });
  });

  describe("success paths", function () {
    it("lets a provider anchor a record", async function () {
      await expect(reg.connect(provider).anchor(recordId, DIGEST, CID))
        .to.emit(reg, "RecordAnchored")
        .withArgs(recordId, DIGEST, provider.address, CID);

      const r = await reg.get(recordId);
      expect(r.digest).to.equal(DIGEST);
      expect(r.cid).to.equal(CID);
      expect(r.submitter).to.equal(provider.address);
      expect(r.submittedAt).to.be.greaterThan(0n);
      expect(r.verifiedAt).to.equal(0n);
    });

    it("lets a client verify the record and records who and when", async function () {
      await reg.connect(provider).anchor(recordId, DIGEST, CID);
      await expect(reg.connect(client).verify(recordId))
        .to.emit(reg, "RecordVerified");

      const r = await reg.get(recordId);
      expect(r.verifier).to.equal(client.address);
      expect(r.verifiedAt).to.be.greaterThan(0n);
    });
  });

  describe("required refusals", function () {
    it("1. refuses an anchor without the PROVIDER role", async function () {
      await expect(reg.connect(outsider).anchor(recordId, DIGEST, CID))
        .to.be.revertedWithCustomError(reg, "NotAuthorized")
        .withArgs(PROVIDER);
    });

    it("2. refuses a verify without the CLIENT role", async function () {
      await reg.connect(provider).anchor(recordId, DIGEST, CID);
      await expect(reg.connect(outsider).verify(recordId))
        .to.be.revertedWithCustomError(reg, "NotAuthorized")
        .withArgs(CLIENT);
    });

    it("3. refuses self-verification even when the provider also holds CLIENT", async function () {
      await reg.grantRole(CLIENT, provider.address); // the misconfiguration
      await reg.connect(provider).anchor(recordId, DIGEST, CID);
      await expect(reg.connect(provider).verify(recordId))
        .to.be.revertedWithCustomError(reg, "SelfVerification");
    });

    it("4. refuses verification of a record that does not exist", async function () {
      await expect(reg.connect(client).verify(newRecordId()))
        .to.be.revertedWithCustomError(reg, "UnknownRecord");
    });

    it("5. refuses anchoring the same recordId twice", async function () {
      await reg.connect(provider).anchor(recordId, DIGEST, CID);
      await expect(reg.connect(provider).anchor(recordId, "0x" + "22".repeat(32), CID))
        .to.be.revertedWithCustomError(reg, "AlreadyAnchored");
    });

    it("6a. refuses an anchor after the PROVIDER role is revoked", async function () {
      await reg.revokeRole(PROVIDER, provider.address);
      await expect(reg.connect(provider).anchor(recordId, DIGEST, CID))
        .to.be.revertedWithCustomError(reg, "NotAuthorized")
        .withArgs(PROVIDER);
    });

    it("6b. refuses a verify after the CLIENT role is revoked", async function () {
      await reg.connect(provider).anchor(recordId, DIGEST, CID);
      await reg.revokeRole(CLIENT, client.address);
      await expect(reg.connect(client).verify(recordId))
        .to.be.revertedWithCustomError(reg, "NotAuthorized")
        .withArgs(CLIENT);
    });

    it("refuses verifying an already-verified record", async function () {
      await reg.connect(provider).anchor(recordId, DIGEST, CID);
      await reg.connect(client).verify(recordId);
      await expect(reg.connect(client).verify(recordId))
        .to.be.revertedWithCustomError(reg, "AlreadyVerified");
    });
  });

  describe("input validation", function () {
    it("refuses an empty digest", async function () {
      await expect(reg.connect(provider).anchor(recordId, ethers.ZeroHash, CID))
        .to.be.revertedWithCustomError(reg, "EmptyDigest");
    });

    it("refuses an empty CID", async function () {
      await expect(reg.connect(provider).anchor(recordId, DIGEST, ""))
        .to.be.revertedWithCustomError(reg, "EmptyCid");
    });

    it("refuses a zero recordId", async function () {
      await expect(reg.connect(provider).anchor(ethers.ZeroHash, DIGEST, CID))
        .to.be.revertedWithCustomError(reg, "EmptyRecordId");
    });
  });
});
