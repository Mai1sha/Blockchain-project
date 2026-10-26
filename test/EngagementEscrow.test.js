const { expect } = require("chai");
const { ethers, network } = require("hardhat");
const { loadFixture, time } = require("@nomicfoundation/hardhat-network-helpers");
const {
  HOUR,
  DAY,
  AMOUNT,
  SPEC_HASH,
  DELIVERABLE_HASH,
  CREDENTIAL_HASH,
  Status,
  CancelReason,
  deployFixture,
  verifiedFixture,
  requestedFixture
} = require("./helpers/fixtures");

describe("EngagementEscrow", function () {
  describe("deployment", function () {
    it("stores the registry and constants", async function () {
      const { registry, escrow } = await loadFixture(deployFixture);
      expect(await escrow.registry()).to.equal(await registry.getAddress());
      expect(await escrow.lastEngagementId()).to.equal(0);
      expect(await escrow.ACCEPT_WINDOW()).to.equal(7 * DAY);
      expect(await escrow.MIN_PERIOD()).to.equal(HOUR);
      expect(await escrow.MAX_PERIOD()).to.equal(180 * DAY);
    });

    it("rejects a zero or non-contract registry", async function () {
      const { escrow, other } = await loadFixture(deployFixture);
      const Escrow = await ethers.getContractFactory("EngagementEscrow");
      await expect(Escrow.deploy(ethers.ZeroAddress)).to.be.revertedWithCustomError(escrow, "ZeroAddress");
      await expect(Escrow.deploy(other.address)).to.be.revertedWithCustomError(escrow, "ZeroAddress");
    });
  });

  describe("happy path", function () {
    it("create -> accept -> deliver -> accept delivery -> withdraw, paid exactly once", async function () {
      const { escrow, client, provider } = await loadFixture(verifiedFixture);

      const createTx = escrow
        .connect(client)
        .createEngagement(provider.address, SPEC_HASH, 2 * DAY, 3 * DAY, { value: AMOUNT });
      await expect(createTx)
        .to.emit(escrow, "EngagementCreated")
        .withArgs(1, client.address, provider.address, AMOUNT, SPEC_HASH);
      await expect(createTx).to.changeEtherBalances([client, escrow], [-AMOUNT, AMOUNT]);

      let e = await escrow.getEngagement(1);
      expect(e.status).to.equal(Status.Requested);
      expect(e.client).to.equal(client.address);
      expect(e.provider).to.equal(provider.address);
      expect(e.amount).to.equal(AMOUNT);
      expect(e.specHash).to.equal(SPEC_HASH);
      expect(e.acceptBy).to.equal(e.createdAt + BigInt(7 * DAY));

      const acceptTx = escrow.connect(provider).acceptEngagement(1);
      await expect(acceptTx).to.emit(escrow, "EngagementAccepted");
      e = await escrow.getEngagement(1);
      expect(e.status).to.equal(Status.Accepted);
      expect(e.deliverBy).to.equal(BigInt(await time.latest()) + BigInt(2 * DAY));

      await expect(escrow.connect(provider).submitDelivery(1, DELIVERABLE_HASH))
        .to.emit(escrow, "DeliverySubmitted")
        .withArgs(1, DELIVERABLE_HASH, (await time.latest()) + 1 + 3 * DAY);
      e = await escrow.getEngagement(1);
      expect(e.status).to.equal(Status.Delivered);
      expect(e.deliverableHash).to.equal(DELIVERABLE_HASH);

      await expect(escrow.connect(client).acceptDelivery(1)).to.emit(escrow, "EngagementCompleted").withArgs(1, true);
      e = await escrow.getEngagement(1);
      expect(e.status).to.equal(Status.Completed);
      expect(e.clientConfirmed).to.equal(true);

      const withdrawTx = escrow.connect(provider).withdraw(1);
      await expect(withdrawTx).to.emit(escrow, "PaymentWithdrawn").withArgs(1, provider.address, AMOUNT);
      await expect(withdrawTx).to.changeEtherBalances([provider, escrow], [AMOUNT, -AMOUNT]);
      expect((await escrow.getEngagement(1)).status).to.equal(Status.Settled);

      await expect(escrow.connect(provider).withdraw(1)).to.be.revertedWithCustomError(escrow, "InvalidState");
    });
  });

  describe("creation validation (invalid inputs)", function () {
    it("rejects an unverified provider", async function () {
      const { escrow, client, other } = await loadFixture(verifiedFixture);
      await expect(
        escrow.connect(client).createEngagement(other.address, SPEC_HASH, DAY, DAY, { value: AMOUNT })
      ).to.be.revertedWithCustomError(escrow, "ProviderNotVerified");
    });

    it("rejects zero value", async function () {
      const { escrow, client, provider } = await loadFixture(verifiedFixture);
      await expect(
        escrow.connect(client).createEngagement(provider.address, SPEC_HASH, DAY, DAY, { value: 0 })
      ).to.be.revertedWithCustomError(escrow, "InvalidAmount");
    });

    it("rejects client == provider", async function () {
      const { escrow, provider } = await loadFixture(verifiedFixture);
      await expect(
        escrow.connect(provider).createEngagement(provider.address, SPEC_HASH, DAY, DAY, { value: AMOUNT })
      ).to.be.revertedWithCustomError(escrow, "InvalidParties");
    });

    it("rejects the zero address", async function () {
      const { escrow, client } = await loadFixture(verifiedFixture);
      await expect(
        escrow.connect(client).createEngagement(ethers.ZeroAddress, SPEC_HASH, DAY, DAY, { value: AMOUNT })
      ).to.be.revertedWithCustomError(escrow, "ZeroAddress");
    });

    it("rejects a zero spec hash", async function () {
      const { escrow, client, provider } = await loadFixture(verifiedFixture);
      await expect(
        escrow.connect(client).createEngagement(provider.address, ethers.ZeroHash, DAY, DAY, { value: AMOUNT })
      ).to.be.revertedWithCustomError(escrow, "InvalidHash");
    });

    it("rejects periods outside [1 hour, 180 days]", async function () {
      const { escrow, client, provider } = await loadFixture(verifiedFixture);
      const create = (d, r) =>
        escrow.connect(client).createEngagement(provider.address, SPEC_HASH, d, r, { value: AMOUNT });
      await expect(create(HOUR - 1, DAY)).to.be.revertedWithCustomError(escrow, "InvalidPeriod");
      await expect(create(DAY, 180 * DAY + 1)).to.be.revertedWithCustomError(escrow, "InvalidPeriod");
      await expect(create(HOUR, 180 * DAY)).to.emit(escrow, "EngagementCreated");
    });

    it("rejects plain ETH transfers", async function () {
      const { escrow, client } = await loadFixture(deployFixture);
      await expect(client.sendTransaction({ to: await escrow.getAddress(), value: AMOUNT })).to.be.reverted;
    });

    it("rejects unknown engagement ids", async function () {
      const { escrow, provider } = await loadFixture(requestedFixture);
      await expect(escrow.getEngagement(0)).to.be.revertedWithCustomError(escrow, "InvalidEngagement");
      await expect(escrow.getEngagement(2)).to.be.revertedWithCustomError(escrow, "InvalidEngagement");
      await expect(escrow.connect(provider).acceptEngagement(2)).to.be.revertedWithCustomError(
        escrow,
        "InvalidEngagement"
      );
    });
  });

  describe("role and state restrictions (unauthorized callers)", function () {
    it("only the provider can accept, decline, deliver and withdraw", async function () {
      const { escrow, client, other, id } = await loadFixture(requestedFixture);
      for (const caller of [client, other]) {
        await expect(escrow.connect(caller).acceptEngagement(id)).to.be.revertedWithCustomError(escrow, "Unauthorized");
        await expect(escrow.connect(caller).declineEngagement(id)).to.be.revertedWithCustomError(
          escrow,
          "Unauthorized"
        );
        await expect(escrow.connect(caller).submitDelivery(id, DELIVERABLE_HASH)).to.be.revertedWithCustomError(
          escrow,
          "Unauthorized"
        );
        await expect(escrow.connect(caller).withdraw(id)).to.be.revertedWithCustomError(escrow, "Unauthorized");
      }
    });

    it("only the client can cancel, accept delivery, cancel overdue and refund", async function () {
      const { escrow, provider, other, id } = await loadFixture(requestedFixture);
      for (const caller of [provider, other]) {
        await expect(escrow.connect(caller).cancelEngagement(id)).to.be.revertedWithCustomError(escrow, "Unauthorized");
        await expect(escrow.connect(caller).acceptDelivery(id)).to.be.revertedWithCustomError(escrow, "Unauthorized");
        await expect(escrow.connect(caller).cancelOverdue(id)).to.be.revertedWithCustomError(escrow, "Unauthorized");
        await expect(escrow.connect(caller).withdrawRefund(id)).to.be.revertedWithCustomError(escrow, "Unauthorized");
      }
    });

    it("rejects actions in the wrong state", async function () {
      const { escrow, client, provider, id } = await loadFixture(requestedFixture);
      // Requested: cannot deliver, accept delivery, withdraw or refund yet
      await expect(escrow.connect(provider).submitDelivery(id, DELIVERABLE_HASH)).to.be.revertedWithCustomError(
        escrow,
        "InvalidState"
      );
      await expect(escrow.connect(client).acceptDelivery(id)).to.be.revertedWithCustomError(escrow, "InvalidState");
      await expect(escrow.connect(provider).withdraw(id)).to.be.revertedWithCustomError(escrow, "InvalidState");
      await expect(escrow.connect(client).withdrawRefund(id)).to.be.revertedWithCustomError(escrow, "InvalidState");
      await expect(escrow.completeAfterReviewWindow(id)).to.be.revertedWithCustomError(escrow, "InvalidState");

      // Accepted: cannot accept again, decline or cancel
      await escrow.connect(provider).acceptEngagement(id);
      await expect(escrow.connect(provider).acceptEngagement(id)).to.be.revertedWithCustomError(escrow, "InvalidState");
      await expect(escrow.connect(provider).declineEngagement(id)).to.be.revertedWithCustomError(
        escrow,
        "InvalidState"
      );
      await expect(escrow.connect(client).cancelEngagement(id)).to.be.revertedWithCustomError(escrow, "InvalidState");
    });

    it("rejects a zero deliverable hash", async function () {
      const { escrow, provider, id } = await loadFixture(requestedFixture);
      await escrow.connect(provider).acceptEngagement(id);
      await expect(escrow.connect(provider).submitDelivery(id, ethers.ZeroHash)).to.be.revertedWithCustomError(
        escrow,
        "InvalidHash"
      );
    });
  });

  describe("cancellation and refunds", function () {
    it("client cancels a requested engagement and is refunded exactly once", async function () {
      const { escrow, client, id } = await loadFixture(requestedFixture);
      await expect(escrow.connect(client).cancelEngagement(id))
        .to.emit(escrow, "EngagementCancelled")
        .withArgs(id, CancelReason.ClientCancelled);
      const refundTx = escrow.connect(client).withdrawRefund(id);
      await expect(refundTx).to.emit(escrow, "RefundWithdrawn").withArgs(id, client.address, AMOUNT);
      await expect(refundTx).to.changeEtherBalances([client, escrow], [AMOUNT, -AMOUNT]);
      expect((await escrow.getEngagement(id)).status).to.equal(Status.Refunded);
      await expect(escrow.connect(client).withdrawRefund(id)).to.be.revertedWithCustomError(escrow, "InvalidState");
    });

    it("provider declines; client is refunded", async function () {
      const { escrow, client, provider, id } = await loadFixture(requestedFixture);
      await expect(escrow.connect(provider).declineEngagement(id))
        .to.emit(escrow, "EngagementCancelled")
        .withArgs(id, CancelReason.ProviderDeclined);
      await expect(escrow.connect(client).withdrawRefund(id)).to.changeEtherBalance(client, AMOUNT);
    });
  });

  describe("verification gating", function () {
    it("suspended provider cannot accept; client can still cancel and refund", async function () {
      const { registry, escrow, verifier, client, provider, id } = await loadFixture(requestedFixture);
      await registry.connect(verifier).suspendProvider(provider.address);
      await expect(escrow.connect(provider).acceptEngagement(id)).to.be.revertedWithCustomError(
        escrow,
        "ProviderNotVerified"
      );
      await escrow.connect(client).cancelEngagement(id);
      await expect(escrow.connect(client).withdrawRefund(id)).to.changeEtherBalance(client, AMOUNT);
    });

    it("provider whose credential expired cannot accept", async function () {
      const { registry, escrow, verifier, provider, id } = await loadFixture(requestedFixture);
      // shorten the credential so it expires inside the 7-day accept window
      const shortExpiry = (await time.latest()) + 2 * HOUR;
      await registry.connect(verifier).verifyProvider(provider.address, shortExpiry, CREDENTIAL_HASH);
      await time.increaseTo(shortExpiry);
      await expect(escrow.connect(provider).acceptEngagement(id)).to.be.revertedWithCustomError(
        escrow,
        "ProviderNotVerified"
      );
    });

    it("accept window is enforced (deadline itself is still in time)", async function () {
      const { escrow, provider, id } = await loadFixture(requestedFixture);
      const { acceptBy } = await escrow.getEngagement(id);
      await time.setNextBlockTimestamp(acceptBy + 1n);
      await expect(escrow.connect(provider).acceptEngagement(id)).to.be.revertedWithCustomError(
        escrow,
        "DeadlinePassed"
      );
    });

    it("accepting exactly at acceptBy succeeds", async function () {
      const { escrow, provider, id } = await loadFixture(requestedFixture);
      const { acceptBy } = await escrow.getEngagement(id);
      await time.setNextBlockTimestamp(acceptBy);
      await expect(escrow.connect(provider).acceptEngagement(id)).to.emit(escrow, "EngagementAccepted");
    });

    it("accepted engagement can still finish after the provider is revoked", async function () {
      const { registry, escrow, admin, client, provider, id } = await loadFixture(requestedFixture);
      await escrow.connect(provider).acceptEngagement(id);
      await registry.connect(admin).revokeProvider(provider.address);
      await escrow.connect(provider).submitDelivery(id, DELIVERABLE_HASH);
      await escrow.connect(client).acceptDelivery(id);
      await expect(escrow.connect(provider).withdraw(id)).to.changeEtherBalance(provider, AMOUNT);
    });
  });

  describe("timeouts", function () {
    it("delivery timeout: provider cannot deliver late; client cancels overdue then refunds", async function () {
      const { escrow, client, provider, other, id } = await loadFixture(requestedFixture);
      await escrow.connect(provider).acceptEngagement(id);
      const { deliverBy } = await escrow.getEngagement(id);

      await expect(escrow.connect(client).cancelOverdue(id)).to.be.revertedWithCustomError(
        escrow,
        "DeadlineNotReached"
      );

      await time.increaseTo(deliverBy + 1n);
      await expect(escrow.connect(provider).submitDelivery(id, DELIVERABLE_HASH)).to.be.revertedWithCustomError(
        escrow,
        "DeadlinePassed"
      );
      await expect(escrow.connect(other).cancelOverdue(id)).to.be.revertedWithCustomError(escrow, "Unauthorized");
      await expect(escrow.connect(client).cancelOverdue(id))
        .to.emit(escrow, "EngagementCancelled")
        .withArgs(id, CancelReason.DeliveryOverdue);
      await expect(escrow.connect(client).withdrawRefund(id)).to.changeEtherBalance(client, AMOUNT);
    });

    it("review timeout: anyone completes with clientConfirmed == false; provider withdraws", async function () {
      const { escrow, provider, other, id } = await loadFixture(requestedFixture);
      await escrow.connect(provider).acceptEngagement(id);
      await escrow.connect(provider).submitDelivery(id, DELIVERABLE_HASH);
      const { reviewBy } = await escrow.getEngagement(id);

      await expect(escrow.connect(other).completeAfterReviewWindow(id)).to.be.revertedWithCustomError(
        escrow,
        "DeadlineNotReached"
      );

      await time.increaseTo(reviewBy + 1n);
      await expect(escrow.connect(other).completeAfterReviewWindow(id))
        .to.emit(escrow, "EngagementCompleted")
        .withArgs(id, false);
      const e = await escrow.getEngagement(id);
      expect(e.status).to.equal(Status.Completed);
      expect(e.clientConfirmed).to.equal(false);
      await expect(escrow.connect(provider).withdraw(id)).to.changeEtherBalance(provider, AMOUNT);
    });

    it("client may still accept delivery after reviewBy if nobody completed it", async function () {
      const { escrow, client, provider, id } = await loadFixture(requestedFixture);
      await escrow.connect(provider).acceptEngagement(id);
      await escrow.connect(provider).submitDelivery(id, DELIVERABLE_HASH);
      const { reviewBy } = await escrow.getEngagement(id);
      await time.increaseTo(reviewBy + 1n);
      await expect(escrow.connect(client).acceptDelivery(id)).to.emit(escrow, "EngagementCompleted").withArgs(id, true);
    });
  });

  describe("security", function () {
    it("force-sent ETH does not affect payouts", async function () {
      const { escrow, client, provider, id } = await loadFixture(requestedFixture);
      const escrowAddr = await escrow.getAddress();
      const extra = ethers.parseEther("5");
      // simulate selfdestruct/coinbase force-send by bumping the balance directly
      await network.provider.send("hardhat_setBalance", [escrowAddr, ethers.toQuantity(AMOUNT + extra)]);

      await escrow.connect(provider).acceptEngagement(id);
      await escrow.connect(provider).submitDelivery(id, DELIVERABLE_HASH);
      await escrow.connect(client).acceptDelivery(id);
      await expect(escrow.connect(provider).withdraw(id)).to.changeEtherBalance(provider, AMOUNT);
      expect(await ethers.provider.getBalance(escrowAddr)).to.equal(extra);
    });

    it("reentrancy attempt on withdraw fails; funds paid once", async function () {
      const { registry, escrow, verifier, client } = await loadFixture(verifiedFixture);
      const Attacker = await ethers.getContractFactory("ReentrantProvider");
      const attacker = await Attacker.deploy();
      const attackerAddr = await attacker.getAddress();
      const escrowAddr = await escrow.getAddress();

      await registry
        .connect(verifier)
        .verifyProvider(attackerAddr, (await time.latest()) + 30 * DAY, CREDENTIAL_HASH);
      await escrow.connect(client).createEngagement(attackerAddr, SPEC_HASH, DAY, DAY, { value: AMOUNT });
      // a second engagement keeps extra ETH in the escrow for the attacker to try to drain
      const other = ethers.parseEther("2");
      const [, , , , , client2] = await ethers.getSigners();
      await escrow.connect(client2).createEngagement(attackerAddr, SPEC_HASH, DAY, DAY, { value: other });

      await attacker.exec(escrowAddr, escrow.interface.encodeFunctionData("acceptEngagement", [1]));
      await attacker.exec(
        escrowAddr,
        escrow.interface.encodeFunctionData("submitDelivery", [1, DELIVERABLE_HASH])
      );
      await escrow.connect(client).acceptDelivery(1);

      await attacker.setTarget(escrowAddr, 1);
      await attacker.exec(escrowAddr, escrow.interface.encodeFunctionData("withdraw", [1]));

      expect(await attacker.reentryAttempted()).to.equal(true);
      expect(await attacker.reentrySucceeded()).to.equal(false);
      expect(await ethers.provider.getBalance(attackerAddr)).to.equal(AMOUNT);
      expect(await ethers.provider.getBalance(escrowAddr)).to.equal(other);
      expect((await escrow.getEngagement(1)).status).to.equal(Status.Settled);
    });

    it("conserves balance across mixed cancel / complete / withdraw flows", async function () {
      const { escrow, client, provider } = await loadFixture(verifiedFixture);
      const escrowAddr = await escrow.getAddress();
      const amounts = [1n, 2n, 3n].map((n) => ethers.parseEther(n.toString()));
      for (const value of amounts) {
        await escrow.connect(client).createEngagement(provider.address, SPEC_HASH, DAY, DAY, { value });
      }
      expect(await ethers.provider.getBalance(escrowAddr)).to.equal(ethers.parseEther("6"));

      // #1 completed and withdrawn, #2 cancelled and refunded, #3 left Accepted
      await escrow.connect(provider).acceptEngagement(1);
      await escrow.connect(provider).submitDelivery(1, DELIVERABLE_HASH);
      await escrow.connect(client).acceptDelivery(1);
      await escrow.connect(provider).withdraw(1);
      await escrow.connect(client).cancelEngagement(2);
      await escrow.connect(client).withdrawRefund(2);
      await escrow.connect(provider).acceptEngagement(3);

      expect(await ethers.provider.getBalance(escrowAddr)).to.equal(amounts[2]);
      expect(await escrow.lastEngagementId()).to.equal(3);
    });
  });
});
