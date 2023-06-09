/// <reference types="mocha" />
import "@nomiclabs/hardhat-ethers";
import "@typechain/hardhat";
import "hardhat-contract-sizer";
import "solidity-docgen";
import "solidity-coverage";
import "@nomiclabs/hardhat-solpp";
import "@nomicfoundation/hardhat-chai-matchers";
declare const _default: {
    docgen: {
        pages: (contracts: any) => string;
    };
    defaultNetwork?: string | undefined;
    paths?: import("hardhat/types").ProjectPathsUserConfig | undefined;
    networks?: import("hardhat/types").NetworksUserConfig | undefined;
    solidity?: import("hardhat/types").SolidityUserConfig | undefined;
    mocha?: Mocha.MochaOptions | undefined;
    typechain?: import("@typechain/hardhat/dist/types").TypechainUserConfig | undefined;
    contractSizer?: {
        alphaSort?: boolean | undefined;
        disambiguatePaths?: boolean | undefined;
        runOnCompile?: boolean | undefined;
        strict?: boolean | undefined;
        only?: string[] | undefined;
        except?: string[] | undefined;
        outputFile?: string | undefined;
        unit?: "B" | "kB" | "KiB" | undefined;
    } | undefined;
    solpp?: Partial<import("@nomiclabs/hardhat-solpp/dist/src/types").SolppConfig> | undefined;
};
export default _default;
//# sourceMappingURL=hardhat.config.d.ts.map