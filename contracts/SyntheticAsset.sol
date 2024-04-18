// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract SyntheticAsset is Ownable {
    // Struct to represent a user's position
    struct Position {
        uint256 collateralAmount; // Amount of collateral deposited by the user
        uint256 positionSize; // Size of the position in synthetic asset tokens
        bool isLong; // Flag indicating if the position is long (true) or short (false)
    }

    // ERC20 token used as collateral
    IERC20 public collateralToken;
    // Fixed price of the synthetic asset for simplicity
    uint256 public syntheticAssetPrice;

    // Mapping to track user positions
    mapping(address => Position) public positions;

    // Events
    event OpenPosition(address indexed user, uint256 positionSize, bool isLong);
    event ClosePosition(address indexed user, int256 profitLoss);
    event IncreasePosition(address indexed user, uint256 additionalSize);
    event ReducePosition(address indexed user, uint256 reduceSize);
    event SetSyntheticAssetPrice(uint256 newPrice);

    // Constructor to initialize the contract with the collateral token address
    constructor(address _collateralToken) Ownable(msg.sender) {
        collateralToken = IERC20(_collateralToken);
        syntheticAssetPrice = 1000; // Initial synthetic asset price
    }

    // Function to deposit collateral and open a position
    function deposit(uint256 _amount, uint256 _positionSize, bool _isLong) external {
        require(_amount > 0, "Amount must be greater than 0");
        require(_positionSize > 0, "Position size must be greater than 0");
        require(collateralToken.transferFrom(msg.sender, address(this), _amount), "Failed to transfer collateral");

        // Update user's collateral balance
        positions[msg.sender].collateralAmount += _amount;
        
        // Update user's position
        positions[msg.sender].positionSize = _positionSize;
        positions[msg.sender].isLong = _isLong;

        // Emit open position events
        emit OpenPosition(msg.sender, _positionSize, _isLong);
    }

    // Function to withdraw collateral and close a position
    function withdraw() external {
        require(positions[msg.sender].collateralAmount > 0, "No opened position");

        // Calculate profit/loss
        int256 profitLoss = calculateProfitLoss(msg.sender);

        // Calculate total amount to transfer
        uint256 totalAmountToTransfer;
        if (profitLoss >= 0) {
            totalAmountToTransfer = positions[msg.sender].collateralAmount + uint256(profitLoss);
        } else {
            totalAmountToTransfer = positions[msg.sender].collateralAmount - uint256(-profitLoss);
        }

        // Transfer remaining collateral and profit (if any) to the user
        require(collateralToken.transfer(msg.sender, totalAmountToTransfer), "Failed to transfer collateral and profit");

        // Reset user's position
        delete positions[msg.sender];

        // Emit close position events
        emit ClosePosition(msg.sender, profitLoss);
    }

    // Function to increase position size
    function increasePosition(uint256 _additionalSize) external {
        require(_additionalSize > 0, "Additional size must be greater than 0");
        require(positions[msg.sender].collateralAmount >= _additionalSize, "Insufficient collateral");

        // Update user's position size
        positions[msg.sender].positionSize += _additionalSize;

        // Emit increase position event
        emit IncreasePosition(msg.sender, _additionalSize);
    }

    // Function to reduce position size
    function reducePosition(uint256 _reduceSize) external {
        require(_reduceSize > 0 && _reduceSize <= positions[msg.sender].positionSize, "Invalid amount");

        // Update user's position size
        positions[msg.sender].positionSize -= _reduceSize;

        // Emit reduce position event
        emit ReducePosition(msg.sender, _reduceSize);
    }

    // Function to calculate profit/loss
    function calculateProfitLoss(address user) public view returns (int256) {
        int256 profitLoss;
        if (positions[user].isLong) {
            profitLoss = int256((syntheticAssetPrice * positions[user].positionSize) / 1000) - int256(positions[user].collateralAmount);
        } else {
            profitLoss = int256(positions[user].collateralAmount) - int256((syntheticAssetPrice * positions[user].positionSize) / 1000);
        }
        return profitLoss;
    }

    // Function to update synthetic asset price (for simulation purposes)
    function setSyntheticAssetPrice(uint256 _newPrice) external onlyOwner {
        syntheticAssetPrice = _newPrice;

        // Emit set synthetic asset price event
        emit SetSyntheticAssetPrice(_newPrice);
    }
}
