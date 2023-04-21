import '../styles/globals.css';
import type { AppProps } from 'next/app';
import WalletProvider from '../providers/WalletProvider';
import { ZKContextProvider } from '../contexts/ZKContext';
import { ResourceContextProvider } from '../contexts/ResourceContext';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <WalletProvider>
      <ResourceContextProvider>
        <ZKContextProvider>
          <Component {...pageProps} />
        </ZKContextProvider>
      </ResourceContextProvider>
    </WalletProvider>
  );
}
