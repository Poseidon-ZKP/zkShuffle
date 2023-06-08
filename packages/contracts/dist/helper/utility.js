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
Object.defineProperty(exports, "__esModule", { value: true });
exports.tx_to_contract = void 0;
function tx_to_contract(owner, address, calldata) {
    return __awaiter(this, void 0, void 0, function* () {
        let tx = {
            gasLimit: 20000000,
            to: address,
            data: calldata
        };
        let resp = yield owner.sendTransaction(tx);
        return yield resp.wait();
    });
}
exports.tx_to_contract = tx_to_contract;
//# sourceMappingURL=utility.js.map