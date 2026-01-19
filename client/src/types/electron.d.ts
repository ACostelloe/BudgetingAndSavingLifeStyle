export interface ElectronAPI {
  onUpdateStatus: (callback: (status: string) => void) => void;
  onUpdateDownloaded: (callback: () => void) => void;
  restartApp: () => Promise<void>;
  checkUpdates: () => Promise<void>;
  platform: string;
  isDev: boolean;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

