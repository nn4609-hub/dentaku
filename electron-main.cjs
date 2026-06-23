const { app, BrowserWindow, Menu, ipcMain } = require("electron");
const fs = require("node:fs");
const path = require("node:path");

const APP_TITLE = "上限仕入れ額計算機";
let mainWindow = null;

app.commandLine.appendSwitch("disable-features", "MediaRouter");
app.commandLine.appendSwitch("disable-renderer-backgrounding");

function resourcePath(relativePath) {
  return path.join(__dirname, relativePath);
}

function runSelfTest() {
  const requiredFiles = [
    resourcePath("web-dist/index.html"),
    resourcePath("web-dist/service-worker.js"),
    resourcePath("preload.cjs"),
  ];
  const missing = requiredFiles.filter((filePath) => !fs.existsSync(filePath));

  if (missing.length > 0) {
    console.error(`missing files: ${missing.join(", ")}`);
    process.exit(1);
  }

  console.log("desktop self-test passed");
  process.exit(0);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 820,
    minWidth: 900,
    minHeight: 640,
    title: APP_TITLE,
    backgroundColor: "#f6f7fb",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: resourcePath("preload.cjs"),
    },
  });

  mainWindow.loadFile(resourcePath("web-dist/index.html"));
}

if (process.argv.includes("--self-test")) {
  runSelfTest();
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);

  ipcMain.handle("always-on-top:set", (_event, enabled) => {
    if (!mainWindow) {
      return false;
    }

    mainWindow.setAlwaysOnTop(Boolean(enabled), "screen-saver");
    return mainWindow.isAlwaysOnTop();
  });

  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
