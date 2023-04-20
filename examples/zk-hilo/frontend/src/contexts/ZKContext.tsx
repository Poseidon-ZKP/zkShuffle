// some snarkjs shuffle helpers
import { BigNumber, BigNumberish } from 'ethers';
// @ts-ignore
import { createContext, ReactNode, useCallback, useState } from 'react';
import { useResourceContext } from '../hooks/useResourceContext';
// import { useResourceContext } from '../hooks/useResourceContext';

import {
  bignumberish2Bigint,
  compressDeck,
  initDeck,
  prepareDecryptData,
  recoverDeck,
  sampleFieldElements,
  samplePermutation,
} from '../utils/utilities';
// import { ShuffleProofStruct, DecryptProofStruct } from './GameContractContext/types/Verifier';
import { shuffleEncryptV2Plaintext } from '../utils/plaintext';
import { DecryptProofStruct, ShuffleProofStruct } from './types/Verifier';
import {
  FullProof,
  generateDecryptProof,
  generateShuffleEncryptV2Proof,
  packToSolidityProof,
  SolidityProof,
} from '@poseidon-zkp/poseidon-zk-proof/dist/src/shuffle/proof';
import {
  prepareShuffleDeck,
  string2Bigint,
} from '@poseidon-zkp/poseidon-zk-proof/dist/src/shuffle/utilities';

export const CARD_NUMBER = 52;
export const BITS = 251;

const numCards = BigInt(CARD_NUMBER);
const numBits = BigInt(BITS);

export type ZKContextStateType = {
  generatingProof: boolean;
  genShuffleProof: (aggregatedPk: any, deck: any) => Promise<any>;
  genDecryptProofLocally: (
    isFirstDecrypt: boolean,
    cardIndex: number,
    lastDecryptProof: DecryptProofStruct | null,
    shuffledDeck: BigNumber[] | null
  ) => Promise<FullProof | null>;
  genDecryptProof: (
    isFirstDecrypt: boolean,
    cardIndex: number,
    lastDecryptProof: DecryptProofStruct | null,
    shuffledDeck: BigNumber[] | null
  ) => Promise<DecryptProofStruct | null>;
};

function combineShuffleData(signals: string[], numCards: number): bigint[] {
  const nonce = [BigInt(signals[0])];
  const shuffledX0 = string2Bigint(
    signals.slice(2 * numCards + 3, 3 * numCards + 3)
  );
  const shuffledX1 = string2Bigint(
    signals.slice(3 * numCards + 3, 4 * numCards + 3)
  );
  const selector = string2Bigint(
    signals.slice(4 * numCards + 5, 4 * numCards + 7)
  );

  return nonce.concat(shuffledX0).concat(shuffledX1).concat(selector);
}

export const ZKContext = createContext<ZKContextStateType | null>(null);

export const ZKContextProvider = ({ children }: { children: ReactNode }) => {
  const resourceContext = useResourceContext();
  if (!resourceContext) {
    throw new Error('resource context is not ready');
  }

  const [generatingProof, setGeneratingProof] = useState(false);

  const {
    babyjub,
    aggregatedKey,
    aggregateECKey,
    shuffleEncryptWasmData,
    shuffleEncryptZkeyData,
    decryptWasmData,
    decryptZkeyData,
    myKey,
  } = resourceContext;

  // this first shuffle is responsible for initin deck
  const genShuffleProof = useCallback(
    async (aggregatedPk: any, deck: any) => {
      if (
        !babyjub ||
        !aggregatedKey ||
        !aggregateECKey ||
        !shuffleEncryptWasmData ||
        !shuffleEncryptZkeyData
      ) {
        console.warn(`genShuffleProof not prepared`);
        return null;
      }
      setGeneratingProof(true);
      let A = samplePermutation(Number(numCards));
      let R = sampleFieldElements(babyjub, numBits, numCards);
      let aggregatedPkEC = [
        babyjub.F.e(aggregatedPk[0]),
        babyjub.F.e(aggregatedPk[1]),
      ];
      let preprocessedDeck = prepareShuffleDeck(
        babyjub,
        deck,
        Number(numCards)
      );
      let plaintext_output = shuffleEncryptV2Plaintext(
        babyjub,
        Number(numCards),
        A,
        R,
        aggregatedPkEC,
        preprocessedDeck.X0,
        preprocessedDeck.X1,
        preprocessedDeck.Delta[0],
        preprocessedDeck.Delta[1],
        preprocessedDeck.Selector
      );

      try {
        let shuffleEncryptOutput = await generateShuffleEncryptV2Proof(
          aggregatedPk,
          A,
          R,
          preprocessedDeck.X0,
          preprocessedDeck.X1,
          preprocessedDeck.Delta[0],
          preprocessedDeck.Delta[1],
          preprocessedDeck.Selector,
          plaintext_output.X0,
          plaintext_output.X1,
          plaintext_output.delta0,
          plaintext_output.delta1,
          plaintext_output.selector,
          shuffleEncryptWasmData,
          shuffleEncryptZkeyData
        );
        let solidityProof: SolidityProof = packToSolidityProof(
          shuffleEncryptOutput.proof
        );
        const comData = combineShuffleData(
          shuffleEncryptOutput.publicSignals,
          Number(numCards)
        );
        setGeneratingProof(false);

        return [solidityProof, comData];
      } catch (e) {
        console.error(`shuffle error: `, e);
        setGeneratingProof(false);
        return null;
      }
    },
    [
      aggregateECKey,
      aggregatedKey,
      babyjub,
      shuffleEncryptWasmData,
      shuffleEncryptZkeyData,
    ]
  );

  // generate non-solidity proof
  // isFirstDecrypt: is the first one for decrypting the card of cardIndex
  // cardIndex: which card is to be decrypted
  // shuffledDeck: the latest shuffled deck
  const genDecryptProofLocally = useCallback(
    async (
      isFirstDecrypt: boolean,
      cardIndex: number,
      lastDecryptProof: DecryptProofStruct | null,
      shuffledDeck: BigNumber[] | null
    ) => {
      if (!myKey || !decryptWasmData || !decryptZkeyData) {
        return null;
      }
      try {
        setGeneratingProof(true);
        // Y: the input for generating proofs
        let Y: bigint[] = [];
        // if it's the first time to decrypt for this card index, there is no stored dec proof
        // we need to generate one which will be double verified in contract side
        if (isFirstDecrypt) {
          if (!shuffledDeck) {
            throw new Error('must provide latest shuffle deck');
          }
          const X0 = shuffledDeck.slice(107, 159);
          const X1 = shuffledDeck.slice(159, 211);
          const selector = shuffledDeck.slice(213, 215);
          Y = prepareDecryptData(
            babyjub,
            BigNumber.from(X0[cardIndex]),
            BigNumber.from(X1[cardIndex]),
            BigNumber.from(selector[0]),
            BigNumber.from(selector[1]),
            Number(numCards),
            cardIndex
          );
        } else {
          if (!lastDecryptProof) {
            throw new Error('must provide latest decrypt proof');
          }
          const inputs = bignumberish2Bigint(
            lastDecryptProof.inputs.map((i) => i.toString())
          );
          Y = [inputs[2], inputs[3], inputs[0], inputs[1]];
        }

        // generate!
        const proof = await generateDecryptProof(
          Y,
          myKey.sk,
          myKey.pk,
          decryptWasmData,
          decryptZkeyData
        );
        return proof;
      } catch (e) {
        // might be multiple types of internal errors
        console.error(`decrypt error: `, e);
        setGeneratingProof(false);
        return null;
      }
    },
    [babyjub, decryptWasmData, decryptZkeyData, myKey]
  );

  const genDecryptProof = useCallback(
    async (
      isFirstDecrypt: boolean,
      cardIndex: number,
      lastDecryptProof: DecryptProofStruct | null,
      shuffledDeck: BigNumber[] | null
    ) => {
      const decryptProof = await genDecryptProofLocally(
        isFirstDecrypt,
        cardIndex,
        lastDecryptProof,
        shuffledDeck
      );
      if (!decryptProof) {
        console.error(`locally decrypt error`);
        return decryptProof;
      }
      let solidityProof: SolidityProof = packToSolidityProof(
        decryptProof.proof
      );
      return {
        a: [solidityProof[0], solidityProof[1]],
        b: [
          [solidityProof[2], solidityProof[3]],
          [solidityProof[4], solidityProof[5]],
        ] as [BigNumberish[], BigNumberish[]],
        c: [solidityProof[6], solidityProof[7]],
        inputs: decryptProof.publicSignals,
      } as DecryptProofStruct;
    },
    [genDecryptProofLocally]
  );

  const state = {
    generatingProof,
    genShuffleProof,
    genDecryptProof,
    genDecryptProofLocally,
  };
  return <ZKContext.Provider value={state}>{children}</ZKContext.Provider>;
};
