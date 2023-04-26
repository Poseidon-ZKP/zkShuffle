// format address
export const formatAddress = (address?: string) => {
  return address
    ? address.replace(address?.slice(5, address.length - 3), '...')
    : '--';
};

export const sleep = (ms: number) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};
