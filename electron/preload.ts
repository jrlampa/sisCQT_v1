import { contextBridge } from 'electron';

// Exponha somente o necessário. Por enquanto, apenas metadados de versão/plataforma.
contextBridge.exposeInMainWorld('sisCQT', {
  platform: process.platform,
  versions: process.versions,
});

