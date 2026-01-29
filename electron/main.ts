import { app, BrowserWindow, shell, Menu, ipcMain, dialog } from 'electron';
import { autoUpdater } from 'electron-updater';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import fs from 'node:fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow: BrowserWindow | null = null;
let splashWindow: BrowserWindow | null = null;
let serverHandle: { close: () => void } | null = null;

const isDev = process.env.NODE_ENV === 'development';
const isDesktopMode = true;

// Configurar variáveis de ambiente para modo desktop
process.env.SISCQT_DESKTOP_MODE = 'true';
process.env.SISCQT_SERVE_DIST_CLIENT = 'true';

// Configurar database path no userData do Electron
const userDataPath = app.getPath('userData');
const dbPath = path.join(userDataPath, 'data', 'siscqt.db');
const dbDir = path.dirname(dbPath);

// Criar diretório do banco se não existir
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

process.env.DESKTOP_DATABASE_URL = `file:${dbPath}`;

// Configurar auto-updater
autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;

autoUpdater.on('update-available', (info) => {
  if (!mainWindow) return;

  dialog.showMessageBox(mainWindow, {
    type: 'info',
    title: 'Atualização Disponível',
    message: `Uma nova versão (${info.version}) está disponível!`,
    buttons: ['Baixar Agora', 'Depois'],
    defaultId: 0,
  }).then((result) => {
    if (result.response === 0) {
      autoUpdater.downloadUpdate();
    }
  });
});

autoUpdater.on('update-downloaded', () => {
  if (!mainWindow) return;

  dialog.showMessageBox(mainWindow, {
    type: 'info',
    title: 'Atualização Pronta',
    message: 'Atualização baixada. O aplicativo será reiniciado para instalar.',
    buttons: ['Reiniciar Agora', 'Depois'],
    defaultId: 0,
  }).then((result) => {
    if (result.response === 0) {
      autoUpdater.quitAndInstall();
    }
  });
});

autoUpdater.on('error', (err) => {
  console.error('[auto-updater] Error:', err);
});

function createSplashWindow() {
  splashWindow = new BrowserWindow({
    width: 400,
    height: 300,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // Criar HTML inline para splash
  const splashHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body {
          margin: 0;
          padding: 0;
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          color: white;
        }
        .splash-content {
          text-align: center;
        }
        .logo {
          font-size: 48px;
          font-weight: bold;
          margin-bottom: 20px;
        }
        .loading {
          font-size: 14px;
          opacity: 0.8;
        }
        .spinner {
          border: 3px solid rgba(255,255,255,0.3);
          border-top: 3px solid white;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          animation: spin 1s linear infinite;
          margin: 20px auto;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      </style>
    </head>
    <body>
      <div class="splash-content">
        <div class="logo">sisCQT</div>
        <div class="spinner"></div>
        <div class="loading">Inicializando servidor...</div>
      </div>
    </body>
    </html>
  `;

  splashWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(splashHTML)}`);
}

async function startLocalExpress(): Promise<{ url: string }> {
  const serverModulePath = path.join(__dirname, '..', 'server', 'server.js');
  const serverModuleUrl = pathToFileURL(serverModulePath).href;

  const mod = await import(serverModuleUrl) as unknown as {
    startServer: (opts: { port?: number; host?: string }) => Promise<{ server: any; port: number }>;
  };

  const { server, port } = await mod.startServer({ port: 0, host: '127.0.0.1' });
  serverHandle = server;

  console.log(`[electron] Backend started on http://127.0.0.1:${port}`);
  return { url: `http://127.0.0.1:${port}` };
}

function createApplicationMenu() {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'Arquivo',
      submenu: [
        {
          label: 'Novo Projeto',
          accelerator: 'CmdOrCtrl+N',
          click: () => mainWindow?.webContents.send('menu-new-project'),
        },
        {
          label: 'Abrir Projeto',
          accelerator: 'CmdOrCtrl+O',
          click: () => mainWindow?.webContents.send('menu-open-project'),
        },
        {
          label: 'Salvar',
          accelerator: 'CmdOrCtrl+S',
          click: () => mainWindow?.webContents.send('menu-save-project'),
        },
        { type: 'separator' },
        {
          label: 'Sair',
          accelerator: 'Alt+F4',
          click: () => app.quit(),
        },
      ],
    },
    {
      label: 'Editar',
      submenu: [
        { role: 'undo', label: 'Desfazer' },
        { role: 'redo', label: 'Refazer' },
        { type: 'separator' },
        { role: 'cut', label: 'Recortar' },
        { role: 'copy', label: 'Copiar' },
        { role: 'paste', label: 'Colar' },
        { role: 'selectAll', label: 'Selecionar Tudo' },
      ],
    },
    {
      label: 'Visualizar',
      submenu: [
        { role: 'reload', label: 'Recarregar' },
        { role: 'toggleDevTools', label: 'Ferramentas do Desenvolvedor' },
        { type: 'separator' },
        { role: 'resetZoom', label: 'Zoom Padrão' },
        { role: 'zoomIn', label: 'Aumentar Zoom' },
        { role: 'zoomOut', label: 'Diminuir Zoom' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: 'Tela Cheia' },
      ],
    },
    {
      label: 'Ajuda',
      submenu: [
        {
          label: 'Sobre sisCQT Desktop',
          click: () => {
            dialog.showMessageBox(mainWindow!, {
              type: 'info',
              title: 'Sobre sisCQT Desktop',
              message: 'sisCQT Desktop',
              detail: `Versão: ${app.getVersion()}\nEngenharia de Redes BT\n\nIM3 Brasil © 2026`,
            });
          },
        },
        {
          label: 'Verificar Atualizações',
          click: () => {
            if (isDev) {
              dialog.showMessageBox(mainWindow!, {
                type: 'info',
                message: 'Auto-update desabilitado em desenvolvimento',
              });
            } else {
              autoUpdater.checkForUpdates();
            }
          },
        },
        { type: 'separator' },
        {
          label: 'Documentação',
          click: () => shell.openExternal('https://github.com/im3brasil/siscqt'),
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

async function createMainWindow() {
  createSplashWindow();

  try {
    const { url } = await startLocalExpress();

    mainWindow = new BrowserWindow({
      width: 1400,
      height: 900,
      minWidth: 1024,
      minHeight: 768,
      show: false,
      backgroundColor: '#1a1a2e',
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false,
      },
      icon: path.join(__dirname, '..', '..', 'build', 'icon.png'),
    });

    createApplicationMenu();

    mainWindow.once('ready-to-show', () => {
      splashWindow?.close();
      splashWindow = null;
      mainWindow?.show();

      // Verificar updates apenas em produção
      if (!isDev && process.env.ENABLE_AUTO_UPDATE !== 'false') {
        setTimeout(() => {
          autoUpdater.checkForUpdates();
        }, 3000);
      }
    });

    // Links externos abrem no navegador padrão
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
      void shell.openExternal(url);
      return { action: 'deny' };
    });

    mainWindow.webContents.on('will-navigate', (event, url) => {
      if (!url.startsWith('http://127.0.0.1:')) {
        event.preventDefault();
        void shell.openExternal(url);
      }
    });

    await mainWindow.loadURL(url);

  } catch (err) {
    console.error('[electron] Failed to start:', err);

    splashWindow?.close();

    dialog.showErrorBox(
      'Erro ao Iniciar',
      `Não foi possível iniciar o sisCQT Desktop.\n\nErro: ${err}`
    );

    app.quit();
  }
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

// IPC Handlers para comunicação com o renderer
ipcMain.handle('app:getVersion', () => app.getVersion());
ipcMain.handle('app:getPath', (_, name: 'userData' | 'appData' | 'temp') => app.getPath(name));
ipcMain.handle('app:checkUpdates', async () => {
  if (isDev) return { available: false, message: 'Dev mode' };
  const result = await autoUpdater.checkForUpdates();
  return result;
});

// Single instance lock
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
      console.error('[electron] Failed to start:', err);
      app.quit();
    });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      void createMainWindow();
    }
  });

  app.on('window-all-closed', () => {
    shutdownServer();
    app.quit();
  });
}
