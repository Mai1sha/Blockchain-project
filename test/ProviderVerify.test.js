const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ProviderVerify", function () {
  let providerVerify;
  let admin, verifier, provider, otherUser;

  beforeEach(async function () {
    [admin, verifier, provider, otherUser] =
      await ethers.getSigners();

    const ProviderVerify =
      await ethers.getContractFactory("ProviderVerify");

    providerVerify = await ProviderVerify.deploy(
      0,
      admin.address,
      verifier.address
    );

    await providerVerify.waitForDeployment();
  });

  it("Should assign the admin role correctly", async function () {
    const adminRole = await providerVerify.DEFAULT_ADMIN_ROLE();

    expect(
      await providerVerify.hasRole(adminRole, admin.address)
    ).to.equal(true);
  });

  it("Should assign the verifier role correctly", async function () {
    const verifierRole = await providerVerify.VERIFIER_ROLE();

    expect(
      await providerVerify.hasRole(verifierRole, verifier.address)
    ).to.equal(true);
  });

  it("Should initially mark a provider as unverified", async function () {
    expect(
      await providerVerify.isVerifiedProvider(provider.address)
    ).to.equal(false);
  });
  // Test 4: Authorized verifier can verify a provider
it("Should verify a provider successfully", async function () {
  const block = await ethers.provider.getBlock("latest");
  const expiresAt = block.timestamp + 30 * 24 * 60 * 60;

  const credentialHash = ethers.id("test-credential");

  await expect(
    providerVerify
      .connect(verifier)
      .verifyProvider(provider.address, expiresAt, credentialHash)
  )
    .to.emit(providerVerify, "ProviderVerified")
    .withArgs(provider.address, expiresAt, credentialHash);

  expect(
    await providerVerify.isVerifiedProvider(provider.address)
  ).to.equal(true);
});

// Test 5: Unauthorized user cannot verify a provider
it("Should reject verification by unauthorized users", async function () {
  const block = await ethers.provider.getBlock("latest");
  const expiresAt = block.timestamp + 86400;

  const credentialHash = ethers.id("test-credential");

  const verifierRole = await providerVerify.VERIFIER_ROLE();

  await expect(
    providerVerify
      .connect(otherUser)
      .verifyProvider(provider.address, expiresAt, credentialHash)
  )
    .to.be.revertedWithCustomError(
      providerVerify,
      "AccessControlUnauthorizedAccount"
    )
    .withArgs(otherUser.address, verifierRole);
});

// Test 6: Cannot verify the zero address
it("Should reject zero address verification", async function () {
  const block = await ethers.provider.getBlock("latest");
  const expiresAt = block.timestamp + 86400;

  await expect(
    providerVerify
      .connect(verifier)
      .verifyProvider(
        ethers.ZeroAddress,
        expiresAt,
        ethers.id("test-credential")
      )
  ).to.be.revertedWithCustomError(
    providerVerify,
    "ZeroAddress"
  );
});

// Test 7: Cannot verify with an expired timestamp
it("Should reject an invalid expiry timestamp", async function () {
  const block = await ethers.provider.getBlock("latest");
  const expiresAt = block.timestamp - 100;

  await expect(
    providerVerify
      .connect(verifier)
      .verifyProvider(
        provider.address,
        expiresAt,
        ethers.id("test-credential")
      )
  ).to.be.revertedWithCustomError(
    providerVerify,
    "InvalidExpiry"
  );
});
// Test 8: Verification expires automatically
it("Should mark an expired provider as unverified", async function () {
  const block = await ethers.provider.getBlock("latest");
  const expiresAt = block.timestamp + 3600;

  await providerVerify
    .connect(verifier)
    .verifyProvider(
      provider.address,
      expiresAt,
      ethers.id("credential")
    );

  expect(
    await providerVerify.isVerifiedProvider(provider.address)
  ).to.equal(true);

  // Move the local blockchain forward by one hour and one second
  await ethers.provider.send("evm_increaseTime", [3601]);
  await ethers.provider.send("evm_mine", []);

  expect(
    await providerVerify.isVerifiedProvider(provider.address)
  ).to.equal(false);
});

// Test 9: Verifier can suspend a provider
it("Should suspend a verified provider", async function () {
  const block = await ethers.provider.getBlock("latest");

  await providerVerify
    .connect(verifier)
    .verifyProvider(
      provider.address,
      block.timestamp + 86400,
      ethers.id("credential")
    );

  await expect(
    providerVerify.connect(verifier).suspendProvider(provider.address)
  )
    .to.emit(providerVerify, "ProviderSuspended")
    .withArgs(provider.address);

  expect(
    await providerVerify.isVerifiedProvider(provider.address)
  ).to.equal(false);
});

// Test 10: Suspended provider can be reinstated
it("Should reinstate a suspended provider", async function () {
  const block = await ethers.provider.getBlock("latest");

  await providerVerify
    .connect(verifier)
    .verifyProvider(
      provider.address,
      block.timestamp + 86400,
      ethers.id("credential")
    );

  await providerVerify
    .connect(verifier)
    .suspendProvider(provider.address);

  await providerVerify
    .connect(verifier)
    .verifyProvider(
      provider.address,
      block.timestamp + 172800,
      ethers.id("renewed-credential")
    );

  expect(
    await providerVerify.isVerifiedProvider(provider.address)
  ).to.equal(true);
});

// Test 11: Only admin can revoke providers
it("Should reject revocation by unauthorized users", async function () {
  const adminRole = await providerVerify.DEFAULT_ADMIN_ROLE();

  await expect(
    providerVerify.connect(otherUser).revokeProvider(provider.address)
  )
    .to.be.revertedWithCustomError(
      providerVerify,
      "AccessControlUnauthorizedAccount"
    )
    .withArgs(otherUser.address, adminRole);
});

// Test 12: Admin can permanently revoke a provider
it("Should permanently revoke a provider", async function () {
  const block = await ethers.provider.getBlock("latest");

  await providerVerify
    .connect(verifier)
    .verifyProvider(
      provider.address,
      block.timestamp + 86400,
      ethers.id("credential")
    );

  await expect(
    providerVerify.connect(admin).revokeProvider(provider.address)
  )
    .to.emit(providerVerify, "ProviderRevoked")
    .withArgs(provider.address);

  expect(
    await providerVerify.isVerifiedProvider(provider.address)
  ).to.equal(false);

  // Revoked providers cannot be verified again
  await expect(
    providerVerify
      .connect(verifier)
      .verifyProvider(
        provider.address,
        block.timestamp + 172800,
        ethers.id("new-credential")
      )
  ).to.be.revertedWithCustomError(
    providerVerify,
    "ProviderIsRevoked"
  );
});

});