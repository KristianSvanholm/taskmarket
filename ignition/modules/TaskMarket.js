const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("TaskMarketModule", (m) => {

  const tm = m.contract("TaskMarket");

  return { tm };
});
