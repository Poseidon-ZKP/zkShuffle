// Import dependencies from Hardhat
const { expect } = require("chai");
const { ethers } = require("hardhat");
const { expectEvent, expectRevert } = require("@openzeppelin/test-helpers");
import { BigNumber } from "ethers";

describe("AccountManagement", function () {
    let accountManagement;
    let accounts;
    let token;

    beforeEach(async function () {
        const Token = await ethers.getContractFactory("GameToken");
        token = await Token.deploy("Test Token", "TEST", 10 ** 8);
        await token.deployed();

        const AccountManagement = await ethers.getContractFactory("AccountManagement");
        accountManagement = await AccountManagement.deploy(
            token.address,
            100,  // ratio
            2,   // minAmount
            40, // delay
            100  // vig
        );
        await accountManagement.deployed();

        accounts = await ethers.getSigners();
    });


    describe("deposit()", function () {
        it("should allow users to deposit tokens and receive chips", async function () {
            //deposited chips = deposited tokens * ratio
            const user = accounts[0];
            const tokenAmount = 100;
            const ratio = await accountManagement.ratio();
            console.log("ratio: ", ratio);
            const chipAmount = tokenAmount * ratio;

            await token.approve(accountManagement.address, tokenAmount);
            await accountManagement.deposit(tokenAmount);

            const expectedChipEquity = ethers.BigNumber.from(chipAmount);
            expect(await token.balanceOf(accountManagement.address)).to.equal(tokenAmount);
            expect(await accountManagement.getChipEquityAmount(user.address)).to.equal(expectedChipEquity);
        });

        it("should reject deposits below the minimum amount", async function () {
            const tokenAmount = 1;

            await expect(accountManagement.deposit(tokenAmount)).to.be.revertedWith("Amount less than minimum amount");
        });
    });

    describe("withdraw()", function () {
        it("should allow users to withdraw tokens using chips", async function () {
            //deposit takes token amount 
            const user = accounts[0];
            const tokenAmount = 100;
            const ratio = await accountManagement.ratio();
            const chipAmount = tokenAmount * ratio;
            const userInitialBalance = await token.balanceOf(user.address);

            await token.approve(accountManagement.address, tokenAmount);
            await accountManagement.deposit(tokenAmount);

            expect(await token.balanceOf(accountManagement.address)).to.equal(tokenAmount);

            //withdraw takes chip amount
            await accountManagement.withdraw(chipAmount);

            expect(await token.balanceOf(accountManagement.address)).to.equal(0);
            expect(await accountManagement.getChipEquityAmount(user.address)).to.equal(0);
            expect(await token.balanceOf(user.address)).to.equal(userInitialBalance);
        });

        it("should reject withdrawals if the user doesn't have enough chips", async function () {
            const tokenAmount = 100;

            await token.approve(accountManagement.address, tokenAmount);
            await accountManagement.deposit(tokenAmount);

            await expect(accountManagement.withdraw(100000)).to.be.revertedWith("Not enough chips");
        });
    });

    describe("authorize()", function () {
        it("should allow a registered contract to authorize an ephemeral account", async function () {
            const gameContract = accounts[0];
            const permanentAccount = accounts[1].address;
            const ephemeralAccount = accounts[1].address;

            await accountManagement.registerContract(gameContract.address);

            await accountManagement.authorize(permanentAccount, ephemeralAccount, { from: gameContract.address });

            expect(await accountManagement.getPermanentAccount(ephemeralAccount)).to.equal(permanentAccount);
        });

        it("should not reset the ephemeral account if it has already been authorized", async function () {
            const gameContract = accounts[0];
            const permanentAccount = accounts[1].address;
            const ephemeralAccount1 = accounts[2].address;
            const ephemeralAccount2 = accounts[3].address;

            await accountManagement.registerContract(gameContract.address);

            await accountManagement.authorize(permanentAccount, ephemeralAccount1, { from: gameContract.address });
            await accountManagement.authorize(permanentAccount, ephemeralAccount2, { from: gameContract.address });

            expect(await accountManagement.getPermanentAccount(ephemeralAccount1)).to.equal(permanentAccount);
        });

        it("should revert if an unregistered contract tries to authorize an ephemeral account", async function () {
            const gameContract = accounts[0];
            const permanentAccount = accounts[1].address;
            const ephemeralAccount = accounts[1].address;

            await expect(
                accountManagement.authorize(permanentAccount, ephemeralAccount, { from: gameContract.address })
            ).to.be.revertedWith("Not registered game contract");
        });

        it("should revert if an ephemeral account has already been used", async function () {
            const gameContract = accounts[0];
            const permanentAccount1 = accounts[1].address;
            const permanentAccount2 = accounts[2].address;
            const ephemeralAccount = accounts[3].address;

            await accountManagement.registerContract(gameContract.address);

            await accountManagement.authorize(permanentAccount1, ephemeralAccount, { from: gameContract.address });

            await expect(
                accountManagement.authorize(permanentAccount2, ephemeralAccount, { from: gameContract.address })
            ).to.be.revertedWith("Requested ephemeral account has been used");
        });


        it("should emit an event when an ephemeral account is authorized", async function () {
            const user = accounts[0];
            const ephemeralAccount = accounts[1].address;

            await accountManagement.registerContract(user.address);

            const tx = await accountManagement.authorize(user.address, ephemeralAccount);

            expect(tx)
                .to.emit(accountManagement, "EphemeralAccountAuthorized")
                .withArgs(user.address, ephemeralAccount);
        });
    });

    describe("claim", function () {
        it("should add matured chips to chip equity and remove them from withholds", async function () {
            const user = accounts[0];
            const withholdAmount = 10;
            const maturityTime = Math.floor(Date.now() / 1000) - 10; // matured withhold
            const maturityTime2 = Math.floor(Date.now() / 1000) + 10; // unmatured withhold

            await token.approve(accountManagement.address, withholdAmount);
            await accountManagement.deposit(withholdAmount);

            await accountManagement.withhold(
                withholdAmount,
                maturityTime,
                user.address
            );
            await accountManagement.withhold(
                withholdAmount,
                maturityTime2,
                user.address
            );

            const initialChipEquity = await accountManagement.chipEquityOf(user.address);

            const tx = await accountManagement.connect(user).claim();

            const newChipEquity = await accountManagement.chipEquityOf(user.address);
            const unmaturedChips = await accountManagement.connect(user).unmaturedChips();

            expect(newChipEquity).to.equal(initialChipEquity.add(withholdAmount).toString());
            expect(unmaturedChips).to.equal(withholdAmount.toString());

            const event = await expectEvent.inTransaction(
                tx.hash,
                accountManagement,
                "WithholdRemoved"
            );

            expect(event.args.account).to.equal(user.address);
            expect(event.args.amount).to.equal(withholdAmount);
            expect(event.args.maturityTime).to.equal(maturityTime);
        });

        it("should not add unmatured chips to chip equity but return them", async function () {
            const user = accounts[0];
            const withholdAmount = 10;
            const maturityTime = Math.floor(Date.now() / 1000) + 10; // unmatured withhold

            await token.approve(accountManagement.address, withholdAmount);
            await accountManagement.deposit(withholdAmount);

            await accountManagement.withhold(
                withholdAmount,
                maturityTime,
                user.address
            );

            const initialChipEquity = await accountManagement.chipEquityOf(user.address);

            const tx = await accountManagement.connect(user).claim();

            const newChipEquity = await accountManagement.chipEquityOf(user.address);
            const unmaturedChips = await accountManagement.connect(user).unmaturedChips();

            expect(newChipEquity).to.equal(initialChipEquity.toString());
            expect(unmaturedChips).to.equal(withholdAmount.toString());

            const event = await expectEvent.notEmitted(
                accountManagement,
                "WithholdRemoved"
            );
        });
    });

    describe("join", function () {
        it("should allow a registered contract to use join function for people to join game and withhold chips", async function () {
            const gameContract = accounts[0];
            const permanentAccount = accounts[1];
            const gameId = 1;
            const buyIn = 100;

            await accountManagement.registerContract(gameContract.address);
                
            await accountManagement.join(permanentAccount.address, gameId, buyIn, { from: gameContract.address });
        
            const account = await accountManagement.accounts(permanentAccount.address);
            expect(account.gameId).to.equal(gameId);
            expect(account.chipEquity).to.equal(900);
            expect(account.withholds.length).to.equal(1);
            expect(account.withholds[0].gameId).to.equal(gameId);
            expect(account.withholds[0].amount).to.equal(buyIn);
        
            // Check that the withhold will expire after the delay period
            const delay = await accountManagement.delay();
            const maturityTime = account.withholds[0].maturityTime.toNumber();
            const currentTime = Math.floor(Date.now() / 1000);
            expect(maturityTime).to.be.closeTo(currentTime + delay, 5);
          });
    });


    
});

