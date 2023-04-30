// SPDX-License-Identifier: GPL-3.0

pragma solidity >=0.8.2 <0.9.0;

import "./BitMaps.sol";

// currently, we support 30 card deck and 52 card deck
enum DeckConfig {
    Deck30Card,
    Deck52Card
}

// Deck of cards
//
// Suppose that we have n cards in the deck, for each card,
// we have two points on BabyJubJub (x_{i,0}, y_{i,0}),
// (x_{i,1}, y_{i,1}). We use a compressed representation of these points
// (x_{i,0}, c_{i, 0}), (x_{i,1}, c_{i, 1}), where c_{i, j} is a
// boolean flag to represent the sign instead of a y coordinate.
//
// We compress the selector to a bitmap and packed the bitmap into two uint256,
// which means the deck can at most support 253 cards.
struct Deck {
    // config
    DeckConfig config;
    // x0 of cards
    uint256[] X0;
    // x1 of cards
    uint256[] X1;
    // y0 of cards
    uint256[] Y0;
    // y1 of cards
    uint256[] Y1;
    // 2 selectors for recovering y coordinates
    BitMaps.BitMap256 selector0;
    BitMaps.BitMap256 selector1;
    // deal record
    // for example, decryptRecord[0] = 10000... means that
    // the first card has been dealt to the player 0
    mapping(uint256 => BitMaps.BitMap256) decryptRecord;
    // set of cards to be dealed
    BitMaps.BitMap256 cardsToDeal;
    // player to deal the cards
    uint256 playerToDeal;
}

// Compressed representation of the Deck
struct CompressedDeck {
    // config
    DeckConfig config;
    // X0 of cards
    uint256[] X0;
    // X1 of cards
    uint256[] X1;
    // 2 selectors of recovering y coordinates
    BitMaps.BitMap256 selector0;
    BitMaps.BitMap256 selector1;
}

struct Card {
    uint256 X;
    uint256 Y;
}

struct DecryptProof {
    uint256[2] A;
    uint256[2][2] B;
    uint256[2] C;
    uint256[8] PI;
}

interface IShuffleEncryptVerifier {
    function verifyProof(
        uint256[2] memory a,
        uint256[2][2] memory b,
        uint256[2] memory c,
        uint256[] memory input
    ) external view;
}

interface IDecryptVerifier {
    function verifyProof(
        uint256[2] memory a,
        uint256[2][2] memory b,
        uint256[2] memory c,
        uint256[8] memory input
    ) external view;
}

library zkShuffleCrypto {
    function deckSize(DeckConfig config) internal pure returns (uint256 size) {
        if (config == DeckConfig.Deck30Card) {
            size = 30;
        } else {
            size = 52;
        }
    }

    modifier checkDeck(CompressedDeck memory deck) {
        require(deckSize(deck.config) == deck.X0.length, "wrong X0 length");
        require(deckSize(deck.config) == deck.X0.length, "wrong X0 length");
        _;
    }

    function getCompressedDeck(Deck storage deck)
        external
        view
        returns (CompressedDeck memory compDeck)
    {
        compDeck.config = deck.config;
        compDeck.X0 = deck.X0;
        compDeck.X1 = deck.X1;
        compDeck.selector0 = deck.selector0;
        compDeck.selector1 = deck.selector1;
    }

    function setDeckUnsafe(
        CompressedDeck memory compDeck,
        Deck storage deck
    ) external {
        if (compDeck.config != deck.config) {
            deck.config = compDeck.config;
        }
        deck.X0 = compDeck.X0;
        deck.X1 = compDeck.X1;
        deck.selector0 = compDeck.selector0;
        deck.selector1 = compDeck.selector1;
    }

    function shuffleEncPublicInput(
        CompressedDeck memory encDeck,
        CompressedDeck memory oldDeck,
        uint256 nonce,
        uint256 aggPkX,
        uint256 aggPkY
    )
        public
        pure
        checkDeck(encDeck)
        checkDeck(oldDeck)
        returns (uint256[] memory)
    {
        require(encDeck.config == oldDeck.config, "Deck config inconsistent");
        uint256 _deckSize = deckSize(encDeck.config);
        uint256[] memory input = new uint256[](7 + _deckSize * 4);
        input[0] = nonce;
        input[1] = aggPkX;
        input[2] = aggPkY;
        for (uint256 i = 0; i < _deckSize; i++) {
            input[i + 3] = oldDeck.X0[i];
            input[i + 3 + _deckSize] = oldDeck.X1[i];
            input[i + 3 + _deckSize * 2] = encDeck.X0[i];
            input[i + 3 + _deckSize * 3] = encDeck.X1[i];
        }
        input[3 + 4 * _deckSize] = oldDeck.selector0._data;
        input[4 + 4 * _deckSize] = oldDeck.selector1._data;
        input[5 + 4 * _deckSize] = encDeck.selector0._data;
        input[6 + 4 * _deckSize] = encDeck.selector1._data;
        return input;
    }

    function initDeck(Deck storage deck) external {
        // data blob: 52 X-coordinate of BabyJubJub
        uint256[52] memory INIT_X1 = [
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
        for(uint256 i = 0; i < deckSize(deck.config); i++) {
            deck.X0[i] = 0;
            deck.X1[i] = INIT_X1[i];
        }
        deck.selector0 = 4503599627370495 >> (52 - deckSize(deck.config));
        deck.selector1 = 3075935501959818 >> (52 - deckSize(deck.config));
    }
}
