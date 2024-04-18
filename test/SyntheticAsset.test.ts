import { ethers } from "hardhat";
import { Signer } from "ethers";
import { expect } from "chai";
import { SyntheticAsset, CollateralToken } from "../typechain";

describe("SyntheticAsset", function () {
  let owner: Signer;
  let user: Signer;
  let syntheticAsset: SyntheticAsset;
  let collateralToken: CollateralToken;

  before(async function () {
    [owner, user] = await ethers.getSigners();

    // Deploy a mock ERC20 token for testing
    const CollateralTokenFactory = await ethers.getContractFactory("CollateralToken");
    collateralToken = await CollateralTokenFactory.connect(owner).deploy("Collateral", "COLL");
    await collateralToken.waitForDeployment();

    const SyntheticAssetFactory = await ethers.getContractFactory("SyntheticAsset");
    syntheticAsset = await SyntheticAssetFactory.deploy(await collateralToken.getAddress());
    await syntheticAsset.waitForDeployment();
  });

  it("Should allow depositing collateral and opening a position", async function () {
    const beforeBalance = await collateralToken.balanceOf(owner.getAddress());

    const initialCollateralAmount = 1000;
    const positionSize = 500;
    const isLong = true;

    await collateralToken.connect(owner).approve(syntheticAsset.getAddress(), initialCollateralAmount);
    const tx = await syntheticAsset.connect(owner).deposit(initialCollateralAmount, positionSize, isLong);
    await tx.wait();

    const gasCost = (await tx).gasPrice * ((await tx).gasLimit);
    console.log("Gas used for deposit:", gasCost.toString());
    
    const position = await syntheticAsset.positions(await owner.getAddress());
    expect(position.collateralAmount).to.equal(initialCollateralAmount);
    expect(position.positionSize).to.equal(positionSize);
    expect(position.isLong).to.equal(isLong);

    const afterBalance = await collateralToken.balanceOf(owner.getAddress());

    expect(afterBalance - beforeBalance).to.equal(-1000n);
  });

  it("Should allow increasing position size", async function () {
    const additionalSize = 200;

    const tx = await syntheticAsset.increasePosition(additionalSize);
    await tx.wait();

    const gasCost = (await tx).gasPrice * ((await tx).gasLimit);
    console.log("Gas used for increasing position:", gasCost.toString());

    const position = await syntheticAsset.positions(await owner.getAddress());
    expect(position.positionSize).to.equal(700);
  });

  it("Should allow reducing position size", async function () {
    const reduceSize = 100;

    const tx = await syntheticAsset.reducePosition(reduceSize);
    await tx.wait();

    const gasCost = (await tx).gasPrice * ((await tx).gasLimit);
    console.log("Gas used for reducing position:", gasCost.toString());

    const position = await syntheticAsset.positions(await owner.getAddress());
    expect(position.positionSize).to.equal(600);
  });

  it("Should allow withdrawing collateral and closing a position", async function () {
    const beforeBalance = await collateralToken.balanceOf(owner.getAddress());
    const tx = await syntheticAsset.connect(owner).withdraw();
    await tx.wait();

    const gasCost = (await tx).gasPrice * ((await tx).gasLimit);
    console.log("Gas used for withdrawal:", gasCost.toString());

    const position = await syntheticAsset.positions(await owner.getAddress());
    expect(position.collateralAmount).to.equal(0);
    expect(position.positionSize).to.equal(0);
    expect(position.isLong).to.equal(false); // Assuming position is closed

    const afterBalance = await collateralToken.balanceOf(owner.getAddress());

    expect(afterBalance - beforeBalance).to.equal(600n);

    expect(await collateralToken.balanceOf(syntheticAsset.getAddress())).to.equal(400n);
  });

  it("Should set synthetic asset price", async function () {
    const newPrice = 1200;

    const tx = await syntheticAsset.setSyntheticAssetPrice(newPrice);
    await tx.wait();

    const gasCost = (await tx).gasPrice * ((await tx).gasLimit);
    console.log("Gas used for setting synthetic asset price:", gasCost.toString());

    const currentPrice = await syntheticAsset.syntheticAssetPrice();
    expect(currentPrice).to.equal(newPrice);
  });

  it("Should prevent user from reducing position size beyond the existing position", async function () {
    const reduceSize = 200;

    await expect(
      syntheticAsset.reducePosition(reduceSize)
    ).to.be.revertedWith("Invalid amount");
  });

  it("Should prevent user from depositing 0 collateral", async function () {
    const positionSize = 500;
    const isLong = true;

    await expect(
      syntheticAsset.deposit(0, positionSize, isLong)
    ).to.be.revertedWith("Amount must be greater than 0");
  });
});
