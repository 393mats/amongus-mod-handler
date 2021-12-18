"use strict";

import { app, protocol, BrowserWindow, ipcMain, dialog, shell } from "electron";
import { createProtocol } from "vue-cli-plugin-electron-builder/lib";
import installExtension, { VUEJS_DEVTOOLS } from "electron-devtools-installer";
import * as propertiesReader from "properties-reader";
import { Registry } from "rage-edit";
import * as vdf from "@node-steam/vdf";
import * as fs from "fs-extra";
import * as path from "path";
import axios from "axios";
import admZip from "adm-zip";

const isDevelopment = process.env.NODE_ENV !== "production";

// eslint-disable-next-line no-unused-vars
const PLATFORM_DATA = {
  STEAM: "steam://rungameid/945360",
  EPIC: "com.epicgames.launcher://apps/963137e4c29d4c79a81323b8fab03a40?action=launch&silent=true",
};

const GIT_RELEASE = {
  tor: "https://api.github.com/repos/Eisbison/TheOtherRoles/releases",
  torgm: "https://api.github.com/repos/yukinogatari/TheOtherRoles-GM/releases",
};

// Scheme must be registered before the app is ready
protocol.registerSchemesAsPrivileged([
  { scheme: "app", privileges: { secure: true, standard: true } },
]);

async function createWindow() {
  // Create the browser window.
  const win = new BrowserWindow({
    width: 500,
    height: 300,
    frame: false,
    transparent: true,
    resizable: false,
    webPreferences: {
      // Use pluginOptions.nodeIntegration, leave this alone
      // See nklayman.github.io/vue-cli-plugin-electron-builder/guide/security.html#node-integration for more info
      nodeIntegration: true,
      contextIsolation: !process.env.ELECTRON_NODE_INTEGRATION,
    },
  });
  win.setMenu(null);

  // CLOSE BUTTON EVENT
  ipcMain.handle("close", async () => {
    const options = {
      type: "question",
      message: "確認",
      detail: "アプリを終了しますか？？",
      buttons: ["はい", "キャンセル"],
    };
    const result = await dialog.showMessageBox(win, options);
    if (result.response === 0) win.destroy();
    // event.reply("asynchronous-reply", "pong");
  });

  // DIRECTORY BUTTON EVENT
  ipcMain.handle("open-directory", async () => {
    const options = {
      properties: ["openDirectory"],
      title: "フォルダ(単独選択)",
      defaultPath: ".",
    };
    const result = await dialog.showOpenDialog(win, options);
    return result;
  });

  // get INI
  ipcMain.handle("ini-get", async () => {
    const hasProperty = await fs.existsSync("./config.ini");
    if (hasProperty) {
      const properties = propertiesReader("./config.ini");
      return properties.path().setting;
    } else return {};
  });

  // link to url
  ipcMain.handle("link-to", async (_, url) => {
    shell.openExternal(url);
  });

  // get INI
  ipcMain.handle("ini-save", async (_, platform, location) => {
    const hasProperty = await fs.existsSync("./config.ini");
    if (!hasProperty) {
      await fs.promises.writeFile("./config.ini", "");
    }
    const properties = propertiesReader("./config.ini");
    properties.set("setting.platform", platform);
    properties.set("setting.location", location);
    properties
      .save("./config.ini")
      .then((r) => {
        console.log(r);
        return true;
      })
      .catch((e) => {
        console.log(e);
        return false;
      });
  });

  // CHECK AmongUs.exe exist
  ipcMain.handle("check-exe", async (_, location) => {
    try {
      const isAmongUsDir = await fs.existsSync(
        path.join(location, "Among Us.exe")
      );
      return isAmongUsDir;
    } catch (e) {
      console.log(e);
    }
  });

  // ERROR DIALOG
  ipcMain.handle("error-dialog", async (_, title, str) => {
    dialog.showErrorBox(title, str);
  });

  // ERROR DIALOG
  ipcMain.handle("launch-game", async (_, platform) => {
    shell.openExternal(PLATFORM_DATA[platform]);
    return true;
  });

  // CHECK HANDLER
  ipcMain.handle("handler-check", async (_, location, modPrefix) => {
    const isModInstalled = await fs.existsSync(
      path.join(location, "handler", modPrefix)
    );
    return isModInstalled;
  });

  // SET VANILLA
  ipcMain.handle("handler-set-v", async (_, location, hats) => {
    try {
      const mod_file_list = [
        "winhttp.dll",
        "steam_appid.txt",
        "doorstop_config.ini",
      ];
      const mod_folder_list = ["mono", "BepInEx"];
      if (hats) mod_folder_list.push("TheOtherHats");
      for (let i = 0; i < mod_file_list.length; i++) {
        const target = path.join(location, mod_file_list[i]);
        const exist = await fs.existsSync(target);
        if (exist) {
          await fs.promises.unlink(target);
          console.log("deleted: ", target);
        }
      }
      for (let i = 0; i < mod_folder_list.length; i++) {
        const target = path.join(location, mod_folder_list[i]);
        const exist = await fs.existsSync(target);
        if (exist) {
          await fs.promises.rmdir(target, {
            recursive: true,
          });
          console.log("deleted: ", target);
        }
      }
      return true;
    } catch (e) {
      return false;
    }
  });

  // SET MOD
  ipcMain.handle("handler-set-m", async (_, location, modPrefix) => {
    try {
      const ModDir = path.join(location, "handler", modPrefix);
      if (!ModDir) throw "Not Found Mod";
      await fs.copy(ModDir, location);
      return true;
    } catch (e) {
      console.log(e);
      return false;
    }
  });

  // DELETE
  ipcMain.handle("handler-delete", async (_, location, modPrefix) => {
    try {
      const HANDLER = path.join(location, "handler");
      await fs.promises.rmdir(path.join(HANDLER, modPrefix), {
        recursive: true,
      });
      return true;
    } catch (e) {
      return false;
    }
  });

  // DOWNLOAD
  ipcMain.handle("handler-download", async (_, location, modPrefix) => {
    try {
      const HANDLER = path.join(location, "handler");
      const isHandler = await fs.existsSync(HANDLER);
      if (!isHandler) await fs.promises.mkdir(HANDLER);
      const response_release = await axios.get(GIT_RELEASE[modPrefix]);
      // const json = JSON.parse(response_release);
      if (response_release.status !== 200) throw "NETWORK ERROR";
      let downloadUrl = null;
      for (const key in response_release.data) {
        if (downloadUrl) break;
        if (Object.hasOwnProperty.call(response_release.data, key)) {
          const release = response_release.data[key];
          for (const idx in release["assets"]) {
            if (downloadUrl) break;
            if (Object.hasOwnProperty.call(release["assets"], idx)) {
              const file = release["assets"][idx];
              if (/.*\.zip$/.test(file.name)) {
                downloadUrl = file.browser_download_url;
              }
            }
          }
        }
      }
      if (!downloadUrl) throw "COULDN'T DOWNLOAD FILE";
      const response_zip = await axios.get(downloadUrl, {
        responseType: "arraybuffer",
      });
      if (response_zip.status !== 200) throw "NETWORK ERROR";
      const zipPath = path.join(HANDLER, modPrefix + ".zip");
      await fs.promises.writeFile(
        zipPath,
        new Buffer.from(response_zip.data),
        "binary"
      );
      const zip = new admZip(zipPath);
      zip.extractAllTo(path.join(HANDLER, modPrefix), true);
      await fs.promises.unlink(zipPath);
      return true;
    } catch (e) {
      return false;
    }
  });

  // DIRECTORY BUTTON EVENT
  ipcMain.handle("search-directory", async (_, platform) => {
    let found = 0;
    let location = "";
    try {
      if (platform === "STEAM") {
        // GET STEAM REGISTRY DATA
        const linstalled = await Registry.get(
          "HKLM\\SOFTWARE\\WOW6432Node\\Valve\\Steam"
        );
        if (!linstalled) throw "not installed";
        const targetDir = path.join(linstalled.$values.installpath, "config");
        const isTargetDir = await fs.existsSync(targetDir);
        if (!isTargetDir) throw "no directory";
        // SEARCH AU INSTALLED LOCATION FROM STEAM CONFIG
        const files = await fs.promises.readdir(targetDir);
        const file = files.filter((e) => e === "libraryfolders.vdf");
        if (!file.length) throw "no libraryfolders";
        const vdfData = await fs.promises.readFile(
          path.join(targetDir, file[0]),
          "utf8"
        );
        const json = vdf.parse(vdfData).libraryfolders;
        for (const key in json) {
          if (found) break;
          if (Object.hasOwnProperty.call(json, key)) {
            if (Object.hasOwnProperty.call(json[key], "path")) {
              const common = path.join(json[key].path, "steamapps\\common");
              const folders = await fs.promises.readdir(common);
              for (let idx = 0; idx < folders.length; idx++) {
                const sub = folders[idx];
                const isAmongUs = await fs.existsSync(
                  path.join(common, sub, "Among Us.exe")
                );
                if (isAmongUs) {
                  found = 1;
                  location = path.join(common, sub);
                }
              }
            }
          }
        }
      } else if (platform === "EPIC") {
        // GET EPIC REGISTRY DATA
        const linstalled = await Registry.get(
          "HKLM\\SOFTWARE\\WOW6432Node\\Epic Games\\EpicGamesLauncher"
        );
        if (!linstalled) throw "not installed";
        const targetDir = path.join(
          linstalled.$values.appdatapath,
          "Manifests"
        );
        const isTargetDir = await fs.existsSync(targetDir);
        if (!isTargetDir) throw "no directory";
        // SEARCH AU INSTALLED LOCATION FROM EPIC CONFIG
        const files = await fs.promises.readdir(targetDir);
        const items = files.filter((e) => /.*\.item$/.test(e));
        for (let idx = 0; idx < items.length; idx++) {
          if (found) break;
          const item = items[idx];
          const json = await fs.promises.readFile(
            path.join(targetDir, item),
            "utf8"
          );
          const data = JSON.parse(json);
          if (data.LaunchExecutable === "Among Us.exe") {
            const installLocation = data.InstallLocation;
            const isinstallLocation = await fs.existsSync(installLocation);
            if (isinstallLocation) {
              found = 1;
              location = installLocation;
              break;
            }
          }
        }
      }
      return { found: found, location: location };
    } catch (e) {
      console.log(e);
      return { found: 0, path: "" };
    }
  });

  if (process.env.WEBPACK_DEV_SERVER_URL) {
    // Load the url of the dev server if in development mode
    await win.loadURL(process.env.WEBPACK_DEV_SERVER_URL);
    if (!process.env.IS_TEST) win.webContents.openDevTools();
  } else {
    createProtocol("app");
    // Load the index.html when not in development
    win.loadURL("app://./index.html");
  }
}

// Quit when all windows are closed.
app.on("window-all-closed", () => {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on("ready", async () => {
  if (isDevelopment && !process.env.IS_TEST) {
    // Install Vue Devtools
    try {
      await installExtension(VUEJS_DEVTOOLS);
    } catch (e) {
      console.error("Vue Devtools failed to install:", e.toString());
    }
  }
  createWindow();
});

// Exit cleanly on request from parent process in development mode.
if (isDevelopment) {
  if (process.platform === "win32") {
    process.on("message", (data) => {
      if (data === "graceful-exit") {
        app.quit();
      }
    });
  } else {
    process.on("SIGTERM", () => {
      app.quit();
    });
  }
}
