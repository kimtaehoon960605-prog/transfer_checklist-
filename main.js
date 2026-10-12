const { app, BrowserWindow, Tray, Menu, nativeImage, shell } = require('electron');
const path = require('path');

let mainWindow = null;
let tray = null;
let isQuitting = false;

const APP_TITLE = '전보 체크리스트';

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 480,
    height: 860,
    minWidth: 390,
    minHeight: 620,
    show: false,
    title: APP_TITLE,
    icon: path.join(__dirname, 'app.ico'),
    autoHideMenuBar: true,
    backgroundColor: '#f7f9fc',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      devTools: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  // Keep external links out of the internal checklist window.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    const localUrl = new URL(`file://${path.join(__dirname, 'index.html')}`).href;
    if (url !== localUrl && !url.startsWith('file:')) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });
}

function updateTrayMenu() {
  if (!tray || !mainWindow) return;
  const alwaysOnTop = mainWindow.isAlwaysOnTop();
  const launchAtLogin = app.getLoginItemSettings().openAtLogin;

  const menu = Menu.buildFromTemplate([
    {
      label: '전보 체크리스트 열기',
      click: () => {
        mainWindow.show();
        mainWindow.restore();
        mainWindow.focus();
      },
    },
    { type: 'separator' },
    {
      label: '항상 위에 표시',
      type: 'checkbox',
      checked: alwaysOnTop,
      click: (item) => {
        mainWindow.setAlwaysOnTop(item.checked, 'floating');
        updateTrayMenu();
      },
    },
    {
      label: 'Windows 시작 시 실행',
      type: 'checkbox',
      checked: launchAtLogin,
      click: (item) => {
        app.setLoginItemSettings({ openAtLogin: item.checked });
        updateTrayMenu();
      },
    },
    { type: 'separator' },
    {
      label: '종료',
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(menu);
}

function createTray() {
  const iconPath = path.join(__dirname, 'tray.ico');
  let icon = nativeImage.createFromPath(iconPath);
  if (icon.isEmpty()) icon = nativeImage.createFromPath(path.join(__dirname, 'app.ico'));
  tray = new Tray(icon);
  tray.setToolTip(APP_TITLE);

  tray.on('click', () => {
    if (!mainWindow) return;
    if (mainWindow.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow.show();
      mainWindow.restore();
      mainWindow.focus();
    }
  });
  tray.on('double-click', () => {
    if (!mainWindow) return;
    mainWindow.show();
    mainWindow.restore();
    mainWindow.focus();
  });
  updateTrayMenu();
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    createWindow();
    createTray();
  });
}

app.on('before-quit', () => {
  isQuitting = true;
});

app.on('window-all-closed', (event) => {
  // Deliberately stay alive in the Windows tray.
  if (process.platform !== 'darwin') event.preventDefault?.();
});
