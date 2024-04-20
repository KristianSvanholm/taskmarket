const {
  loadFixture,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect } = require("chai");

describe("TaskMarket", function () {

    async function deployFixture() {
        const [addressA, addressB] = await ethers.getSigners();

        const TaskMarket = await ethers.getContractFactory("TaskMarket");
        const taskmarket = await TaskMarket.deploy();

        const shitcoin = await ethers.getContractAt("Shitcoin", (await taskmarket.sht()));
        return {taskmarket, shitcoin, addressA, addressB};
    }

    describe("Deployment", function() {
        it("Should initialize the shitcoin", async function () {
            const { taskmarket, shitcoin } = await loadFixture(deployFixture);
            
            expect(await taskmarket.sht()).to.equal(await shitcoin.getAddress());
        });

        it("Should initialize the coin owner", async function () {
            const { taskmarket, shitcoin } = await loadFixture(deployFixture);

            expect(await shitcoin.market()).to.equal(await taskmarket.getAddress());
        });

        it("Should give the coin owner market cap", async function () {
            const { taskmarket, shitcoin } = await loadFixture(deployFixture);

            expect(await shitcoin.wallets(await taskmarket.getAddress())).to.equal(10000000);
        });
    });

    describe("Shitcoin", function() {
        it("Should give money to user trough faucet", async function () {
            const {shitcoin, addressA} = await loadFixture(deployFixture);
                
            await shitcoin.connect(addressA).faucet(100);

            await expect(await shitcoin.wallets(addressA)).to.equal(100);
        });

        it("Should handle transaction", async function () {
            const {shitcoin, addressA, addressB} = await loadFixture(deployFixture);
                
            await shitcoin.connect(addressA).faucet(100);
            await expect(await shitcoin.wallets(addressA)).to.equal(100);

            await expect(shitcoin.connect(addressA).transfer(addressB, 35)).to.emit(shitcoin, "Transfer");
            
            await expect(await shitcoin.wallets(addressA)).to.equal(65);
            await expect(await shitcoin.wallets(addressB)).to.equal(35);

        })
    });
    
    describe("TaskManager", function() {
        it("Should fail to access uninitialized tasks", async function () {
            const { taskmarket } = await loadFixture(deployFixture);

            await expect(taskmarket.tasks(0)).to.be.reverted;
        });

        it("Should create and access tasks", async function () {
            const { taskmarket, shitcoin, addressA, addressB } = await loadFixture(deployFixture);
                
            await shitcoin.connect(addressA).faucet(10); // Give coin to owner
            await taskmarket.connect(addressA).NewTask(addressB, 10); // Create new task
            
            await expect(taskmarket.tasks(0)).to.not.be.reverted; // Ensure the task has been created
        });

        it("Should create and finsh task", async function () {
            const { taskmarket, shitcoin, addressA, addressB } = await loadFixture(deployFixture);
            
            await shitcoin.connect(addressA).faucet(10); // Give coin to owner
            await taskmarket.connect(addressA).NewTask(addressB, 10); // Create new task
            
            await taskmarket.connect(addressB).FinishTask(0) // OtherAccount finished task
            await expect((await taskmarket.tasks(0)).done).to.equal(true); 
        });

        it("Should create and reject task", async function () {
            const {taskmarket, shitcoin, addressA, addressB } = await loadFixture(deployFixture);

            await shitcoin.connect(addressA).faucet(10); // Give coin to owner
            await taskmarket.connect(addressA).NewTask(addressB, 10); // Create new task
            
            await taskmarket.connect(addressB).FinishTask(0) // OtherAccount finished task
            await expect((await taskmarket.tasks(0)).done).to.equal(true); // Ensure task is set to done
            await taskmarket.connect(addressA).RequestChanges(0);
            await expect((await taskmarket.tasks(0)).done).to.equal(false); // Ensure task is set to not done 
        });

        it("Should create and accept task", async function() { 
            const {taskmarket, shitcoin, addressA, addressB } = await loadFixture(deployFixture);

            await shitcoin.connect(addressA).faucet(10); // Give coin to owner
            await taskmarket.connect(addressA).NewTask(addressB, 10); // Create new task
            
            await taskmarket.connect(addressB).FinishTask(0); // OtherAccount finished task
            await taskmarket.connect(addressA).AcceptTask(0);
            await expect((await taskmarket.tasks(0)).owner).to.not.equal(addressA); // Check that the task has been cleared
            await expect(await shitcoin.wallets(addressB)).to.equal(10); // Check that the money has been moved to correct account
        })
    })
/*
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function deployOneYearLockFixture() {
    const ONE_YEAR_IN_SECS = 365 * 24 * 60 * 60;
    const ONE_GWEI = 1_000_000_000;

    const lockedAmount = ONE_GWEI;
    const unlockTime = (await time.latest()) + ONE_YEAR_IN_SECS;

    // Contracts are deployed using the first signer/account by default
    const [owner, otherAccount] = await ethers.getSigners();

    const Lock = await ethers.getContractFactory("Lock");
    const lock = await Lock.deploy(unlockTime, { value: lockedAmount });

    return { lock, unlockTime, lockedAmount, owner, otherAccount };
  }

  describe("Deployment", function () {
    it("Should set the right unlockTime", async function () {
      const { lock, unlockTime } = await loadFixture(deployOneYearLockFixture);

      expect(await lock.unlockTime()).to.equal(unlockTime);
    });

    it("Should set the right owner", async function () {
      const { lock, owner } = await loadFixture(deployOneYearLockFixture);

      expect(await lock.owner()).to.equal(owner.address);
    });

    it("Should receive and store the funds to lock", async function () {
      const { lock, lockedAmount } = await loadFixture(
        deployOneYearLockFixture
      );

      expect(await ethers.provider.getBalance(lock.target)).to.equal(
        lockedAmount
      );
    });

    it("Should fail if the unlockTime is not in the future", async function () {
      // We don't use the fixture here because we want a different deployment
      const latestTime = await time.latest();
      const Lock = await ethers.getContractFactory("Lock");
      await expect(Lock.deploy(latestTime, { value: 1 })).to.be.revertedWith(
        "Unlock time should be in the future"
      );
    });
  });

  describe("Withdrawals", function () {
    describe("Validations", function () {
      it("Should revert with the right error if called too soon", async function () {
        const { lock } = await loadFixture(deployOneYearLockFixture);

        await expect(lock.withdraw()).to.be.revertedWith(
          "You can't withdraw yet"
        );
      });

      it("Should revert with the right error if called from another account", async function () {
        const { lock, unlockTime, otherAccount } = await loadFixture(
          deployOneYearLockFixture
        );

        // We can increase the time in Hardhat Network
        await time.increaseTo(unlockTime);

        // We use lock.connect() to send a transaction from another account
        await expect(lock.connect(otherAccount).withdraw()).to.be.revertedWith(
          "You aren't the owner"
        );
      });

      it("Shouldn't fail if the unlockTime has arrived and the owner calls it", async function () {
        const { lock, unlockTime } = await loadFixture(
          deployOneYearLockFixture
        );

        // Transactions are sent using the first signer by default
        await time.increaseTo(unlockTime);

        await expect(lock.withdraw()).not.to.be.reverted;
      });
    });

    describe("Events", function () {
      it("Should emit an event on withdrawals", async function () {
        const { lock, unlockTime, lockedAmount } = await loadFixture(
          deployOneYearLockFixture
        );

        await time.increaseTo(unlockTime);

        await expect(lock.withdraw())
          .to.emit(lock, "Withdrawal")
          .withArgs(lockedAmount, anyValue); // We accept any value as `when` arg
      });
    });

    describe("Transfers", function () {
      it("Should transfer the funds to the owner", async function () {
        const { lock, unlockTime, lockedAmount, owner } = await loadFixture(
          deployOneYearLockFixture
        );

        await time.increaseTo(unlockTime);

        await expect(lock.withdraw()).to.changeEtherBalances(
          [owner, lock],
          [lockedAmount, -lockedAmount]
        );
      });
    });
  });*/
});
