// SPDX-License-Identifier: MIT

pragma solidity >=0.8.4;
pragma experimental ABIEncoderV2;

import "../types/HiLoTypes.sol";

interface IHiLo {
    // ========================== Events ==========================
    event BoardCreated(address indexed creator, uint256 indexed boardId);
    event JoinedBoard(address indexed player, uint256 indexed boardId);
    event Bet(
        address indexed player,
        uint256 indexed amount,
        uint256 indexed betType,
        uint256 stage,
        uint256 boardId
    );
    event NextPlayer(uint256 indexed playerIndex, uint256 indexed boardId);
    event GameStageChanged(GameStage indexed stage, uint256 indexed boardId);

    event DeckShuffled(address indexed player, uint256 indexed boardId);
    event DecryptProofProvided(
        address indexed sender,
        uint256 indexed cardIndex,
        uint256 indexed boardId
    );

    event BatchDecryptProofProvided(
        address indexed sender,
        uint256 indexed cardCount,
        uint256 indexed boardId
    );

    event Challenged(
        address indexed challenged,
        address indexed challenger,
        uint256 boardId,
        bool punishChallenger
    );
     

    // ========================== Public ==========================
    // create a board for a new game, reverts when
    // - the current board is not ended yet
    // - parameter checking fails
    function createBoard(
        uint256 numPlayers
    ) external;

    // Joins the `boardId` board with the public key `pk`, the `ephemeralAccount` that `msg.sender`
    // wants to authorize, and `buyIn` amount of chips.
    // Reverts when a) user has joined; b) board players reach the limit.
    function join(
        uint256[2] calldata pk,
        address ephemeralAccount,
        uint256 buyIn,
        uint256 boardId
    ) external payable;

    // Shuffles the deck without submitting the proof.
    function shuffleDeck(
        uint256[52] calldata shuffledX0,
        uint256[52] calldata shuffledX1,
        uint256[2] calldata selector,
        uint256 boardId
    ) external;

    // Submits the proof for shuffling the deck.
    function shuffleProof(uint256[8] calldata proof, uint256 boardId) external;

    // everyone needs to provide the reveal proof to reveal a specific card of the deck, fails when
    // - user who's not his turn calls this func
    // - user provide for that card twice
    // - proof verification fails
    function deal(
        uint256[] calldata cardIdx,
        uint256[8][] calldata proof,
        uint256[2][] memory decryptedCard,
        uint256[2][] memory initDelta,
        uint256 boardId
    ) external;


}