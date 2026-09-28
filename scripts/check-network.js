const { ethers } = require("hardhat");

async function main() {
  const network = await ethers.provider.getNetwork();
  console.log("Chain ID:", network.chainId);
}

main().catch(console.error);
