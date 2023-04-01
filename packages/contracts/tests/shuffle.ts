import { assert } from 'chai';
import { readFileSync } from 'fs';
import { ethers } from 'hardhat';
import { resolve } from 'path';
import { generateDecryptProof, generateShuffleEncryptProof, generateShuffleEncryptV2Proof, packToSolidityProof, SolidityProof, FullProof, shuffle, deal } from '@poseidon-zkp/poseidon-zk-proof/src/shuffle/proof';
import { convertPk, initDeck, keyGen, keyAggregate, sampleFieldElements, samplePermutation, searchDeck, compressDeck, recoverDeck, string2Bigint, prepareDecryptData } from '@poseidon-zkp/poseidon-zk-proof/src/shuffle/utilities';
import { shuffleEncryptPlaintext, shuffleEncryptV2Plaintext } from '@poseidon-zkp/poseidon-zk-proof/src/shuffle/plaintext';
import { DecryptVerifier } from 'types/@poseidon-zkp/poseidon-zk-circuits/contracts/decrypt_verifier.sol';
import { BigNumber } from 'ethers';
const buildBabyjub = require('circomlibjs').buildBabyjub;
const snarkjs = require('snarkjs');
const fs = require('fs');
const path = require('path');
const https = require('https')

const HOME_DIR = require('os').homedir();
const P0X_DIR = resolve(HOME_DIR, "./.poseidon-zkp")
const P0X_AWS_URL = "https://p0x-labs.s3.amazonaws.com/refactor/"
async function dnld_aws(file_name : string) {
    fs.mkdir(P0X_DIR, () => {})
    fs.mkdir(resolve(P0X_DIR, './wasm'), () => {})
    fs.mkdir(resolve(P0X_DIR, './zkey'), () => {})
    return new Promise((reslv, reject) => {
        if (!fs.existsSync(resolve(P0X_DIR, file_name))) {
            const file = fs.createWriteStream(resolve(P0X_DIR, file_name))
            https.get(P0X_AWS_URL + file_name, (resp) => {
                file.on("finish", () => {
                    file.close();
                    reslv(0)
                });
                resp.pipe(file)
            });
        } else {
            reslv(0)
        }
    });
}
const resourceBasePath = P0X_DIR;

// Deploys contract for shuffle encrypt v1.
async function deployShuffleEncrypt() {
    const vk0 = await (await ethers.getContractFactory('ShuffleEncryptVerifierKey0')).deploy();
    const vk1 = await (await ethers.getContractFactory('ShuffleEncryptVerifierKey1')).deploy();
    return await (await ethers.getContractFactory('Shuffle_encryptVerifier', {
        libraries: {
            ShuffleEncryptVerifierKey0: vk0.address,
            ShuffleEncryptVerifierKey1: vk1.address,
        }
    })).deploy();
}

// Depploys contract for decryption.
async function deployDecrypt() {
    return <DecryptVerifier>await (await ethers.getContractFactory('DecryptVerifier')).deploy();
}

// Deploys contract for shuffle encrypt v2.
async function deployShuffleEncryptV2() {
    const vk = await (await ethers.getContractFactory('ShuffleEncryptV2VerifierKey')).deploy();
    return await (await ethers.getContractFactory('Shuffle_encrypt_v2Verifier', {
        libraries: {
            ShuffleEncryptV2VerifierKey: vk.address,
        }
    })).deploy();
}

// Deploys contract for shuffle state machine.
async function deployStateMachine(numPlayers: bigint) {
    const shuffle_encrypt_v2_verifier_contract = await deployShuffleEncryptV2();
    const decrypt_verifier_contract = await deployDecrypt();
    return await (await ethers.getContractFactory('Shuffle')).deploy(
        shuffle_encrypt_v2_verifier_contract.address,
        decrypt_verifier_contract.address,
        numPlayers,
    );
}

describe('Shuffle test', function () {
    const NumCard2Deal = 5;
    const numPlayers = 9;
    beforeEach(async () => {
        await Promise.all(['wasm/shuffle_encrypt.wasm', 'wasm/decrypt.wasm', 'zkey/shuffle_encrypt.zkey', 'zkey/decrypt.zkey', 'wasm/shuffle_encrypt_v2.wasm', 'zkey/shuffle_encrypt_v2.zkey'].map(
            async (e) => {
                await dnld_aws(e)
            }
        ));
    });

    it('Shuffle contract can function normally', async () => {
        // Load metadata.
        const shuffleEncryptWasmFile = resolve(resourceBasePath, './wasm/shuffle_encrypt.wasm');
        const shuffleEncryptZkeyFile = resolve(resourceBasePath, './zkey/shuffle_encrypt.zkey');
        const shuffleEncryptVkey = await snarkjs.zKey.exportVerificationKey(new Uint8Array(Buffer.from(readFileSync(shuffleEncryptZkeyFile))));

        const decryptWasmFile = resolve(resourceBasePath, './wasm/decrypt.wasm');
        const decryptZkeyFile = resolve(resourceBasePath, './zkey/decrypt.zkey');
        const decryptVkey = await snarkjs.zKey.exportVerificationKey(new Uint8Array(Buffer.from(readFileSync(decryptZkeyFile))));

        // Deploy Contracts
        const shuffleEncryptVerifierContract = await deployShuffleEncrypt();
        const decryptVerifierContract = await deployDecrypt();

        const numCards = BigInt(52);
        const numBits = BigInt(251);
        const babyjub = await buildBabyjub();
        // Generates secret/public key for each player. Each player should run this line.
        // keys.pk: uint256 will be sent to smart contract.
        // keys.sk: uint256 will be kept secret by each player.
        const keysAlice = keyGen(babyjub, numBits);
        const keysBob = keyGen(babyjub, numBits);
        const keysCharlie = keyGen(babyjub, numBits);
        // Compute aggregated key for all players. Each player should run this line on their own machine.
        // No need to send this pk to smart contract.
        const aggregatedPkEC = keyAggregate(babyjub, [keysAlice.pk, keysBob.pk, keysCharlie.pk]);
        const aggregatePk = [babyjub.F.toString(aggregatedPkEC[0]), babyjub.F.toString(aggregatedPkEC[1])];
        const skArray = [keysAlice.sk, keysBob.sk, keysCharlie.sk];
        let pkArray = convertPk(babyjub, [keysAlice.pk, keysBob.pk, keysCharlie.pk]);
        // Now shuffle the cards! Each player should run shuffleEncrypt.
        // Output is the shuffled card Y and a proof.
        // Alice's turn!
        let A = samplePermutation(Number(numCards));
        const X: bigint[] = initDeck(babyjub, Number(numCards));
        let R = sampleFieldElements(babyjub, numBits, numCards);
        let shuffleEncryptOutput = await generateShuffleEncryptProof(A, X, R, aggregatePk, shuffleEncryptWasmFile, shuffleEncryptZkeyFile);
        assert(await snarkjs.groth16.verify(shuffleEncryptVkey, shuffleEncryptOutput.publicSignals, shuffleEncryptOutput.proof), 'Off-chain verification failed.');
        let solidityProof: SolidityProof = packToSolidityProof(shuffleEncryptOutput.proof)
        await shuffleEncryptVerifierContract.verifyProof(
            [solidityProof[0], solidityProof[1]],
            [[solidityProof[2], solidityProof[3]], [solidityProof[4], solidityProof[5]]],
            [solidityProof[6], solidityProof[7]],
            shuffleEncryptOutput.publicSignals,
        );
        // In shuffleEncryptOutput.publicSignals, there are 209 uint256 in total.
        // 0~207 are card output after shuffle & encrypt, 208~415 are cards before shuffle & encryption.
        // 416~417 is the aggregatePk.
        const AliceShuffleEncryptDecks = shuffleEncryptOutput.publicSignals.slice(0, 208);
        // Checks if shuffle encrypt in plaintext matches circuits.
        let plaintext_output = shuffleEncryptPlaintext(babyjub, Number(numCards), A, X, R, aggregatedPkEC);
        for (let i = 0; i < 208; i++) {
            assert(BigInt(shuffleEncryptOutput.publicSignals[i]) === plaintext_output[i]);
        }
        console.log('Alice shuffled the card!')

        // Bob's turn!
        A = samplePermutation(Number(numCards));
        R = sampleFieldElements(babyjub, numBits, numCards);
        shuffleEncryptOutput = await generateShuffleEncryptProof(A, string2Bigint(AliceShuffleEncryptDecks), R, aggregatePk, shuffleEncryptWasmFile, shuffleEncryptZkeyFile);
        assert(await snarkjs.groth16.verify(shuffleEncryptVkey, shuffleEncryptOutput.publicSignals, shuffleEncryptOutput.proof), 'Off-chain verification failed.');
        solidityProof = packToSolidityProof(shuffleEncryptOutput.proof)
        await shuffleEncryptVerifierContract.verifyProof(
            [solidityProof[0], solidityProof[1]],
            [[solidityProof[2], solidityProof[3]], [solidityProof[4], solidityProof[5]]],
            [solidityProof[6], solidityProof[7]],
            shuffleEncryptOutput.publicSignals,
        );
        const BobShuffleEncryptDecks = shuffleEncryptOutput.publicSignals.slice(0, 208);
        console.log('Bob shuffled the card!')

        // Charlie's turn!
        A = samplePermutation(Number(numCards));
        R = sampleFieldElements(babyjub, numBits, numCards);
        shuffleEncryptOutput = await generateShuffleEncryptProof(A, string2Bigint(BobShuffleEncryptDecks), R, aggregatePk, shuffleEncryptWasmFile, shuffleEncryptZkeyFile);
        assert(await snarkjs.groth16.verify(shuffleEncryptVkey, shuffleEncryptOutput.publicSignals, shuffleEncryptOutput.proof), 'Off-chain verification failed.');
        solidityProof = packToSolidityProof(shuffleEncryptOutput.proof)
        await shuffleEncryptVerifierContract.verifyProof(
            [solidityProof[0], solidityProof[1]],
            [[solidityProof[2], solidityProof[3]], [solidityProof[4], solidityProof[5]]],
            [solidityProof[6], solidityProof[7]],
            shuffleEncryptOutput.publicSignals,
        );
        const CharlieShuffleEncryptDecks = shuffleEncryptOutput.publicSignals.slice(0, 208);
        console.log('Charlie shuffled the card!')

        /// Decrypts NumCard2Deal cards
        for (let i = 0; i < NumCard2Deal; i++) {
            let Y = []
            for (let j = 0; j < 4; j++) {
                Y.push(CharlieShuffleEncryptDecks[j * Number(numCards) + i]);
            }
            // assign a default proof so the code can compile
            let decryptProof: FullProof = {
                proof: {
                    pi_a: ['0'],
                    pi_b: [['0']],
                    pi_c: ['0'],
                    protocol: '',
                    curve: '',
                },
                publicSignals: ['0']
            };
            for (let j = 0; j < 3; j++) {
                decryptProof = await generateDecryptProof(string2Bigint(Y), skArray[(Number(i) + j) % 3], pkArray[(i + j) % 3], decryptWasmFile, decryptZkeyFile);
                assert(await snarkjs.groth16.verify(decryptVkey, decryptProof.publicSignals, decryptProof.proof), 'Off-chain verification failed.');
                let solidityProof: SolidityProof = packToSolidityProof(decryptProof.proof)
                await decryptVerifierContract.verifyProof(
                    [solidityProof[0], solidityProof[1]],
                    [[solidityProof[2], solidityProof[3]], [solidityProof[4], solidityProof[5]]],
                    [solidityProof[6], solidityProof[7]],
                    decryptProof.publicSignals,
                );
                // publicSignals contain 8 values.
                // 1~2 is the card value, 3~6 is the Y, 7～8 is the personal public key.
                Y = [Y[0], Y[1], decryptProof.publicSignals[0], decryptProof.publicSignals[1]];
            }
            const cardIdx = searchDeck(X, BigNumber.from(decryptProof.publicSignals[0]).toBigInt(), Number(numCards));
            console.log('cardIdx: ', cardIdx);
        }
        console.log('Decrypt Done!!!')
    })

    it('Shuffle contract v2 can function normally', async () => {
        // Load metadata.
        const shuffleEncryptV2WasmFile = resolve(resourceBasePath, './wasm/shuffle_encrypt_v2.wasm');
        const shuffleEncryptV2ZkeyFile = resolve(resourceBasePath, './zkey/shuffle_encrypt_v2.zkey');
        const shuffleEncryptV2Vkey = await snarkjs.zKey.exportVerificationKey(new Uint8Array(Buffer.from(readFileSync(shuffleEncryptV2ZkeyFile))));

        const decryptWasmFile = resolve(resourceBasePath, './wasm/decrypt.wasm');
        const decryptZkeyFile = resolve(resourceBasePath, './zkey/decrypt.zkey');
        const decryptVkey = await snarkjs.zKey.exportVerificationKey(new Uint8Array(Buffer.from(readFileSync(decryptZkeyFile))));

        // Deploy Contracts
        const shuffleEncryptV2VerifierContract = await deployShuffleEncryptV2();
        const decryptVerifierContract = await deployDecrypt();

        const numCards = BigInt(52);
        const numBits = BigInt(251);
        const babyjub = await buildBabyjub();
        // Generates secret/public key for each player. Each player should run this line.
        // keys.pk: uint256 will be sent to smart contract.
        // keys.sk: uint256 will be kept secret by each player.
        const keys = [];
        let pkArray = [];
        const skArray = [];
        for (let i = 0; i < numPlayers; i++) {
            keys.push(keyGen(babyjub, numBits));
            pkArray.push(keys[i].pk);
            skArray.push(keys[i].sk);
        }
        // Compute aggregated key for all players. Each player should run this line on their own machine.
        // No need to send this pk to smart contract.
        const aggregatedPkEC = keyAggregate(babyjub, pkArray);
        const aggregatePk = [babyjub.F.toString(aggregatedPkEC[0]), babyjub.F.toString(aggregatedPkEC[1])];
        pkArray = convertPk(babyjub, pkArray);

        // Initializes deck.
        const initializedDeck: bigint[] = initDeck(babyjub, Number(numCards));
        let compressedDeck = compressDeck(initializedDeck);
        let deck: {
            X0: bigint[],
            X1: bigint[],
            selector: bigint[],
        } = {
            X0: compressedDeck.X0,
            X1: compressedDeck.X1,
            selector: compressedDeck.selector,
        };

        // Now shuffle the cards! Each player should run shuffleEncrypt.
        // Output is the shuffled card Y and a proof.
        for (let i = 0; i < numPlayers; i++) {
            let A = samplePermutation(Number(numCards));
            let R = sampleFieldElements(babyjub, numBits, numCards);
            let deckDelta = recoverDeck(babyjub, deck.X0, deck.X1);
            let plaintext_output = shuffleEncryptV2Plaintext(
                babyjub, Number(numCards), A, R, aggregatedPkEC,
                deck.X0, deck.X1,
                deckDelta.Delta0, deckDelta.Delta1,
                deck.selector,
            );
            let shuffleEncryptV2Output = await generateShuffleEncryptV2Proof(
                aggregatePk, A, R,
                deck.X0, deck.X1,
                deckDelta.Delta0, deckDelta.Delta1,
                deck.selector,
                plaintext_output.X0, plaintext_output.X1,
                plaintext_output.delta0, plaintext_output.delta1,
                plaintext_output.selector,
                shuffleEncryptV2WasmFile, shuffleEncryptV2ZkeyFile,
            );
            assert(await snarkjs.groth16.verify(shuffleEncryptV2Vkey, shuffleEncryptV2Output.publicSignals, shuffleEncryptV2Output.proof), 'Off-chain verification failed.');
            let solidityProof: SolidityProof = packToSolidityProof(shuffleEncryptV2Output.proof);
            await shuffleEncryptV2VerifierContract.verifyProof(
                [solidityProof[0], solidityProof[1]],
                [[solidityProof[2], solidityProof[3]], [solidityProof[4], solidityProof[5]]],
                [solidityProof[6], solidityProof[7]],
                shuffleEncryptV2Output.publicSignals,
            );
            // In shuffleEncryptOutput.publicSignals, there are 215 uint256 in total.
            // 0 is a dummy output, 1~2 is the aggregatedPk, 3~54 is the UX0, 55~106 is the UX1, 107~158 is the VX0, 159~210 is the VX1,
            // 211~212 is the s_u, 213~214 is the s_v.
            deck = {
                X0: string2Bigint(shuffleEncryptV2Output.publicSignals.slice(107, 159)),
                X1: string2Bigint(shuffleEncryptV2Output.publicSignals.slice(159, 211)),
                selector: string2Bigint(shuffleEncryptV2Output.publicSignals.slice(213, 215)),
            };
            console.log('Player' + String(i) + ' shuffled the card!');
        }

        // Decrypts NumCard2Deal cards
        for (let i = 0; i < NumCard2Deal; i++) {
            let Y = prepareDecryptData(
                babyjub,
                BigNumber.from(deck.X0[i]),
                BigNumber.from(deck.X1[i]),
                BigNumber.from(deck.selector[0]),
                BigNumber.from(deck.selector[1]),
                Number(numCards),
                i,
            );
            // assign a default proof so the code can compile
            let decryptProof: FullProof = {
                proof: {
                    pi_a: ['0'],
                    pi_b: [['0']],
                    pi_c: ['0'],
                    protocol: '',
                    curve: '',
                },
                publicSignals: ['0']
            };
            for (let j = 0; j < numPlayers; j++) {
                decryptProof = await generateDecryptProof(Y, skArray[(Number(i) + j) % numPlayers], pkArray[(i + j) % numPlayers], decryptWasmFile, decryptZkeyFile);
                assert(await snarkjs.groth16.verify(decryptVkey, decryptProof.publicSignals, decryptProof.proof), 'Off-chain verification failed.');
                let solidityProof: SolidityProof = packToSolidityProof(decryptProof.proof)
                await decryptVerifierContract.verifyProof(
                    [solidityProof[0], solidityProof[1]],
                    [[solidityProof[2], solidityProof[3]], [solidityProof[4], solidityProof[5]]],
                    [solidityProof[6], solidityProof[7]],
                    decryptProof.publicSignals,
                );
                // decryptProof.publicSignals contain 8 values.
                // 1~2 is the decrypted card value, 3~6 is the Y, 7～8 is the personal public key.
                let signal = string2Bigint(decryptProof.publicSignals);
                Y = [Y[0], Y[1], signal[0], signal[1]];
            }
            const cardIdx = searchDeck(initializedDeck, BigNumber.from(decryptProof.publicSignals[0]).toBigInt(), Number(numCards));
            console.log('cardIdx: ', cardIdx);
        }
        console.log('Decrypt Done!!!');
    })

    it('Shuffle state machine is correct', async () => {
        // Load metadata.
        const shuffleEncryptV2WasmFile = resolve(resourceBasePath, './wasm/shuffle_encrypt_v2.wasm');
        const shuffleEncryptV2ZkeyFile = resolve(resourceBasePath, './zkey/shuffle_encrypt_v2.zkey');
        const decryptWasmFile = resolve(resourceBasePath, './wasm/decrypt.wasm');
        const decryptZkeyFile = resolve(resourceBasePath, './zkey/decrypt.zkey');

        // Deploy Contracts
        const stateMachineContract = await deployStateMachine(BigInt(numPlayers));

        const numCards = BigInt(52);
        const numBits = BigInt(251);
        const babyjub = await buildBabyjub();

        // Generates secret/public key for each player. Each player should run this line.
        // keys.pk: uint256 will be sent to smart contract.
        // keys.sk: uint256 will be kept secret by each player.
        const keys = [];
        let pkArray = [];
        const skArray = [];
        for (let i = 0; i < numPlayers; i++) {
            keys.push(keyGen(babyjub, numBits));
            pkArray.push(keys[i].pk);
            skArray.push(keys[i].sk);
        }
        pkArray = convertPk(babyjub, pkArray);

        // Registers three players
        for (let i = 0; i < numPlayers; i++) {
            await stateMachineContract.register([pkArray[i][0], pkArray[i][1]]);
        }

        // Queries aggregated public key
        const key = await stateMachineContract.queryAggregatedPk();
        const aggregatePk = [key[0].toBigInt(), key[1].toBigInt()];

        // Now shuffle the cards! Each player should run shuffleEncrypt.
        // Output is the shuffled card Y and a proof.
        for (let i = 0; i < numPlayers; i++) {
            let A = samplePermutation(Number(numCards));
            let R = sampleFieldElements(babyjub, numBits, numCards);
            await shuffle(babyjub, A, R, aggregatePk, Number(numCards), stateMachineContract, shuffleEncryptV2WasmFile, shuffleEncryptV2ZkeyFile);
            console.log('Player' + String(i) + ' shuffled the card!');
        }

        const initialDeck: bigint[] = initDeck(babyjub, Number(numCards));

        // Decrypts NumCard2Deal cards
        for (let i = 0; i < NumCard2Deal; i++) {
            let flag: boolean;
            let card: bigint[];
            for (let j = 0; j < numPlayers; j++) {
                let curPlayerIdx = (Number(i) + j) % numPlayers;
                if (j === 0) flag = true;
                else flag = false;
                card = await deal(
                    babyjub,
                    Number(numCards),
                    i,
                    curPlayerIdx,
                    skArray[curPlayerIdx],
                    pkArray[curPlayerIdx],
                    stateMachineContract,
                    decryptWasmFile,
                    decryptZkeyFile,
                    flag,
                );
                if (j === numPlayers - 1) {
                    const cardIdx = searchDeck(initialDeck, card[0], Number(numCards));
                    console.log('cardIdx: ', cardIdx);
                }
            }
        }
        console.log('Decrypt Done!!!');
    })
});
