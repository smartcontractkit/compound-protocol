const {
  etherUnsigned,
  etherMantissa,
  increaseTime,
  getTime,
  UInt256Max,
  unlockedAccounts
} = require('../Utils/Ethereum');

const {
  makeCToken,
  makeToken,
  setBorrowRate,
  pretendBorrow,
  totalSupply,
  mintFresh,
  preMint,
  quickMint
} = require('../Utils/Compound');

const exchangeRate = 50e3;
const mintAmount = etherUnsigned(10e4);
const mintTokens = mintAmount.dividedBy(exchangeRate);

describe('CPoR', function () {
  let minter, cToken, impl, token, feed;
  beforeEach(async () => {
    [, minter] = saddle.accounts;
    feed = await deploy('MockV3Aggregator', [8, 100000000]);
    token = await makeToken({
      kind: 'erc20',
      decimals: 8,
      quantity: 100000000
    });
    cToken = await makeCToken({
      kind: 'cpor',
      comptrollerOpts: {
        kind: 'bool'
      },
      exchangeRate,
      underlying: token,
      symbol: 'cWBTC'
    });
  });

  describe('mintFresh', () => {
    beforeEach(async () => {
      await preMint(cToken, minter, mintAmount, mintTokens, exchangeRate);
    });

    it('should mint like normal if the feed is unset', async () => {
      const tx = await mintFresh(cToken, minter, mintAmount);
      expect(tx).toSucceed();
      expect(tx.gasUsed).toEqual(96104);
    });

    it('should mint if the feed is set and heartbeat is unset', async () => {
      await send(cToken, '_setFeed', [feed._address]);
      expect(await call(cToken, 'feed')).toEqual(feed._address);
      const tx = await mintFresh(cToken, minter, mintAmount)
      expect(tx).toSucceed();
      expect(tx.gasUsed).toEqual(111581);
    });

    it('should mint if the feed is set and heartbeat is set', async () => {
      await send(cToken, '_setFeed', [feed._address]);
      await send(cToken, '_setHeartbeat', [86400]);
      const currentTime = await getTime();
      const updatedAt = await call(feed, 'latestTimestamp');
      const heartbeat = await call(cToken, 'heartbeat');
      expect(currentTime - heartbeat > updatedAt).toEqual(false);
      expect(await call(cToken, 'feed')).toEqual(feed._address);
      const tx = await mintFresh(cToken, minter, mintAmount)
      expect(tx).toSucceed();
      expect(tx.gasUsed).toEqual(111591);
    });

    it('should mint if the feed decimals is less than the underlying decimals', async () => {
      const newFeed = await deploy('MockV3Aggregator', [6, 1000000]);
      await send(cToken, '_setFeed', [newFeed._address]);
      expect(await call(cToken, 'feed')).toEqual(newFeed._address);
      expect(await mintFresh(cToken, minter, mintAmount)).toSucceed();
    });

    it('should mint if the feed decimals is more than the underlying decimals', async () => {
      const newFeed = await deploy('MockV3Aggregator', [18, etherUnsigned(1e18)]);
      await send(cToken, '_setFeed', [newFeed._address]);
      expect(await call(cToken, 'feed')).toEqual(newFeed._address);
      expect(await mintFresh(cToken, minter, mintAmount)).toSucceed();
    });

    it('should revert if the feed is not updated within the heartbeat', async () => {
      await send(cToken, '_setFeed', [feed._address]);
      await send(cToken, '_setHeartbeat', [1]);
      await increaseTime(10);
      const currentTime = await getTime();
      const updatedAt = await call(feed, 'latestTimestamp');
      const heartbeat = await call(cToken, 'heartbeat');
      expect(currentTime - heartbeat > updatedAt).toEqual(true);
      expect(await call(cToken, 'feed')).toEqual(feed._address);
      expect(await mintFresh(cToken, minter, mintAmount)).toHaveTokenFailure('TOKEN_MINT_ERROR', 'MINT_FEED_HEARTBEAT_CHECK');
    });

    it('should revert if the reserves answer is negative', async () => {
      feed = await deploy('MockV3Aggregator', [8, -10000]);
      await send(cToken, '_setFeed', [feed._address]);
      expect(await mintFresh(cToken, minter, mintAmount)).toHaveTokenFailure('TOKEN_MINT_ERROR', 'MINT_FEED_INVALID_ANSWER');
    });

    it('should revert if the reserves are not met', async () => {
      await send(cToken, '_setFeed', [feed._address]);
      await send(token, 'mint', [1]);
      expect(await mintFresh(cToken, minter, mintAmount)).toHaveTokenFailure('TOKEN_MINT_ERROR', 'MINT_FEED_SUPPLY_CHECK');
    });
  });

  describe('_setFeed', () => {
    it('should only be callable by admin', async () => {
      expect(await send(cToken, '_setFeed', [feed._address], {from: minter})).toHaveTokenFailure('UNAUTHORIZED', 'SET_FEED_ADMIN_OWNER_CHECK');
    });

    it('should set the feed', async () => {
      expect(await send(cToken, '_setFeed', [feed._address])).toSucceed();
      expect(await call(cToken, 'feed')).toEqual(feed._address);

      // Try to set a different feed address
      const newFeed = await deploy('MockV3Aggregator', [6, 1000000]);
      expect(await send(cToken, '_setFeed', [newFeed._address])).toSucceed();
      expect(await call(cToken, 'feed')).toEqual(newFeed._address);
    });

    it('should not set the feed if setting to the same address', async () => {
      // Set the feed address
      expect(await send(cToken, '_setFeed', [feed._address])).toSucceed();
      expect(await call(cToken, 'feed')).toEqual(feed._address);

      // Try to set the feed address
      expect(await send(cToken, '_setFeed', [feed._address])).toHaveTokenFailure('BAD_INPUT', 'SET_FEED_ADDRESS_INPUT_CHECK')
    });

    it('should unset the feed', async () => {
      expect(await send(cToken, '_setFeed', [feed._address])).toSucceed();
      expect(await call(cToken, 'feed')).toEqual(feed._address);
      const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
      expect(await send(cToken, '_setFeed', [ZERO_ADDRESS])).toSucceed();
      expect(await call(cToken, 'feed')).toEqual(ZERO_ADDRESS);
    });
  });

  describe('_setHeartbeat', () => {
    it('should only be callable by admin', async () => {
      expect(await send(cToken, '_setHeartbeat', [1], {from: minter})).toHaveTokenFailure('UNAUTHORIZED', 'SET_FEED_HEARTBEAT_ADMIN_OWNER_CHECK');
    });

    it('should revert if newHeartbeat > MAX_AGE', async () => {
      expect(await send(cToken, '_setHeartbeat', [864000 * 7 + 1])).toHaveTokenFailure('BAD_INPUT', 'SET_FEED_HEARTBEAT_INPUT_CHECK');
    });

    it('should set the heartbeat', async () => {
      expect(await send(cToken, '_setHeartbeat', [1])).toSucceed();
      expect(await call(cToken, 'heartbeat')).toEqual('1');
    });

    it('should unset the heartbeat', async () => {
      expect(await send(cToken, '_setHeartbeat', [1])).toSucceed();
      expect(await call(cToken, 'heartbeat')).toEqual('1');
      expect(await send(cToken, '_setHeartbeat', [0])).toSucceed();
      expect(await call(cToken, 'heartbeat')).toEqual('0');
    });
  });
});
