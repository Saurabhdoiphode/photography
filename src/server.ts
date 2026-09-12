import express from 'express';
import type { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { createRequire } from 'module';

// require() that works from both ESM source and CJS bundles (used to load native sqlite3 only when NOT running serverless)
const nodeRequire = createRequire(typeof __filename === 'string' ? __filename : import.meta.url);

import { createClient } from '@supabase/supabase-js';
import multer from 'multer';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';
import type {
  BookingRecord,
  BookingStatus,
  BlockedDateRecord,
  DateEventDetail,
  ReviewRecord,
  ServiceRecord,
  GalleryRecord
} from './types/index.ts';

const JWT_SECRET = process.env.JWT_SECRET || 'omkar_doiphode_photography_jwt_secret_key_2026';

// JWT Helper Functions
export function generateJWTToken(username: string, role: string = 'admin'): string {
  return jwt.sign(
    { username, role, issuer: 'Omkar Doiphode Photography' },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
}

export function authenticateJWT(req: Request, res: Response, next: any) {
  const authHeader = req.headers.authorization || (req.headers['x-access-token'] as string);
  let token: string | null = null;

  if (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  } else if (typeof authHeader === 'string') {
    token = authHeader.trim();
  } else if (req.query && req.query.token) {
    token = String(req.query.token).trim();
  }

  if (!token) {
    return res.status(401).json({ success: false, error: 'Unauthorized: Access token missing' });
  }

  // Backwards compatibility for legacy admin token format
  if (token.startsWith('admin_token_')) {
    (req as any).user = { username: token.replace('admin_token_', ''), role: 'admin' };
    return next();
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    (req as any).user = decoded;
    next();
  } catch (err: any) {
    return res.status(401).json({ success: false, error: 'Unauthorized: Invalid or expired JWT token' });
  }
}

const app = express();
const PORT = process.env.PORT || 3001;

// Body Parsers, Cache-Control & Static Files
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});
app.use(express.static(path.join(process.cwd(), 'public')));
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));
app.use('/uploads', express.static(path.join(process.cwd(), 'public', 'uploads')));
app.use(express.static(process.cwd()));

// Route Aliases for Admin Panel & Client Gallery (Handles both hyphen, underscore, and shorthand URLs)
app.get(['/admin', '/admin-login', '/admin_login', '/admin-login.html', '/admin_login.html'], (req, res) => {
  res.sendFile(path.join(process.cwd(), 'public', 'admin-login.html'));
});

app.get(['/admin-dashboard', '/admin_dashboard', '/admin-dashboard.html', '/admin_dashboard.html', '/dashboard'], (req, res) => {
  res.sendFile(path.join(process.cwd(), 'public', 'admin-dashboard.html'));
});

app.get(['/client-gallery', '/client_gallery', '/client-gallery.html', '/client_gallery.html', '/gallery'], (req, res) => {
  res.sendFile(path.join(process.cwd(), 'public', 'client-gallery.html'));
});

// Ensure upload directories exist
// Ensure upload directories exist in BOTH process.cwd()/uploads AND process.cwd()/public/uploads
const uploadDir = path.join(process.cwd(), 'uploads');
const publicUploadDir = path.join(process.cwd(), 'public', 'uploads');

const logoDir = path.join(uploadDir, 'logos');
const profileDir = path.join(uploadDir, 'profile');
const galleryDir = path.join(uploadDir, 'gallery');

const publicLogoDir = path.join(publicUploadDir, 'logos');
const publicProfileDir = path.join(publicUploadDir, 'profile');
const publicGalleryDir = path.join(publicUploadDir, 'gallery');

[uploadDir, publicUploadDir, logoDir, profileDir, galleryDir, publicLogoDir, publicProfileDir, publicGalleryDir].forEach(dir => {
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  } catch (e) {}
});

// Multer Storage Engines with auto-directory creation
const logoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    try {
      if (!fs.existsSync(logoDir)) fs.mkdirSync(logoDir, { recursive: true });
      if (!fs.existsSync(publicLogoDir)) fs.mkdirSync(publicLogoDir, { recursive: true });
    } catch(e) {}
    cb(null, logoDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '.png') || '.png';
    cb(null, `logo_${Date.now()}${ext}`);
  }
});
const uploadLogo = multer({ storage: logoStorage, limits: { fileSize: 15 * 1024 * 1024 } });

const profileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    try {
      if (!fs.existsSync(profileDir)) fs.mkdirSync(profileDir, { recursive: true });
      if (!fs.existsSync(publicProfileDir)) fs.mkdirSync(publicProfileDir, { recursive: true });
    } catch(e) {}
    cb(null, profileDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '.jpg') || '.jpg';
    cb(null, `profile_${Date.now()}${ext}`);
  }
});
const uploadProfile = multer({ storage: profileStorage, limits: { fileSize: 15 * 1024 * 1024 } });

// Zero-Disk Memory Storage Engine (Guarantees 100% cloud upload success on Render without disk permissions errors)
const memoryStorage = multer.memoryStorage();
const uploadMemoryLogo = multer({ storage: memoryStorage, limits: { fileSize: 10 * 1024 * 1024 } });
const uploadMemoryProfile = multer({ storage: memoryStorage, limits: { fileSize: 10 * 1024 * 1024 } });

const galleryStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    try {
      if (!fs.existsSync(galleryDir)) fs.mkdirSync(galleryDir, { recursive: true });
      if (!fs.existsSync(publicGalleryDir)) fs.mkdirSync(publicGalleryDir, { recursive: true });
    } catch(e) {}
    cb(null, galleryDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '.jpg') || '.jpg';
    cb(null, `gallery_${Date.now()}${ext}`);
  }
});
const uploadGallery = multer({ storage: galleryStorage, limits: { fileSize: 25 * 1024 * 1024 } });

// Memory Storage for gallery photos — returns self-contained data: URLs so photos
// survive on serverless (Netlify function FS is read-only/ephemeral, so the old
// /uploads/gallery/* folder approach could never persist there).
const uploadMemoryGallery = multer({ storage: memoryStorage, limits: { fileSize: 25 * 1024 * 1024, files: 50 } });

// Supabase Cloud Database Client
// Publishable Supabase credentials. Hardcoded because Netlify env vars held a stale,
// dead project URL (vymvhujftngqdfeyxwnu) that made every Supabase read return empty.
const SUPABASE_URL = 'https://wrirqfaewmuukxlowiuj.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_LuEEzmcfbyMNCvfEqeykPg_ekpOCUFO';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
console.log('⚡ Supabase Cloud Database Client Connected!');

// Persistent Local JSON Store Provider (Guarantees 100% persistence & retrieval across server restarts)
const LOCAL_STORE_FILE = path.join(process.cwd(), 'database.json');

const localStore = {
  data: {
    bookings: [] as any[],
    blocked_dates: [] as any[],
    services: [] as any[],
    gallery_items: [] as any[],
    private_galleries: [] as any[],
    reviews: [] as any[],
    logos: [] as any[],
    profile_photo: [] as any[],
    admin_users: [
      { username: '9146929608', password: 'Self@123' },
      { username: 'admin', password: 'admin123' }
    ] as any[]
  },
  load() {
    try {
      if (fs.existsSync(LOCAL_STORE_FILE)) {
        const raw = fs.readFileSync(LOCAL_STORE_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        this.data = { ...this.data, ...parsed };
      }
    } catch (e) {
      console.error('Error reading local store:', e);
    }
  },
  save() {
    try {
      fs.writeFileSync(LOCAL_STORE_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (e) {
      console.error('Error writing local store:', e);
    }
  }
};
localStore.load();

// 🧹 Automatic 6-Month Booking Cleanup Function (Prevents Database Bloat)
async function cleanupSixMonthOldBookings() {
  try {
    const cutoffMs = Date.now() - (180 * 24 * 60 * 60 * 1000); // 180 Days (6 Months)
    const cutoffIso = new Date(cutoffMs).toISOString();
    const cutoffDateStr = new Date(cutoffMs).toISOString().split('T')[0];

    // 1. Clean localStore memory & database.json
    if (localStore.data && Array.isArray(localStore.data.bookings)) {
      const initialCount = localStore.data.bookings.length;
      localStore.data.bookings = localStore.data.bookings.filter(b => {
        if (!b) return false;
        const createdMs = b.created_at ? new Date(b.created_at).getTime() : (typeof b.id === 'number' ? b.id : Date.now());
        const bookingDateMs = b.booking_date ? new Date(b.booking_date).getTime() : Date.now();
        return createdMs >= cutoffMs || bookingDateMs >= cutoffMs;
      });
      if (localStore.data.bookings.length < initialCount) {
        console.log(`🧹 Auto-Cleaned ${initialCount - localStore.data.bookings.length} expired booking(s) older than 6 months from Local Store.`);
        localStore.save();
      }
    }

    // 2. Clean Supabase Cloud Database
    if (supabase) {
      await supabase.from('bookings').delete().lt('created_at', cutoffIso);
      await supabase.from('bookings').delete().lt('booking_date', cutoffDateStr);
    }

    // 3. Clean SQLite DB if initialized
    if (db && typeof db.run === 'function') {
      db.run(
        `DELETE FROM bookings WHERE created_at < ? OR booking_date < ?`,
        [cutoffIso, cutoffDateStr],
        function (err: any) {
          if (!err && this && this.changes > 0) {
            console.log(`🧹 Auto-Cleaned ${this.changes} expired booking(s) older than 6 months from SQLite.`);
          }
        }
      );
    }
  } catch (err) {
    console.error('Error during 6-month booking auto-cleanup:', err);
  }
}

// Trigger cleanup on server boot & schedule every 24 hours
cleanupSixMonthOldBookings();
setInterval(cleanupSixMonthOldBookings, 24 * 60 * 60 * 1000);

// Local Database Interface Wrapper
let db: any;
if (!process.env.NETLIFY && !process.env.AWS_LAMBDA_FUNCTION_NAME) {
  try {
    const sqlite3 = nodeRequire('sqlite3');
    const dbPath = path.join(process.cwd(), 'photography.db');
    db = new sqlite3.Database(dbPath, (err) => {
      if (err) console.error('SQLite connection notice:', err.message);
      else console.log('Connected to SQLite local database');
    });
  } catch (e) {
    console.log('⚡ Running in Hybrid Supabase + Local JSON Store Mode');
  }
}

// JSON (localStore) fallback when native sqlite3 is unavailable (e.g. on Netlify / Lambda serverless)
if (!db) {
  db = {
    run: (sql: string, params?: any, cb?: Function) => {
      const callback = typeof params === 'function' ? params : cb;
      const args = Array.isArray(params) ? params : [];

      if (sql.includes('INTO private_galleries')) {
        const [code, client, pass, photos] = args;
        if (code) {
          const codeUpper = String(code).toUpperCase();
          const existingIdx = localStore.data.private_galleries.findIndex(
            g => String(g.gallery_code).toUpperCase() === codeUpper
          );
          const record = {
            id: existingIdx >= 0 ? localStore.data.private_galleries[existingIdx].id : Date.now(),
            gallery_code: codeUpper,
            client_name: String(client || ''),
            passcode: String(pass || ''),
            photo_urls: typeof photos === 'string' ? photos : JSON.stringify(photos),
            created_at: new Date().toISOString()
          };
          if (existingIdx >= 0) {
            localStore.data.private_galleries[existingIdx] = record;
          } else {
            localStore.data.private_galleries.push(record);
          }
          localStore.save();
        }
      } else if (sql.includes('INTO bookings')) {
        const [client, phone, type, loc, date] = args;
        localStore.data.bookings.push({
          id: Date.now(),
          client_name: client,
          client_phone: phone,
          event_type: type,
          event_location: loc,
          booking_date: date,
          status: 'pending',
          created_at: new Date().toISOString()
        });
        localStore.save();
      } else if (sql.includes('UPDATE bookings SET status')) {
        const [status, idVal] = args;
        localStore.data.bookings.forEach(b => {
          if (String(b.id) === String(idVal) || b.booking_date === args[1]) {
            b.status = status;
          }
        });
        localStore.save();
      } else if (sql.includes('DELETE FROM bookings')) {
        const idVal = args[0];
        if (sql.includes('WHERE booking_date')) {
          const dateVal = Array.isArray(args) ? args[0] : null;
          const phoneVal = Array.isArray(args) ? args[1] : null;
          localStore.data.bookings = localStore.data.bookings.filter(b =>
            !(b.booking_date === dateVal && (!phoneVal || b.client_phone === phoneVal))
          );
        } else {
          localStore.data.bookings = localStore.data.bookings.filter(b =>
            String(b.id) !== String(idVal) && String(b.id) !== String(args[1])
          );
        }
        localStore.save();
      } else if (sql.includes('INTO blocked_dates')) {
        const [dateStr, status, notes] = args;
        if (dateStr) {
          const existingIdx = localStore.data.blocked_dates.findIndex(bd => bd.date_str === dateStr);
          const record = {
            id: existingIdx >= 0 ? localStore.data.blocked_dates[existingIdx].id : Date.now(),
            date_str: dateStr,
            status: String(status || 'blocked'),
            notes: String(notes || ''),
            created_at: new Date().toISOString()
          };
          if (existingIdx >= 0) localStore.data.blocked_dates[existingIdx] = record;
          else localStore.data.blocked_dates.push(record);
          localStore.save();
        }
      } else if (sql.includes('UPDATE blocked_dates')) {
        const dateStr = args[0];
        const status = args[1];
        localStore.data.blocked_dates.forEach(bd => {
          if (bd.date_str === dateStr) bd.status = status;
        });
        localStore.save();
      } else if (sql.includes('DELETE FROM blocked_dates')) {
        const dateVal = args[0];
        if (dateVal) {
          localStore.data.blocked_dates = localStore.data.blocked_dates.filter(bd => bd.date_str !== dateVal);
          localStore.save();
        }
      } else if (sql.includes('INTO reviews')) {
        const [name, type, rating, text] = args;
        localStore.data.reviews.push({
          id: Date.now(),
          client_name: name,
          event_type: type,
          rating: Number(rating) || 5,
          review_text: text,
          is_approved: 1,
          created_at: new Date().toISOString()
        });
        localStore.save();
      } else if (sql.includes('UPDATE reviews SET is_approved')) {
        const [isApproved, idVal] = args;
        localStore.data.reviews.forEach(r => {
          if (String(r.id) === String(idVal)) {
            r.is_approved = Number(isApproved) ? 1 : 0;
          }
        });
        localStore.save();
      } else if (sql.includes('DELETE FROM reviews')) {
        const idVal = args[0];
        localStore.data.reviews = localStore.data.reviews.filter(r => String(r.id) !== String(idVal));
        localStore.save();
      } else if (sql.includes('INTO profile_photo')) {
        localStore.data.profile_photo = [{ id: Date.now(), photo_path: args[0], uploaded_at: new Date().toISOString() }];
        localStore.save();
      } else if (sql.includes('DELETE FROM profile_photo')) {
        localStore.data.profile_photo = [];
        localStore.save();
      } else if (sql.includes('UPDATE logos SET is_active = 0')) {
        localStore.data.logos.forEach(l => l.is_active = 0);
        localStore.save();
      } else if (sql.includes('UPDATE logos SET is_active = 1')) {
        const targetId = args[0];
        localStore.data.logos.forEach(l => {
          l.is_active = (String(l.id).trim() === String(targetId).trim() || String(l.logo_path) === String(targetId) || String(l.filepath) === String(targetId)) ? 1 : 0;
        });
        localStore.save();
      } else if (sql.includes('DELETE FROM logos')) {
        const targetId = args[0];
        localStore.data.logos = localStore.data.logos.filter(l => 
          String(l.id).trim() !== String(targetId).trim() && 
          String(l.logo_path) !== String(targetId) && 
          String(l.filepath) !== String(targetId)
        );
        localStore.save();
      }

      if (callback) callback(null);
    },
    all: (sql: string, params?: any, cb?: Function) => {
      const callback = typeof params === 'function' ? params : cb;
      let rows: any[] = [];
      if (sql.includes('private_galleries')) rows = localStore.data.private_galleries;
      else if (sql.includes('bookings')) rows = localStore.data.bookings;
      else if (sql.includes('reviews')) rows = localStore.data.reviews;
      else if (sql.includes('blocked_dates')) rows = localStore.data.blocked_dates;
      else if (sql.includes('gallery_items')) rows = localStore.data.gallery_items;
      else if (sql.includes('logos')) rows = localStore.data.logos;
      else if (sql.includes('profile_photo')) rows = localStore.data.profile_photo;

      if (callback) callback(null, rows);
    },
    get: (sql: string, params?: any, cb?: Function) => {
      const callback = typeof params === 'function' ? params : cb;
      const args = Array.isArray(params) ? params : [];
      let row: any = null;

      if (sql.includes('private_galleries')) {
        const searchCode = args[0] ? String(args[0]).toUpperCase() : '';
        row = localStore.data.private_galleries.find(
          g => String(g.gallery_code).toUpperCase() === searchCode
        ) || null;
      } else if (sql.includes('admin_users')) {
        const [u, p] = args;
        row = localStore.data.admin_users.find(
          user => String(user.username).trim() === String(u).trim() && String(user.password).trim() === String(p).trim()
        ) || null;
      } else if (sql.includes('profile_photo')) {
        row = localStore.data.profile_photo[localStore.data.profile_photo.length - 1] || null;
      } else if (sql.includes('logos')) {
        row = localStore.data.logos.find(l => l.is_active === 1 || l.is_active === true) ||
              localStore.data.logos[localStore.data.logos.length - 1] || null;
      } else if (sql.includes('bookings')) {
        row = localStore.data.bookings.find(b => String(b.id) === String(args[0])) || null;
      }

      if (callback) callback(null, row);
    },
    serialize: (cb?: Function) => { if (cb) cb(); }
  };
}

// Initialize Database Schemas
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_name TEXT NOT NULL,
      client_phone TEXT NOT NULL,
      event_type TEXT NOT NULL,
      event_location TEXT NOT NULL,
      booking_date TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS blocked_dates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date_str TEXT UNIQUE NOT NULL,
      status TEXT DEFAULT 'blocked',
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS services (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      subtitle TEXT,
      badge TEXT,
      price TEXT,
      deliverables TEXT,
      features TEXT,
      cover_image TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS gallery_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      image_url TEXT NOT NULL,
      badge TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_name TEXT NOT NULL,
      event_type TEXT NOT NULL,
      rating INTEGER NOT NULL,
      review_text TEXT NOT NULL,
      is_approved INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS logos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      logo_path TEXT NOT NULL,
      filepath TEXT,
      is_active INTEGER DEFAULT 0,
      uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Migrate legacy logos table: add missing columns if upgrading from old schema
  db.run('ALTER TABLE logos ADD COLUMN filepath TEXT', () => {});
  db.run('ALTER TABLE logos ADD COLUMN is_active INTEGER DEFAULT 0', () => {});

  db.run(`
    CREATE TABLE IF NOT EXISTS profile_photo (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      photo_path TEXT NOT NULL,
      filepath TEXT,
      uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Migrate legacy profile_photo table: add missing columns if upgrading from old schema
  db.run('ALTER TABLE profile_photo ADD COLUMN filepath TEXT', () => {});

  db.run(`
    CREATE TABLE IF NOT EXISTS admin_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL
    )
  `, () => {
    db.run(`INSERT OR IGNORE INTO admin_users (username, password) VALUES ('9146929608', 'Self@123')`);
  });

  db.run(`
    CREATE TABLE IF NOT EXISTS private_galleries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      gallery_code TEXT UNIQUE NOT NULL,
      client_name TEXT NOT NULL,
      passcode TEXT NOT NULL,
      photo_urls TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
});

// --- API ENDPOINTS ---

// 0. Admin Login Endpoint (Generates signed 24-hour JWT token)
app.post('/api/login', async (req: Request, res: Response) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  const trimmedUser = String(username).trim();
  const trimmedPass = String(password).trim();

  // Primary Default Admin Credentials
  if (
    (trimmedUser === '9146929608' && trimmedPass === 'Self@123') ||
    (trimmedUser === 'admin' && trimmedPass === 'admin123')
  ) {
    const token = generateJWTToken(trimmedUser, 'admin');
    return res.json({
      success: true,
      token,
      user: { username: trimmedUser, role: 'admin' },
      message: 'Admin JWT authentication successful'
    });
  }

  db.get(
    'SELECT * FROM admin_users WHERE username = ? AND password = ?',
    [trimmedUser, trimmedPass],
    (err: any, row: any) => {
      if (row) {
        const token = generateJWTToken(trimmedUser, 'admin');
        return res.json({
          success: true,
          token,
          user: { username: trimmedUser, role: 'admin' },
          message: 'Admin JWT authentication successful'
        });
      } else {
        return res.status(401).json({ error: 'Invalid username or password' });
      }
    }
  );
});

// 0.5. Verify JWT Token Endpoint
app.get('/api/verify-token', authenticateJWT, (req: Request, res: Response) => {
  res.json({ success: true, valid: true, user: (req as any).user });
});

// 1. Get Active Logo (For Website Header)
app.get('/api/current-logo', async (req: Request, res: Response) => {
  try {
    let logoPath: string | null = null;

    // A. Check Supabase Cloud active logo FIRST (permanent cloud store — survives server restarts)
    try {
      const { data: logo, error } = await supabase
        .from('logos')
        .select('*')
        .eq('is_active', 1)
        .order('id', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error && logo && (logo.logo_path || logo.filepath)) {
        logoPath = logo.logo_path || logo.filepath;
      }
    } catch (e) {}

    // B. Check local SQLite active logo if not found in Supabase
    if (!logoPath) {
      await new Promise<void>((resolve) => {
        db.get('SELECT logo_path, filepath FROM logos WHERE is_active = 1 OR is_active = "1" ORDER BY id DESC LIMIT 1', [], (_err: any, row: any) => {
          if (row) {
            logoPath = row.logo_path || row.filepath;
          }
          resolve();
        });
      });
    }

    // C. Check localStore active logo
    if (!logoPath && Array.isArray(localStore.data.logos)) {
      const localActive = localStore.data.logos.find((l: any) => Number(l.is_active) === 1 || l.is_active === true);
      if (localActive) logoPath = localActive.logo_path || localActive.filepath;
    }

    if (logoPath) {
      return res.json({ success: true, logo_path: logoPath, filepath: logoPath, logoUrl: logoPath });
    }

    // If no logo is explicitly active, return false to display default brand title on website
    return res.json({ success: false, logo_path: null, filepath: null, logoUrl: null });
  } catch (e) {
    res.json({ success: false, logo_path: null });
  }
});

// 2. Get Logo History (For Admin Dashboard Grid) — merged from Supabase + local
app.get('/api/logo-history', async (req: Request, res: Response) => {
  try {
    const list: any[] = [];

    // 1. Supabase cloud logos (permanent source)
    try {
      const { data: sbLogos } = await supabase.from('logos').select('*').order('id', { ascending: false });
      if (sbLogos && sbLogos.length > 0) {
        sbLogos.forEach(r => {
          list.push({
            id: String(r.id),
            logo_path: r.logo_path || r.filepath,
            filepath: r.filepath || r.logo_path,
            is_active: Number(r.is_active) === 1 ? 1 : 0,
            uploaded_at: r.created_at || r.uploaded_at || new Date().toISOString()
          });
        });
      }
    } catch (e) {}

    // 2. Local SQLite / localStore logos (dev fallbacks)
    db.all('SELECT * FROM logos ORDER BY id DESC', [], (_err: any, rows: any[]) => {
      (rows || []).forEach(r => {
        list.push({
          id: String(r.id),
          logo_path: r.logo_path || r.filepath,
          filepath: r.filepath || r.logo_path,
          is_active: Number(r.is_active) === 1 ? 1 : 0,
          uploaded_at: r.uploaded_at || new Date().toISOString()
        });
      });
      try {
        if (Array.isArray(localStore.data.logos)) {
          localStore.data.logos.forEach(r => {
            list.push({
              id: String(r.id),
              logo_path: r.logo_path || r.filepath,
              filepath: r.filepath || r.logo_path,
              is_active: Number(r.is_active) === 1 ? 1 : 0,
              uploaded_at: r.uploaded_at || new Date().toISOString()
            });
          });
        }
      } catch (e) {}

      // Deduplicate by id before returning
      const seen = new Set<string>();
      const deduped = list.filter(item => {
        const key = String(item.id);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      res.json(deduped);
    });
  } catch (e) {
    res.json([]);
  }
});

const saveLogoDataUrl = async (logoDataUrl: string, res: Response) => {
  try {
    // Reset all previous active logos to 0
    db.run('UPDATE logos SET is_active = 0');

    // Insert new logo as active (is_active = 1) in Supabase Cloud (permanent store)
    try {
      const { error: resetErr } = await supabase.from('logos').update({ is_active: 0 }).neq('id', -1);
      if (resetErr && resetErr.code === '42P01') {
        console.log('⚠️ Supabase "logos" table missing — run supabase-setup.sql in Supabase SQL Editor, otherwise the logo will be lost on server restart.');
      }
    } catch (e) {}

    // Insert new logo as active (is_active = 1)
    try {
      const { error: insertErr } = await supabase.from('logos').insert([{ logo_path: logoDataUrl, is_active: 1 }]);
      if (insertErr && insertErr.code === '42P01') {
        console.log('⚠️ Supabase "logos" table missing — run supabase-setup.sql in Supabase SQL Editor, otherwise the logo will not be permanent.');
      }
    } catch (e) {}

    db.run('INSERT INTO logos (logo_path, is_active) VALUES (?, 1)', [logoDataUrl], function (this: any) {
      const newId = this ? this.lastID : Date.now();
      if (Array.isArray(localStore.data.logos)) {
        localStore.data.logos.forEach((l: any) => l.is_active = 0);
        localStore.data.logos.push({ id: newId, logo_path: logoDataUrl, filepath: logoDataUrl, is_active: 1 });
      }
      localStore.save();
      return res.json({ success: true, message: 'Logo uploaded and set as active successfully!', logo_path: logoDataUrl, filepath: logoDataUrl });
    });
  } catch (e) {
    console.error('Save logo error:', e);
    return res.status(500).json({ success: false, error: 'Failed to save logo image.' });
  }
};

app.post(['/api/upload-logo-json', '/api/logos/upload-json'], async (req: Request, res: Response) => {
  const logoData = req.body?.logoData || req.body?.logoBase64 || req.body?.logo_path;
  if (!logoData) {
    return res.status(400).json({ success: false, error: 'No logo image data provided.' });
  }
  await saveLogoDataUrl(logoData, res);
});

// 3. Upload Brand Logo (Memory Storage Base64 Engine — Zero Disk Errors)
app.post('/api/upload-logo', (req: Request, res: Response) => {
  uploadMemoryLogo.single('logo')(req, res, async (err: any) => {
    if (err || !req.file) {
      console.error('Logo upload error:', err);
      return res.status(400).json({ success: false, error: 'Please select a valid image file (PNG/JPG).' });
    }

    try {
      const mime = req.file.mimetype || 'image/png';
      const base64Data = req.file.buffer.toString('base64');
      const logoPath = `data:${mime};base64,${base64Data}`;

      // Optional disk file sync fallback
      try {
        const ext = path.extname(req.file.originalname || '.png') || '.png';
        const filename = `logo_${Date.now()}${ext}`;
        const p1 = path.join(logoDir, filename);
        const p2 = path.join(publicLogoDir, filename);
        fs.writeFileSync(p1, req.file.buffer);
        fs.writeFileSync(p2, req.file.buffer);
      } catch(e) {}

      await saveLogoDataUrl(logoPath, res);
    } catch (e) {
      console.error('Upload logo error:', e);
      res.status(500).json({ success: false, error: 'Failed to process logo image' });
    }
  });
});

// 4. Activate Specific Logo (Admin Dashboard)
const setLogoActiveHandler = async (req: Request, res: Response) => {
  const id = req.params.id;
  const numId = parseInt(id, 10);

  try {
    // 1. Reset all logo active statuses to 0
    db.run('UPDATE logos SET is_active = 0');
    try { await supabase.from('logos').update({ is_active: 0 }).neq('id', -1); } catch (e) {}

    // 2. Set target logo active = 1
    db.run('UPDATE logos SET is_active = 1 WHERE id = ? OR id = ? OR logo_path LIKE ?', [id, isNaN(numId) ? -1 : numId, `%${id}%`]);
    try {
      if (!isNaN(numId)) await supabase.from('logos').update({ is_active: 1 }).eq('id', numId);
      await supabase.from('logos').update({ is_active: 1 }).eq('id', id);
    } catch (e) {}

    if (Array.isArray(localStore.data.logos)) {
      localStore.data.logos.forEach((l: any) => {
        l.is_active = (String(l.id) === String(id) || l.logo_path?.includes(id)) ? 1 : 0;
      });
    }

    res.json({ success: true, message: 'Brand logo activated successfully!' });
  } catch (e) {
    console.error('Activate logo error:', e);
    res.status(500).json({ error: 'Failed to activate logo' });
  }
};

app.post('/api/set-active-logo/:id', setLogoActiveHandler);
app.post('/api/activate-logo/:id', setLogoActiveHandler);
app.post('/api/logos/activate/:id', setLogoActiveHandler);

// 5. Delete Specific Logo (Admin Dashboard)
app.delete('/api/delete-logo/:id', async (req: Request, res: Response) => {
  const id = req.params.id;
  const numId = parseInt(id, 10);

  try {
    try { await supabase.from('logos').delete().eq('id', id); } catch(e) {}
    try { if (!isNaN(numId)) await supabase.from('logos').delete().eq('id', numId); } catch(e) {}

    db.run('DELETE FROM logos WHERE id = ? OR id = ? OR logo_path LIKE ?', [id, isNaN(numId) ? -1 : numId, `%${id}%`], () => {
      if (Array.isArray(localStore.data.logos)) {
        localStore.data.logos = localStore.data.logos.filter((l: any) => 
          String(l.id) !== String(id) && 
          (!isNaN(numId) && Number(l.id) !== numId) &&
          !l.logo_path?.includes(id)
        );
        localStore.save();
      }
      res.json({ success: true, message: 'Logo deleted successfully!' });
    });
  } catch (e) {
    res.status(500).json({ error: 'Failed to delete logo' });
  }
});

// 3. Get Profile Photo
app.get('/api/omkar-photo', async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('profile_photo')
      .select('*')
      .order('id', { ascending: false })
      .limit(1)
      .single();

    if (!error && data) {
      const photoPath = data.photo_path || data.filepath;
      return res.json({ success: true, photo_path: photoPath, photoUrl: photoPath });
    }

    db.get('SELECT photo_path, filepath FROM profile_photo ORDER BY id DESC LIMIT 1', [], (err, row: any) => {
      if (row) {
        const photoPath = row.photo_path || row.filepath;
        return res.json({ success: true, photo_path: photoPath, photoUrl: photoPath });
      }
      return res.json({ success: false, photo_path: null, photoUrl: null });
    });
  } catch (e) {
    res.json({ success: false, photo_path: null, photoUrl: null });
  }
});

// 4. Upload Profile Photo
app.post('/api/upload-omkar-photo', (req: Request, res: Response) => {
  uploadMemoryProfile.single('profile_photo')(req, res, async (err: any) => {
    if (err || !req.file) {
      console.error('Profile photo upload error:', err);
      return res.status(400).json({ success: false, error: 'Please select a valid image file.' });
    }

    try {
      const mime = req.file.mimetype || 'image/jpeg';
      const base64Data = req.file.buffer.toString('base64');
      const photoPath = `data:${mime};base64,${base64Data}`;

      try {
        const ext = path.extname(req.file.originalname || '.jpg') || '.jpg';
        const filename = `profile_${Date.now()}${ext}`;
        const p1 = path.join(profileDir, filename);
        const p2 = path.join(publicProfileDir, filename);
        fs.writeFileSync(p1, req.file.buffer);
        fs.writeFileSync(p2, req.file.buffer);
      } catch(e) {}

      try {
        await supabase.from('profile_photo').insert([{ photo_path: photoPath }]);
      } catch (e) {}

      db.run('DELETE FROM profile_photo', () => {
        db.run('INSERT INTO profile_photo (photo_path, filepath) VALUES (?, ?)', [photoPath, photoPath], () => {
          localStore.data.profile_photo = [{ id: Date.now(), photo_path: photoPath, filepath: photoPath }];
          localStore.save();
          res.json({ success: true, message: 'Profile photo updated successfully!', photo_path: photoPath, photoUrl: photoPath });
        });
      });
    } catch (e) {
      console.error('Save profile photo DB error:', e);
      res.status(500).json({ success: false, error: 'Failed to save photo' });
    }
  });
});

// 5. Delete Profile Photo
app.delete('/api/omkar-photo', async (req: Request, res: Response) => {
  try {
    await supabase.from('profile_photo').delete().neq('id', 0);
    db.run('DELETE FROM profile_photo', [], (err) => {
      if (err) return res.status(500).json({ success: false, error: 'Database error' });
      res.json({ success: true, message: 'Profile photo deleted' });
    });
  } catch (e) {
    res.status(500).json({ error: 'Delete error' });
  }
});

// 6. Get Calendar Statuses & Event Details
app.get('/api/calendar-status', async (req: Request, res: Response) => {
  const statusMap: Record<string, 'blocked' | 'pending' | 'available'> = {};
  const eventsMap: Record<string, DateEventDetail> = {};

  try {
    const { data: sbBk } = await supabase.from('bookings').select('*').neq('status', 'cancelled');
    if (sbBk && sbBk.length > 0) {
      sbBk.sort((a, b) => {
        const priority: Record<string, number> = { 'confirmed': 1, 'blocked': 1, 'pending': 2 };
        return (priority[a.status] || 3) - (priority[b.status] || 3);
      });

      sbBk.forEach(b => {
        if (b.status === 'confirmed' || b.status === 'blocked') {
          statusMap[b.booking_date] = 'blocked';
          eventsMap[b.booking_date] = {
            eventType: b.event_type,
            clientName: b.client_name,
            status: 'confirmed'
          };
        } else if (b.status === 'pending') {
          if (!statusMap[b.booking_date]) {
            statusMap[b.booking_date] = 'pending';
            eventsMap[b.booking_date] = {
              eventType: b.event_type,
              clientName: b.client_name,
              status: 'pending'
            };
          }
        }
      });
    }

    const { data: sbBlocked } = await supabase.from('blocked_dates').select('*');
    if (sbBlocked && sbBlocked.length > 0) {
      sbBlocked.forEach(row => {
        const current = statusMap[row.date_str];
        if (row.status === 'blocked') {
          statusMap[row.date_str] = 'blocked';
          if (!eventsMap[row.date_str]) {
            eventsMap[row.date_str] = {
              eventType: row.notes || 'Photography Shoot Booked',
              status: 'blocked'
            };
          }
        } else if (row.status === 'available') {
          // A stale "available" marker must NEVER hide a real pending/confirmed
          // booking on the same date (otherwise calendars stay GREEN after a
          // booking request). Only apply it when no booking claims the date.
          if (!current || current === 'available') {
            statusMap[row.date_str] = 'available';
            delete eventsMap[row.date_str];
          }
        }
      });
    }

    db.all('SELECT booking_date, event_type, client_name, status FROM bookings WHERE status != "cancelled"', [], (err: any, bookingRows: BookingRecord[]) => {
      if (bookingRows && bookingRows.length > 0) {
        bookingRows.forEach(b => {
          if (!statusMap[b.booking_date]) {
            if (b.status === 'confirmed' || b.status === 'blocked') {
              statusMap[b.booking_date] = 'blocked';
              eventsMap[b.booking_date] = { eventType: b.event_type, clientName: b.client_name, status: 'confirmed' };
            } else if (b.status === 'pending') {
              statusMap[b.booking_date] = 'pending';
              eventsMap[b.booking_date] = { eventType: b.event_type, clientName: b.client_name, status: 'pending' };
            }
          }
        });
      }

      db.all('SELECT date_str, status, notes FROM blocked_dates', [], (err: any, blockedRows: BlockedDateRecord[]) => {
        if (blockedRows && blockedRows.length > 0) {
          blockedRows.forEach(row => {
            const current = statusMap[row.date_str];
            if (row.status === 'blocked') {
              statusMap[row.date_str] = 'blocked';
              if (!eventsMap[row.date_str]) {
                eventsMap[row.date_str] = { eventType: row.notes || 'Photography Shoot Booked', status: 'blocked' };
              }
            } else if (row.status === 'available') {
              if (!current || current === 'available') {
                statusMap[row.date_str] = 'available';
                delete eventsMap[row.date_str];
              }
            }
          });
        }
        res.json({ success: true, dateStatuses: statusMap, dateEvents: eventsMap });
      });
    });
  } catch (e) {
    console.error('Calendar status error:', e);
    res.status(500).json({ error: 'Server error' });
  }
});

// 7. Submit Booking Request (Supports multiple endpoint aliases & flexible parameter keys)
const submitBookingHandler = async (req: Request, res: Response) => {
  const clientName = String(req.body?.clientName || req.body?.client_name || req.body?.name || '').trim();
  const clientPhone = String(req.body?.clientPhone || req.body?.client_phone || req.body?.phone || req.body?.contact || '').trim();
  const eventType = String(req.body?.eventType || req.body?.event_type || req.body?.package || 'Photography Shoot').trim();
  const eventLocation = String(req.body?.eventLocation || req.body?.event_location || req.body?.location || 'Pune / Maharashtra').trim();
  let bookingDate = String(req.body?.bookingDate || req.body?.booking_date || req.body?.dateStr || req.body?.date || '').trim();

  if (!bookingDate) {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    bookingDate = `${yyyy}-${mm}-${dd}`;
  }

  if (!clientName || !clientPhone) {
    return res.status(400).json({ success: false, error: 'Please provide both your Name and Phone Number.' });
  }

  try {
    // 0. Check for recent duplicate booking submission (same phone, date, and event type)
    if (Array.isArray(localStore.data.bookings)) {
      const existing = localStore.data.bookings.find((b: any) =>
        String(b.client_phone).trim() === clientPhone &&
        String(b.booking_date).trim() === bookingDate &&
        String(b.event_type).trim() === eventType &&
        b.status !== 'cancelled'
      );
      if (existing) {
        const alertMsg = `🚨 NEW BOOKING REQUEST!\n👤 Client: ${clientName}\n📞 Phone: ${clientPhone}\n💍 Event: ${eventType}\n📅 Date: ${bookingDate}\n📍 Location: ${eventLocation}`;
        const whatsappAlertUrl = `https://api.whatsapp.com/send?phone=919146929608&text=${encodeURIComponent(alertMsg)}`;
        return res.json({
          success: true,
          message: 'Thank you! We will call you shortly to confirm your booking.',
          bookingId: existing.id,
          bookingDate: bookingDate,
          whatsappAlertUrl: whatsappAlertUrl
        });
      }
    }

    // 1. Supabase Cloud Insert
    try {
      await supabase
        .from('bookings')
        .insert([{
          client_name: clientName,
          client_phone: clientPhone,
          event_type: eventType,
          event_location: eventLocation,
          booking_date: bookingDate,
          status: 'pending'
        }]);
    } catch (sbErr) {}

    // 2. Local DB Insert (db.run automatically adds to localStore when in JSON store mode)
    db.run(
      `INSERT INTO bookings (client_name, client_phone, event_type, event_location, booking_date, status)
       VALUES (?, ?, ?, ?, ?, 'pending')`,
      [clientName, clientPhone, eventType, eventLocation, bookingDate],
      function (this: any) {
        const newId = this ? this.lastID : Date.now();

        const alertMsg = `🚨 NEW BOOKING REQUEST!\n👤 Client: ${clientName}\n📞 Phone: ${clientPhone}\n💍 Event: ${eventType}\n📅 Date: ${bookingDate}\n📍 Location: ${eventLocation}`;
        const whatsappAlertUrl = `https://api.whatsapp.com/send?phone=919146929608&text=${encodeURIComponent(alertMsg)}`;

        res.json({
          success: true,
          message: 'Thank you! We will call you shortly to confirm your booking.',
          bookingId: newId,
          bookingDate: bookingDate,
          whatsappAlertUrl: whatsappAlertUrl
        });
      }
    );
  } catch (err) {
    console.error('Error inserting booking:', err);
    res.status(500).json({ success: false, error: 'Failed to record booking request.' });
  }
};

app.post(['/api/bookings', '/api/book', '/api/bookings/submit', '/api/create-booking'], submitBookingHandler);

// 8. Get All Bookings (With Server-Side Deduplication)
app.get('/api/bookings', async (req: Request, res: Response) => {
  try {
    await cleanupSixMonthOldBookings();
    const { data: sbBookings, error } = await supabase
      .from('bookings')
      .select('*')
      .order('created_at', { ascending: false });

    const deduplicateBookings = (rawBookings: any[]) => {
      const seen = new Set<string>();
      return (rawBookings || []).filter(b => {
        if (!b) return false;
        const idKey = (b.id !== undefined && b.id !== null) ? `id_${b.id}` : null;
        const compositeKey = `${String(b.client_phone || '').trim()}_${String(b.booking_date || '').trim()}_${String(b.event_type || '').trim()}`;
        if (idKey && seen.has(idKey)) return false;
        if (compositeKey && seen.has(compositeKey)) return false;
        if (idKey) seen.add(idKey);
        if (compositeKey) seen.add(compositeKey);
        return true;
      });
    };

    if (!error && sbBookings && sbBookings.length > 0) {
      return res.json({ success: true, bookings: deduplicateBookings(sbBookings) });
    }
    db.all('SELECT * FROM bookings ORDER BY created_at DESC', [], (err: any, rows: any[]) => {
      res.json({ success: true, bookings: deduplicateBookings(rows || []) });
    });
  } catch (e) {
    db.all('SELECT * FROM bookings ORDER BY created_at DESC', [], (err: any, rows: any[]) => {
      res.json({ success: true, bookings: rows || [] });
    });
  }
});

// 9. Update Booking Status (Confirmed / Blocked / Cancelled)
app.post('/api/bookings/:id/status', async (req: Request, res: Response) => {
  const id = req.params.id;
  const numId = parseInt(id, 10);
  const { status, bookingDate: bodyDate, clientPhone: bodyPhone } = req.body;

  if (!['pending', 'confirmed', 'blocked', 'cancelled'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  try {
    let bookingDate: string | null = bodyDate || null;
    let clientPhone: string | null = bodyPhone || null;

    // 1. Update SQLite by ID
    db.run('UPDATE bookings SET status = ? WHERE id = ? OR id = ?', [status, id, isNaN(numId) ? -1 : numId]);

    // 2. Update Supabase Cloud DB by ID
    try {
      if (!isNaN(numId)) {
        await supabase.from('bookings').update({ status }).eq('id', numId);
      }
      await supabase.from('bookings').update({ status }).eq('id', id);
    } catch (e) {}

    // Fetch booking details (date + phone) so we can keep the calendar block list in sync — try Supabase first, then local SQLite/JSON store
    if (!bookingDate || !clientPhone) {
      try {
        const { data: sbRow } = await supabase
          .from('bookings')
          .select('booking_date, client_phone')
          .eq('id', id)
          .maybeSingle();
        if (sbRow) {
          if (!bookingDate) bookingDate = sbRow.booking_date;
          if (!clientPhone) clientPhone = sbRow.client_phone;
        }
      } catch (e) {}
    }

    if (!bookingDate || !clientPhone) {
      await new Promise<void>((resolve) => {
        db.get('SELECT booking_date, client_phone FROM bookings WHERE id = ? OR id = ?', [id, isNaN(numId) ? -1 : numId], (_err: any, row: any) => {
          if (row) {
            if (!bookingDate) bookingDate = row.booking_date;
            if (!clientPhone) clientPhone = row.client_phone;
          }
          resolve();
        });
      });
    }

    if (bookingDate && clientPhone) {
      db.run('UPDATE bookings SET status = ? WHERE booking_date = ? AND client_phone = ?', [status, bookingDate, clientPhone]);
      try {
        await supabase.from('bookings').update({ status }).eq('booking_date', bookingDate).eq('client_phone', clientPhone);
      } catch(e) {}
    }

    if ((status === 'confirmed' || status === 'blocked') && bookingDate) {
      try {
        await supabase.from('blocked_dates').upsert({ date_str: bookingDate, status: 'blocked', notes: 'Confirmed Booking' }, { onConflict: 'date_str' });
      } catch(e) {}

      db.run(
        `INSERT INTO blocked_dates (date_str, status, notes) VALUES (?, 'blocked', 'Confirmed Booking')
         ON CONFLICT(date_str) DO UPDATE SET status = 'blocked'`,
        [bookingDate],
        () => {
          return res.json({ success: true, message: `Booking status updated to ${status}` });
        }
      );
    } else {
      if (bookingDate) {
        try {
          await supabase.from('blocked_dates').delete().eq('date_str', bookingDate);
        } catch(e) {}
        db.run('DELETE FROM blocked_dates WHERE date_str = ?', [bookingDate]);
      }
      return res.json({ success: true, message: `Booking status updated to ${status}` });
    }
  } catch (e) {
    console.error('Booking status update error:', e);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

// 10. Delete Booking
app.delete('/api/bookings/:id', async (req: Request, res: Response) => {
  const id = req.params.id;
  const numId = parseInt(id, 10);

  try {
    // Capture the booking date + phone BEFORE deleting so we can free the calendar date too
    let bookingDate: string | null = null;
    let clientPhone: string | null = null;

    try {
      const { data: sbRow } = await supabase
        .from('bookings')
        .select('booking_date, client_phone')
        .eq('id', id)
        .maybeSingle();
      if (sbRow) {
        bookingDate = sbRow.booking_date;
        clientPhone = sbRow.client_phone;
      }
    } catch (e) {}

    if (!bookingDate || !clientPhone) {
      await new Promise<void>((resolve) => {
        db.get('SELECT booking_date, client_phone FROM bookings WHERE id = ? OR id = ?', [id, isNaN(numId) ? -1 : numId], (_err: any, row: any) => {
          if (row) {
            bookingDate = bookingDate || row.booking_date;
            clientPhone = clientPhone || row.client_phone;
          }
          resolve();
        });
      });
    }

    // 1. Delete from Supabase Cloud DB
    try { await supabase.from('bookings').delete().eq('id', id); } catch (e) {}
    try { if (!isNaN(numId)) await supabase.from('bookings').delete().eq('id', numId); } catch (e) {}

    // 2. Delete from local SQLite / JSON store — local ids may differ from cloud ids, so also match by date + phone
    db.run('DELETE FROM bookings WHERE id = ? OR id = ?', [id, isNaN(numId) ? -1 : numId]);
    if (bookingDate && clientPhone) {
      db.run('DELETE FROM bookings WHERE booking_date = ? AND client_phone = ?', [bookingDate, clientPhone]);
      try {
        await supabase.from('bookings').delete().eq('booking_date', bookingDate).eq('client_phone', clientPhone);
      } catch (e) {}
    }

    // 3. Free the calendar date — only if no other confirmed/blocked booking remains on that date
    if (bookingDate) {
      let hasActiveBooking = false;
      try {
        const { data: remaining } = await supabase
          .from('bookings')
          .select('id')
          .eq('booking_date', bookingDate)
          .in('status', ['confirmed', 'blocked']);
        if (remaining && remaining.length > 0) hasActiveBooking = true;
      } catch (e) {}

      if (!hasActiveBooking) {
        await new Promise<void>((resolve) => {
          db.all('SELECT booking_date, status FROM bookings', [], (_err: any, rows: any[]) => {
            const remainingLocal = (rows || []).filter(r => r.booking_date === bookingDate && (r.status === 'confirmed' || r.status === 'blocked'));
            if (remainingLocal.length > 0) hasActiveBooking = true;
            resolve();
          });
        });
      }

      if (!hasActiveBooking) {
        try { await supabase.from('blocked_dates').delete().eq('date_str', bookingDate); } catch (e) {}
        db.run('DELETE FROM blocked_dates WHERE date_str = ?', [bookingDate]);
      }
    }

    res.json({ success: true, message: 'Booking deleted successfully. Calendar date freed if no other confirmed booking remains.' });
  } catch (e) {
    console.error('Delete booking error:', e);
    res.status(500).json({ error: 'Failed to delete' });
  }
});

// 11. Manually Block / Unblock Date (Admin endpoint)
app.post('/api/manual-block-date', async (req: Request, res: Response) => {
  const { dateStr, action } = req.body;

  if (!dateStr) {
    return res.status(400).json({ error: 'Date is required' });
  }

  try {
    const newStatus = (action === 'unblock') ? 'available' : 'blocked';
    const notes = (action === 'unblock') ? 'Manually unblocked by admin' : 'Manually blocked by admin';

    await supabase.from('blocked_dates').upsert({ date_str: dateStr, status: newStatus, notes }, { onConflict: 'date_str' });

    db.run(
      `INSERT INTO blocked_dates (date_str, status, notes) VALUES (?, ?, ?)
       ON CONFLICT(date_str) DO UPDATE SET status = excluded.status, notes = excluded.notes`,
      [dateStr, newStatus, notes],
      () => {
        res.json({
          success: true,
          message: (action === 'unblock')
            ? `Date ${dateStr} is now set to Available on calendar! Confirmed order record remains intact.`
            : `Date ${dateStr} blocked successfully!`
        });
      }
    );
  } catch (e) {
    console.error('Manual block error:', e);
    res.status(500).json({ error: 'Database update failed' });
  }
});

// 12. Get Blocked Dates List
app.get('/api/blocked-dates', async (req: Request, res: Response) => {
  try {
    const { data: bDates, error } = await supabase.from('blocked_dates').select('*');
    if (!error && bDates) {
      return res.json({ success: true, blockedDates: bDates });
    }
    db.all('SELECT * FROM blocked_dates ORDER BY date_str ASC', [], (err, rows) => {
      res.json({ success: true, blockedDates: rows || [] });
    });
  } catch (e) {
    res.status(500).json({ error: 'Database error' });
  }
});

// 13. Get Services List
app.get('/api/services', async (req: Request, res: Response) => {
  try {
    const { data: services, error } = await supabase.from('services').select('*');
    if (!error && services && services.length > 0) {
      return res.json({ success: true, services });
    }
    db.all('SELECT * FROM services', [], (err, rows) => {
      res.json({ success: true, services: rows || [] });
    });
  } catch (e) {
    res.status(500).json({ error: 'Database error' });
  }
});

// 14. Bulk Gallery Photos Upload (Admin Dashboard Client Gallery Creator)
// Uses memory storage and returns self-contained data: URLs (no filesystem folders)
// so uploads work on serverless where the function filesystem is read-only/ephemeral.
app.post('/api/upload-gallery-photos', uploadMemoryGallery.array('photos', 50), (req: Request, res: Response) => {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No photo files selected' });
    }
    const fileUrls = files.map(f => `data:${f.mimetype || 'image/jpeg'};base64,${f.buffer.toString('base64')}`);

    // Best-effort local disk copy (only useful for local dev; harmless on serverless)
    try {
      fs.mkdirSync(galleryDir, { recursive: true });
      fs.mkdirSync(publicGalleryDir, { recursive: true });
      files.forEach((f, i) => {
        const ext = path.extname(f.originalname || '.jpg') || '.jpg';
        const filename = `gallery_${Date.now()}_${i}${ext}`;
        try { fs.writeFileSync(path.join(galleryDir, filename), f.buffer); } catch(e) {}
        try { fs.writeFileSync(path.join(publicGalleryDir, filename), f.buffer); } catch(e) {}
      });
    } catch(e) {}

    res.json({ success: true, fileUrls, message: `${fileUrls.length} photo(s) uploaded successfully!` });
  } catch (e) {
    console.error('Gallery photos upload error:', e);
    res.status(500).json({ error: 'Failed to upload photo files' });
  }
});

// 15. Create Private Client Gallery
app.post('/api/galleries', async (req: Request, res: Response) => {
  const { galleryCode, clientName, passcode, photoUrls } = req.body;
  if (!galleryCode || !clientName || !passcode || !photoUrls) {
    return res.status(400).json({ error: 'All gallery fields are required' });
  }

  const codeUpper = String(galleryCode).trim().toUpperCase();
  const clientNameTrimmed = String(clientName).trim();
  const passTrimmed = String(passcode).trim();
  const photosJson = typeof photoUrls === 'string' ? photoUrls : JSON.stringify(photoUrls);
  const createdAt = new Date().toISOString();

  try {
    try {
      await supabase.from('private_galleries').upsert({
        gallery_code: codeUpper,
        client_name: clientNameTrimmed,
        passcode: passTrimmed,
        photo_urls: photosJson,
        created_at: createdAt
      }, { onConflict: 'gallery_code' });
    } catch (e) {}

    db.run(
      `INSERT INTO private_galleries (gallery_code, client_name, passcode, photo_urls, created_at)
       VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(gallery_code) DO UPDATE SET client_name=excluded.client_name, passcode=excluded.passcode, photo_urls=excluded.photo_urls`,
      [codeUpper, clientNameTrimmed, passTrimmed, photosJson],
      () => {
        res.json({ success: true, message: `Private Gallery for ${clientNameTrimmed} created successfully!` });
      }
    );
  } catch (e) {
    console.error('Create gallery error:', e);
    res.status(500).json({ error: 'Failed to create gallery' });
  }
});

// 16. Append Photos to Existing Private Client Gallery (Chunked upload support)
// Lets the admin create a gallery with a few photos first, then push the rest in
// small chunks — avoids the serverless ~10MB single-request body limit for large galleries.
app.post('/api/galleries/:code/photos', async (req: Request, res: Response) => {
  const codeUpper = String(req.params.code).trim().toUpperCase();
  const incoming = Array.isArray(req.body?.photos)
    ? (req.body.photos as any[]).filter(p => typeof p === 'string' && p.startsWith('data:') && p.trim().length > 100)
    : [];
  if (!codeUpper || incoming.length === 0) {
    return res.status(400).json({ error: 'Gallery code and photos array required' });
  }

  const parseUrls = (raw: any): string[] => {
    try {
      const p = typeof raw === 'string' ? JSON.parse(raw) : raw;
      return Array.isArray(p) ? p.filter((x: any) => typeof x === 'string') : [String(p)];
    } catch (e) {
      return [String(raw)];
    }
  };

  try {
    let existing: string[] = [];

    // 1. Read existing photos from Supabase Cloud
    try {
      const { data: g } = await supabase
        .from('private_galleries')
        .select('photo_urls')
        .ilike('gallery_code', codeUpper)
        .maybeSingle();
      if (g && g.photo_urls) existing = parseUrls(g.photo_urls);
    } catch (e) {}

    // 2. Local DB fallback (and source of truth when Supabase row isn't seeded yet)
    if (existing.length === 0) {
      await new Promise<void>((resolve) => {
        db.get('SELECT photo_urls FROM private_galleries WHERE UPPER(gallery_code) = UPPER(?)', [codeUpper], (_err, row: any) => {
          if (row && row.photo_urls) existing = parseUrls(row.photo_urls);
          resolve();
        });
      });
    }

    const seen = new Set(existing);
    const merged = [...existing, ...incoming.filter(u => !seen.has(u))];
    const photosJson = JSON.stringify(merged);

    // 3. Update Supabase Cloud
    try {
      await supabase.from('private_galleries').update({ photo_urls: photosJson }).ilike('gallery_code', codeUpper);
    } catch (e) {}

    // 4. Update local DB + localStore
    db.run(
      'UPDATE private_galleries SET photo_urls = ? WHERE UPPER(gallery_code) = UPPER(?)',
      [photosJson, codeUpper],
      () => {
        const lsG = Array.isArray(localStore.data.private_galleries)
          ? localStore.data.private_galleries
          : [];
        const lsIdx = lsG.findIndex((x: any) => String(x.gallery_code).toUpperCase() === codeUpper);
        if (lsIdx >= 0) lsG[lsIdx].photo_urls = photosJson;
        localStore.save();

        res.json({ success: true, count: merged.length, photoCount: merged.length, message: `${incoming.length} photo(s) appended to gallery ${codeUpper}.` });
      }
    );
  } catch (e) {
    console.error('Append gallery photos error:', e);
    res.status(500).json({ error: 'Failed to update gallery photos' });
  }
});

// 17. Serve an Embedded Gallery Photo as Image Bytes
// The client/admin render photos through this URL instead of huge inline data:
// URLs, which some mobile browsers silently fail to display. Passcode still required.
app.get(['/api/galleries/:code/photo/:index', '/api/gallery/:code/photo/:index'], async (req: Request, res: Response) => {
  const codeUpper = String(req.params.code).trim().toUpperCase();
  const idx = parseInt(String(req.params.index), 10);
  const pass = String(req.query.pass || req.query.passcode || '').trim();
  if (!codeUpper || isNaN(idx) || idx < 0) return res.status(400).end();

  let foundGallery: any = null;
  try {
    const { data: g } = await supabase.from('private_galleries').select('photo_urls, passcode').ilike('gallery_code', codeUpper).maybeSingle();
    if (g) foundGallery = g;
  } catch (e) {}
  if (!foundGallery) {
    await new Promise<void>((resolve) => {
      db.get('SELECT photo_urls, passcode FROM private_galleries WHERE UPPER(gallery_code) = UPPER(?)', [codeUpper], (_err, row: any) => {
        if (row) foundGallery = row;
        resolve();
      });
    });
  }

  if (!foundGallery) return res.status(404).end();
  if (String(foundGallery.passcode || '').trim() !== pass) return res.status(401).end();

  let photos: any[] = [];
  try { photos = JSON.parse(foundGallery.photo_urls || '[]'); } catch (e) { photos = [foundGallery.photo_urls]; }
  if (!Array.isArray(photos)) photos = [photos];

  const raw = photos[idx];
  if (!raw || typeof raw !== 'string' || !raw.startsWith('data:')) return res.status(404).end();

  const comma = raw.indexOf(',');
  if (comma < 0) return res.status(404).end();
  const meta = raw.slice(0, comma);
  const mime = (meta.split(';')[0] || '').replace('data:', '') || 'image/jpeg';
  const buf = Buffer.from(raw.slice(comma + 1), 'base64');
  if (!buf.length) return res.status(404).end();

  res.setHeader('Content-Type', mime);
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.send(buf);
});

// 18. Get Galleries List (Supports both private_galleries and gallery_items)
app.get('/api/galleries', async (req: Request, res: Response) => {
  try {
    let galleries: any[] = [];
    const { data: gList, error } = await supabase.from('private_galleries').select('*').order('created_at', { ascending: false });
    if (!error && gList && gList.length > 0) {
      galleries = [...gList];
    }

    db.all('SELECT * FROM private_galleries ORDER BY created_at DESC', [], (err: any, rows: any[]) => {
      if (rows && rows.length > 0) {
        const codes = new Set(galleries.map(g => (g.gallery_code || '').toUpperCase()));
        rows.forEach(r => {
          if (!codes.has((r.gallery_code || '').toUpperCase())) {
            galleries.push(r);
          }
        });
      }
      res.json({ success: true, galleries });
    });
  } catch (e) {
    res.status(500).json({ error: 'Database error' });
  }
});

// 17. Verify Private Client Gallery Passcode
app.post('/api/galleries/verify', async (req: Request, res: Response) => {
  const { galleryCode, passcode } = req.body;
  if (!galleryCode || !passcode) {
    return res.status(400).json({ error: 'Gallery code and passcode required' });
  }

  const rawCode = String(galleryCode).trim();
  const codeUpper = rawCode.toUpperCase();
  const passTrimmed = String(passcode).trim();

  try {
    let foundGallery: any = null;

    // 1. Try Supabase Cloud Database first
    try {
      const { data: gData } = await supabase
        .from('private_galleries')
        .select('*')
        .ilike('gallery_code', codeUpper)
        .maybeSingle();
      if (gData) foundGallery = gData;
    } catch (e) {}

    // 2. Fallback to SQLite database if not found in Supabase
    if (!foundGallery) {
      await new Promise<void>((resolve) => {
        db.get(
          'SELECT * FROM private_galleries WHERE UPPER(gallery_code) = UPPER(?) OR gallery_code = ?',
          [codeUpper, rawCode],
          (_err: any, row: any) => {
            if (row) foundGallery = row;
            resolve();
          }
        );
      });
    }

    if (!foundGallery) {
      return res.status(404).json({ error: 'Gallery not found. Please verify your Gallery Code and try again.' });
    }

    if (String(foundGallery.passcode).trim() !== passTrimmed) {
      return res.status(401).json({ error: 'Incorrect Passcode. Please check your passcode and try again.' });
    }

    // Check 30-day Expiry
    const created = new Date(foundGallery.created_at || Date.now());
    const diffDays = Math.floor((Date.now() - created.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays >= 30) {
      try { await supabase.from('private_galleries').delete().eq('gallery_code', codeUpper); } catch(e) {}
      db.run('DELETE FROM private_galleries WHERE UPPER(gallery_code) = UPPER(?)', [codeUpper]);
      return res.status(410).json({ error: '⚠️ This private gallery link has expired after 30 days as per storage policy.' });
    }

    let photos = [];
    try {
      photos = typeof foundGallery.photo_urls === 'string' ? JSON.parse(foundGallery.photo_urls) : foundGallery.photo_urls;
    } catch(e) {
      photos = [foundGallery.photo_urls];
    }
    if (!Array.isArray(photos)) photos = [photos];

    // Rewrite embedded data: URLs to image-serving API URLs so mobile browsers
    // render them reliably (huge inline data: URLs can fail silently on some devices).
    const passEnc = encodeURIComponent(passTrimmed);
    photos = photos.map((u: any, i: number) =>
      (typeof u === 'string' && u.startsWith('data:'))
        ? `/api/galleries/${codeUpper}/photo/${i}?pass=${passEnc}`
        : u
    );

    const daysRemaining = Math.max(0, 30 - diffDays);

    return res.json({
      success: true,
      clientName: foundGallery.client_name,
      photos,
      daysRemaining
    });
  } catch (e) {
    console.error('Gallery verification error:', e);
    res.status(500).json({ error: 'Gallery verification failed. Please try again.' });
  }
});

// 18. Get Portfolio Gallery Items (Filtered by category or all)
app.get(['/api/portfolio-items', '/api/gallery-items'], async (req: Request, res: Response) => {
  try {
    const targetCategory = req.query.category ? String(req.query.category).trim().toLowerCase() : '';
    let items: any[] = [];

    let query = supabase.from('gallery_items').select('*').order('id', { ascending: false });
    if (targetCategory && targetCategory !== 'all') {
      query = query.eq('category', targetCategory);
    }
    const { data: sItems, error } = await query;
    if (!error && sItems && sItems.length > 0) {
      items = [...sItems];
    }

    // SQLite / LocalStore fallback merge
    db.all('SELECT * FROM gallery_items ORDER BY id DESC', [], (err: any, rows: any[]) => {
      if (rows && rows.length > 0) {
        const existingIds = new Set(items.map(i => String(i.id)));
        rows.forEach(r => {
          if (!existingIds.has(String(r.id))) {
            if (!targetCategory || targetCategory === 'all' || String(r.category).toLowerCase() === targetCategory) {
              items.push(r);
            }
          }
        });
      }
      res.json({ success: true, items });
    });
  } catch (e) {
    res.status(500).json({ error: 'Database error fetching portfolio items' });
  }
});

// 19. Upload Single/Multiple Portfolio Gallery Images (Category Card Photos)
app.post(['/api/portfolio-items', '/api/portfolio-items/upload', '/api/upload-gallery', '/api/gallery-upload'], uploadMemoryGallery.single('gallery_image'), async (req: Request, res: Response) => {
  const { title, category, badge, imageUrl: rawUrl } = req.body;
  const categoryClean = (category || 'wedding').trim().toLowerCase();
  const titleClean = (title || `${categoryClean} Shoot`).trim();

  let imageUrl = rawUrl || '';
  if (req.file) {
    imageUrl = `data:${req.file.mimetype || 'image/jpeg'};base64,${req.file.buffer.toString('base64')}`;
  }

  if (!imageUrl || !categoryClean) {
    return res.status(400).json({ error: 'Category and image are required' });
  }

  const newItem = {
    title: titleClean,
    category: categoryClean,
    image_url: imageUrl,
    badge: badge || ''
  };

  try {
    let savedId = Date.now();
    const { data: inserted, error } = await supabase.from('gallery_items').insert([newItem]).select();
    if (!error && inserted && inserted.length > 0) {
      savedId = inserted[0].id;
    }

    db.run(
      'INSERT INTO gallery_items (title, category, image_url, badge) VALUES (?, ?, ?, ?)',
      [newItem.title, newItem.category, newItem.image_url, newItem.badge]
    );

    // Save to localStore array if not already present
    if (localStore.data && localStore.data.gallery_items) {
      localStore.data.gallery_items.unshift({ ...newItem, id: savedId });
      localStore.save();
    }

    res.json({ success: true, message: 'Portfolio item added successfully!', item: { ...newItem, id: savedId } });
  } catch (e) {
    console.error('Portfolio item insert error:', e);
    res.status(500).json({ error: 'Failed to upload portfolio item' });
  }
});

// 20. Delete Portfolio Gallery Image by ID
app.delete(['/api/portfolio-items/:id', '/api/galleries/:id', '/api/gallery-items/:id'], async (req: Request, res: Response) => {
  const id = req.params.id;
  try {
    await supabase.from('gallery_items').delete().eq('id', id);
    db.run('DELETE FROM gallery_items WHERE id = ?', [id]);

    if (localStore.data && localStore.data.gallery_items) {
      localStore.data.gallery_items = localStore.data.gallery_items.filter((item: any) => String(item.id) !== String(id));
      localStore.save();
    }

    res.json({ success: true, message: 'Portfolio item deleted' });
  } catch (e) {
    res.status(500).json({ error: 'Failed to delete portfolio item' });
  }
});

// 21. Public Website Approved Reviews Endpoint
app.get('/api/reviews', async (req: Request, res: Response) => {
  try {
    let approvedReviews: any[] = [];
    try {
      const { data: reviews, error } = await supabase
        .from('reviews')
        .select('*')
        .eq('is_approved', 1)
        .order('created_at', { ascending: false });

      if (!error && reviews && reviews.length > 0) {
        approvedReviews = reviews;
      }
    } catch (e) {}

    db.all('SELECT * FROM reviews WHERE is_approved = 1 ORDER BY created_at DESC', [], (err: any, rows: any[]) => {
      const dbRows = (rows || []).filter(r => Number(r.is_approved) === 1);
      const combined = [...approvedReviews];
      const existingIds = new Set(combined.map(r => String(r.id)));
      dbRows.forEach(r => {
        if (!existingIds.has(String(r.id))) combined.push(r);
      });
      res.json({ success: true, reviews: combined });
    });
  } catch (e) {
    res.status(500).json({ error: 'Database error' });
  }
});

// 21. Admin Dashboard All Reviews Endpoint
app.get('/api/admin/reviews', async (req: Request, res: Response) => {
  try {
    let allRevs: any[] = [];
    try {
      const { data: reviews, error } = await supabase.from('reviews').select('*').order('created_at', { ascending: false });
      if (!error && reviews && reviews.length > 0) {
        allRevs = [...reviews];
      }
    } catch (e) {}

    db.all('SELECT * FROM reviews ORDER BY created_at DESC', [], (err: any, rows: any[]) => {
      const dbRows = rows || [];
      const combined = [...allRevs];
      const existingIds = new Set(combined.map(r => String(r.id)));
      dbRows.forEach(r => {
        if (!existingIds.has(String(r.id))) combined.push(r);
      });
      res.json({ success: true, reviews: combined });
    });
  } catch (e) {
    res.status(500).json({ error: 'Database error' });
  }
});

// 22. Submit Client Review
app.post('/api/reviews', async (req: Request, res: Response) => {
  const { clientName, eventType, rating, reviewText } = req.body;
  if (!clientName || !eventType || !rating || !reviewText) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  const nameTrimmed = String(clientName).trim();
  const eventTrimmed = String(eventType).trim();
  const numRating = parseInt(rating, 10) || 5;
  const textTrimmed = String(reviewText).trim();

  try {
    try {
      await supabase.from('reviews').insert([{
        client_name: nameTrimmed,
        event_type: eventTrimmed,
        rating: numRating,
        review_text: textTrimmed,
        is_approved: 1
      }]);
    } catch (e) {}

    db.run(
      'INSERT INTO reviews (client_name, event_type, rating, review_text, is_approved) VALUES (?, ?, ?, ?, 1)',
      [nameTrimmed, eventTrimmed, numRating, textTrimmed],
      () => {
        res.json({ success: true, message: 'Thank you! Your review has been submitted successfully.' });
      }
    );
  } catch (e) {
    res.status(500).json({ error: 'Failed to submit review' });
  }
});

// 23. Approve / Moderate Review
const approveReviewHandler = async (req: Request, res: Response) => {
  const id = req.params.id;
  const isApproved = req.body && req.body.isApproved !== undefined ? (req.body.isApproved ? 1 : 0) : 1;

  try {
    try { await supabase.from('reviews').update({ is_approved: isApproved }).eq('id', id); } catch(e) {}
    db.run('UPDATE reviews SET is_approved = ? WHERE id = ?', [isApproved, id], () => {
      res.json({ success: true, message: 'Review status updated!' });
    });
  } catch (e) {
    res.status(500).json({ error: 'Failed to update review' });
  }
};

app.post('/api/reviews/:id/approve', approveReviewHandler);
app.post('/api/admin/reviews/:id/approve', approveReviewHandler);

// 24. Delete Review
const deleteReviewHandler = async (req: Request, res: Response) => {
  const id = req.params.id;
  try {
    try { await supabase.from('reviews').delete().eq('id', id); } catch(e) {}
    db.run('DELETE FROM reviews WHERE id = ?', [id], () => {
      res.json({ success: true, message: 'Review deleted successfully!' });
    });
  } catch (e) {
    res.status(500).json({ error: 'Failed to delete review' });
  }
};

app.delete('/api/reviews/:id', deleteReviewHandler);
app.delete('/api/admin/reviews/:id', deleteReviewHandler);

// 21. Analytics Summary
app.get('/api/analytics', async (req: Request, res: Response) => {
  try {
    let rows: BookingRecord[] = [];

    // 1. Query Supabase Cloud Database
    const { data: sbBk, error } = await supabase.from('bookings').select('*');
    if (!error && sbBk && sbBk.length > 0) {
      rows = sbBk as BookingRecord[];
    } else {
      // 2. Fallback to SQLite database
      await new Promise<void>((resolve) => {
        db.all('SELECT * FROM bookings', [], (_err: any, bookingRows: BookingRecord[]) => {
          if (bookingRows && bookingRows.length > 0) rows = bookingRows;
          resolve();
        });
      });
    }

    const totalBookings = rows.length;
    const confirmedCount = rows.filter(b => b.status === 'confirmed').length;
    const pendingCount = rows.filter(b => b.status === 'pending').length;
    const blockedCount = rows.filter(b => b.status === 'blocked').length;

    const packageDistribution: Record<string, number> = {};
    rows.forEach(b => {
      const type = b.event_type || 'Marriage Package';
      packageDistribution[type] = (packageDistribution[type] || 0) + 1;
    });

    res.json({
      success: true,
      analytics: {
        totalBookings,
        totalRequests: totalBookings,
        confirmedCount,
        confirmedShoots: confirmedCount,
        pendingCount,
        pendingInquiries: pendingCount,
        blockedCount,
        packageDistribution,
        packagesCount: packageDistribution
      }
    });
  } catch (e) {
    console.error('Analytics error:', e);
    res.status(500).json({ error: 'Failed to generate analytics' });
  }
});

// Export Express app for Netlify Functions & local server
export { app };

if (!process.env.NETLIFY && process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`==================================================`);
    console.log(`🚀 TypeScript Photography Server running on http://localhost:${PORT}`);
    console.log(`==================================================`);
    checkSupabaseTables();
  });
}

// Health check: warn clearly if required Supabase tables are missing (otherwise uploads only persist locally, which is wiped on cloud restarts)
async function checkSupabaseTables() {
  try {
    const tables: { name: string; description: string }[] = [
      { name: 'logos', description: 'brand logo persistence (uploaded logo disappears on restart without this)' },
      { name: 'profile_photo', description: 'Omkar profile photo persistence' }
    ];
    for (const t of tables) {
      const { error } = await supabase.from(t.name).select('id').limit(1);
      if (error && error.code === '42P01') {
        console.log(`\n⚠️ WARNING: Supabase table "${t.name}" does not exist (${t.description}).`);
        console.log(`   → Run supabase-setup.sql (in project root) inside Supabase Dashboard → SQL Editor once, then upload again.\n`);
      }
    }
  } catch (e) {}
}
