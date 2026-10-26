const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying ProviderVerify...");
  console.log("Deployer:", deployer.address);

  const admin = process.env.ADMIN_ADDRESS || deployer.address;
  const verifier = process.env.VERIFIER_ADDRESS || deployer.address;

  const ProviderVerify = await ethers.getContractFactory("ProviderVerify");

  const contract = await ProviderVerify.deploy(0, admin, verifier);

  await contract.waitForDeployment();

  console.log("Contract address:", await contract.getAddress());
  console.log("Admin:", admin);
  console.log("Verifier:", verifier);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});