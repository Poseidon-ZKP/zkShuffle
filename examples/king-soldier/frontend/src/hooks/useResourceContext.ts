import { useContext } from 'react';
import { ResourceContext } from '../contexts/ResourceContext';
// import { ResourceContext } from "../context/ResourceContext";

export const useResourceContext = () => {
  return useContext(ResourceContext);
};
