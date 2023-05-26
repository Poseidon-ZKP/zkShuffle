import { Signer } from "ethers";

export async function tx_to_contract(
    owner : Signer,
    address		:	string,
    calldata	:	string)
{
    let tx = {
       gasLimit : 20000000,
       to   : address,
       data : calldata
     }
     let resp = await owner.sendTransaction(tx)
     return await resp.wait()
}
