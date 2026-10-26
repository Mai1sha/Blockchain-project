const { ethers, network } = require("hardhat");
const fs = require("fs");
const path = require("path");

// Deploys ProviderVerify (the provider registry), then EngagementEscrow wired to it, and records the
// addresses, deploy blocks and transaction hashes in deployments/<network>-<chainId>.json.
// Set REGISTRY_ADDRESS to reuse an already deployed ProviderVerify and deploy only the escrow.
async function main() {
  const [deployer] = await ethers.getSigners();
  const existingRegistry = process.env.REGISTRY_ADDRESS;

  let registryRecord;
  let roles = {};
  if (existingRegistry) {
    if (!ethers.isAddress(existingRegistry)) throw new Error(`REGISTRY_ADDRESS is not an address: ${existingRegistry}`);
    if ((await ethers.provider.getCode(existingRegistry)) === "0x") {
      throw new Error(`No contract at REGISTRY_ADDRESS ${existingRegistry} on ${network.name}`);
    }
    const registry = await ethers.getContractAt("ProviderVerify", existingRegistry);
    roles.admin = await registry.defaultAdmin(); // fails if this is not a ProviderVerify
    registryRecord = { address: ethers.getAddress(existingRegistry), reused: true };
  } else {
    roles.admin = process.env.ADMIN_ADDRESS || deployer.address;
    roles.verifier = process.env.VERIFIER_ADDRESS || deployer.address;
    roles.adminDelay = Number(process.env.ADMIN_DELAY_SECONDS ?? 0);

    const Registry = await ethers.getContractFactory("ProviderVerify");
    const registry = await Registry.deploy(roles.adminDelay, roles.admin, roles.verifier);
    const registryReceipt = await registry.deploymentTransaction().wait();
    registryRecord = {
      address: await registry.getAddress(),
      deployBlock: registryReceipt.blockNumber,
      txHash: registryReceipt.hash
    };
  }

  const Escrow = await ethers.getContractFactory("EngagementEscrow");
  const escrow = await Escrow.deploy(registryRecord.address);
  const escrowReceipt = await escrow.deploymentTransaction().wait();
  const escrowAddress = await escrow.getAddress();

  const chainId = Number((await ethers.provider.getNetwork()).chainId);
  const out = {
    network: network.name,
    chainId,
    deployer: deployer.address,
    ...roles,
    deployedAt: new Date().toISOString(),
    contracts: {
      ProviderVerify: registryRecord,
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
