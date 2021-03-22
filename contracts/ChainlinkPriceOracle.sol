pragma solidity ^0.5.16;

import "./AggregatorInterface.sol";
import "./PriceOracle.sol";
import "./ErrorReporter.sol";
import "./SafeMath.sol";

contract ChainlinkPriceOracle is PriceOracle, OracleErrorReporter {
    using SafeMath for uint;

    //// @notice Administrator for this contract. Full control of contract.
    address public admin;

    //// @notice Failover administrator for this contract. Failover control only.
    address public failoverAdmin;

    //// @notice Mapping of (cToken Address => price feed AggregatorInterface)
    mapping(address => AggregatorInterface) public priceFeeds;

    //// @notice Failover price feeds to switch to in emergency
    mapping(address => AggregatorInterface) public failoverFeeds;

    //// @notice Emitted when a price feed is set
    event PriceFeedSet(address indexed cTokenAddress, address indexed newPriceFeed, address indexed failoverPriceFeed);

    //// @notice Emitted when a cToken price feed is failed over
    event PriceFeedFailover(address indexed cTokenAddress, address indexed oldPriceFeed, address indexed failoverPriceFeed);

    constructor(address failoverAdminAddress) public {
        admin = msg.sender;
        failoverAdmin = failoverAdminAddress;
    }

    /**
     * @notice Get the underlying price of a cToken asset
     * @param cToken The cToken to get the underlying price of
     * @return The underlying asset price
     */
    function getUnderlyingPrice(CToken cToken) public view returns (uint) {
        // Check that a price feed exists for the cToken
        AggregatorInterface feed = priceFeeds[address(cToken)];
        require(address(feed) != address(0), "Price feed doesn't exist");

        // Get the price
        int price = feed.latestAnswer();
        require(price >= 0, "Price cannot be negative");
        return uint(price);
    }

    /*** Admin Only Functions ***/

    /**
     * @notice Add a price feed for a cToken
     * @dev Only callable by the administrator
     * @param cTokenAddress The address of the cToken
     * @param newPriceFeedAddress The address of the price feed
     * @param failoverPriceFeedAddress The failover address
     * @return Whether or not the price feed was set
     */
    function _setPriceFeed(address cTokenAddress, address newPriceFeedAddress, address failoverPriceFeedAddress) external returns (uint) {
        // Check caller is admin
        if (msg.sender != admin) {
            return fail(Error.UNAUTHORIZED, FailureInfo.SET_PRICE_FEED_OWNER_CHECK);
        }

        // Check that neither of the price feed addresses are zero addresses
        if (newPriceFeedAddress == address(0) || failoverPriceFeedAddress == address(0)) {
            return fail(Error.BAD_INPUT, FailureInfo.SET_PRICE_FEED_ZERO_ADDRESS);
        }

        // Check that the failover price feed address is different to the price feed address
        if (newPriceFeedAddress == failoverPriceFeedAddress) {
            return fail(Error.BAD_INPUT, FailureInfo.SET_PRICE_FEED_INVALID_FAILOVER);
        }

        // Set new feed
        priceFeeds[cTokenAddress] = AggregatorInterface(newPriceFeedAddress);

        // Set failover feed
        failoverFeeds[cTokenAddress] = AggregatorInterface(failoverPriceFeedAddress);

        // Emit that a price feed has been added
        emit PriceFeedSet(cTokenAddress, newPriceFeedAddress, failoverPriceFeedAddress);

        return uint(Error.NO_ERROR);
    }

    /*** Admin or Failover Admin Only Functions ***/

    /**
     * @notice Failover cToken price feed
     * @dev Only callable by the administrator, or the failover administrator
     * @param cTokenAddress cToken to failover price feed
     * @return Whether or not the price feed failed over
     */
    function _failoverPriceFeed(address cTokenAddress) external returns (uint) {
        // Check that caller is admin or failover admin
        if (msg.sender != admin && msg.sender != failoverAdmin) {
            return fail(Error.UNAUTHORIZED, FailureInfo.FAILOVER_PRICE_FEED_OWNER_CHECK);
        }

        // Current price feed
        AggregatorInterface oldPriceFeed = priceFeeds[cTokenAddress];

        // Failover price feed
        AggregatorInterface failedOverPriceFeed = failoverFeeds[cTokenAddress];

        // Check if already failed over
        if (address(oldPriceFeed) == address(failedOverPriceFeed)) {
            return fail(Error.CANNOT_FAILOVER, FailureInfo.ALREADY_FAILED_OVER);
        }

        // Set the cToken to use the failover price feed
        priceFeeds[cTokenAddress] = failedOverPriceFeed;

        // Emit that a cToken price feed has failed over
        emit PriceFeedFailover(cTokenAddress, address(oldPriceFeed), address(failedOverPriceFeed));

        return uint(Error.NO_ERROR);
    }
}