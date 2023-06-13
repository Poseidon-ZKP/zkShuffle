import type { SignerWithAddress } from '@nomiclabs/hardhat-ethers/dist/src/signer-with-address';
import { shuffleEncryptV2Plaintext } from '@zk-shuffle/proof/src/shuffle/plaintext';
import { generateDecryptProof, generateShuffleEncryptV2Proof } from '@zk-shuffle/proof/src/shuffle/proof';
import { initDeck, keyGen, sampleFieldElements, samplePermutation, compressDeck, recoverDeck, string2Bigint, assert } from '@zk-shuffle/proof/src/shuffle/utilities';
import { ethers } from 'hardhat';
import { resolve } from 'path';
import { readFileSync } from 'fs';
import { dnld_aws, P0X_DIR } from '../utils/utils';
const buildBabyjub = require('circomlibjs').buildBabyjub;
const snarkjs = require('snarkjs');

describe('Shuffle Prod encrypt/decrypt benchmark tests', function () {
  const numBits = BigInt(251);
  const numCards = BigInt(52);
  const numProfiling = 3;

  before(async function () {
    const signers: SignerWithAddress[] = await ethers.getSigners();
    const admin = signers[0];
    this.signers = signers;
    this.admin = admin;
    await Promise.all(
      [
          'wasm/decrypt.wasm',
          'zkey/decrypt.zkey',
          'wasm/encrypt.wasm',
          'zkey/encrypt.zkey'
      ].map(async (e) => {
          await dnld_aws(e)
      })
  )
  });

  it('Benchmark Shuffle Encrypt/Decrypt', async function () {
    const babyjub = await buildBabyjub();
    const keysAlice = keyGen(babyjub, numBits);
    const pk = keysAlice.pk;
    const pkString = [babyjub.F.toString(keysAlice.pk[0]), babyjub.F.toString(keysAlice.pk[1])];

    const encryptWasmFile = resolve(P0X_DIR, './wasm/encrypt.wasm')
    const encryptZkeyFile = resolve(P0X_DIR, './zkey/encrypt.zkey')
    const encryptVkey = await snarkjs.zKey.exportVerificationKey(new Uint8Array(Buffer.from(readFileSync(encryptZkeyFile))));

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
    let shuffleEncryptOutput = await generateShuffleEncryptV2Proof(
      pkString, A, R,
      deck.X0, deck.X1,
      deckDelta.Delta0, deckDelta.Delta1,
      deck.selector,
      plaintext_output.X0, plaintext_output.X1,
      plaintext_output.delta0, plaintext_output.delta1,
      plaintext_output.selector,
      encryptWasmFile, encryptZkeyFile,
    );
    assert(await snarkjs.groth16.verify(encryptVkey, shuffleEncryptOutput.publicSignals, shuffleEncryptOutput.proof), 'Off-chain verification failed.');

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
        encryptWasmFile, encryptZkeyFile,
      );
    }
    let elapsed = new Date().getTime() - start;
    console.log("Shuffle Encrypt V2 Proof Generation Latency:", elapsed / (1000 * numProfiling), "seconds");

    start = new Date().getTime();
    for (let i = 0; i < numProfiling; i++) {
      await snarkjs.groth16.verify(encryptVkey, shuffleEncryptOutput.publicSignals, shuffleEncryptOutput.proof);
    }
    elapsed = new Date().getTime() - start;
    console.log("Shuffle Encrypt V2 Proof Verification Latency:", elapsed / (1000 * numProfiling), "seconds");

    const decryptWasmFile = resolve(P0X_DIR, './wasm/decrypt.wasm')
    const decryptZkeyFile = resolve(P0X_DIR, './zkey/decrypt.zkey')
    const decryptVkey = await snarkjs.zKey.exportVerificationKey(new Uint8Array(Buffer.from(readFileSync(decryptZkeyFile))));

    let shuffleEncryptedDecks = shuffleEncryptOutput.publicSignals.slice(0, Number(numCards) * 4);
    let Y: bigint[] = []
    for (let j = 0; j < 4; j++) {
      Y.push(BigInt(shuffleEncryptedDecks[j * Number(numCards)]));
    }
    let decryptProof = await generateDecryptProof(Y, keysAlice.sk, pkString, decryptWasmFile, decryptZkeyFile);
    assert(await snarkjs.groth16.verify(decryptVkey, decryptProof.publicSignals, decryptProof.proof), 'Off-chain verification failed.');

    start = new Date().getTime();
    for (let i = 0; i < numProfiling; i++) {
      await generateDecryptProof(Y, keysAlice.sk, pkString, decryptWasmFile, decryptZkeyFile);
    }
    elapsed = new Date().getTime() - start;
    console.log("Decrypt V1 Proof Generation Latency:", elapsed / (1000 * numProfiling), "seconds");

    start = new Date().getTime();
    for (let i = 0; i < numProfiling; i++) {
      await snarkjs.groth16.verify(decryptVkey, decryptProof.publicSignals, decryptProof.proof);
    }
    elapsed = new Date().getTime() - start;
    console.log("Decrypt V1 Proof Verification Latency:", elapsed / (1000 * numProfiling), "seconds");
  });
});
