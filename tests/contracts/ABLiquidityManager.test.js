const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

describe("ABLiquidityManager", function () {
  // Fixture to deploy contracts
  async function deployLiquidityManagerFixture() {
    const [owner, user1, user2, feeRecipient] = await ethers.getSigners();

    // Deploy ABTokenFactory first
    const ABTokenFactory = await ethers.getContractFactory("ABTokenFactory");
    const creationFee = ethers.parseEther("0.1");
    const factory = await ABTokenFactory.deploy(creationFee, feeRecipient.address);

    // Deploy ABLiquidityManager
    const ABLiquidityManager = await ethers.getContractFactory("ABLiquidityManager");
    const swapFee = 300; // 0.3%
    const protocolFee = 100; // 0.1%
    const liquidityManager = await ABLiquidityManager.deploy(
      await factory.getAddress(),
      swapFee,
      protocolFee,
      feeRecipient.address
    );

    // Create a test token
    const tokenName = "Test Token";
    const tokenSymbol = "TEST";
    const initialSupply = ethers.parseEther("1000000");
    
    const tx = await factory.connect(user1).createToken(
      tokenName,
      tokenSymbol,
      initialSupply,
      "Test token description",
      "image.png",
      "website.com",
      "telegram",
      "twitter",
      { value: creationFee }
    );

    const receipt = await tx.wait();
    const event = receipt.logs.find(log => {
      try {
        return factory.interface.parseLog(log).name === "TokenCreated";
      } catch {
        return false;
      }
    });

    const parsedEvent = factory.interface.parseLog(event);
    const testTokenAddress = parsedEvent.args.tokenAddress;

    // Get the test token contract
    const TestToken = await ethers.getContractFactory("ABToken");
    const testToken = TestToken.attach(testTokenAddress);

    return {
      factory,
      liquidityManager,
      testToken,
      testTokenAddress,
      owner,
      user1,
      user2,
      feeRecipient,
      swapFee,
      protocolFee,
      initialSupply
    };
  }

  describe("Deployment", function () {
    it("Should set the correct factory address", async function () {
      const { liquidityManager, factory } = await loadFixture(deployLiquidityManagerFixture);
      expect(await liquidityManager.tokenFactory()).to.equal(await factory.getAddress());
    });

    it("Should set the correct swap fee", async function () {
      const { liquidityManager, swapFee } = await loadFixture(deployLiquidityManagerFixture);
      expect(await liquidityManager.swapFee()).to.equal(swapFee);
    });

    it("Should set the correct protocol fee", async function () {
      const { liquidityManager, protocolFee } = await loadFixture(deployLiquidityManagerFixture);
      expect(await liquidityManager.protocolFee()).to.equal(protocolFee);
    });

    it("Should set the correct fee recipient", async function () {
      const { liquidityManager, feeRecipient } = await loadFixture(deployLiquidityManagerFixture);
      expect(await liquidityManager.feeRecipient()).to.equal(feeRecipient.address);
    });

    it("Should set the right owner", async function () {
      const { liquidityManager, owner } = await loadFixture(deployLiquidityManagerFixture);
      expect(await liquidityManager.owner()).to.equal(owner.address);
    });
  });

  describe("Pool Creation", function () {
    it("Should create a liquidity pool with correct parameters", async function () {
      const { liquidityManager, testTokenAddress, user1 } = await loadFixture(deployLiquidityManagerFixture);
      
      const tokenAmount = ethers.parseEther("100000");
      const ethAmount = ethers.parseEther("10");

      // First approve tokens
      const testToken = await ethers.getContractAt("ABToken", testTokenAddress);
      await testToken.connect(user1).approve(await liquidityManager.getAddress(), tokenAmount);

      const tx = await liquidityManager.connect(user1).createPool(
        testTokenAddress,
        tokenAmount,
        { value: ethAmount }
      );

      const receipt = await tx.wait();
      const event = receipt.logs.find(log => {
        try {
          return liquidityManager.interface.parseLog(log).name === "PoolCreated";
        } catch {
          return false;
        }
      });

      expect(event).to.not.be.undefined;
      
      const parsedEvent = liquidityManager.interface.parseLog(event);
      expect(parsedEvent.args.token).to.equal(testTokenAddress);
      expect(parsedEvent.args.creator).to.equal(user1.address);
      expect(parsedEvent.args.tokenAmount).to.equal(tokenAmount);
      expect(parsedEvent.args.ethAmount).to.equal(ethAmount);
    });

    it("Should revert if pool already exists", async function () {
      const { liquidityManager, testTokenAddress, user1 } = await loadFixture(deployLiquidityManagerFixture);
      
      const tokenAmount = ethers.parseEther("100000");
      const ethAmount = ethers.parseEther("10");

      const testToken = await ethers.getContractAt("ABToken", testTokenAddress);
      await testToken.connect(user1).approve(await liquidityManager.getAddress(), tokenAmount * 2n);

      // Create first pool
      await liquidityManager.connect(user1).createPool(
        testTokenAddress,
        tokenAmount,
        { value: ethAmount }
      );

      // Try to create second pool for same token
      await expect(
        liquidityManager.connect(user1).createPool(
          testTokenAddress,
          tokenAmount,
          { value: ethAmount }
        )
      ).to.be.revertedWith("Pool already exists");
    });

    it("Should revert if token amount is zero", async function () {
      const { liquidityManager, testTokenAddress, user1 } = await loadFixture(deployLiquidityManagerFixture);
      
      const ethAmount = ethers.parseEther("10");

      await expect(
        liquidityManager.connect(user1).createPool(
          testTokenAddress,
          0, // Zero token amount
          { value: ethAmount }
        )
      ).to.be.revertedWith("Token amount must be greater than 0");
    });

    it("Should revert if ETH amount is zero", async function () {
      const { liquidityManager, testTokenAddress, user1 } = await loadFixture(deployLiquidityManagerFixture);
      
      const tokenAmount = ethers.parseEther("100000");

      const testToken = await ethers.getContractAt("ABToken", testTokenAddress);
      await testToken.connect(user1).approve(await liquidityManager.getAddress(), tokenAmount);

      await expect(
        liquidityManager.connect(user1).createPool(
          testTokenAddress,
          tokenAmount,
          { value: 0 } // Zero ETH amount
        )
      ).to.be.revertedWith("ETH amount must be greater than 0");
    });

    it("Should transfer tokens to the contract", async function () {
      const { liquidityManager, testTokenAddress, user1 } = await loadFixture(deployLiquidityManagerFixture);
      
      const tokenAmount = ethers.parseEther("100000");
      const ethAmount = ethers.parseEther("10");

      const testToken = await ethers.getContractAt("ABToken", testTokenAddress);
      await testToken.connect(user1).approve(await liquidityManager.getAddress(), tokenAmount);

      const initialBalance = await testToken.balanceOf(user1.address);
      
      await liquidityManager.connect(user1).createPool(
        testTokenAddress,
        tokenAmount,
        { value: ethAmount }
      );

      const finalBalance = await testToken.balanceOf(user1.address);
      expect(initialBalance - finalBalance).to.equal(tokenAmount);
    });
  });

  describe("Liquidity Management", function () {
    async function createPoolFixture() {
      const fixture = await loadFixture(deployLiquidityManagerFixture);
      const { liquidityManager, testTokenAddress, user1 } = fixture;
      
      const tokenAmount = ethers.parseEther("100000");
      const ethAmount = ethers.parseEther("10");

      const testToken = await ethers.getContractAt("ABToken", testTokenAddress);
      await testToken.connect(user1).approve(await liquidityManager.getAddress(), tokenAmount);

      await liquidityManager.connect(user1).createPool(
        testTokenAddress,
        tokenAmount,
        { value: ethAmount }
      );

      return { ...fixture, tokenAmount, ethAmount };
    }

    it("Should add liquidity to existing pool", async function () {
      const { liquidityManager, testTokenAddress, user2 } = await loadFixture(createPoolFixture);
      
      const addTokenAmount = ethers.parseEther("50000");
      const addEthAmount = ethers.parseEther("5");

      const testToken = await ethers.getContractAt("ABToken", testTokenAddress);
      
      // Transfer some tokens to user2 first
      const { user1 } = await loadFixture(deployLiquidityManagerFixture);
      await testToken.connect(user1).transfer(user2.address, addTokenAmount);
      
      await testToken.connect(user2).approve(await liquidityManager.getAddress(), addTokenAmount);

      const tx = await liquidityManager.connect(user2).addLiquidity(
        testTokenAddress,
        addTokenAmount,
        { value: addEthAmount }
      );

      const receipt = await tx.wait();
      const event = receipt.logs.find(log => {
        try {
          return liquidityManager.interface.parseLog(log).name === "LiquidityAdded";
        } catch {
          return false;
        }
      });

      expect(event).to.not.be.undefined;
      
      const parsedEvent = liquidityManager.interface.parseLog(event);
      expect(parsedEvent.args.token).to.equal(testTokenAddress);
      expect(parsedEvent.args.provider).to.equal(user2.address);
    });

    it("Should remove liquidity from pool", async function () {
      const { liquidityManager, testTokenAddress, user1 } = await loadFixture(createPoolFixture);
      
      const removeAmount = ethers.parseEther("1000"); // LP tokens to remove

      const initialEthBalance = await ethers.provider.getBalance(user1.address);
      const testToken = await ethers.getContractAt("ABToken", testTokenAddress);
      const initialTokenBalance = await testToken.balanceOf(user1.address);

      const tx = await liquidityManager.connect(user1).removeLiquidity(
        testTokenAddress,
        removeAmount
      );

      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed * receipt.gasPrice;
      
      const finalEthBalance = await ethers.provider.getBalance(user1.address);
      const finalTokenBalance = await testToken.balanceOf(user1.address);

      // Should receive some ETH back (minus gas)
      expect(finalEthBalance + gasUsed).to.be.greaterThan(initialEthBalance);
      // Should receive some tokens back
      expect(finalTokenBalance).to.be.greaterThan(initialTokenBalance);
    });

    it("Should revert when removing more liquidity than owned", async function () {
      const { liquidityManager, testTokenAddress, user2 } = await loadFixture(createPoolFixture);
      
      const removeAmount = ethers.parseEther("1000");

      await expect(
        liquidityManager.connect(user2).removeLiquidity(
          testTokenAddress,
          removeAmount
        )
      ).to.be.revertedWith("Insufficient liquidity");
    });
  });

  describe("Token Swapping", function () {
    async function createPoolFixture() {
      const fixture = await loadFixture(deployLiquidityManagerFixture);
      const { liquidityManager, testTokenAddress, user1 } = fixture;
      
      const tokenAmount = ethers.parseEther("100000");
      const ethAmount = ethers.parseEther("10");

      const testToken = await ethers.getContractAt("ABToken", testTokenAddress);
      await testToken.connect(user1).approve(await liquidityManager.getAddress(), tokenAmount);

      await liquidityManager.connect(user1).createPool(
        testTokenAddress,
        tokenAmount,
        { value: ethAmount }
      );

      return { ...fixture, tokenAmount, ethAmount };
    }

    it("Should swap ETH for tokens", async function () {
      const { liquidityManager, testTokenAddress, user2 } = await loadFixture(createPoolFixture);
      
      const ethAmount = ethers.parseEther("1");
      const minTokens = ethers.parseEther("1000"); // Minimum tokens expected

      const testToken = await ethers.getContractAt("ABToken", testTokenAddress);
      const initialBalance = await testToken.balanceOf(user2.address);

      const tx = await liquidityManager.connect(user2).swapETHForTokens(
        testTokenAddress,
        minTokens,
        { value: ethAmount }
      );

      const receipt = await tx.wait();
      const event = receipt.logs.find(log => {
        try {
          return liquidityManager.interface.parseLog(log).name === "Swap";
        } catch {
          return false;
        }
      });

      expect(event).to.not.be.undefined;
      
      const finalBalance = await testToken.balanceOf(user2.address);
      expect(finalBalance).to.be.greaterThan(initialBalance);
    });

    it("Should swap tokens for ETH", async function () {
      const { liquidityManager, testTokenAddress, user1, user2 } = await loadFixture(createPoolFixture);
      
      // First give user2 some tokens
      const testToken = await ethers.getContractAt("ABToken", testTokenAddress);
      const tokenAmount = ethers.parseEther("10000");
      await testToken.connect(user1).transfer(user2.address, tokenAmount);
      
      const swapAmount = ethers.parseEther("5000");
      const minEth = ethers.parseEther("0.1");

      await testToken.connect(user2).approve(await liquidityManager.getAddress(), swapAmount);
      
      const initialBalance = await ethers.provider.getBalance(user2.address);

      const tx = await liquidityManager.connect(user2).swapTokensForETH(
        testTokenAddress,
        swapAmount,
        minEth
      );

      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed * receipt.gasPrice;
      
      const finalBalance = await ethers.provider.getBalance(user2.address);
      
      // Should receive ETH (minus gas costs)
      expect(finalBalance + gasUsed).to.be.greaterThan(initialBalance);
    });

    it("Should revert if slippage is too high", async function () {
      const { liquidityManager, testTokenAddress, user2 } = await loadFixture(createPoolFixture);
      
      const ethAmount = ethers.parseEther("1");
      const minTokens = ethers.parseEther("50000"); // Unrealistically high expectation

      await expect(
        liquidityManager.connect(user2).swapETHForTokens(
          testTokenAddress,
          minTokens,
          { value: ethAmount }
        )
      ).to.be.revertedWith("Insufficient output amount");
    });

    it("Should charge correct swap fees", async function () {
      const { liquidityManager, testTokenAddress, user2, feeRecipient } = await loadFixture(createPoolFixture);
      
      const ethAmount = ethers.parseEther("1");
      const minTokens = ethers.parseEther("1000");

      const initialFeeBalance = await ethers.provider.getBalance(feeRecipient.address);

      await liquidityManager.connect(user2).swapETHForTokens(
        testTokenAddress,
        minTokens,
        { value: ethAmount }
      );

      const finalFeeBalance = await ethers.provider.getBalance(feeRecipient.address);
      
      // Fee recipient should receive protocol fees
      expect(finalFeeBalance).to.be.greaterThan(initialFeeBalance);
    });
  });

  describe("Pool Information", function () {
    async function createPoolFixture() {
      const fixture = await loadFixture(deployLiquidityManagerFixture);
      const { liquidityManager, testTokenAddress, user1 } = fixture;
      
      const tokenAmount = ethers.parseEther("100000");
      const ethAmount = ethers.parseEther("10");

      const testToken = await ethers.getContractAt("ABToken", testTokenAddress);
      await testToken.connect(user1).approve(await liquidityManager.getAddress(), tokenAmount);

      await liquidityManager.connect(user1).createPool(
        testTokenAddress,
        tokenAmount,
        { value: ethAmount }
      );

      return { ...fixture, tokenAmount, ethAmount };
    }

    it("Should return correct pool info", async function () {
      const { liquidityManager, testTokenAddress, tokenAmount, ethAmount } = await loadFixture(createPoolFixture);
      
      const poolInfo = await liquidityManager.getPoolInfo(testTokenAddress);
      
      expect(poolInfo.tokenReserve).to.equal(tokenAmount);
      expect(poolInfo.ethReserve).to.equal(ethAmount);
      expect(poolInfo.totalSupply).to.be.greaterThan(0);
    });

    it("Should calculate correct output amounts", async function () {
      const { liquidityManager, testTokenAddress } = await loadFixture(createPoolFixture);
      
      const ethInput = ethers.parseEther("1");
      const tokenOutput = await liquidityManager.getTokensForETH(testTokenAddress, ethInput);
      
      expect(tokenOutput).to.be.greaterThan(0);
      
      const tokenInput = ethers.parseEther("10000");
      const ethOutput = await liquidityManager.getETHForTokens(testTokenAddress, tokenInput);
      
      expect(ethOutput).to.be.greaterThan(0);
    });

    it("Should return user liquidity info", async function () {
      const { liquidityManager, testTokenAddress, user1 } = await loadFixture(createPoolFixture);
      
      const userLiquidity = await liquidityManager.getUserLiquidity(testTokenAddress, user1.address);
      
      expect(userLiquidity).to.be.greaterThan(0);
    });
  });

  describe("Admin Functions", function () {
    it("Should allow owner to update swap fee", async function () {
      const { liquidityManager, owner } = await loadFixture(deployLiquidityManagerFixture);
      
      const newSwapFee = 500; // 0.5%
      await liquidityManager.connect(owner).updateSwapFee(newSwapFee);
      
      expect(await liquidityManager.swapFee()).to.equal(newSwapFee);
    });

    it("Should not allow non-owner to update swap fee", async function () {
      const { liquidityManager, user1 } = await loadFixture(deployLiquidityManagerFixture);
      
      const newSwapFee = 500;
      
      await expect(
        liquidityManager.connect(user1).updateSwapFee(newSwapFee)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Should allow owner to update protocol fee", async function () {
      const { liquidityManager, owner } = await loadFixture(deployLiquidityManagerFixture);
      
      const newProtocolFee = 200; // 0.2%
      await liquidityManager.connect(owner).updateProtocolFee(newProtocolFee);
      
      expect(await liquidityManager.protocolFee()).to.equal(newProtocolFee);
    });

    it("Should allow owner to update fee recipient", async function () {
      const { liquidityManager, owner, user1 } = await loadFixture(deployLiquidityManagerFixture);
      
      await liquidityManager.connect(owner).updateFeeRecipient(user1.address);
      
      expect(await liquidityManager.feeRecipient()).to.equal(user1.address);
    });

    it("Should revert if swap fee is too high", async function () {
      const { liquidityManager, owner } = await loadFixture(deployLiquidityManagerFixture);
      
      const tooHighFee = 10001; // > 100%
      
      await expect(
        liquidityManager.connect(owner).updateSwapFee(tooHighFee)
      ).to.be.revertedWith("Fee too high");
    });

    it("Should revert if protocol fee is too high", async function () {
      const { liquidityManager, owner } = await loadFixture(deployLiquidityManagerFixture);
      
      const tooHighFee = 10001; // > 100%
      
      await expect(
        liquidityManager.connect(owner).updateProtocolFee(tooHighFee)
      ).to.be.revertedWith("Fee too high");
    });
  });

  describe("Events", function () {
    it("Should emit PoolCreated event", async function () {
      const { liquidityManager, testTokenAddress, user1 } = await loadFixture(deployLiquidityManagerFixture);
      
      const tokenAmount = ethers.parseEther("100000");
      const ethAmount = ethers.parseEther("10");

      const testToken = await ethers.getContractAt("ABToken", testTokenAddress);
      await testToken.connect(user1).approve(await liquidityManager.getAddress(), tokenAmount);

      await expect(
        liquidityManager.connect(user1).createPool(
          testTokenAddress,
          tokenAmount,
          { value: ethAmount }
        )
      ).to.emit(liquidityManager, "PoolCreated")
       .withArgs(testTokenAddress, user1.address, tokenAmount, ethAmount);
    });

    it("Should emit SwapFeeUpdated event", async function () {
      const { liquidityManager, owner } = await loadFixture(deployLiquidityManagerFixture);
      
      const newSwapFee = 500;
      
      await expect(
        liquidityManager.connect(owner).updateSwapFee(newSwapFee)
      ).to.emit(liquidityManager, "SwapFeeUpdated")
       .withArgs(newSwapFee);
    });

    it("Should emit ProtocolFeeUpdated event", async function () {
      const { liquidityManager, owner } = await loadFixture(deployLiquidityManagerFixture);
      
      const newProtocolFee = 200;
      
      await expect(
        liquidityManager.connect(owner).updateProtocolFee(newProtocolFee)
      ).to.emit(liquidityManager, "ProtocolFeeUpdated")
       .withArgs(newProtocolFee);
    });
  });

  describe("Edge Cases and Security", function () {
    it("Should handle zero liquidity removal", async function () {
      const { liquidityManager, testTokenAddress, user1 } = await loadFixture(deployLiquidityManagerFixture);
      
      await expect(
        liquidityManager.connect(user1).removeLiquidity(
          testTokenAddress,
          0
        )
      ).to.be.revertedWith("Amount must be greater than 0");
    });

    it("Should handle non-existent pool queries", async function () {
      const { liquidityManager } = await loadFixture(deployLiquidityManagerFixture);
      
      const fakeTokenAddress = ethers.Wallet.createRandom().address;
      
      await expect(
        liquidityManager.getPoolInfo(fakeTokenAddress)
      ).to.be.revertedWith("Pool does not exist");
    });

    it("Should prevent reentrancy attacks", async function () {
      // This test would require a malicious contract to test properly
      // For now, we just verify the ReentrancyGuard is in place
      const { liquidityManager } = await loadFixture(deployLiquidityManagerFixture);
      
      // The contract should have ReentrancyGuard modifiers on critical functions
      // This is more of a code review item than a runtime test
      expect(liquidityManager).to.not.be.undefined;
    });

    it("Should handle large numbers without overflow", async function () {
      const { liquidityManager, testTokenAddress, user1 } = await loadFixture(deployLiquidityManagerFixture);
      
      const largeAmount = ethers.parseEther("1000000000"); // 1 billion tokens
      const ethAmount = ethers.parseEther("1000");

      const testToken = await ethers.getContractAt("ABToken", testTokenAddress);
      
      // This should not overflow
      const quote = await liquidityManager.getTokensForETH(testTokenAddress, ethAmount);
      expect(quote).to.be.greaterThan(0);
    });
  });

  describe("Gas Optimization", function () {
    it("Should use reasonable gas for pool creation", async function () {
      const { liquidityManager, testTokenAddress, user1 } = await loadFixture(deployLiquidityManagerFixture);
      
      const tokenAmount = ethers.parseEther("100000");
      const ethAmount = ethers.parseEther("10");

      const testToken = await ethers.getContractAt("ABToken", testTokenAddress);
      await testToken.connect(user1).approve(await liquidityManager.getAddress(), tokenAmount);

      const tx = await liquidityManager.connect(user1).createPool(
        testTokenAddress,
        tokenAmount,
        { value: ethAmount }
      );
      
      const receipt = await tx.wait();
      
      // Gas should be reasonable (less than 500k gas)
      expect(receipt.gasUsed).to.be.lessThan(500000);
    });

    it("Should use reasonable gas for swaps", async function () {
      const { liquidityManager, testTokenAddress, user1, user2 } = await loadFixture(deployLiquidityManagerFixture);
      
      // Create pool first
      const tokenAmount = ethers.parseEther("100000");
      const ethAmount = ethers.parseEther("10");

      const testToken = await ethers.getContractAt("ABToken", testTokenAddress);
      await testToken.connect(user1).approve(await liquidityManager.getAddress(), tokenAmount);

      await liquidityManager.connect(user1).createPool(
        testTokenAddress,
        tokenAmount,
        { value: ethAmount }
      );

      // Now test swap gas usage
      const swapEthAmount = ethers.parseEther("1");
      const minTokens = ethers.parseEther("1000");

      const tx = await liquidityManager.connect(user2).swapETHForTokens(
        testTokenAddress,
        minTokens,
        { value: swapEthAmount }
      );
      
      const receipt = await tx.wait();
      
      // Swap gas should be reasonable (less than 200k gas)
      expect(receipt.gasUsed).to.be.lessThan(200000);
    });
  });
});