import { ethers, providers } from 'ethers';

export const getLogPrams = async ({
  filter,
  address,
  provider,
}: {
  filter: ethers.EventFilter;
  address?: string;
  provider?: any;
}) => {
  const fromBlock = (await provider?.getBlockNumber()) - 20;
  const toBlock = 'latest';
  return {
    address,
    fromBlock,
    toBlock,
    topics: filter.topics,
  };
};
