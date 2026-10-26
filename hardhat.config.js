require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

const keys = [
  process.env.DEPLOYER_KEY,
  process.env.VERIFIER_KEY,
  process.env.CLIENT_KEY,
  process.env.PROVIDER_KEY
].filter((k) => !!k);

module.exports = {
  solidity: {
    version: "0.8.26",
    settings: {
      optimizer: { enabled: true, runs: 200 },
      evmVersion: "paris" // avoids PUSH0; raise only after confirming DIDLab's EVM version
    }
  },
  networks: {
    hardhat: {},
    didlab: {
      url: process.env.DIDLAB_RPC || "https://eth.didlab.org",
      chainId: 252501,
      accounts: keys
    }
  },
  gasReporter: { enabled: process.env.REPORT_GAS === "true" }
};
