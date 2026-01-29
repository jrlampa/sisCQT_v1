// Global type definitions for sisCQT Desktop

interface SisCQTDesktopAPI {
  platform: string;
  versions: NodeJS.ProcessVersions;
  isDesktop: boolean;

  app: {
    getVersion: () => Promise<string>;
    getPath: (name: 'userData' | 'appData' | 'temp') => Promise<string>;
    checkUpdates: () => Promise<any>;
  };

  fs: {
    saveFile: (data: any, filename: string) => Promise<boolean>;
    openFile: () => Promise<any | null>;
  };

  onMenuAction: (channel: string, callback: () => void) => () => void;
}

declare global {
  interface Window {
    sisCQT?: SisCQTDesktopAPI;
  }
}

export { };
