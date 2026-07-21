import { CMMRecord } from './types/cmm';

export {};

declare global {
  interface Window {
    api: {
      getAllCMMs: () => Promise<CMMRecord[]>;
    };
  }
}