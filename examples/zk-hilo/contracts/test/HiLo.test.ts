const { ethers, waffle } = require("hardhat");
const { expect } = require("chai");

const { parseEther } = ethers.utils;
const { deployContract } = waffle;

const MIN_PLAYERS = 2;

describe("HiLo", function () {
    let HiLo, hiLo, HiLoEvaluator, hiLoEvaluator, IShuffle, shuffle, IAccountManagement, accountManagement;
    let owner, player1, player2, player3;

    beforeEach(async function () {
        [owner, player1, player2, player3] = await ethers.getSigners();

        HiLoEvaluator = await ethers.getContractFactory("HiLoEvaluator");
        hiLoEvaluator = await HiLoEvaluator.deploy();
        await hiLoEvaluator.deployed();

        IShuffle = await ethers.getContractFactory("IShuffle");
        shuffle = await IShuffle.deploy();
        await shuffle.deployed();

        IAccountManagement = await ethers.getContractFactory("IAccountManagement");
        accountManagement = await IAccountManagement.deploy();
        await accountManagement.deployed();

        HiLo = await ethers.getContractFactory("HiLo");
        hiLo = await HiLo.deploy(shuffle.address, hiLoEvaluator.address, accountManagement.address, false);
        await hiLo.deployed();
    });

    describe("createBoard", function () {
        it("should create a board successfully", async function () {
            await hiLo.connect(player1).createBoard(MIN_PLAYERS);

            const boardId = await accountManagement.generateGameId();
            const board = await hiLo.getBoard(boardId);
            expect(board.stage).to.equal(1);
            expect(board.numPlayers).to.equal(MIN_PLAYERS);
        });
    });

    describe("join", function () {
        let boardId;
        beforeEach(async function () {
            await hiLo.connect(player1).createBoard(MIN_PLAYERS);
            boardId = await accountManagement.generateGameId();
        });

        it("should join successfully", async function () {
            const pk = [1, 2];
            const buyIn = parseEther("1");

            await hiLo.connect(player1).join(pk, player1.address, buyIn, boardId);

            const playerStatus = await hiLo.playerStatuses(boardId, player1.address);
            expect(playerStatus.index).to.equal(0);
            expect(playerStatus.permAddress).to.equal(player1.address);
        });
    });

    // Test shuffle function
    it("should shuffle the deck correctly", async function () {
        // Replace these with proper test data
        const shuffledX0 = [];
        const shuffledX1 = [];
        const selector = [];

        // Call the shuffle function
        await hiLo.shuffleDeck(player1, shuffledX0, shuffledX1, selector, 1);

        // Check if the DeckShuffled event is emitted
        await expect(hiLo.shuffleDeck(shuffledX0, shuffledX1, selector, 1))
            .to.emit(hiLo, "DeckShuffled")
            .withArgs(/* the expected args */);
    });

    // Test shuffleProof function
    it("should submit the proof for shuffling the deck correctly", async function () {
        // Replace this with proper test data
        const proof = [];

        // Call the shuffleProof function
        await hiLo.shuffleProof(proof, 1);

        // Assertions or additional checks if needed
    });

    // Test deal function
    it("should deal cards correctly", async function () {
        // Replace these with proper test data
        const cardIdx = [];
        const proof = [];
        const decryptedCard = [];
        const initDelta = [];
        // Call the deal function
        await hiLo.deal(cardIdx, proof, decryptedCard, initDelta, 1);

        // Check if the BatchDecryptProofProvided event is emitted
        await expect(hiLo.deal(cardIdx, proof, decryptedCard, initDelta, 1))
            .to.emit(hiLo, "BatchDecryptProofProvided")
            .withArgs(/* the expected args */);
    });

    // Test _moveToTheNextStage function
    it("should move to the next stage correctly", async function () {
        // Replace this with the proper test data for boardId
        const boardId = 1;

        // Call the _moveToTheNextStage function with the internal call workaround
        const moveToTheNextStage = hiLo.connect(ethers.provider.getSigner(0))._moveToTheNextStage(boardId);

        // Check if the GameStageChanged event is emitted
        await expect(moveToTheNextStage)
            .to.emit(hiLo, "GameStageChanged")
            .withArgs(/* the expected args */);
    });

    // Test _postRound function
    it("should post a round correctly", async function () {
        // Replace these with proper test data
        const newStage = 1;
        const boardId = 1;
        const betAmount = 10;
        const won = true;

        // Call the _postRound function with the internal call workaround
        const postRound = hiLo.connect(ethers.provider.getSigner(0))._postRound(newStage, boardId, betAmount, won);

        // Check if the RoundPosted event is emitted
        await expect(postRound)
            .to.emit(hiLo, "RoundPosted")
            .withArgs(/* the expected args */);

        // Additional assertions or checks if needed
    });

});


