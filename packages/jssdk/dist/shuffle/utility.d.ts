export declare const P0X_DIR: string;
export declare const P0X_AWS_URL = "https://p0x-labs.s3.amazonaws.com/zkShuffle/";
export declare function dnld_aws(file_name: string): Promise<unknown>;
export declare function dnld_file(path: string): Promise<any>;
export declare function sleep(ms: number): Promise<unknown>;
export declare function dnld_crypto_files(cardNum: 5 | 30 | 52): Promise<{
    encrypt_wasm: any;
    encrypt_zkey: any;
    decrypt_wasm: any;
    decrypt_zkey: any;
}>;
