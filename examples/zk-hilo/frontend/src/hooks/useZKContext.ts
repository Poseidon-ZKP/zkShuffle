import { useContext } from 'react';
import { ZKContext } from '../contexts/ZKContext';

export const useZKContext = () => {
  return useContext(ZKContext);
};
