const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("ShitcoinModule", (m) => {

  const shtm = m.contract("Shitcoin");

  return { shtm };
});
