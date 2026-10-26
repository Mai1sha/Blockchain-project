const { ethers, network } = require("hardhat");
const fs = require("fs");
const path = require("path");

// Deploys ProviderVerify (the provider registry), then EngagementEscrow wired to it, and records the
// addresses, deploy blocks and transaction hashes in deployments/<network>-<chainId>.json.
async function main() {
  const [deployer] = await ethers.getSigners();
  const admin = process.env.ADMIN_ADDRESS || deployer.address;
  const verifier = process.env.VERIFIER_ADDRESS || deployer.address;
  const adminDelay = Number(process.env.ADMIN_DELAY_SECONDS ?? 0);

  const Registry = await ethers.getContractFactory("ProviderVerify");
  const registry = await Registry.deploy(adminDelay, admin, verifier);
  const registryReceipt = await registry.deploymentTransaction().wait();
  const registryAddress = await registry.getAddress();

  const Escrow = await ethers.getContractFactory("EngagementEscrow");
  const escrow = await Escrow.deploy(registryAddress);
  const escrowReceipt = await escrow.deploymentTransaction().wait();
  const escrowAddress = await escrow.getAddress();

  const chainId = Number((await ethers.provider.getNetwork()).chainId);
  const out = {
    network: network.name,
    chainId,
    deployer: deployer.address,
    admin,
    verifier,
    adminDelay,
    deployedAt: new Date().toISOString(),
    contracts: {
      ProviderVerify: {
        address: registryAddress,
        deployBlock: registryReceipt.blockNumber,
        txHash: registryReceipt.hash
      },
      EngagementEscrow: {
        address: escrowAddress,
        deployBlock: escrowReceipt.blockNumber,
        txHash: escrowReceipt.hash
      }
    }
  };

  const dir = path.join(__dirname, "..", "deployments");
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${network.name}-${chainId}.json`);
  fs.writeFileSync(file, JSON.stringify(out, null, 2) + "\n");
  console.log(out);
  console.log("Wrote", file);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
