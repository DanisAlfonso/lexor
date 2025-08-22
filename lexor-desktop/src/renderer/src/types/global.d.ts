import type { ElectronAPI } from '../../../preload/index';

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
    isElectron?: boolean;
  }
}

export {};