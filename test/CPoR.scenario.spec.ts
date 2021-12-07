import { expect } from "chai";
import { ethers, network } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import {
  MockV3Aggregator__factory,
  Comp__factory,
  Comp,
  GovernorBravoDelegate__factory,
  GovernorBravoDelegate,
  CPoRDelegate,
  CPoRDelegate__factory,
  ComptrollerG6,
  ComptrollerG6__factory,
  CErc20Delegate,
  CErc20Delegate__factory,
  ERC20,
  ERC20__factory,
  PriceOracle__factory,
  PriceOracle,
  UniswapAnchoredView__factory,
} from "../types";
import { BigNumber, BigNumberish } from "@ethersproject/bignumber";

const uavTokenConfigs = [
  {
    // "NAME": "ETH",
    cToken: "0x4Ddc2D193948926D02f9B1fE9e1daa0718270ED5",
    underlying: "0x0000000000000000000000000000000000000000",
    symbolHash:
      "0xaaaebeba3810b1e6b70781f14b2d72c1cb89c0b2b320c43bb67ff79f562f5ff4",
    baseUnit: "1000000000000000000",
    priceSource: "2",
    fixedPrice: "0",
    uniswapMarket: "0xB4e16d0168e52d35CaCD2c6185b44281Ec28C9Dc",
    reporter: "0x264BDDFD9D93D48d759FBDB0670bE1C6fDd50236",
    reporterMultiplier: "10000000000000000",
    isUniswapReversed: true,
  },
  {
    // "NAME": "DAI",
    cToken: "0x5d3a536E4D6DbD6114cc1Ead35777bAB948E3643",
    underlying: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
    symbolHash:
      "0xa5e92f3efb6826155f1f728e162af9d7cda33a574a1153b58f03ea01cc37e568",
    baseUnit: "1000000000000000000",
    priceSource: "2",
    fixedPrice: "0",
    uniswapMarket: "0xA478c2975Ab1Ea89e8196811F51A7B7Ade33eB11",
    reporter: "0xb2419f587f497CDd64437f1B367E2e80889631ea",
    reporterMultiplier: "10000000000000000",
    isUniswapReversed: false,
  },
  {
    // "NAME": "USDC",
    cToken: "0x39AA39c021dfbaE8faC545936693aC917d5E7563",
    underlying: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    symbolHash:
      "0xd6aca1be9729c13d677335161321649cccae6a591554772516700f986f942eaa",
    baseUnit: "1000000",
    priceSource: "1",
    fixedPrice: "1000000",
    uniswapMarket: "0x0000000000000000000000000000000000000000",
    reporter: "0x0000000000000000000000000000000000000000",
    reporterMultiplier: "1",
    isUniswapReversed: false,
  },
  {
    // "NAME": "USDT",
    cToken: "0xf650C3d88D12dB855b8bf7D11Be6C55A4e07dCC9",
    underlying: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    symbolHash:
      "0x8b1a1d9c2b109e527c9134b25b1a1833b16b6594f92daa9f6d9b7a6024bce9d0",
    baseUnit: "1000000",
    priceSource: "1",
    fixedPrice: "1000000",
    uniswapMarket: "0x0000000000000000000000000000000000000000",
    reporter: "0x0000000000000000000000000000000000000000",
    reporterMultiplier: "1",
    isUniswapReversed: false,
  },
  {
    // "NAME": "TUSD",
    cToken: "0x12392F67bdf24faE0AF363c24aC620a2f67DAd86",
    underlying: "0x0000000000085d4780B73119b644AE5ecd22b376",
    symbolHash:
      "0xa1b8d8f7e538bb573797c963eeeed40d0bcb9f28c56104417d0da1b372ae3051",
    baseUnit: "1000000000000000000",
    priceSource: "1",
    fixedPrice: "1000000",
    uniswapMarket: "0x0000000000000000000000000000000000000000",
    reporter: "0x0000000000000000000000000000000000000000",
    reporterMultiplier: "1",
    isUniswapReversed: false,
  },
  {
    // This is a dummy token ONLY used for test scenarios
    // "NAME": "PAXG",
    cToken: "0xbA381C66958096BDa27f932ff39523db67fbf1e3",
    underlying: "0x45804880De22913dAFE09f4980848ECE6EcbAf78",
    symbolHash:
      "0xde44649a6513182d82aeab5e881fdc66e5d5952e54f879dacc865ed226a90e71",
    baseUnit: "1000000000000000000",
    priceSource: "2",
    fixedPrice: "0",
    uniswapMarket: "0x9C4Fe5FFD9A9fC5678cFBd93Aa2D4FD684b67C4C",
    reporter: "0x939C9DA1a740E8d258584AA0844b29Ce94a1Ea22",
    reporterMultiplier: "10000000000000000",
    isUniswapReversed: false,
  },
];

const TEST_UAV_ADDRESS = "0x2772de57E2AFCcd464798f4A086c7Da007ca3111";
const TEST_CPAXG_ADDRESS = "0xbA381C66958096BDa27f932ff39523db67fbf1e3";
const PAXG_HOLDER_ADDRESS = "0x5b2f8818c7c3ed4c702d2a356ce3e3988be1381d";
const PAXG_ADDRESS = "0x45804880De22913dAFE09f4980848ECE6EcbAf78";
const CUSDC_ADDRESS = "0x39aa39c021dfbae8fac545936693ac917d5e7563";
const FEED_ADMIN_ADDRESS = "0x939C9DA1a740E8d258584AA0844b29Ce94a1Ea22";
const CUSDC_HOLDER_ADDRESS = "0xb3bd459e0598dde1fe84b1d0a1430be175b5d5be";
const COMP_HOLDER_ADDRESS = "0x7587cAefc8096f5F40ACB83A09Df031a018C66ec";
const COMP_ADDRESS = "0xc00e94Cb662C3520282E6f5717214004A7f26888";
const GOV_BRAVO_DELEGATOR_ADDRESS =
  "0xc0Da02939E1441F497fd74F78cE7Decb17B66529";
// const GOV_BRAVO_DELEGATEE_ADDRESS =
//   "0x563A63d650a5D259abAE9248dddC6867813d3f87";
const COMPTROLLER_ADDRESS = "0x3d9819210A31b4961b30EF54bE2aeD79B9c9Cd3B";

const abiEncoder = ethers.utils.defaultAbiCoder;

const exp = (base: BigNumberish, exponent: BigNumberish) =>
  BigNumber.from(base).mul(BigNumber.from("10").pow(exponent));

/**
 * Impersonates (unlocks) an account for forked mainnet.
 *
 * @param address
 */
async function impersonate(address: string) {
  await network.provider.request({
    method: "hardhat_impersonateAccount",
    params: [address],
  });
  return ethers.getSigner(address);
}

/**
 * Mine blocks
 *
 * @param n
 */
async function mine(blocks: number) {
  for (let i = 0; i < blocks; i++) {
    await network.provider.send("evm_mine");
  }
}

/**
 * Increase time
 *
 * @param seconds
 */
async function increaseTime(seconds: number) {
  await network.provider.send("evm_increaseTime", [seconds]);
}

describe("Hypothetical cPAXG deploy scenario with oracle", () => {
  let deployer: SignerWithAddress;
  let feedAdmin: SignerWithAddress;
  let compHolder: SignerWithAddress;
  let paxgHolder: SignerWithAddress;
  let cUsdcHolder: SignerWithAddress;
  let compToken: Comp;
  let govBravo: GovernorBravoDelegate;
  let cPaxg: CPoRDelegate;
  let cUsdc: CErc20Delegate;
  let comptroller: ComptrollerG6;
  let paxg: ERC20;
  before(async () => {
    const signers = await ethers.getSigners();
    deployer = signers[0];
    feedAdmin = await ethers.getSigner(FEED_ADMIN_ADDRESS);

    comptroller = await new ComptrollerG6__factory(deployer)
      .attach(COMPTROLLER_ADDRESS)
      .connect(deployer);

    compHolder = await impersonate(COMP_HOLDER_ADDRESS);
    compToken = await new Comp__factory(deployer)
      .attach(COMP_ADDRESS)
      .connect(compHolder);

    // GovernorBravoDelegator is a proxy, actual interface is GovernorBravoDelegate
    govBravo = await new GovernorBravoDelegate__factory(deployer)
      .attach(GOV_BRAVO_DELEGATOR_ADDRESS)
      .connect(compHolder);

    paxgHolder = await impersonate(PAXG_HOLDER_ADDRESS);
    paxg = (
      new ethers.Contract(
        PAXG_ADDRESS,
        ERC20__factory.createInterface()
      ) as ERC20
    ).connect(paxgHolder);
    cPaxg = await new CPoRDelegate__factory(deployer)
      .attach(TEST_CPAXG_ADDRESS)
      .connect(paxgHolder);
    cUsdcHolder = await impersonate(CUSDC_HOLDER_ADDRESS);
    cUsdc = await new CErc20Delegate__factory(deployer)
      .attach(CUSDC_ADDRESS)
      .connect(cUsdcHolder);
  });

  /**
   * Helper functions for passing proposals through governance.
   *
   * @param fnSignatures
   * @param calldatas
   */
  async function passThroughGov(
    description: string,
    targets: string[],
    values: BigNumberish[],
    fnSignatures: string[],
    calldatas: string[]
  ) {
    await compToken.connect(compHolder).delegate(compHolder.address);
    await govBravo.propose(
      targets,
      values,
      fnSignatures,
      calldatas,
      description
    );
    // Vote
    await mine(14000);
    const proposalId = await govBravo.proposalCount();
    await govBravo.castVote(proposalId, 1 /** For */);
    // Queue
    await mine(20000);
    await govBravo.queue(proposalId);
    // Execute
    await increaseTime(604910);
    await govBravo.execute(proposalId, { gasLimit: 2_000_000 });
  }

  it("should pass through governance", async () => {
    // Deploy mock PAXG reserves feed
    const paxgReservesFeed = await new MockV3Aggregator__factory(
      feedAdmin
    ).deploy("8", "17809126900000");

    // Gov - Set price oracle
    // Deploy a mock UAV
    const uav = await new UniswapAnchoredView__factory(deployer).deploy(
      "150000000000000000",
      1800,
      uavTokenConfigs
    );
    await uav.validate("0", "0", "0", "177071799161");
    await passThroughGov(
      "Update oracle",
      [comptroller.address],
      [0],
      ["_setPriceOracle(address)"],
      [abiEncoder.encode(["address"], [uav.address])]
    );

    // Gov - Support new cPAXG market in Comptroller
    await passThroughGov(
      "Add cPAXG Market",
      [comptroller.address, comptroller.address, cPaxg.address],
      [0, 0, 0],
      [
        "_supportMarket(address)",
        "_setCollateralFactor(address,uint256)",
        "_setReserveFactor(uint256)",
      ],
      [
        abiEncoder.encode(["address"], [cPaxg.address]),
        abiEncoder.encode(["address", "uint256"], [cPaxg.address, 0]),
        abiEncoder.encode(["uint256"], ["250000000000000000"]),
      ]
    );

    await cPaxg.connect(feedAdmin)._setFeed(paxgReservesFeed.address);
    await paxgReservesFeed.updateAnswer("180902125000000000000000");
    expect(await paxgReservesFeed.latestAnswer()).to.equal(
      "180902125000000000000000"
    );

    // Sanity: at this point, cPAXG should be a supported market on the Comptroller
    expect((await comptroller.markets(cPaxg.address)).isListed).to.be.true;
    expect((await comptroller.markets(cUsdc.address)).isListed).to.be.true;

    await cPaxg.accrueInterest();

    // Assert Equal (Erc20 PAXG TokenBalance cPAXG) (9998e15)
    await paxg.approve(cPaxg.address, exp(10, 18));
    await cPaxg.mint(exp(10, 18));
    expect(await paxg.balanceOf(cPaxg.address)).to.equal(exp(9998, 15));

    expect(await comptroller.oracle()).to.equal(
      uav.address,
      "The price correct oracle has been set"
    );
    const oracle = new ethers.Contract(
      TEST_UAV_ADDRESS,
      PriceOracle__factory.createInterface(),
      deployer
    ) as PriceOracle;
    expect(await oracle.getUnderlyingPrice(cUsdc.address)).to.equal(exp(1, 30));
    expect(await oracle.getUnderlyingPrice(cPaxg.address)).to.equal(
      "1770717991000000000000"
    );

    // Borrow PAXG
    await cPaxg.connect(cUsdcHolder).borrow(exp(1, 18));
    expect(await paxg.balanceOf(cUsdcHolder.address)).to.equal(exp(9998, 14));
    expect(await paxg.balanceOf(cPaxg.address)).to.equal(exp(8998, 15));

    // Repay
    await paxg.connect(cUsdcHolder).approve(cPaxg.address, exp(1, 18));
    await cPaxg.connect(cUsdcHolder).repayBorrow(exp(9998, 14));
    // Assert Equal (Erc20 PAXG TokenBalance CUSDCHolder) (0)
    expect(await paxg.balanceOf(cUsdcHolder.address)).to.equal(0);
    // Assert Equal (Erc20 PAXG TokenBalance cPAXG) (10e18)
    expect(await paxg.balanceOf(cPaxg.address)).to.equal(exp(999760004, 10));

    // -- Redeem test (note: 50 cPAXG == 1 PAXG initially)
    await cPaxg.redeem(exp(50, 8));
  }).timeout(180_0000);
});
