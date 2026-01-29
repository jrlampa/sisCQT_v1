/**
 * electron-builder configuration
 * Build settings for sisCQT Desktop (Windows)
 */

module.exports = {
  appId: 'br.com.im3.siscqt.desktop',
  productName: 'sisCQT Desktop',
  copyright: 'Copyright © 2026 IM3 Brasil',

  directories: {
    output: 'dist/desktop-release',
    buildResources: 'build',
  },

  files: [
    'dist/client/**/*',
    'dist/server/**/*',
    'dist/electron/**/*',
    'node_modules/**/*',
    'package.json',
    'prisma/schema.desktop.prisma',
    'prisma/generated/desktop/**/*',
  ],

  extraResources: [
    {
      from: 'prisma/migrations-desktop',
      to: 'prisma/migrations-desktop',
      filter: ['**/*']
    },
  ],

  asar: true,
  asarUnpack: [
    '**/node_modules/prisma/**/*',
    '**/node_modules/@prisma/**/*',
  ],

  win: {
    target: [
      {
        target: 'nsis',
        arch: ['x64']
      }
    ],
    icon: 'build/icon.ico',
    // Configuração para assinatura digital (quando certificado estiver instalado)
    // Descomente quando o certificado estiver disponível:
    // certificateFile: 'path/to/cert.pfx',
    // certificatePassword: process.env.CERT_PASSWORD,
  },

  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
    shortcutName: 'sisCQT Desktop',
    installerIcon: 'build/icon.ico',
    uninstallerIcon: 'build/icon.ico',
    installerHeaderIcon: 'build/icon.ico',
    deleteAppDataOnUninstall: false, // Preserva dados do usuário
  },

  publish: {
    provider: 'github',
    owner: 'im3brasil',
    repo: 'siscqt',
    releaseType: 'release',
  },

  // Auto-updater configuration
  electronUpdaterCompatibility: '>=6.0.0',
};
