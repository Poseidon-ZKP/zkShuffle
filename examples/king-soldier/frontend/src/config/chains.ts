import { Chain } from 'wagmi';

export const HarmanyTestnet: Chain = {
  id: 1666700000,
  name: 'Harmony Testnet',
  network: 'harmony',
  nativeCurrency: {
    name: 'ONE',
    symbol: 'ONE',
    decimals: 18,
  },
  rpcUrls: {
    public: {
      http: ['https://api.s0.b.hmny.io'],
    },
    default: {
      http: ['https://api.s0.b.hmny.io'],
    },
  },
  blockExplorers: {
    etherscan: { name: 'Harmony', url: 'https://explorer.pops.one' },
    default: { name: 'Harmony', url: 'https://explorer.pops.one' },
  },

  testnet: true,
};

export const supChains = {
  HarmanyTestnet,
};
