import type { SignerWithAddress } from '@nomiclabs/hardhat-ethers/dist/src/signer-with-address';
import { shuffleEncryptV2Plaintext } from '@p0x-labs/poseidon-zk-proof/src/shuffle/plaintext';
import { generateDecryptProof, generateShuffleEncryptProof, generateShuffleEncryptV2Proof } from '@p0x-labs/poseidon-zk-proof/src/shuffle/proof';
import { initDeck, keyGen, sampleFieldElements, samplePermutation, compressDeck, recoverDeck, string2Bigint, assert } from '@p0x-labs/poseidon-zk-proof/src/shuffle/utilities';
import { ethers } from 'hardhat';
import { resolve } from 'path';
import { readFileSync } from 'fs';
const buildBabyjub = require('circomlibjs').buildBabyjub;
const snarkjs = require('snarkjs');

describe('Shuffle encrypt unit tests', function () {
  const numBits = BigInt(251);
  const numCards = BigInt(52);
  const numProfiling = 10;

  before(async function () {
    const signers: SignerWithAddress[] = await ethers.getSigners();
    const admin = signers[0];
    this.signers = signers;
    this.admin = admin;
  });

  it('Benchmark Shuffle Encrypt V1', async function () {
    const babyjub = await buildBabyjub();
    const keysAlice = keyGen(babyjub, numBits);
    const pk = [babyjub.F.toString(keysAlice.pk[0]), babyjub.F.toString(keysAlice.pk[1])];

    const shuffleEncryptWasmFile = resolve(__dirname, '../wasm/shuffle_encrypt.wasm');
    const shuffleEncryptZkeyFile = resolve(__dirname, '../zkey/shuffle_encrypt.zkey');
    const shuffleEncryptVkey = await snarkjs.zKey.exportVerificationKey(new Uint8Array(Buffer.from(readFileSync(shuffleEncryptZkeyFile))));

    let A = samplePermutation(Number(numCards));
    const X: bigint[] = initDeck(babyjub, Number(numCards));
    let R = sampleFieldElements(babyjub, numBits, numCards);
    let shuffleEncryptOutput = await generateShuffleEncryptProof(A, X, R, pk, shuffleEncryptWasmFile, shuffleEncryptZkeyFile);

    let start = new Date().getTime();
    for (let i = 0; i < numProfiling; i++) {
      await generateShuffleEncryptProof(A, X, R, pk, shuffleEncryptWasmFile, shuffleEncryptZkeyFile);
    }
    let elapsed = new Date().getTime() - start;
    console.log("Shuffle Encrypt V1 Proof Generation Latency:", elapsed / (1000 * numProfiling), "seconds");

    assert(await snarkjs.groth16.verify(shuffleEncryptVkey, shuffleEncryptOutput.publicSignals, shuffleEncryptOutput.proof), 'Off-chain verification failed.');
    start = new Date().getTime();
    for (let i = 0; i < numProfiling; i++) {
      await snarkjs.groth16.verify(shuffleEncryptVkey, shuffleEncryptOutput.publicSignals, shuffleEncryptOutput.proof);
    }
    elapsed = new Date().getTime() - start;
    console.log("Shuffle Encrypt V1 Proof Verification Latency:", elapsed / (1000 * numProfiling), "seconds");
  });

  it('Benchmark Shuffle Encrypt V2', async function () {
    const babyjub = await buildBabyjub();
    const keysAlice = keyGen(babyjub, numBits);
    const pk = keysAlice.pk;
    const pkString = [babyjub.F.toString(keysAlice.pk[0]), babyjub.F.toString(keysAlice.pk[1])];

    const shuffleEncryptV2WasmFile = resolve(__dirname, '../wasm/shuffle_encrypt_v2.wasm');
    const shuffleEncryptV2ZkeyFile = resolve(__dirname, '../zkey/shuffle_encrypt_v2.zkey');
    const shuffleEncryptV2Vkey = await snarkjs.zKey.exportVerificationKey(new Uint8Array(Buffer.from(readFileSync(shuffleEncryptV2ZkeyFile))));

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

    let A = samplePermutation(Number(numCards));
    let R = sampleFieldElements(babyjub, numBits, numCards);
    let deckDelta = recoverDeck(babyjub, deck.X0, deck.X1);
    let plaintext_output = shuffleEncryptV2Plaintext(
      babyjub, Number(numCards), A, R, pk,
      deck.X0, deck.X1,
      deckDelta.Delta0, deckDelta.Delta1,
      deck.selector,
    );
    let shuffleEncryptV2Output = await generateShuffleEncryptV2Proof(
      pkString, A, R,
      deck.X0, deck.X1,
      deckDelta.Delta0, deckDelta.Delta1,
      deck.selector,
      plaintext_output.X0, plaintext_output.X1,
      plaintext_output.delta0, plaintext_output.delta1,
      plaintext_output.selector,
      shuffleEncryptV2WasmFile, shuffleEncryptV2ZkeyFile,
    );
    assert(await snarkjs.groth16.verify(shuffleEncryptV2Vkey, shuffleEncryptV2Output.publicSignals, shuffleEncryptV2Output.proof), 'Off-chain verification failed.');

    let start = new Date().getTime();
    for (let i = 0; i < numProfiling; i++) {
      await generateShuffleEncryptV2Proof(
        pkString, A, R,
        deck.X0, deck.X1,
        deckDelta.Delta0, deckDelta.Delta1,
        deck.selector,
        plaintext_output.X0, plaintext_output.X1,
        plaintext_output.delta0, plaintext_output.delta1,
        plaintext_output.selector,
        shuffleEncryptV2WasmFile, shuffleEncryptV2ZkeyFile,
      );
    }
    let elapsed = new Date().getTime() - start;
    console.log("Shuffle Encrypt V2 Proof Generation Latency:", elapsed / (1000 * numProfiling), "seconds");

    start = new Date().getTime();
    for (let i = 0; i < numProfiling; i++) {
      await snarkjs.groth16.verify(shuffleEncryptV2Vkey, shuffleEncryptV2Output.publicSignals, shuffleEncryptV2Output.proof);
    }
    elapsed = new Date().getTime() - start;
    console.log("Shuffle Encrypt V2 Proof Verification Latency:", elapsed / (1000 * numProfiling), "seconds");
  });

  it('Benchmark Decrypt', async function () {
    const babyjub = await buildBabyjub();
    const keysAlice = keyGen(babyjub, numBits);
    const pk = [babyjub.F.toString(keysAlice.pk[0]), babyjub.F.toString(keysAlice.pk[1])];

    const shuffleEncryptWasmFile = resolve(__dirname, '../wasm/shuffle_encrypt.wasm');
    const shuffleEncryptZkeyFile = resolve(__dirname, '../zkey/shuffle_encrypt.zkey');
    const shuffleEncryptVkey = await snarkjs.zKey.exportVerificationKey(new Uint8Array(Buffer.from(readFileSync(shuffleEncryptZkeyFile))));

    const decryptWasmFile = resolve(__dirname, '../wasm/decrypt.wasm');
    const decryptZkeyFile = resolve(__dirname, '../zkey/decrypt.zkey');
    const decryptVkey = await snarkjs.zKey.exportVerificationKey(new Uint8Array(Buffer.from(readFileSync(decryptZkeyFile))));

    let A = samplePermutation(Number(numCards));
    const X: bigint[] = initDeck(babyjub, Number(numCards));
    let R = sampleFieldElements(babyjub, numBits, numCards);
    let shuffleEncryptOutput = await generateShuffleEncryptProof(A, X, R, pk, shuffleEncryptWasmFile, shuffleEncryptZkeyFile);
    assert(await snarkjs.groth16.verify(shuffleEncryptVkey, shuffleEncryptOutput.publicSignals, shuffleEncryptOutput.proof), 'Off-chain verification failed.');
    let shuffleEncryptedDecks = shuffleEncryptOutput.publicSignals.slice(0, 208);
    let Y: bigint[] = []
    for (let j = 0; j < 4; j++) {
      Y.push(BigInt(shuffleEncryptedDecks[j * Number(numCards)]));
    }
    let decryptProof = await generateDecryptProof(Y, keysAlice.sk, pk, decryptWasmFile, decryptZkeyFile);
    assert(await snarkjs.groth16.verify(decryptVkey, decryptProof.publicSignals, decryptProof.proof), 'Off-chain verification failed.');

    let start = new Date().getTime();
    for (let i = 0; i < numProfiling; i++) {
      await generateDecryptProof(Y, keysAlice.sk, pk, decryptWasmFile, decryptZkeyFile);
    }
    let elapsed = new Date().getTime() - start;
    console.log("Decrypt V1 Proof Generation Latency:", elapsed / (1000 * numProfiling), "seconds");

    start = new Date().getTime();
    for (let i = 0; i < numProfiling; i++) {
      await snarkjs.groth16.verify(decryptVkey, decryptProof.publicSignals, decryptProof.proof);
    }
    elapsed = new Date().getTime() - start;
    console.log("Decrypt V1 Proof Verification Latency:", elapsed / (1000 * numProfiling), "seconds");
  });
});
