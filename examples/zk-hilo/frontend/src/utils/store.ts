// import { Keys } from '../context/ResourceContext';

import { Keys } from '../contexts/ResourceContext';

// zk file local storage for zkey & wasm files
export const USER_PK_STORAGE_KEY = 'USER_PK_STORAGE_KEY_V2';

export const getLocalKey = () => {
  const pk = localStorage.getItem(USER_PK_STORAGE_KEY);
  if (!pk) {
    return null;
  }
  return JSON.parse(pk);
};

export const setLocalPK = (key: Keys) => {
  return localStorage.setItem(USER_PK_STORAGE_KEY, JSON.stringify(key));
};
