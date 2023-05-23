// SPDX-License-Identifier: GPL-3.0

pragma solidity >=0.8.2 <0.9.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./IShuffleStateManager.sol";
import "./ECC.sol";
import "./IBaseGame.sol";
import "./BitMaps.sol";
import "./Storage.sol";

import { MyTable } from "../mud-codegen/codegen/tables/MyTable.sol";

import { Schema, SchemaType, SchemaLib } from "@latticexyz/store/src/Schema.sol";
import { Store } from "@latticexyz/store/src/Store.sol";
import { StoreSwitch } from "@latticexyz/store/src/StoreSwitch.sol";
import { StoreCore } from "@latticexyz/store/src/StoreCore.sol";

/**
 * @title Shuffle Manager
 * @dev manage all ZK Games
 */
// #if SHUFFLE_UNIT_TEST
import "../debug/Debug.sol";
contract ShuffleManager is IShuffleStateManager, Debug, Ownable {
// #else
contract ShuffleManager is IShuffleStateManager, Storage, Ownable {
// #endif
    // invalid card index or player index
    uint256 public constant override INVALID_INDEX = 999999;

    event PlayerTurn (
        uint256 indexed gameId,
        uint256 playerIndex,
        BaseState state
    );

    // check whether the caller is the game owner
    modifier gameOwner(uint256 gameId) {
        require(
            _activeGames[gameId] == msg.sender,
            "Caller is not game owner."
        );
        _;
    }

    // check state
    modifier checkState(uint256 gameId, BaseState state) {
        require(state == gameStates[gameId].state, "Check state failed");
        _;
    }

    // check if this is your turn
    modifier checkTurn(uint256 gameId) {
        ShuffleGameState storage state = gameStates[gameId];
        require(
            msg.sender == state.playerAddrs[state.curPlayerIndex] ||
                msg.sender == state.signingAddrs[state.curPlayerIndex],
            "not your turn!"
        );
        _;
    }

    constructor(
        address decryptVerifier_,
        address deck52EncVerifier,
        address deck30EncVerifier,
        address deck5EncVerifier
    ) {
        _deck52EncVerifier = deck52EncVerifier;
        _deck30EncVerifier = deck30EncVerifier;
        _deck5EncVerifier = deck5EncVerifier;
        decryptVerifier = IDecryptVerifier(decryptVerifier_);

        StoreCore.initialize();
        MyTable.registerSchema();
        // Setting metadata is optional. It helps off-chain actors name columns
        MyTable.setMetadata();
        MyTable.set(keccak256("largestGameId"), 0);
    }

    // get number of card of a gameId
    function getNumCards(
        uint256 gameId
    ) public view override returns (uint256) {
        require(gameId <= MyTable.get(keccak256("largestGameId")), "Invalid gameId");
        return gameInfos[gameId].numCards;
    }

    // get state of the game
    function gameState(uint256 gameId) public view returns (uint256) {
        require(gameId <= MyTable.get(keccak256("largestGameId")), "Invalid gameId");
        return uint(gameStates[gameId].state);
    }

    // get the current player index (who need to take action)
    function curPlayerIndex(
        uint256 gameId
    ) public view override returns (uint256) {
        require(gameId <= MyTable.get(keccak256("largestGameId")), "Invalid gameId");
        return gameStates[gameId].curPlayerIndex;
    }

    // get decrypt record of a single card
    function getDecryptRecord(
        uint256 gameId,
        uint256 cardIdx
    ) public view override returns (BitMaps.BitMap256 memory) {
        require(gameId <= MyTable.get(keccak256("largestGameId")), "Invalid gameId");
        require(cardIdx < gameInfos[gameId].numCards, "Invalid cardIdx");
        return gameStates[gameId].deck.decryptRecord[cardIdx];
    }

    // Returns the aggregated public key for all players.
    function queryAggregatedPk(
        uint256 gameId
    ) external view override returns (uint px, uint py) {
        require(
            gameStates[gameId].state != BaseState.Registration,
            "aggregated pk is not ready"
        );
        return (
            gameStates[gameId].aggregatePkX,
            gameStates[gameId].aggregatePkY
        );
    }

    // Returns Deck Config.
    function cardConfig(uint gameId) external view returns (DeckConfig) {
        return IBaseGame(_activeGames[gameId]).cardConfig();
    }

    // Return the current Deck
    function queryDeck(
        uint gameId
    )
        external
        view
        returns (
            uint[] memory X0,
            uint[] memory X1,
            uint[] memory Y0,
            uint[] memory Y1,
            BitMaps.BitMap256 memory selector0,
            BitMaps.BitMap256 memory selector1,
            BitMaps.BitMap256 memory cardsToDeal
        )
    {
        X0 = gameStates[gameId].deck.X0;
        Y0 = gameStates[gameId].deck.Y0;
        X1 = gameStates[gameId].deck.X1;
        Y1 = gameStates[gameId].deck.Y1;
        selector0 = gameStates[gameId].deck.selector0;
        selector1 = gameStates[gameId].deck.selector1;
        cardsToDeal = gameStates[gameId].deck.cardsToDeal;
    }

    // Returns the player index in the `gameId`-th game.
    function getPlayerIdx(
        uint gameId,
        address player
    ) external view override returns (uint256) {
        ShuffleGameState storage state = gameStates[gameId];
        for (uint256 i = 0; i < state.playerAddrs.length; i++) {
            if (player == state.playerAddrs[i]) {
                return i;
            }
        }
        return INVALID_INDEX;
    }

    /**
     * create a new shuffle game (call by the game contract)
     */
    function createShuffleGame(
        uint8 numPlayers
    ) external override returns (uint256) {
        uint256 newGameId = MyTable.get(keccak256("largestGameId"));
        MyTable.set(keccak256("largestGameId"), ++newGameId);

        gameInfos[newGameId].numPlayers = numPlayers;

        // TODO: do we need to explicit start
        // an intialization logic of gameStates[newGameId]?
        _activeGames[newGameId] = msg.sender;

        ShuffleGameState storage state = gameStates[newGameId];
        state.state = BaseState.Created;

        // set up verifier contract according to deck type
        if (IBaseGame(msg.sender).cardConfig() == DeckConfig.Deck5Card) {
            gameInfos[newGameId].encryptVerifier = IShuffleEncryptVerifier(
                _deck5EncVerifier
            );
            gameInfos[newGameId].numCards = 5;
            state.deck.config = DeckConfig.Deck5Card;
        } else if (
            IBaseGame(msg.sender).cardConfig() == DeckConfig.Deck30Card
        ) {
            gameInfos[newGameId].encryptVerifier = IShuffleEncryptVerifier(
                _deck30EncVerifier
            );
            gameInfos[newGameId].numCards = 30;
            state.deck.config = DeckConfig.Deck30Card;
        } else if (
            IBaseGame(msg.sender).cardConfig() == DeckConfig.Deck52Card
        ) {
            gameInfos[newGameId].encryptVerifier = IShuffleEncryptVerifier(
                _deck52EncVerifier
            );
            gameInfos[newGameId].numCards = 52;
            state.deck.config = DeckConfig.Deck52Card;
        } else {
            revert("Unsupported size of deck.");
        }

        // init deck
        zkShuffleCrypto.initDeck(state.deck);
        return newGameId;
    }

    /**
     * [Game Contract]: enter register state, can only be called by game owner
     * currently, we only support player registering during the beginning of the game
     */
    function register(
        uint256 gameId,
        bytes calldata next
    )
        external
        override
        gameOwner(gameId)
        checkState(gameId, BaseState.Created)
    {
        ShuffleGameState storage state = gameStates[gameId];
        state.state = BaseState.Registration;
        nextToCall[gameId] = next;
    }

    /**
     * [SDK]: register, called by player
     * Note: we don't need to check turn here
     */
    function playerRegister(
        uint256 gameId,
        address signingAddr,
        uint256 pkX,
        uint256 pkY
    )
        external
        checkState(gameId, BaseState.Registration)
        returns (uint256 pid)
    {
        require(CurveBabyJubJub.isOnCurve(pkX, pkY), "Invalid public key");
        ShuffleGameInfo memory info = gameInfos[gameId];
        ShuffleGameState storage state = gameStates[gameId];
        require(state.playerAddrs.length < info.numPlayers, "Game full");

        // assign pid before push to the array
        pid = state.playerAddrs.length;

        // update game info
        state.playerAddrs.push(msg.sender);
        state.signingAddrs.push(signingAddr);
        state.playerPkX.push(pkX);
        state.playerPKY.push(pkY);

        // update aggregated PK
        if (pid == 0) {
            state.aggregatePkX = pkX;
            state.aggregatePkY = pkY;
        } else {
            (state.aggregatePkX, state.aggregatePkY) = CurveBabyJubJub.pointAdd(
                state.aggregatePkX,
                state.aggregatePkY,
                pkX,
                pkY
            );
        }
        emit Register(gameId, pid, msg.sender);

        // if this is the last player to join
        if (pid == info.numPlayers - 1) {
            state.nonce = mulmod(
                state.aggregatePkX,
                state.aggregatePkY,
                CurveBabyJubJub.Q
            );
            _callGameContract(gameId);
        }
    }

    /**
     * [Game Contract]: enter shuffle state, can only be called by game owner
     */
    function shuffle(
        uint256 gameId,
        bytes calldata next
    ) external override gameOwner(gameId) {
        ShuffleGameState storage state = gameStates[gameId];
        require(
            state.curPlayerIndex == 0,
            "wrong player index to start shuffle"
        );
        state.state = BaseState.Shuffle;
        nextToCall[gameId] = next;
        emit PlayerTurn(gameId, state.curPlayerIndex, BaseState.Shuffle);
    }

    /**
     * [SDK]: shuffle, called by each player
     */
    function playerShuffle(
        uint256 gameId,
        uint256[8] memory proof,
        CompressedDeck memory compDeck
    ) external checkState(gameId, BaseState.Shuffle) checkTurn(gameId) {
        ShuffleGameInfo memory info = gameInfos[gameId];
        ShuffleGameState storage state = gameStates[gameId];
        info.encryptVerifier.verifyProof(
            [proof[0], proof[1]],
            [[proof[2], proof[3]], [proof[4], proof[5]]],
            [proof[6], proof[7]],
            zkShuffleCrypto.shuffleEncPublicInput(
                compDeck,
                zkShuffleCrypto.getCompressedDeck(state.deck),
                state.nonce,
                state.aggregatePkX,
                state.aggregatePkY
            )
        );
        zkShuffleCrypto.setDeckUnsafe(compDeck, state.deck);
        state.curPlayerIndex += 1;
        // end shuffle state and execute call back
        // if this is the last player to shuffle
        if (state.curPlayerIndex == state.playerAddrs.length) {
            state.curPlayerIndex = 0;
            _callGameContract(gameId);
        } else {
            emit PlayerTurn(gameId, state.curPlayerIndex, BaseState.Shuffle);
        }
    }

    /**
     * [Game Contract]: can only called by game contract,
     * specifiy a set of cards to be dealed to a players
     */
    function dealCardsTo(
        uint256 gameId,
        BitMaps.BitMap256 memory cards,
        uint256 playerId,
        bytes calldata next
    ) external override gameOwner(gameId) {
        ShuffleGameState storage state = gameStates[gameId];
        // TODO: maybe add a checking of the remaining deck size
        // this check could removed if we formally verified the contract
        require(state.curPlayerIndex == 0, "internal erorr! ");
        require(
            playerId < gameInfos[gameId].numPlayers,
            "game contract error: deal card to an invalid player id"
        );

        // change to Play state if not already in the state
        if (state.state != BaseState.Deal) {
            state.state = BaseState.Deal;
        }
        state.deck.cardsToDeal = cards;
        state.deck.playerToDeal = playerId;

        // we assume a game must have at least 2 or more players,
        // otherwise the game should stop
        if (playerId == 0) {
            state.curPlayerIndex = 1;
        }
        nextToCall[gameId] = next;
        emit PlayerTurn(gameId, state.curPlayerIndex, BaseState.Deal);
    }

    /**
     * [SDK]: deal (draw) card from each player
     */
    function playerDealCards(
        uint256 gameId,
        uint[8][] memory proofs,
        Card[] memory decryptedCards,
        uint256[2][] memory initDeltas
    ) external checkState(gameId, BaseState.Deal) checkTurn(gameId) {
        ShuffleGameInfo memory info = gameInfos[gameId];
        ShuffleGameState storage state = gameStates[gameId];
        uint256 numberCardsToDeal = BitMaps.memberCountUpTo(
            state.deck.cardsToDeal,
            info.numCards
        );
        require(
            proofs.length == numberCardsToDeal,
            "number of proofs is wrong!"
        );
        require(
            decryptedCards.length == numberCardsToDeal,
            "number of decrypted cards is wrong!"
        );
        require(
            initDeltas.length == numberCardsToDeal,
            "init delta's shape is invalid!"
        );

        uint256 counter = 0;
        for (uint256 cid = 0; cid < uint256(info.numCards); cid++) {
            if (BitMaps.get(state.deck.cardsToDeal, cid)) {
                // update decrypted card
                _updateDecryptedCard(
                    gameId,
                    cid,
                    proofs[counter],
                    decryptedCards[counter],
                    initDeltas[counter]
                );
                counter++;
            }
            if (counter == numberCardsToDeal) {
                break;
            }
        }
        state.curPlayerIndex++;
        if (state.curPlayerIndex == state.deck.playerToDeal) {
            state.curPlayerIndex++;
        }

        if (state.curPlayerIndex == info.numPlayers) {
            state.curPlayerIndex = 0;
            state.playerHand[state.deck.playerToDeal] += numberCardsToDeal;
            _callGameContract(gameId);
        } else {
            emit PlayerTurn(gameId, state.curPlayerIndex, BaseState.Deal);
        }
    }

    /**
     * [Internal]: update a decrypted card.
     */
    function _updateDecryptedCard(
        uint256 gameId,
        uint256 cardIndex,
        uint[8] memory proof,
        Card memory decryptedCard,
        uint256[2] memory initDelta
    ) internal {
        ShuffleGameState storage state = gameStates[gameId];
        require(
            !BitMaps.get(
                state.deck.decryptRecord[cardIndex],
                state.curPlayerIndex
            ),
            "This player has decrypted this card already"
        );

        // recover Y0 and Y1 from the current X0 and X1
        if (state.deck.decryptRecord[cardIndex]._data == 0) {
            state.deck.Y0[cardIndex] = CurveBabyJubJub.recoverY(
                state.deck.X0[cardIndex],
                initDelta[0],
                BitMaps.get(state.deck.selector0, cardIndex)
            );
            state.deck.Y1[cardIndex] = CurveBabyJubJub.recoverY(
                state.deck.X1[cardIndex],
                initDelta[1],
                BitMaps.get(state.deck.selector1, cardIndex)
            );
        }

        decryptVerifier.verifyProof(
            [proof[0], proof[1]],
            [[proof[2], proof[3]], [proof[4], proof[5]]],
            [proof[6], proof[7]],
            [
                decryptedCard.X,
                decryptedCard.Y,
                state.deck.X0[cardIndex],
                state.deck.Y0[cardIndex],
                state.deck.X1[cardIndex],
                state.deck.Y1[cardIndex],
                state.playerPkX[state.curPlayerIndex],
                state.playerPKY[state.curPlayerIndex]
            ]
        );
        // update X1 and Y1 in the deck
        state.deck.X1[cardIndex] = decryptedCard.X;
        state.deck.Y1[cardIndex] = decryptedCard.Y;
        BitMaps.set(state.deck.decryptRecord[cardIndex], state.curPlayerIndex);
    }

    // [Game Contract]: specify a player to open a number of cards
    function openCards(
        uint256 gameId,
        uint256 playerId,
        uint8 openningNum,
        bytes calldata next
    ) external override gameOwner(gameId) {
        ShuffleGameState storage state = gameStates[gameId];
        require(
            openningNum <= state.playerHand[playerId],
            "don't have enough card to open"
        );
        state.openning = openningNum;
        state.curPlayerIndex = playerId;
        nextToCall[gameId] = next;
        state.state = BaseState.Open;
        emit PlayerTurn(gameId, playerId, BaseState.Open);
    }

    // [SDK]: player open one or more cards
    function playerOpenCards(
        uint256 gameId,
        BitMaps.BitMap256 memory cards, // TODO : should be inner shuffleManager
        uint[8][] memory proofs,
        Card[] memory decryptedCards
    ) external checkState(gameId, BaseState.Open) checkTurn(gameId) {
        ShuffleGameInfo memory info = gameInfos[gameId];
        ShuffleGameState storage state = gameStates[gameId];
        uint256 numberCardsToOpen = BitMaps.memberCountUpTo(
            cards,
            info.numCards
        );
        require(
            numberCardsToOpen == state.openning,
            "cards passed by player doesn't match number to open"
        );
        require(
            proofs.length == numberCardsToOpen,
            "number of proofs is wrong!"
        );
        require(
            decryptedCards.length == numberCardsToOpen,
            "number of decrypted cards is wrong!"
        );
        uint[2] memory dummy = [uint(0), uint(0)];
        uint256 counter = 0;
        for (uint256 cid = 0; cid < uint256(info.numCards); cid++) {
            if (BitMaps.get(cards, cid)) {
                // update decrypted card
                _updateDecryptedCard(
                    gameId,
                    cid,
                    proofs[counter],
                    decryptedCards[counter],
                    dummy
                );
                counter++;
            }
            if (counter == numberCardsToOpen) {
                break;
            }
        }
        // reset the openning register
        state.openning = 0;
        // update players handcard status
        state.playerHand[state.curPlayerIndex] -= numberCardsToOpen;
        // call the next action
        _callGameContract(gameId);
    }

    // [Game Contract]: end game
    function endGame(uint256 gameId) external override gameOwner(gameId) {
        ShuffleGameState storage state = gameStates[gameId];
        state.state = BaseState.Complete;
        delete _activeGames[gameId];
        for (
            uint256 playerId = 0;
            playerId < state.playerAddrs.length;
            playerId++
        ) {
            emit PlayerTurn(gameId, playerId, BaseState.Complete);
        }
        //TODO: clean game state
    }

    // goes into error state
    function error(
        uint256 gameId,
        bytes calldata next
    ) external override gameOwner(gameId) {
        gameStates[gameId].state = BaseState.GameError;
        nextToCall[gameId] = next;
        _callGameContract(gameId);
    }

    // switch control to game contract, set the game to error state if the contract call failed
    function _callGameContract(uint256 gameId) internal {
        if (nextToCall[gameId].length != 0) {
            (bool success, ) = _activeGames[gameId].call(nextToCall[gameId]);
            require(success, "Error calling game contract");
        }
    }

    // query the value of the `cardIndex`-th card in the `gameId`-th game.
    function queryCardValue(
        uint256 gameId,
        uint256 cardIndex
    ) external view override returns (uint256) {
        ShuffleGameInfo memory info = gameInfos[gameId];
        ShuffleGameState storage state = gameStates[gameId];

        require(
            BitMaps.memberCountUpTo(
                state.deck.decryptRecord[cardIndex],
                info.numPlayers
            ) == info.numPlayers,
            "Card has not been fully decrypted"
        );

        uint256 X1 = state.deck.X1[cardIndex];
        uint256[52] memory initX1 = getInitX1();
        for (uint256 i = 0; i < info.numCards; i++) {
            if (initX1[i] == X1) {
                return i;
            }
        }
        return INVALID_INDEX;
    }

    function getInitX1() internal pure returns(uint256[52] memory) {
        return [
            5299619240641551281634865583518297030282874472190772894086521144482721001553,
            10031262171927540148667355526369034398030886437092045105752248699557385197826,
            2763488322167937039616325905516046217694264098671987087929565332380420898366,
            12252886604826192316928789929706397349846234911198931249025449955069330867144,
            11480966271046430430613841218147196773252373073876138147006741179837832100836,
            10483991165196995731760716870725509190315033255344071753161464961897900552628,
            20092560661213339045022877747484245238324772779820628739268223482659246842641,
            7582035475627193640797276505418002166691739036475590846121162698650004832581,
            4705897243203718691035604313913899717760209962238015362153877735592901317263,
            153240920024090527149238595127650983736082984617707450012091413752625486998,
            21605515851820432880964235241069234202284600780825340516808373216881770219365,
            13745444942333935831105476262872495530232646590228527111681360848540626474828,
            2645068156583085050795409844793952496341966587935372213947442411891928926825,
            6271573312546148160329629673815240458676221818610765478794395550121752710497,
            5958787406588418500595239545974275039455545059833263445973445578199987122248,
            20535751008137662458650892643857854177364093782887716696778361156345824450120,
            13563836234767289570509776815239138700227815546336980653685219619269419222465,
            4275129684793209100908617629232873490659349646726316579174764020734442970715,
            3580683066894261344342868744595701371983032382764484483883828834921866692509,
            18524760469487540272086982072248352918977679699605098074565248706868593560314,
            2154427024935329939176171989152776024124432978019445096214692532430076957041,
            1816241298058861911502288220962217652587610581887494755882131860274208736174,
            3639172054127297921474498814936207970655189294143443965871382146718894049550,
            18153584759852955321993060909315686508515263790058719796143606868729795593935,
            5176949692172562547530994773011440485202239217591064534480919561343940681001,
            11782448596564923920273443067279224661023825032511758933679941945201390953176,
            15115414180166661582657433168409397583403678199440414913931998371087153331677,
            16103312053732777198770385592612569441925896554538398460782269366791789650450,
            15634573854256261552526691928934487981718036067957117047207941471691510256035,
            13522014300368527857124448028007017231620180728959917395934408529470498717410,
            8849597151384761754662432349647792181832839105149516511288109154560963346222,
            17637772869292411350162712206160621391799277598172371975548617963057997942415,
            17865442088336706777255824955874511043418354156735081989302076911109600783679,
            9625567289404330771610619170659567384620399410607101202415837683782273761636,
            19373814649267709158886884269995697909895888146244662021464982318704042596931,
            7390138716282455928406931122298680964008854655730225979945397780138931089133,
            15569307001644077118414951158570484655582938985123060674676216828593082531204,
            5574029269435346901610253460831153754705524733306961972891617297155450271275,
            19413618616187267723274700502268217266196958882113475472385469940329254284367,
            4150841881477820062321117353525461148695942145446006780376429869296310489891,
            13006218950937475527552755960714370451146844872354184015492231133933291271706,
            2756817265436308373152970980469407708639447434621224209076647801443201833641,
            20753332016692298037070725519498706856018536650957009186217190802393636394798,
            18677353525295848510782679969108302659301585542508993181681541803916576179951,
            14183023947711168902945925525637889799656706942453336661550553836881551350544,
            9918129980499720075312297335985446199040718987227835782934042132813716932162,
            13387158171306569181335774436711419178064369889548869994718755907103728849628,
            6746289764529063117757275978151137209280572017166985325039920625187571527186,
            17386594504742987867709199123940407114622143705013582123660965311449576087929,
            11393356614877405198783044711998043631351342484007264997044462092350229714918,
            16257260290674454725761605597495173678803471245971702030005143987297548407836,
            3673082978401597800140653084819666873666278094336864183112751111018951461681
        ];
    }
}
