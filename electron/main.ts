import { app, BrowserWindow, shell } from 'electron';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow: BrowserWindow | null = null;
let serverHandle: { close: () => void } | null = null;

async function startLocalExpress(): Promise<{ url: string }> {
  // Para o desktop, queremos servir a UI buildada (dist/client) via Express (dist/server),
  // sem exigir NODE_ENV=production (que ativa validações estritas de auth).
  process.env.SISCQT_SERVE_DIST_CLIENT = 'true';

  const serverModulePath = path.join(__dirname, '..', 'server', 'server.js');
  const serverModuleUrl = pathToFileURL(serverModulePath).href;

  const mod = await import(serverModuleUrl) as unknown as {
    startServer: (opts: { port?: number; host?: string }) => Promise<{ server: any; port: number }>;
  };

  const { server, port } = await mod.startServer({ port: 0, host: '127.0.0.1' });
  serverHandle = server;

  return { url: `http://127.0.0.1:${port}` };
}

async function createMainWindow() {
  const { url } = await startLocalExpress();

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.once('ready-to-show', () => mainWindow?.show());

  // Links externos abrem no navegador padrão
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    // Evita navegação para fora do app (p. ex. cliques em links)
    if (!url.startsWith('http://127.0.0.1:')) {
      event.preventDefault();
      void shell.openExternal(url);
    }
  });

  await mainWindow.loadURL(url);
}

function shutdownServer() {
  try {
    serverHandle?.close();
  } catch {
    // noop
  } finally {
    serverHandle = null;
  }
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  });

  app.on('before-quit', shutdownServer);

  app.whenReady()
    .then(createMainWindow)
    .catch((err) => {
      // eslint-disable-next-line no-console
      console.error('[electron] Failed to start:', err);
      app.quit();
    });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      void createMainWindow();
    }
  });

  app.on('window-all-closed', () => {
    // No Windows/Linux, fecha o app quando não houver janelas.
    // (No macOS costuma-se manter, mas aqui simplificamos.)
    shutdownServer();
    app.quit();
  });
}

