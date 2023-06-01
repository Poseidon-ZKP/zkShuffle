import { resolve } from 'path';
import axios from 'axios';
const fs = require('fs');
const https = require('https')

const HOME_DIR = require('os').homedir();
export const P0X_DIR = resolve(HOME_DIR, "./.poseidon-zkp/zkShuffle")
export const P0X_AWS_URL = "https://p0x-labs.s3.amazonaws.com/zkShuffle/"
export async function dnld_aws(file_name : string) {
    // fs.mkdir(P0X_DIR, () => {}, { recursive: true })
    fs.mkdir(resolve(HOME_DIR, "./.poseidon-zkp"), () => {})
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

export async function dnld_file(path: string) {
    const res = await axios.get(P0X_AWS_URL + path, {
        responseType: 'arraybuffer'
    });
    return res.data;
  }

export async function sleep(ms : number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export async function dnld_crypto_files(cardNum: number) {
    try {
      let wasmFileName = '';
      let zkeyFileName = '';
      switch (cardNum) {
        case 5:
          wasmFileName = 'wasm/encrypt.wasm.5';
          zkeyFileName = 'zkey/encrypt.zkey.5';
          break;
        case 30:
          wasmFileName = 'wasm/encrypt.wasm.30';
          zkeyFileName = 'zkey/encrypt.zkey.30';
          break;
        case 52:
          wasmFileName = 'wasm/encrypt.wasm';
          zkeyFileName = 'zkey/encrypt.zkey';
          break;
        default:
          break;
      }
      const wasmPromise = dnld_file(wasmFileName);
      const zkeyPromise = dnld_file(zkeyFileName);
      const decryptWasmPromise = dnld_file('wasm/decrypt.wasm');
      const decryptZkeyPromise = dnld_file('zkey/decrypt.zkey');
      const [encrypt_wasm, encrypt_zkey, decrypt_wasm, decrypt_zkey] =
        await Promise.all([
          wasmPromise,
          zkeyPromise,
          decryptWasmPromise,
          decryptZkeyPromise,
        ]);
      //  developer can use this to cache the files
      return {
        encrypt_wasm,
        encrypt_zkey,
        decrypt_wasm,
        decrypt_zkey,
      };
    } catch (e) {
      console.log('download error', e);
    }
  }