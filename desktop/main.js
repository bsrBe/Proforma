const { app, BrowserWindow, ipcMain , session } = require('electron');
const path = require('path');
const http = require('http');
const next = require('next');
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken');
require('dotenv').config();
// const JWT_SECRET = process.env.JWT_SECRET;
const JWT_SECRET = 'your-secret-key-12345';
const { createProforma, getAllProformas } = require('./backend/controllers/proformaController')
const { createUser, findUser } = require('./backend/models/userModel');
const { startBackupScheduler } = require('./backup');
// const db = require('./backend/config/db');
require('./backend/models/proformaModel');
require('./backend/models/itemModel');
require('./backend/models/userModel');
let mainWindow;
process.chdir(path.join(__dirname, 'frontend'));
// Initialize the Next.js app
const dev = process.env.NODE_ENV !== 'production';
const nextApp = next({ dev, dir: path.join(__dirname, 'frontend') });
const handle = nextApp.getRequestHandler();

async function startNextServer() {
  await nextApp.prepare();
  const server = http.createServer((req, res) => {
    handle(req, res);
  });

  const port = 3000;
  server.listen(port, (err) => {
    if (err) throw err;
    console.log(`Next.js server running on http://localhost:${port}`);
  });
}

function createWindow() {
      
  mainWindow = new BrowserWindow({
    maximized: true,
    title: 'Fast-Proforma',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });


  setTimeout(() => {
    mainWindow.loadURL('http://localhost:3000').catch((err) => {
      console.error('Failed to load Next.js app:', err);
    });
  }, 2000); // Delay by 2 seconds

  if (dev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  await startNextServer();
  createWindow();

  startBackupScheduler();

  //     // --- IPC Handlers ---
    ipcMain.handle('create-proforma', async (event, proformaData) => {
        try {
            const newProforma = await createProforma(proformaData);
            return newProforma;
        } catch (error) {
            console.error('Error creating proforma:', error);
            throw error;
        }
    });

    ipcMain.handle('get-proformas', async (event , ) => {
        try {
            const proformas = await getAllProformas();
            return proformas;
        } catch (error) {
            console.error('Error getting proformas:', error);
            throw error;
        }
    });
    
   
    ipcMain.handle('get-proforma-by-id', async (event, id) => {
        try {
            const proforma = await getProformaById(id);
            return proforma;
        } catch (error) {
            console.error('Error getting proforma by ID:', error);
            throw error;
        }
    });

    ipcMain.handle('update-proforma', async (event, id, proformaData) => {
        try {
            const updatedProforma = await updateProforma(id, proformaData);
            return updatedProforma;
        } catch (error) {
            console.error('Error updating proforma:', error);
            throw error;
        }
    });

    ipcMain.handle('delete-proforma', async (event, id) => {
        try {
            const result = await deleteProforma(id);
            return result;
        } catch (error) {
            console.error('Error deleting proforma:', error);
            throw error;
        }
    });

    ipcMain.handle('signup', async (event, userData) => {
      try {
        const { usernameOrEmail, password } = userData;
        if (!usernameOrEmail || !password) {
          throw new Error('signup: usernameOrEmail and password are required');
        }
        const newUser = await createUser(usernameOrEmail, password);
        return { success: true, user: newUser };
      } catch (error) {
        console.error('Error signing up:', error);
        return { success: false, message: error.message };
      }
    });

    ipcMain.handle('login', async (event, userData) => {
        try {
          const { usernameOrEmail, password } = userData;
          if (!usernameOrEmail || !password) {
            throw new Error('login: usernameOrEmail and password are required');
          }
          console.log('main.js: IPC login called with:', userData);
          const user = await findUser(usernameOrEmail);
          console.log('main.js: Found user:', user);
      
          if (!user) {
            return { success: false, message: 'Invalid credentials' };
          }
      
          const passwordMatch = await bcrypt.compare(password, user.password);
          console.log('main.js: Password match:', passwordMatch);
      
          if (!passwordMatch) {
            return { success: false, message: 'Invalid credentials' };
          }
      
          const token = jwt.sign(
            { id: user.id, usernameOrEmail: user.usernameOrEmail },
            JWT_SECRET,
            { expiresIn: '1h' } // Token expires in 1 hour
          );
          console.log('main.js: Generated token:', token);

          await session.defaultSession.cookies.set({
            url: 'http://localhost:3000',
            name: 'authToken',
            value: token,
            httpOnly: true, // Prevents JavaScript access
            secure: dev ? false : true, // Use secure cookies in production
            path: '/',
            expirationDate: Math.floor(Date.now() / 1000) + 60 * 60, // 1 hour
          });
          console.log('main.js: Set HTTP-only cookie: authToken')
          return {
            success: true,
            user: { id: user.id, usernameOrEmail: user.usernameOrEmail },
            token, // Include the token in the response
          };
          
        } catch (error) {
          console.error('main.js: Error logging in:', error);
          return { success: false, message: error.message };
        }
      });



      ipcMain.handle('get-auth-token', async (event) => {
        try {
          const cookies = await session.defaultSession.cookies.get({ name: 'authToken' });
          if (cookies.length > 0) {
            return cookies[0].value;
          }
          throw new Error('No authentication token found');
        } catch (error) {
          console.error('main.js: Error getting auth token:', error);
          throw error;
        }
      });
      
      ipcMain.handle('clear-auth-token', async (event) => {
        try {
          await session.defaultSession.cookies.remove('http://localhost:3000', 'authToken');
          console.log('main.js: Cleared authToken cookie');
          return { success: true };
        } catch (error) {
          console.error('main.js: Error clearing auth token:', error);
          throw error;
        }
      });
    });

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (mainWindow === null) {
        createWindow();
    }
});
