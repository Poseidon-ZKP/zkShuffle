import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

export async function tx_to_contract(
    owner : SignerWithAddress,
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
