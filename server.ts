import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const isProduction = process.env.NODE_ENV === 'production';

app.use(express.json({ limit: '10mb' }));

// Persistent JSON file storage for team shared data
const DATA_DIR = path.resolve(__dirname, 'data');
const STORAGE_FILE = path.resolve(DATA_DIR, 'team-storage.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

interface StorageSchema {
  teamConfig: {
    sheetInfo: any | null;
    ownerEmail?: string;
    ownerName?: string;
    isPubliclyShared?: boolean;
    admins?: any[];
    playerStatuses?: Record<string, any>;
    updatedAt: string;
  };
  games: any[];
}

function readStorage(): StorageSchema {
  try {
    if (fs.existsSync(STORAGE_FILE)) {
      const content = fs.readFileSync(STORAGE_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      if (!parsed.teamConfig.admins) {
        parsed.teamConfig.admins = [];
      }
      if (!parsed.teamConfig.playerStatuses) {
        parsed.teamConfig.playerStatuses = {};
      }
      return parsed;
    }
  } catch (err) {
    console.error('Error reading team storage:', err);
  }
  return {
    teamConfig: {
      sheetInfo: null,
      admins: [],
      playerStatuses: {},
      updatedAt: new Date().toISOString(),
    },
    games: [],
  };
}

function writeStorage(data: StorageSchema) {
  try {
    fs.writeFileSync(STORAGE_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing team storage:', err);
  }
}

// API Routes
app.get('/api/team/config', (req, res) => {
  const data = readStorage();
  res.json(data.teamConfig);
});

app.post('/api/team/config', (req, res) => {
  const data = readStorage();
  data.teamConfig = {
    ...data.teamConfig,
    ...req.body,
    updatedAt: new Date().toISOString(),
  };
  writeStorage(data);
  res.json(data.teamConfig);
});

// Admins Management Routes
app.get('/api/team/admins', (req, res) => {
  const data = readStorage();
  res.json(data.teamConfig.admins || []);
});

app.post('/api/team/admins', (req, res) => {
  const data = readStorage();
  if (!data.teamConfig.admins) data.teamConfig.admins = [];

  const { email, name, role = 'manager', isDriveGranted = false } = req.body;
  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'Valid email is required' });
  }

  const cleanEmail = email.trim().toLowerCase();
  // Check if already exists
  const existingIdx = data.teamConfig.admins.findIndex(
    (a) => a.email.toLowerCase() === cleanEmail
  );

  const newAdmin = {
    id: `admin-${Date.now()}`,
    email: cleanEmail,
    name: name?.trim() || cleanEmail.split('@')[0],
    role,
    addedAt: new Date().toISOString(),
    isDriveGranted,
  };

  if (existingIdx !== -1) {
    data.teamConfig.admins[existingIdx] = {
      ...data.teamConfig.admins[existingIdx],
      ...newAdmin,
    };
  } else {
    data.teamConfig.admins.push(newAdmin);
  }

  writeStorage(data);
  res.json(newAdmin);
});

app.delete('/api/team/admins/:id', (req, res) => {
  const data = readStorage();
  if (!data.teamConfig.admins) data.teamConfig.admins = [];
  data.teamConfig.admins = data.teamConfig.admins.filter(
    (a) => a.id !== req.params.id && a.email !== req.params.id
  );
  writeStorage(data);
  res.json({ success: true });
});

// Player Statuses (Retirement, Transfer, Active) Routes
app.get('/api/team/players', (req, res) => {
  const data = readStorage();
  res.json(data.teamConfig.playerStatuses || {});
});

app.post('/api/team/players', (req, res) => {
  const data = readStorage();
  if (!data.teamConfig.playerStatuses) data.teamConfig.playerStatuses = {};

  const { name, status = 'active', note = '', destination = '' } = req.body;
  if (!name || typeof name !== 'string') {
    return res.status(400).json({ error: 'Player name is required' });
  }

  const cleanKey = name.trim().replace(/\s+/g, ' ');
  const statusInfo = {
    name: cleanKey,
    status,
    note: note?.trim(),
    destination: destination?.trim(),
    updatedAt: new Date().toISOString(),
  };

  data.teamConfig.playerStatuses[cleanKey] = statusInfo;
  writeStorage(data);
  res.json(statusInfo);
});

app.get('/api/games', (req, res) => {
  const data = readStorage();
  res.json(data.games);
});

app.post('/api/games', (req, res) => {
  const data = readStorage();
  if (Array.isArray(req.body.games)) {
    data.games = req.body.games;
    writeStorage(data);
    res.json({ success: true, count: data.games.length });
  } else {
    res.status(400).json({ error: 'games must be an array' });
  }
});

// Mount Vite or serve static files
async function startServer() {
  if (!isProduction) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
