"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.dnld_crypto_files = exports.sleep = exports.dnld_file = exports.dnld_aws = exports.P0X_AWS_URL = exports.P0X_DIR = void 0;
const path_1 = require("path");
const axios_1 = __importDefault(require("axios"));
const fs = require("fs");
const https = require("https");
const HOME_DIR = require("os").homedir();
exports.P0X_DIR = (0, path_1.resolve)(HOME_DIR, "./.poseidon-zkp/zkShuffle");
exports.P0X_AWS_URL = "https://p0x-labs.s3.amazonaws.com/zkShuffle/";
function dnld_aws(file_name) {
    fs.mkdir((0, path_1.resolve)(HOME_DIR, "./.poseidon-zkp"), () => { });
    fs.mkdir(exports.P0X_DIR, () => { });
    fs.mkdir((0, path_1.resolve)(exports.P0X_DIR, "./wasm"), () => { });
    fs.mkdir((0, path_1.resolve)(exports.P0X_DIR, "./zkey"), () => { });
    return new Promise((reslv) => {
        if (!fs.existsSync((0, path_1.resolve)(exports.P0X_DIR, file_name))) {
            const file = fs.createWriteStream((0, path_1.resolve)(exports.P0X_DIR, file_name));
            https.get(exports.P0X_AWS_URL + file_name, (resp) => {
                file.on("finish", () => {
                    file.close();
                    reslv(0);
                });
                resp.pipe(file);
            });
        }
        else {
            reslv(0);
        }
    });
}
exports.dnld_aws = dnld_aws;
function dnld_file(path) {
    return __awaiter(this, void 0, void 0, function* () {
        const res = yield axios_1.default.get(exports.P0X_AWS_URL + path, {
            responseType: "arraybuffer",
        });
        return res.data;
    });
}
exports.dnld_file = dnld_file;
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
exports.sleep = sleep;
function dnld_crypto_files(cardNum) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            let wasmFileName = "";
            let zkeyFileName = "";
            switch (cardNum) {
                case 5:
                    wasmFileName = "wasm/encrypt.wasm.5";
                    zkeyFileName = "zkey/encrypt.zkey.5";
                    break;
                case 30:
                    wasmFileName = "wasm/encrypt.wasm.30";
                    zkeyFileName = "zkey/encrypt.zkey.30";
                    break;
                case 52:
                    wasmFileName = "wasm/encrypt.wasm";
                    zkeyFileName = "zkey/encrypt.zkey";
                    break;
                default:
                    break;
            }
            const wasmPromise = dnld_file(wasmFileName);
            const zkeyPromise = dnld_file(zkeyFileName);
            const decryptWasmPromise = dnld_file("wasm/decrypt.wasm");
            const decryptZkeyPromise = dnld_file("zkey/decrypt.zkey");
            const [encrypt_wasm, encrypt_zkey, decrypt_wasm, decrypt_zkey] = yield Promise.all([
                wasmPromise,
                zkeyPromise,
                decryptWasmPromise,
                decryptZkeyPromise,
            ]);
            return {
                encrypt_wasm,
                encrypt_zkey,
                decrypt_wasm,
                decrypt_zkey,
            };
        }
        catch (e) {
            console.log("download error", e);
            return null;
        }
    });
}
exports.dnld_crypto_files = dnld_crypto_files;
//# sourceMappingURL=utility.js.map