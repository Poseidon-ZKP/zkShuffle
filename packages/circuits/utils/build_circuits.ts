import { build_circuit, calculate_checksum, parse_checksum } from "./utils";

const circuit_list = [
    ["circuits/shuffle_encrypt_v2", "shuffle_encrypt_v2"],
    ["circuits/decrypt", "decrypt"],
];

async function main() {
    let reference_checksum = parse_checksum("circom.checksum");
    let computed_checksum = await calculate_checksum("circuits");
    let circuit_unchanged = true;
    reference_checksum.forEach((key: string, value: string) => {
        if (computed_checksum.get(key) != value) {
            circuit_unchanged = false;
        }
    });
    if (!circuit_unchanged) {
        for (let i = 0; i < circuit_list.length; i++) {
            console.log("Building " + circuit_list[i][1] + " circuit");
            await build_circuit(circuit_list[i][0], circuit_list[i][1]);
        }
    }
}

main().then(() => { process.exit() });
