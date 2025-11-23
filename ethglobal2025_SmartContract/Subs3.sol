// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@pythnetwork/pyth-sdk-solidity/IPyth.sol";
import "@pythnetwork/pyth-sdk-solidity/PythStructs.sol";

/// @title Subscription3
/// @notice ETH-denominated execution for USD-denominated subscriptions, priced via Pyth.
/// @dev Hackathon version for ETHGlobal: simplified ownership, no reentrancy guards.
///      UID is uint256 for easier frontend / Aztec integration.
contract Subscription3 {
    /// -----------------------------------------------------------------------
    /// Events
    /// -----------------------------------------------------------------------

    event Deposited(uint256 indexed uid, address indexed from, uint256 amountWei);

    event PaymentExecuted(
        uint256 indexed uid,
        uint256 amountWei,
        address indexed to,
        int64 price,
        int32 expo,
        uint publishTime
    );

    event ExecutorUpdated(address indexed oldExecutor, address indexed newExecutor);
    event OwnerUpdated(address indexed oldOwner, address indexed newOwner);

    event NewSubscription(uint256 indexed uid, uint256 amountUsd);

    /// -----------------------------------------------------------------------
    /// Storage
    /// -----------------------------------------------------------------------

    address public owner;
    address public executor;

    /// @notice Temporary Aztec placeholder (ETH burned).
    address public constant AZTEC_PLACEHOLDER = address(0);

    /// @notice ETH balance per UID
    mapping(uint256 => uint256) public uidBalance;

    /// @notice USD amount per UID (2 decimals). Example: $10.99 => 1099
    mapping(uint256 => uint256) public uidUsdAmount;

    /// @notice Array of all subscription UIDs
    uint256[] public allUids;

    /// -----------------------------------------------------------------------
    /// Pyth config
    /// -----------------------------------------------------------------------

    /// @notice Pyth Price Feed Contract on Sepolia.
    /// @dev Hardcoded for simplicity during Hackathon.
    IPyth public immutable pyth;

    bytes32 public constant ETH_USD_PRICE_ID =
        0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace;

    /// @notice Max allowed age: set very large for hackathon simplicity.
    uint256 public constant PRICE_MAX_AGE = 60000000; // ~694 days

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
    /// Constructor (NO parameters per instruction)
    /// -----------------------------------------------------------------------

    constructor() {
        owner = msg.sender;
        executor = msg.sender;

        // Hardcoding Pyth price feed contract (Sepolia) for simplicity during Hackathon.
        pyth = IPyth(0xDd24F84d36BF92C65F92307595335bdFab5Bbd21);

        emit OwnerUpdated(address(0), msg.sender);
        emit ExecutorUpdated(address(0), msg.sender);
    }

    /// -----------------------------------------------------------------------
    /// Admin
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
    /// Subscription registration
    /// -----------------------------------------------------------------------

    function newSubscription(uint256 uid, uint256 amountUsd) external onlyOwner {
        require(uidUsdAmount[uid] == 0, "Subscription3: UID exists");
        require(amountUsd > 0, "Subscription3: invalid USD amount");

        allUids.push(uid);
        uidUsdAmount[uid] = amountUsd;

        emit NewSubscription(uid, amountUsd);
    }

    /// -----------------------------------------------------------------------
    /// Deposits
    /// -----------------------------------------------------------------------

    function deposit(uint256 uid) external payable {
        require(msg.value > 0, "Subscription3: no value");
        uidBalance[uid] += msg.value;
        emit Deposited(uid, msg.sender, msg.value);
    }

    /// -----------------------------------------------------------------------
    /// Getter for all UIDs (as requested)
    /// -----------------------------------------------------------------------

    function getAllUids() external view returns (uint256[] memory) {
        return allUids;
    }

    /// -----------------------------------------------------------------------
    /// Read-only Pyth helper
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
    /// Payment Execution (Chainlink Runtime Environment)
    /// -----------------------------------------------------------------------

    /// @notice Executes a payment for the given UID.
    /// @dev No USD parameter—pulled directly from uidUsdAmount.
    function executePayment(uint256 uid) external onlyExecutor {
        uint256 amountUsd = uidUsdAmount[uid];
        require(amountUsd > 0, "Subscription3: no USD amount set");

        // 1. Fetch Pyth price
        PythStructs.Price memory p = pyth.getPriceNoOlderThan(
            ETH_USD_PRICE_ID,
            PRICE_MAX_AGE
        );
        require(p.price > 0, "Subscription3: invalid price");
        require(p.expo < 0, "Subscription3: unexpected exponent");

        int64 price = p.price;
        int32 expo  = p.expo;

        // 2. USD(2 decimals) → ETH(wei)
        uint256 ethWei;
        unchecked {
            uint32 expoAbs = uint32(uint32(-expo));
            uint32 power = 18 + expoAbs - 2;
            uint256 numerator = amountUsd * (10 ** power);
            ethWei = numerator / uint64(price);
        }
        require(ethWei > 0, "Subscription3: zero wei result");

        // 3. Balance check
        uint256 bal = uidBalance[uid];
        require(bal >= ethWei, "Subscription3: insufficient balance");

        uidBalance[uid] = bal - ethWei;

        // 4. Send ETH (placeholder)
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

    function _notifyAztecBridge(uint256, uint256) internal {
        // Empty placeholder for real Aztec integration
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
