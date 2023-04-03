import { execSync } from 'child_process';
import fs from 'fs';
import log4js from 'log4js';
import path, { resolve } from 'path';
import { exit } from 'process';
const snarkjs = require('snarkjs');
const createKeccakHash = require('keccak');
const ffjavascript = require('ffjavascript');
const https = require('https')

const logger = log4js.getLogger();
logger.level = "debug";
logger.debug("log4js level debug");

export type Curve = any;
export type Error = any;
export type Key = { type: string, data: Uint8Array };

// Converts the first character of `s` to be upper case.
export function titleCase(s: string) {
    return !s ? '' : s[0].toUpperCase() + s.slice(1);
}

// Compiles the `fileName` circom code with `options` flags. 
export async function compile_circom(fileName: string, options: any) {
    let flags = "--wasm ";
    if (options.sym) flags += "--sym ";
    if (options.r1cs) flags += "--r1cs ";
    if (options.json) flags += "--json ";
    if (options.output) flags += "--output " + options.output + " ";
    if (options.O === 0) flags += "--O0 ";		// no simplify
    if (options.O === 1) flags += "--O1 ";		// only apply var-to-var/var-to-const simplify
    if (options.O === 2) flags += "--O2 ";		// full constraint simplify
    try {
        await execSync("circom " + flags + fileName);
        console.log("compile circom circuit done !");
    } catch (error) {
        console.log("error : ", error);
        exit(-1);
    }
}

// Generates final zkey.
export async function generate_zkey_final_key(
    curve: Curve,
    ptau_final: Key,
    r1cs_file: string,
    final_zkey_file: string
) {
    const zkey_0 = { type: "mem" };
    const zkey_1 = { type: "mem" };
    const zkey_2 = { type: "mem" };
    const bellman_1 = { type: "mem" };
    const bellman_2 = { type: "mem" };
    let zkey_final: any = { type: "mem", data: undefined };
    console.log(new Date().toUTCString() + " zkey start...")
    await snarkjs.zKey.newZKey(r1cs_file, ptau_final, zkey_0, logger);
    await snarkjs.zKey.contribute(zkey_0, zkey_1, "p2_C1", "pa_Entropy1");
    await snarkjs.zKey.exportBellman(zkey_1, bellman_1);
    await snarkjs.zKey.bellmanContribute(curve, bellman_1, bellman_2, "pa_Entropy2");
    await snarkjs.zKey.importBellman(zkey_1, bellman_2, zkey_2, "C2");
    await snarkjs.zKey.beacon(zkey_2, zkey_final, "B3", "0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f20", 10);
    await snarkjs.zKey.verifyFromR1cs(r1cs_file, ptau_final, zkey_final);
    await snarkjs.zKey.verifyFromInit(zkey_0, ptau_final, zkey_final);
    fs.writeFileSync(final_zkey_file, Buffer.from(zkey_final.data));
    console.log(new Date().toUTCString() + " zkey generated...");
}

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
            https.get(P0X_AWS_URL + file_name, (resp: { pipe: (arg0: fs.WriteStream) => void; }) => {
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

// Compiles circuit at `dir/circuit_name.circom`, conducts a dummy trusted setup, and generates contract 
// for on-chain verification.
export async function build_circuit(dir: string, circuit_name: string) {
    const cwd = process.cwd();
    const target_directory = cwd + "/" + dir + "/";
    await compile_circom(target_directory + circuit_name + ".circom", {
        sym: true,
        r1cs: true,
        json: true,
        O: 2,
        output: target_directory
    });
    const r1cs_file = target_directory + circuit_name + ".r1cs"
    const final_ptau_file = P0X_DIR + "/zkey/ptau.20"
    await dnld_aws('zkey/ptau.20')
    fs.mkdir(resolve(cwd, './wasm'), () => {})
    fs.mkdir(resolve(cwd, './zkey'), () => {})
    const final_zkey_file = cwd + "/zkey/" + circuit_name + ".zkey"
    const curve = await ffjavascript.getCurveFromName("bn128");
    const ptau_final = { type: "mem", data: new Uint8Array(Buffer.from(fs.readFileSync(final_ptau_file))) };
    await generate_zkey_final_key(curve, ptau_final, r1cs_file, final_zkey_file);
    const templates = { groth16: await fs.promises.readFile(cwd + "/templates/verifier_groth16.sol.ejs", "utf8") };
    let verifierCode: string = await snarkjs.zKey.exportSolidityVerifier(
        new Uint8Array(Buffer.from(fs.readFileSync(final_zkey_file))),
        templates,
    );
    verifierCode = verifierCode.replace("Verifier", titleCase(circuit_name) + "Verifier")
    verifierCode = verifierCode.replace(new RegExp("Pairing", "g"), titleCase(circuit_name) + "Pairing")
    fs.writeFileSync(cwd + "/contracts/" + circuit_name + "_verifier.sol", verifierCode, "utf-8");
    fs.rename(
        target_directory + circuit_name + "_js/" + circuit_name + ".wasm",
        cwd + "/wasm/" + circuit_name + ".wasm",
        function (err: Error) {
            if (err) throw err
        }
    );
    fs.rmSync(target_directory + circuit_name + "_js", { recursive: true });
    fs.rmSync(target_directory + circuit_name + "_constraints.json");
    fs.rmSync(target_directory + circuit_name + ".r1cs");
    fs.rmSync(target_directory + circuit_name + ".sym");
}

// Merges two maps.
export function merge_map(map1: Map<string, string>, map2: Map<string, string>) {
    map2.forEach((key: string, value: string) => {
        if (!map1.has(key)) {
            map1.set(key, value);
        }
    });
    return map1;
}

// Recursively calculates checksum for each file in `dir`.
export async function calculate_checksum(dir: string): Promise<Map<string, string>> {
    let dict: Map<string, string> = new Map();
    const directory = await fs.promises.opendir(dir);
    for await (const entry of directory) {
        if (entry.name === "tests") {
            continue;
        }
        if (entry.isDirectory()) {
            dict = merge_map(dict, await calculate_checksum(path.join(dir, entry.name)));
        } else {
            if ((entry.name.substr(entry.name.length - 15) === "test.input.json") || (entry.name.substr(entry.name.length - 4) === ".png")) {
                continue;
            }
            dict.set(
                path.join(dir, entry.name),
                createKeccakHash('keccak256')
                    .update(fs.readFileSync(path.resolve(dir, entry.name), 'utf-8'))
                    .digest('hex')
                    .toString('hex'));
        }
    }
    return dict;
}

// Generates checksum of files in `dir`.
export async function generate_checksum(dir: string) {
    let dict = await calculate_checksum(dir);
    let res = "";
    dict.forEach((key: string, value: string) => {
        res += (value + " " + key + "\n");
    });
    fs.writeFileSync("circom.checksum", res);
}

// Parses checksums from `file`.
export function parse_checksum(file: string): Map<string, string> {
    let checksum = fs.readFileSync(file, 'utf-8');
    var lines = checksum.trim().split(/\r?\n/);
    let dict = new Map();
    lines.forEach((line: string) => {
        const splitted_line = line.split(/\r? /);
        dict.set(splitted_line[1], splitted_line[0]);
    });
    return dict;
}
