const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

describe("ABTokenFactory", function () {
  // Fixture to deploy the contract
  async function deployABTokenFactoryFixture() {
    const [owner, user1, user2, feeRecipient] = await ethers.getSigners();

    // Deploy ABTokenFactory
    const ABTokenFactory = await ethers.getContractFactory("ABTokenFactory");
    const creationFee = ethers.parseEther("0.1"); // 0.1 AB
    const factory = await ABTokenFactory.deploy(creationFee, feeRecipient.address);

    return { factory, owner, user1, user2, feeRecipient, creationFee };
  }

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      const { factory, owner } = await loadFixture(deployABTokenFactoryFixture);
      expect(await factory.owner()).to.equal(owner.address);
    });

    it("Should set the correct creation fee", async function () {
      const { factory, creationFee } = await loadFixture(deployABTokenFactoryFixture);
      expect(await factory.creationFee()).to.equal(creationFee);
    });

    it("Should set the correct fee recipient", async function () {
      const { factory, feeRecipient } = await loadFixture(deployABTokenFactoryFixture);
      expect(await factory.feeRecipient()).to.equal(feeRecipient.address);
    });

    it("Should initialize with zero tokens created", async function () {
      const { factory } = await loadFixture(deployABTokenFactoryFixture);
      expect(await factory.totalTokensCreated()).to.equal(0);
    });
  });

  describe("Token Creation", function () {
    it("Should create a token with correct parameters", async function () {
      const { factory, user1, creationFee } = await loadFixture(deployABTokenFactoryFixture);
      
      const tokenName = "Test Token";
      const tokenSymbol = "TEST";
      const initialSupply = ethers.parseEther("1000000");
      const description = "A test token for AB.LAND";
      const imageUrl = "https://example.com/token.png";
      const websiteUrl = "https://testtoken.com";
      const telegramUrl = "https://t.me/testtoken";
      const twitterUrl = "https://twitter.com/testtoken";

      const tx = await factory.connect(user1).createToken(
        tokenName,
        tokenSymbol,
        initialSupply,
        description,
        imageUrl,
        websiteUrl,
        telegramUrl,
        twitterUrl,
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

      expect(event).to.not.be.undefined;
      
      const parsedEvent = factory.interface.parseLog(event);
      expect(parsedEvent.args.creator).to.equal(user1.address);
      expect(parsedEvent.args.name).to.equal(tokenName);
      expect(parsedEvent.args.symbol).to.equal(tokenSymbol);
      expect(parsedEvent.args.initialSupply).to.equal(initialSupply);
    });

    it("Should increment total tokens created", async function () {
      const { factory, user1, creationFee } = await loadFixture(deployABTokenFactoryFixture);
      
      await factory.connect(user1).createToken(
        "Token 1",
        "TK1",
        ethers.parseEther("1000000"),
        "Description 1",
        "image1.png",
        "website1.com",
        "telegram1",
        "twitter1",
        { value: creationFee }
      );

      expect(await factory.totalTokensCreated()).to.equal(1);

      await factory.connect(user1).createToken(
        "Token 2",
        "TK2",
        ethers.parseEther("2000000"),
        "Description 2",
        "image2.png",
        "website2.com",
        "telegram2",
        "twitter2",
        { value: creationFee }
      );

      expect(await factory.totalTokensCreated()).to.equal(2);
    });

    it("Should revert if insufficient fee is paid", async function () {
      const { factory, user1, creationFee } = await loadFixture(deployABTokenFactoryFixture);
      
      const insufficientFee = creationFee - ethers.parseEther("0.01");

      await expect(
        factory.connect(user1).createToken(
          "Test Token",
          "TEST",
          ethers.parseEther("1000000"),
          "Description",
          "image.png",
          "website.com",
          "telegram",
          "twitter",
          { value: insufficientFee }
        )
      ).to.be.revertedWith("Insufficient fee");
    });

    it("Should revert if token name is empty", async function () {
      const { factory, user1, creationFee } = await loadFixture(deployABTokenFactoryFixture);
      
      await expect(
        factory.connect(user1).createToken(
          "", // Empty name
          "TEST",
          ethers.parseEther("1000000"),
          "Description",
          "image.png",
          "website.com",
          "telegram",
          "twitter",
          { value: creationFee }
        )
      ).to.be.revertedWith("Name cannot be empty");
    });

    it("Should revert if token symbol is empty", async function () {
      const { factory, user1, creationFee } = await loadFixture(deployABTokenFactoryFixture);
      
      await expect(
        factory.connect(user1).createToken(
          "Test Token",
          "", // Empty symbol
          ethers.parseEther("1000000"),
          "Description",
          "image.png",
          "website.com",
          "telegram",
          "twitter",
          { value: creationFee }
        )
      ).to.be.revertedWith("Symbol cannot be empty");
    });

    it("Should revert if initial supply is zero", async function () {
      const { factory, user1, creationFee } = await loadFixture(deployABTokenFactoryFixture);
      
      await expect(
        factory.connect(user1).createToken(
          "Test Token",
          "TEST",
          0, // Zero supply
          "Description",
          "image.png",
          "website.com",
          "telegram",
          "twitter",
          { value: creationFee }
        )
      ).to.be.revertedWith("Initial supply must be greater than 0");
    });

    it("Should transfer fees to fee recipient", async function () {
      const { factory, user1, feeRecipient, creationFee } = await loadFixture(deployABTokenFactoryFixture);
      
      const initialBalance = await ethers.provider.getBalance(feeRecipient.address);

      await factory.connect(user1).createToken(
        "Test Token",
        "TEST",
        ethers.parseEther("1000000"),
        "Description",
        "image.png",
        "website.com",
        "telegram",
        "twitter",
        { value: creationFee }
      );

      const finalBalance = await ethers.provider.getBalance(feeRecipient.address);
      expect(finalBalance - initialBalance).to.equal(creationFee);
    });
  });

  describe("Token Retrieval", function () {
    it("Should return correct token info by address", async function () {
      const { factory, user1, creationFee } = await loadFixture(deployABTokenFactoryFixture);
      
      const tokenName = "Test Token";
      const tokenSymbol = "TEST";
      const initialSupply = ethers.parseEther("1000000");
      const description = "A test token";

      const tx = await factory.connect(user1).createToken(
        tokenName,
        tokenSymbol,
        initialSupply,
        description,
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
      const tokenAddress = parsedEvent.args.tokenAddress;

      const tokenInfo = await factory.getTokenInfo(tokenAddress);
      expect(tokenInfo.creator).to.equal(user1.address);
      expect(tokenInfo.name).to.equal(tokenName);
      expect(tokenInfo.symbol).to.equal(tokenSymbol);
      expect(tokenInfo.initialSupply).to.equal(initialSupply);
      expect(tokenInfo.description).to.equal(description);
    });

    it("Should return all created tokens", async function () {
      const { factory, user1, user2, creationFee } = await loadFixture(deployABTokenFactoryFixture);
      
      // Create first token
      await factory.connect(user1).createToken(
        "Token 1",
        "TK1",
        ethers.parseEther("1000000"),
        "Description 1",
        "image1.png",
        "website1.com",
        "telegram1",
        "twitter1",
        { value: creationFee }
      );

      // Create second token
      await factory.connect(user2).createToken(
        "Token 2",
        "TK2",
        ethers.parseEther("2000000"),
        "Description 2",
        "image2.png",
        "website2.com",
        "telegram2",
        "twitter2",
        { value: creationFee }
      );

      const allTokens = await factory.getAllTokens();
      expect(allTokens.length).to.equal(2);
    });

    it("Should return tokens created by specific user", async function () {
      const { factory, user1, user2, creationFee } = await loadFixture(deployABTokenFactoryFixture);
      
      // User1 creates two tokens
      await factory.connect(user1).createToken(
        "Token 1",
        "TK1",
        ethers.parseEther("1000000"),
        "Description 1",
        "image1.png",
        "website1.com",
        "telegram1",
        "twitter1",
        { value: creationFee }
      );

      await factory.connect(user1).createToken(
        "Token 2",
        "TK2",
        ethers.parseEther("2000000"),
        "Description 2",
        "image2.png",
        "website2.com",
        "telegram2",
        "twitter2",
        { value: creationFee }
      );

      // User2 creates one token
      await factory.connect(user2).createToken(
        "Token 3",
        "TK3",
        ethers.parseEther("3000000"),
        "Description 3",
        "image3.png",
        "website3.com",
        "telegram3",
        "twitter3",
        { value: creationFee }
      );

      const user1Tokens = await factory.getTokensByCreator(user1.address);
      const user2Tokens = await factory.getTokensByCreator(user2.address);

      expect(user1Tokens.length).to.equal(2);
      expect(user2Tokens.length).to.equal(1);
    });
  });

  describe("Admin Functions", function () {
    it("Should allow owner to update creation fee", async function () {
      const { factory, owner } = await loadFixture(deployABTokenFactoryFixture);
      
      const newFee = ethers.parseEther("0.2");
      await factory.connect(owner).updateCreationFee(newFee);
      
      expect(await factory.creationFee()).to.equal(newFee);
    });

    it("Should not allow non-owner to update creation fee", async function () {
      const { factory, user1 } = await loadFixture(deployABTokenFactoryFixture);
      
      const newFee = ethers.parseEther("0.2");
      
      await expect(
        factory.connect(user1).updateCreationFee(newFee)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Should allow owner to update fee recipient", async function () {
      const { factory, owner, user1 } = await loadFixture(deployABTokenFactoryFixture);
      
      await factory.connect(owner).updateFeeRecipient(user1.address);
      
      expect(await factory.feeRecipient()).to.equal(user1.address);
    });

    it("Should not allow non-owner to update fee recipient", async function () {
      const { factory, user1, user2 } = await loadFixture(deployABTokenFactoryFixture);
      
      await expect(
        factory.connect(user1).updateFeeRecipient(user2.address)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Should allow owner to pause and unpause", async function () {
      const { factory, owner, user1, creationFee } = await loadFixture(deployABTokenFactoryFixture);
      
      // Pause the contract
      await factory.connect(owner).pause();
      
      // Try to create token while paused
      await expect(
        factory.connect(user1).createToken(
          "Test Token",
          "TEST",
          ethers.parseEther("1000000"),
          "Description",
          "image.png",
          "website.com",
          "telegram",
          "twitter",
          { value: creationFee }
        )
      ).to.be.revertedWith("Pausable: paused");
      
      // Unpause the contract
      await factory.connect(owner).unpause();
      
      // Should work after unpause
      await expect(
        factory.connect(user1).createToken(
          "Test Token",
          "TEST",
          ethers.parseEther("1000000"),
          "Description",
          "image.png",
          "website.com",
          "telegram",
          "twitter",
          { value: creationFee }
        )
      ).to.not.be.reverted;
    });
  });

  describe("Events", function () {
    it("Should emit TokenCreated event with correct parameters", async function () {
      const { factory, user1, creationFee } = await loadFixture(deployABTokenFactoryFixture);
      
      const tokenName = "Test Token";
      const tokenSymbol = "TEST";
      const initialSupply = ethers.parseEther("1000000");

      await expect(
        factory.connect(user1).createToken(
          tokenName,
          tokenSymbol,
          initialSupply,
          "Description",
          "image.png",
          "website.com",
          "telegram",
          "twitter",
          { value: creationFee }
        )
      ).to.emit(factory, "TokenCreated")
       .withArgs(
         user1.address,
         ethers.ZeroAddress, // We can't predict the token address
         tokenName,
         tokenSymbol,
         initialSupply
       );
    });

    it("Should emit CreationFeeUpdated event", async function () {
      const { factory, owner } = await loadFixture(deployABTokenFactoryFixture);
      
      const newFee = ethers.parseEther("0.2");
      
      await expect(
        factory.connect(owner).updateCreationFee(newFee)
      ).to.emit(factory, "CreationFeeUpdated")
       .withArgs(newFee);
    });

    it("Should emit FeeRecipientUpdated event", async function () {
      const { factory, owner, user1 } = await loadFixture(deployABTokenFactoryFixture);
      
      await expect(
        factory.connect(owner).updateFeeRecipient(user1.address)
      ).to.emit(factory, "FeeRecipientUpdated")
       .withArgs(user1.address);
    });
  });

  describe("Edge Cases", function () {
    it("Should handle maximum supply tokens", async function () {
      const { factory, user1, creationFee } = await loadFixture(deployABTokenFactoryFixture);
      
      const maxSupply = ethers.parseEther("1000000000000000000"); // Very large number
      
      await expect(
        factory.connect(user1).createToken(
          "Max Token",
          "MAX",
          maxSupply,
          "Maximum supply token",
          "image.png",
          "website.com",
          "telegram",
          "twitter",
          { value: creationFee }
        )
      ).to.not.be.reverted;
    });

    it("Should handle long strings in metadata", async function () {
      const { factory, user1, creationFee } = await loadFixture(deployABTokenFactoryFixture);
      
      const longDescription = "A".repeat(1000); // Very long description
      
      await expect(
        factory.connect(user1).createToken(
          "Long Desc Token",
          "LONG",
          ethers.parseEther("1000000"),
          longDescription,
          "image.png",
          "website.com",
          "telegram",
          "twitter",
          { value: creationFee }
        )
      ).to.not.be.reverted;
    });

    it("Should handle special characters in metadata", async function () {
      const { factory, user1, creationFee } = await loadFixture(deployABTokenFactoryFixture);
      
      await expect(
        factory.connect(user1).createToken(
          "Special Token 🚀",
          "SPEC",
          ethers.parseEther("1000000"),
          "Token with émojis and spëcial chars! @#$%^&*()",
          "https://example.com/image.png?param=value&other=123",
          "https://website.com/path?query=value",
          "@telegram_handle",
          "@twitter_handle",
          { value: creationFee }
        )
      ).to.not.be.reverted;
    });
  });

  describe("Gas Optimization", function () {
    it("Should use reasonable gas for token creation", async function () {
      const { factory, user1, creationFee } = await loadFixture(deployABTokenFactoryFixture);
      
      const tx = await factory.connect(user1).createToken(
        "Gas Test Token",
        "GAS",
        ethers.parseEther("1000000"),
        "Testing gas usage",
        "image.png",
        "website.com",
        "telegram",
        "twitter",
        { value: creationFee }
      );
      
      const receipt = await tx.wait();
      
      // Gas should be reasonable (less than 3M gas)
      expect(receipt.gasUsed).to.be.lessThan(3000000);
    });
  });
});