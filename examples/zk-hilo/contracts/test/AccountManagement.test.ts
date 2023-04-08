// Import dependencies from Hardhat
const { expect } = require("chai");
const { ethers } = require("hardhat");
const { expectEvent, expectRevert } = require("@openzeppelin/test-helpers");

describe("AccountManagement", function () {
    let accountManagement;
    let accounts;
    let token;

    // Deploy a new AccountManagement and ERC20 token before each test
    beforeEach(async function () {
        const AccountManagement = await ethers.getContractFactory("AccountManagement");
        accountManagement = await AccountManagement.deploy(
            token.address,
            100,  // ratio
            10,   // minAmount
            86400, // delay
            100  // vig
        );
        await accountManagement.deployed();

        const Token = await ethers.getContractFactory("Token");
        token = await Token.deploy("Test Token", "TEST", 18);
        await token.deployed();

        accounts = await ethers.getSigners();
    });

    describe("deposit()", function () {
        it("should allow users to deposit tokens and receive chips", async function () {
            const user = accounts[0];
            const tokenAmount = 100;

            await token.approve(accountManagement.address, tokenAmount);
            await accountManagement.deposit(tokenAmount);

            expect(await token.balanceOf(accountManagement.address)).to.equal(tokenAmount);
            expect(await accountManagement.getChipBalance(user.address)).to.equal(10000);
        });

        it("should reject deposits below the minimum amount", async function () {
            const user = accounts[0];
            const tokenAmount = 5;

            await expect(accountManagement.deposit(tokenAmount)).to.be.revertedWith("Amount less than minimum amount");
        });
    });

    describe("withdraw()", function () {
        it("should allow users to withdraw tokens using chips", async function () {
            const user = accounts[0];
            const tokenAmount = 100;
            const chipAmount = tokenAmount * 100;

            await token.approve(accountManagement.address, tokenAmount);
            await accountManagement.deposit(tokenAmount);

            expect(await token.balanceOf(accountManagement.address)).to.equal(tokenAmount);

            await accountManagement.withdraw(chipAmount);

            expect(await token.balanceOf(accountManagement.address)).to.equal(0);
            expect(await accountManagement.getChipBalance(user.address)).to.equal(0);
            expect(await token.balanceOf(user.address)).to.equal(tokenAmount);
        });

        it("should reject withdrawals if the user doesn't have enough chips", async function () {
            const user = accounts[0];
            const tokenAmount = 100;

            await token.approve(accountManagement.address, tokenAmount);
            await accountManagement.deposit(tokenAmount);

            await expect(accountManagement.withdraw(100000)).to.be.revertedWith("Not enough chips");
        });
    });

    describe("authorize()", function () {
        it("should allow a registered contract to authorize an ephemeral account", async function () {
            const user = accounts[0];
            const ephemeralAccount = accounts[1].address;

            await accountManagement.registerContract(user.address);

            await accountManagement.authorize(user.address, ephemeralAccount);

            expect(await accountManagement.getEphemeralAccount(user.address)).to.equal(ephemeralAccount);
        });

        it("should not reset the ephemeral account if it has already been authorized", async function () {
            const user = accounts[0];
            const ephemeralAccount1 = accounts[1].address;
            const ephemeralAccount2 = accounts[2].address;

            await accountManagement.registerContract(user.address);

            await accountManagement.authorize(user.address, ephemeralAccount1);
            await accountManagement.authorize(user.address, ephemeralAccount2);

            expect(await accountManagement.getEphemeralAccount(user.address)).to.equal(ephemeralAccount1);
        });

        it("should revert if an unregistered contract tries to authorize an ephemeral account", async function () {
            const user = accounts[0];
            const unregisteredContract = accounts[1].address;
            const ephemeralAccount = accounts[2].address;

            await expect(
                accountManagement.authorize(user.address, ephemeralAccount, { from: unregisteredContract })
            ).to.be.revertedWith("Only registered contracts can call this function");
        });

        it("should revert if an ephemeral account has already been used", async function () {
            const user1 = accounts[0];
            const user2 = accounts[1];
            const ephemeralAccount = accounts[2].address;

            await accountManagement.registerContract(user1.address);
            await accountManagement.registerContract(user2.address);

            await accountManagement.authorize(user1.address, ephemeralAccount);

            await expect(
                accountManagement.authorize(user2.address, ephemeralAccount)
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

    
});

