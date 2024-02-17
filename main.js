const { app, BrowserWindow, Menu, MenuItem, ipcMain} = require('electron')
const { sendRequest } = require('./requests')
const path = require('path')

const createWindow = () => {
  const preloadScriptPath = path.join(__dirname, 'preload.js');
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      contextIsolation: true, preload: path.join(__dirname, 'preload.js')
    }
  })
  
  win.loadFile('index.html')
  
  ipcMain.handle('request', async function request(_event, ...args) {
    var id = await sendRequest(win.webContents, ...args);
    return id
  })
}

//Menu.setApplicationMenu(null)

app.whenReady().then(() => {
  createWindow()
})


//for (const dependency of ['chrome', 'node', 'electron']) {
//  console.log(`${dependency} ver ${process.versions[dependency]}`)
//}