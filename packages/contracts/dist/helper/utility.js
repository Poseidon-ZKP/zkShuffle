"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tx_to_contract = void 0;
async function tx_to_contract(owner, address, calldata) {
    let tx = {
        gasLimit: 20000000,
        to: address,
        data: calldata
    };
    let resp = await owner.sendTransaction(tx);
    return await resp.wait();
}
exports.tx_to_contract = tx_to_contract;
//# sourceMappingURL=utility.js.map