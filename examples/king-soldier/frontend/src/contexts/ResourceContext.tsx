// @ts-ignore
import { buildBabyjub } from 'circomlibjs';
import { createContext, ReactNode, useCallback, useState } from 'react';
// import { keyAggregate, keyGen } from '../utils/utilities';
// import { getLocalKey, setLocalPK } from '../utils/store';
import { get, set } from 'idb-keyval';
import {
  keyAggregate,
  keyGen,
} from '@poseidon-zkp/poseidon-zk-proof/dist/src/shuffle/utilities';
import { getLocalKey, setLocalPK } from '../utils/store';

const numBits = BigInt(251);

export type RESOURCE_TYPE = 'shuffle_encrypt_v2' | 'decrypt';
export type FILE_TYPE = 'wasm' | 'zkey';
export type PublicKey = string[]; // should be 2 Uint8Arrays in 32 length
export type Keys = { g: PublicKey; sk: string | string[]; pk: PublicKey };

export function getResourcePath(resType: RESOURCE_TYPE, fileType: FILE_TYPE) {
  return `https://p0x-labs.s3.amazonaws.com/${fileType}/${resType}.${fileType}`;
}

const shuffleEncryptZkeyFile = getResourcePath('shuffle_encrypt_v2', 'zkey');
const shuffleEncryptWasmFile = getResourcePath('shuffle_encrypt_v2', 'wasm');
const decryptZkeyFile = getResourcePath('decrypt', 'zkey');
const decryptWasmFile = getResourcePath('decrypt', 'wasm');

export type ResourceContextStateType = {
  decryptWasmData: Uint8Array | null;
  shuffleEncryptWasmData: Uint8Array | null;
  decryptZkeyData: Uint8Array | null;
  shuffleEncryptZkeyData: Uint8Array | null;
  babyjub: any;
  publicKeys: PublicKey[] | null;
  myKey: Keys | null;
  aggregatedKey: string[] | null;
  aggregateECKey: Uint8Array[] | null;
  settingUp: boolean;
  hasSetup: boolean;
  fetchingFailed: boolean;
  setupBeforeJoin: () => Promise<void>;
  saveAggregateKeys: (pks: PublicKey[]) => Promise<any>;
};

export const ResourceContext = createContext<ResourceContextStateType | null>(
  null
);

export const ResourceContextProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  // should be prepare before joining, better be when the game page is initializing
  const [settingUp, setIsSettingUp] = useState(false);
  const [decryptWasmData, setDecryptWasmData] = useState<Uint8Array | null>(
    null
  );
  const [shuffleEncryptWasmData, setShuffleEncryptWasmData] =
    useState<Uint8Array | null>(null);
  const [decryptZkeyData, setDecryptZkeyData] = useState<Uint8Array | null>(
    null
  );
  const [shuffleEncryptZkeyData, setShuffleEncryptZkeyData] =
    useState<Uint8Array | null>(null);
  const [hasSetup, setHasSetup] = useState(false);
  const [fetchingFailed, setFetchingFailed] = useState(false);

  // should be prepared before shuffling, after joining
  const [babyjub, setBabyJub] = useState<any>(null);
  const [myKey, setMyKey] = useState<Keys | null>(null);
  // pkArray
  const [publicKeys, setPublicKeys] = useState<PublicKey[] | null>(null);
  const [aggregatedKey, setAggregatedKey] = useState<string[] | null>(null);
  const [aggregateECKey, setAggregateECKey] = useState<Uint8Array[] | null>(
    null
  );

  // prepare all the remote resources
  const setupBeforeJoin = useCallback(async () => {
    if (settingUp || hasSetup) {
      return;
    }
    console.log(
      `start setting up: settingUp ${settingUp}, hasSetup: ${hasSetup}`
    );
    setIsSettingUp(true);

    // setup babyjub curve
    const babyjub = await buildBabyjub();
    setBabyJub(babyjub);

    const localKey = getLocalKey();
    if (localKey) {
      console.log(`local key detected`, localKey);
      setMyKey(localKey);
    } else {
      // Generates secret/public key for each player. Each player should run this line.
      // keys.pk: uint256 will be sent to smart contract.
      // keys.sk: uint256 will be kept secret by each player.
      const rawKey: {
        g: [Uint8Array, Uint8Array];
        pk: [Uint8Array, Uint8Array];
        sk: bigint | bigint[];
      } = keyGen(babyjub, numBits);
      // transfer it to uint256 thus better to be stored in contract
      const rawKeyTemp: Keys = {
        g: [babyjub.F.toString(rawKey.g[0]), babyjub.F.toString(rawKey.g[1])],
        pk: [
          babyjub.F.toString(rawKey.pk[0]),
          babyjub.F.toString(rawKey.pk[1]),
        ],
        sk:
          typeof rawKey.sk == 'bigint'
            ? rawKey.sk.toString()
            : rawKey.sk.map((s) => s.toString()),
      };
      setMyKey(rawKeyTemp);
      // store the keys
      setLocalPK(rawKeyTemp);
    }

    try {
      // prevent any refetch, resources are BIG! 190M size, so cache in IndexDB!
      if (!shuffleEncryptZkeyData) {
        let data = await get(shuffleEncryptZkeyFile);
        if (data) {
          setShuffleEncryptZkeyData(data);
          console.log('shuffleEncryptZkeyFile got in cache!');
        } else {
          data = await fetch(shuffleEncryptZkeyFile, {
            mode: 'cors',
          })
            .then((response) => response.arrayBuffer())
            .then((buffer) => new Uint8Array(buffer));
          console.log('shuffleEncryptZkeyFile fetched');
          setShuffleEncryptZkeyData(data);
          set(shuffleEncryptZkeyFile, data);
        }
      }

      if (!shuffleEncryptWasmData) {
        let response = await fetch(shuffleEncryptWasmFile, {
          mode: 'cors',
        });
        setShuffleEncryptWasmData(new Uint8Array(await response.arrayBuffer()));
        console.log('shuffleEncryptWasmFile fetched');
      }

      if (!decryptWasmData) {
        let response = await fetch(decryptWasmFile, {
          mode: 'cors',
        });
        setDecryptWasmData(new Uint8Array(await response.arrayBuffer()));
        console.log('decryptWasmFile fetched');
      }

      if (!decryptZkeyData) {
        let response = await fetch(decryptZkeyFile, {
          mode: 'cors',
          cache: 'force-cache',
        });
        setDecryptZkeyData(new Uint8Array(await response.arrayBuffer()));
        console.log('decryptZkeyFile fetched');
      }
      setHasSetup(true);
      console.log('done setup!!!');
    } catch (e) {
      console.error(`Error when fetching resources:`, e);
      setFetchingFailed(true);
    }
    setIsSettingUp(false);
  }, [
    decryptWasmData,
    decryptZkeyData,
    hasSetup,
    settingUp,
    shuffleEncryptWasmData,
    shuffleEncryptZkeyData,
  ]);

  // helper functions, should call this when all users join the game
  // the pks are already converted to string forms
  const saveAggregateKeys = useCallback(
    async (pks: PublicKey[]) => {
      if (!babyjub) {
        return;
      }
      const pksInBufferType = pks.map((pk) => pk.map((p) => babyjub.F.e(p)));
      let aggregatePk = await keyAggregate(babyjub, pksInBufferType);
      setAggregateECKey(aggregatePk);
      aggregatePk = [
        babyjub.F.toString(aggregatePk[0]),
        babyjub.F.toString(aggregatePk[1]),
      ];
      setPublicKeys(pks.map((pk) => pk.map((p) => p.toString()))); // this is already converted
      setAggregatedKey(aggregatePk);
    },
    [babyjub]
  );

  const state = {
    decryptWasmData,
    shuffleEncryptWasmData,
    decryptZkeyData,
    shuffleEncryptZkeyData,
    babyjub,
    publicKeys,
    myKey,
    aggregatedKey,
    aggregateECKey,
    settingUp,
    hasSetup,
    fetchingFailed,

    setupBeforeJoin,
    saveAggregateKeys,
  };
  return (
    <ResourceContext.Provider value={state}>
      {children}
    </ResourceContext.Provider>
  );
};
