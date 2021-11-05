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
  CErc20,
  CErc20__factory,
  ERC20,
  ERC20__factory,
  PriceOracle__factory,
  PriceOracle,
} from "../types";
import { BigNumber, BigNumberish } from "@ethersproject/bignumber";

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
  let cUsdc: CErc20;
  let comptroller: ComptrollerG6;
  let paxg: ERC20;
  before(async () => {
    const signers = await ethers.getSigners();
    deployer = signers[0];
    feedAdmin = await ethers.getSigner(FEED_ADMIN_ADDRESS);

    comptroller = await new ComptrollerG6__factory()
      .attach(COMPTROLLER_ADDRESS)
      .connect(deployer);

    compHolder = await impersonate(COMP_HOLDER_ADDRESS);
    compToken = await new Comp__factory()
      .attach(COMP_ADDRESS)
      .connect(compHolder);

    // GovernorBravoDelegator is a proxy, actual interface is GovernorBravoDelegate
    govBravo = await new GovernorBravoDelegate__factory()
      .attach(GOV_BRAVO_DELEGATOR_ADDRESS)
      .connect(compHolder);

    paxgHolder = await impersonate(PAXG_HOLDER_ADDRESS);
    paxg = (
      new ethers.Contract(
        PAXG_ADDRESS,
        ERC20__factory.createInterface()
      ) as ERC20
    ).connect(paxgHolder);
    cPaxg = await new CPoRDelegate__factory()
      .attach(TEST_CPAXG_ADDRESS)
      .connect(paxgHolder);
    cUsdcHolder = await impersonate(CUSDC_HOLDER_ADDRESS);
    cUsdc = await new CErc20__factory()
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
    await passThroughGov(
      "Update oracle",
      [comptroller.address],
      [0],
      ["_setPriceOracle(address)"],
      [abiEncoder.encode(["address"], [TEST_UAV_ADDRESS])]
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

    expect(await comptroller.oracle()).to.equal(TEST_UAV_ADDRESS);
    const oracle = new ethers.Contract(
      TEST_UAV_ADDRESS,
      PriceOracle__factory.createInterface(),
      deployer
    ) as PriceOracle;
    expect(await oracle.getUnderlyingPrice(cUsdc.address)).to.equal(exp(1, 30));
    expect(await oracle.getUnderlyingPrice(cPaxg.address)).to.equal(
      "1770717991000000000000"
    );

    await cPaxg.connect(cUsdcHolder).borrow(exp(1, 18));
    // Assert Equal (Erc20 PAXG TokenBalance CUSDCHolder) (1e18)
    // Assert Equal (Erc20 PAXG TokenBalance cPAXG) (9e18)
  }).timeout(180_0000);
});
