import { contextBridge, ipcRenderer } from 'electron';

// Exponha APIs seguras para o renderer process
contextBridge.exposeInMainWorld('sisCQT', {
  // Informações da plataforma
  platform: process.platform,
  versions: process.versions,
  isDesktop: true,

  // APIs do aplicativo
  app: {
    getVersion: () => ipcRenderer.invoke('app:getVersion'),
    getPath: (name: 'userData' | 'appData' | 'temp') => ipcRenderer.invoke('app:getPath', name),
    checkUpdates: () => ipcRenderer.invoke('app:checkUpdates'),
  },

  // Sistema de arquivos (para futuro - salvar/abrir projetos)
  fs: {
    // Placeholder para implementação futura
    saveFile: async (data: any, filename: string) => {
      console.log('saveFile not implemented yet', filename);
      return false;
    },
    openFile: async () => {
      console.log('openFile not implemented yet');
      return null;
    },
  },

  // Eventos do menu
  onMenuAction: (channel: string, callback: () => void) => {
    const validChannels = [
      'menu-new-project',
      'menu-open-project',
      'menu-save-project',
    ];

    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, callback);

      // Retorna função para cleanup
      return () => ipcRenderer.removeListener(channel, callback);
    }

    return () => { };
  },
});

// Tipos TypeScript para o window.sisCQT (para referência futura)
export interface SisCQTAPI {
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
    sisCQT: SisCQTAPI;
  }
}
