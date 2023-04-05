import "../styles/globals.css";
import type { AppProps } from "next/app";
import WalletProvider from "../providers/WalletProvider";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <WalletProvider>
      <Component {...pageProps} />
    </WalletProvider>
  );
}
