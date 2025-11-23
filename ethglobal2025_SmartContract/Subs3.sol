// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@pythnetwork/pyth-sdk-solidity/IPyth.sol";
import "@pythnetwork/pyth-sdk-solidity/PythStructs.sol";

/// @title Subscription3
/// @notice Balance sheet per subscription UID + Pyth oracle for fiat-denominated recurring payments.
/// @dev ETH-only version for ETHGlobal Hackathon (Sepolia deployment).
contract Subscription3 {
    /// -----------------------------------------------------------------------
    /// Events
    /// -----------------------------------------------------------------------

    event Deposited(bytes32 indexed uid, address indexed from, uint256 amountWei);

    event PaymentExecuted(
        bytes32 indexed uid,
        uint256 amountWei,
        address indexed to,
        int64 price,
        int32 expo,
        uint publishTime
    );

    event ExecutorUpdated(address indexed oldExecutor, address indexed newExecutor);
    event OwnerUpdated(address indexed oldOwner, address indexed newOwner);

    event NewSubscription(bytes32 indexed uid, uint256 amountUsd);

    /// -----------------------------------------------------------------------
    /// Storage
    /// -----------------------------------------------------------------------

    address public owner;
    address public executor;

    address public constant AZTEC_PLACEHOLDER = address(0);

    /// @notice Balance per UID (in ETH wei)
    mapping(bytes32 => uint256) public uidBalance;

    /// @notice The USD amount (2 decimals) for each subscription UID.
    /// Example: $10.99 → 1099
    mapping(bytes32 => uint256) public uidUsdAmount;

    /// @notice A list of all subscription UIDs ever created.
    bytes32[] public allUids;

    /// -----------------------------------------------------------------------
    /// Pyth configuration
    /// -----------------------------------------------------------------------

    IPyth public immutable pyth;

    bytes32 public constant ETH_USD_PRICE_ID =
        0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace;

    /// @notice Maximum allowed age for the price, in seconds.
    /// @dev We require price to be no older than 60000000 seconds. 
    /// (Because you have stale price LOL)
    uint256 public constant PRICE_MAX_AGE = 60000000;

    /// -----------------------------------------------------------------------
    /// Modifiers
    /// -----------------------------------------------------------------------

    modifier onlyOwner() {
        require(msg.sender == owner, "Subscription3: not owner");
        _;
    }

    modifier onlyExecutor() {
        require(msg.sender == executor, "Subscription3: not executor");
        _;
    }

    /// -----------------------------------------------------------------------
    /// Constructor
    /// -----------------------------------------------------------------------

    /// @param _pyth     Pyth price feed contract address on Sepolia.
    /// Please use input "0xDd24F84d36BF92C65F92307595335bdFab5Bbd21" for DEMO
    constructor(address _pyth) {
        owner = msg.sender;
        executor = msg.sender;
        pyth = IPyth(_pyth);

        emit OwnerUpdated(address(0), msg.sender);
        emit ExecutorUpdated(address(0), msg.sender);
    }

    /// -----------------------------------------------------------------------
    /// Admin (Owner-only)
    /// -----------------------------------------------------------------------

    function setOwner(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Subscription3: zero owner");
        emit OwnerUpdated(owner, newOwner);
        owner = newOwner;
    }

    function setExecutor(address newExecutor) external onlyOwner {
        require(newExecutor != address(0), "Subscription3: zero executor");
        emit ExecutorUpdated(executor, newExecutor);
        executor = newExecutor;
    }

    /// -----------------------------------------------------------------------
    /// Subscription registration (Frontend)
    /// -----------------------------------------------------------------------

    /// @notice Register a new subscription UID + USD amount.
    /// @dev USD input uses 2 decimals. Example: $12.50 → 1250.
    function newSubscription(bytes32 uid, uint256 amountUsd) external onlyOwner {
        require(uidUsdAmount[uid] == 0, "Subscription3: UID exists");
        require(amountUsd > 0, "Subscription3: invalid USD amount");

        allUids.push(uid);
        uidUsdAmount[uid] = amountUsd;

        emit NewSubscription(uid, amountUsd);
    }

    /// -----------------------------------------------------------------------
    /// User deposits
    /// -----------------------------------------------------------------------

    function deposit(bytes32 uid) external payable {
        require(msg.value > 0, "Subscription3: no value");

        uidBalance[uid] += msg.value;

        emit Deposited(uid, msg.sender, msg.value);
    }

    /// -----------------------------------------------------------------------
    /// Public read helper
    /// -----------------------------------------------------------------------

    function getLatestEthUsdPrice()
        external
        view
        returns (int64 price, int32 expo, uint publishTime)
    {
        PythStructs.Price memory p = pyth.getPriceNoOlderThan(
            ETH_USD_PRICE_ID,
            PRICE_MAX_AGE
        );
        return (p.price, p.expo, p.publishTime);
    }

    /// -----------------------------------------------------------------------
    /// Chainlink Runtime Execution (Recurring Payments)
    /// -----------------------------------------------------------------------

    /// @notice Execute monthly (or periodic) payment.
    /// @param uid The subscription UID
    /// @param amountUsd USD amount with **2 decimals** (e.g., $10.99 → 1099)
    function executePayment(bytes32 uid, uint256 amountUsd) external onlyExecutor {
        require(amountUsd > 0, "Subscription3: zero USD amount");

        // Fetch fresh Pyth price
        PythStructs.Price memory p = pyth.getPriceNoOlderThan(
            ETH_USD_PRICE_ID,
            PRICE_MAX_AGE
        );

        require(p.price > 0, "Subscription3: invalid price");
        require(p.expo < 0, "Subscription3: unexpected exponent");

        int64 price = p.price;
        int32 expo  = p.expo;

        // Conversion USD (2 decimals) → ETH (wei)
        uint256 ethWei;
        unchecked {
            uint32 expoAbs = uint32(uint32(-expo));  
            uint32 power = 18 + expoAbs - 2;         

            uint256 numerator = amountUsd * (10 ** power);
            ethWei = numerator / uint64(price);
        }

        require(ethWei > 0, "Subscription3: zero wei result");

        uint256 currentBalance = uidBalance[uid];
        require(currentBalance >= ethWei, "Subscription3: insufficient balance");

        uidBalance[uid] = currentBalance - ethWei;

        (bool ok, ) = payable(AZTEC_PLACEHOLDER).call{value: ethWei}("");
        require(ok, "Subscription3: payment failed");

        _notifyAztecBridge(uid, ethWei);

        emit PaymentExecuted(
            uid,
            ethWei,
            AZTEC_PLACEHOLDER,
            p.price,
            p.expo,
            p.publishTime
        );
    }

    /// Internal Aztec hook
    function _notifyAztecBridge(bytes32, uint256) internal {
        // Empty for now — to be implemented later.
    }

    /// -----------------------------------------------------------------------
    /// Fallbacks
    /// -----------------------------------------------------------------------

    receive() external payable {
        revert("Subscription3: use deposit(uid)");
    }

    fallback() external payable {
        revert("Subscription3: invalid call");
    }
}
