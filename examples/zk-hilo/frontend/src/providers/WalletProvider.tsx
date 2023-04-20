import { PropsWithChildren } from 'react';
import { publicProvider } from 'wagmi/providers/public';
import '@rainbow-me/rainbowkit/styles.css';

import {
  connectorsForWallets,
  RainbowKitProvider,
  darkTheme,
} from '@rainbow-me/rainbowkit';
import { configureChains, createClient, WagmiConfig } from 'wagmi';
import { foundry } from '@wagmi/core/chains';
import * as allChains from 'wagmi/chains';
import { jsonRpcProvider } from '@wagmi/core/providers/jsonRpc';
import { mockWallet } from '../lib/mockWallet';
import { TESTNET_URL } from '../lib/const';

const { chains, provider } = configureChains(Object.values(allChains), [
  jsonRpcProvider({ rpc: () => ({ http: TESTNET_URL }) }),
]);

const connectors = connectorsForWallets([
  {
    groupName: 'Testing',
    wallets: [mockWallet()],
  },
]);

const wagmiClient = createClient({
  autoConnect: true,
  // connectors,
  provider,
});

const WalletProvider = ({ children }: PropsWithChildren) => {
  return (
    <WagmiConfig client={wagmiClient}>
      <RainbowKitProvider
        theme={darkTheme({
          accentColor: '#7b3fe4',
          accentColorForeground: '#DABEF1',
          borderRadius: 'small',
          fontStack: 'system',
          overlayBlur: 'small',
        })}
        chains={chains}
      >
        {children}
      </RainbowKitProvider>
    </WagmiConfig>
  );
};

export default WalletProvider;
