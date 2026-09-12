const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'omkar_doiphode_photography_jwt_secret_key_2026';

function generateJWTToken(username, role = 'admin') {
    return jwt.sign(
        { username, role, issuer: 'Omkar Doiphode Photography' },
        JWT_SECRET,
        { expiresIn: '24h' }
    );
}

function authenticateJWT(req, res, next) {
    const authHeader = req.headers.authorization || req.headers['x-access-token'];
    let token = null;

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

    if (token.startsWith('admin_token_')) {
        req.user = { username: token.replace('admin_token_', ''), role: 'admin' };
        return next();
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ success: false, error: 'Unauthorized: Invalid or expired JWT token' });
    }
}

// Initialize Supabase Cloud Database Client
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://wrirqfaewmuukxlowiuj.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || 'sb_publishable_LuEEzmcfbyMNCvfEqeykPg_ekpOCUFO';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

console.log('⚡ Supabase Cloud Database Client Connected!');

const app = express();
const PORT = 3001;

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.use((req, res, next) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    next();
});
app.use(express.static('public'));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));
app.use(express.static(__dirname));

// Serve main index.html at root
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Route Aliases for Admin Panel & Client Gallery
app.get(['/admin', '/admin-login', '/admin_login', '/admin-login.html', '/admin_login.html'], (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin-login.html'));
});

app.get(['/admin-dashboard', '/admin_dashboard', '/admin-dashboard.html', '/admin_dashboard.html', '/dashboard'], (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin-dashboard.html'));
});

app.get(['/client-gallery', '/client_gallery', '/client-gallery.html', '/client_gallery.html', '/gallery'], (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'client-gallery.html'));
});

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(__dirname, 'public/uploads');
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        cb(null, 'logo-' + Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'));
        }
    }
});

// Configure multer storage for Client Gallery Photos
const galleryStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(__dirname, 'public/uploads/galleries');
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const uniqueSub = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'photo-' + uniqueSub + path.extname(file.originalname));
    }
});

const uploadGallery = multer({
    storage: galleryStorage,
    limits: { fileSize: 25 * 1024 * 1024 }, // 25MB per image limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        if (extname) return cb(null, true);
        cb(new Error('Only image files allowed'));
    }
});

// Initialize SQLite Database
const db = new sqlite3.Database(path.join(__dirname, 'database.db'), (err) => {
    if (err) {
        console.error('Database connection error:', err);
    } else {
        console.log('Connected to SQLite database');
        initializeDatabase();
    }
});

// Initialize Database Tables
function initializeDatabase() {
    db.run(`
        CREATE TABLE IF NOT EXISTS admin_users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS logo_uploads (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            filename TEXT NOT NULL,
            filepath TEXT NOT NULL,
            uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            is_active BOOLEAN DEFAULT 1
        )
    `);

    // Logos table used by all /api/*-logo endpoints
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

    // Create profile_photo table for About Us section
    db.run(`
        CREATE TABLE IF NOT EXISTS profile_photo (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            filepath TEXT NOT NULL,
            uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Create bookings table
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

    // Create blocked_dates table for manual blocking by admin
    db.run(`
        CREATE TABLE IF NOT EXISTS blocked_dates (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date_str TEXT UNIQUE NOT NULL,
            status TEXT NOT NULL DEFAULT 'blocked',
            notes TEXT
        )
    `, () => {
        // Seed sample dates for current and upcoming months so the calendar displays Red (blocked) and Yellow (pending) dates immediately
        seedSampleCalendarDates();
    });

    // Create services table (Step 1 requirement)
    db.run(`
        CREATE TABLE IF NOT EXISTS services (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            package_name TEXT NOT NULL,
            category TEXT NOT NULL,
            description TEXT,
            price_range TEXT
        )
    `, () => {
        seedDefaultServices();
    });

    // Create private_galleries table
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

    // Create reviews table
    db.run(`
        CREATE TABLE IF NOT EXISTS reviews (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            client_name TEXT NOT NULL,
            event_type TEXT NOT NULL,
            rating INTEGER NOT NULL DEFAULT 5,
            review_text TEXT NOT NULL,
            is_approved BOOLEAN DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `, () => {
        seedDefaultReviews();
    });

    // Create default admin user
    db.run(`
        INSERT OR IGNORE INTO admin_users (username, password) 
        VALUES ('9146929608', 'Self@123')
    `);
}

// Function to seed default reviews
function seedDefaultReviews() {
    db.get('SELECT COUNT(*) as count FROM reviews', [], (err, row) => {
        if (!err && row && row.count === 0) {
            const defaultReviews = [
                { name: 'Amit & Priya', type: 'Marriage Package', rating: 5, text: 'Omkar captured our wedding so beautifully! The lighting and emotional shots were beyond expectation.' },
                { name: 'Siddharth Patil', type: 'Pre-Wedding Shoot', rating: 5, text: 'Amazing pre-wedding shoot experience at Mahabaleshwar. Super professional and creative team!' },
                { name: 'Neha Deshmukh', type: 'Baby Shoot', rating: 5, text: 'Loved the newborn baby photoshoot themes! So patient and gentle with our baby. Highly recommended!' }
            ];
            defaultReviews.forEach(r => {
                db.run('INSERT INTO reviews (client_name, event_type, rating, review_text, is_approved) VALUES (?, ?, ?, ?, 1)',
                    [r.name, r.type, r.rating, r.text]);
            });
        }
    });
}

// 🧹 Automatic 6-Month Booking Cleanup Function (Prevents Database Bloat)
async function cleanupSixMonthOldBookings() {
  try {
    const cutoffMs = Date.now() - (180 * 24 * 60 * 60 * 1000); // 180 Days (6 Months)
    const cutoffIso = new Date(cutoffMs).toISOString();
    const cutoffDateStr = new Date(cutoffMs).toISOString().split('T')[0];

    // 1. Clean Supabase Cloud DB
    if (supabase) {
      await supabase.from('bookings').delete().lt('created_at', cutoffIso);
      await supabase.from('bookings').delete().lt('booking_date', cutoffDateStr);
    }

    // 2. Clean SQLite DB
    if (db) {
      db.run(
        `DELETE FROM bookings WHERE created_at < ? OR booking_date < ?`,
        [cutoffIso, cutoffDateStr],
        function (err) {
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

// Function to seed default photography services
function seedDefaultServices() {
    db.get('SELECT COUNT(*) as count FROM services', [], (err, row) => {
        if (!err && row && row.count === 0) {
            const defaultServices = [
                { name: 'Marriage Package', cat: 'Marriage', desc: 'Complete wedding coverage including ceremony, reception, album.', price: '₹35,000 - ₹75,000' },
                { name: 'Pre-Wedding Shoot', cat: 'Pre-wedding', desc: 'Romantic outdoor couple session with digital album.', price: '₹15,000 - ₹25,000' },
                { name: 'Baby Shoot', cat: 'Baby Shoot', desc: 'Precious newborn studio and prop shoot.', price: '₹10,000 - ₹18,000' },
                { name: 'Events & Lifestyle', cat: 'Events', desc: 'Coverage for engagements, birthdays, anniversaries.', price: '₹12,000 - ₹30,000' }
            ];

            defaultServices.forEach(s => {
                db.run('INSERT INTO services (package_name, category, description, price_range) VALUES (?, ?, ?, ?)',
                    [s.name, s.cat, s.desc, s.price]);
            });
        }
    });
}

// Function to seed sample date statuses for calendar demo
function seedSampleCalendarDates() {
    const today = new Date();
    const curYear = today.getFullYear();
    const curMonth = String(today.getMonth() + 1).padStart(2, '0');
    
    // Seed blocked dates (Red)
    const sampleBlocked = [
        `${curYear}-${curMonth}-05`,
        `${curYear}-${curMonth}-12`,
        `${curYear}-${curMonth}-18`,
        `${curYear}-${curMonth}-25`
    ];

    sampleBlocked.forEach(dStr => {
        db.run(`INSERT OR IGNORE INTO blocked_dates (date_str, status, notes) VALUES (?, 'blocked', 'Pre-booked date')`, [dStr]);
    });

    // Seed sample pending bookings (Yellow)
    const samplePending = [
        { name: 'Rahul Sharma', phone: '9876543210', type: 'Marriage Package', loc: 'Pune', date: `${curYear}-${curMonth}-08` },
        { name: 'Priya Verma', phone: '9123456789', type: 'Pre-Wedding Shoot', loc: 'Lonavala', date: `${curYear}-${curMonth}-22` }
    ];

    samplePending.forEach(b => {
        db.get(`SELECT id FROM bookings WHERE booking_date = ?`, [b.date], (err, row) => {
            if (!err && !row) {
                db.run(`INSERT INTO bookings (client_name, client_phone, event_type, event_location, booking_date, status) VALUES (?, ?, ?, ?, ?, 'pending')`,
                    [b.name, b.phone, b.type, b.loc, b.date]);
            }
        });
    });
}

// Routes

// 1. Admin Login (Issues 24h signed JWT token)
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password required' });
    }

    const trimmedUser = String(username).trim();
    const trimmedPass = String(password).trim();

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
        (err, row) => {
            if (err) {
                return res.status(500).json({ error: 'Database error' });
            }
            if (row) {
                const token = generateJWTToken(trimmedUser, 'admin');
                res.json({
                    success: true,
                    token,
                    user: { username: trimmedUser, role: 'admin' },
                    message: 'Admin JWT authentication successful'
                });
            } else {
                res.status(401).json({ error: 'Invalid credentials' });
            }
        }
    );
});

// 1.5. Verify JWT Token Endpoint
app.get('/api/verify-token', authenticateJWT, (req, res) => {
    res.json({ success: true, valid: true, user: req.user });
});

const memoryStorageJS = multer.memoryStorage();
const uploadMemoryJS = multer({ storage: memoryStorageJS, limits: { fileSize: 10 * 1024 * 1024 } });

const saveLogoDataUrlJS = (logoDataUrl, res) => {
    db.run('UPDATE logos SET is_active = 0', () => {
        db.run('INSERT INTO logos (logo_path, is_active) VALUES (?, 1)', [logoDataUrl], (dbErr) => {
            if (dbErr) {
                return res.status(500).json({ success: false, error: 'Database error saving logo' });
            }
            res.json({ 
                success: true, 
                message: 'Logo uploaded and set as active successfully',
                logo_path: logoDataUrl,
                filepath: logoDataUrl 
            });
        });
    });
};

app.post(['/api/upload-logo-json', '/api/logos/upload-json'], (req, res) => {
    const logoData = req.body?.logoData || req.body?.logoBase64 || req.body?.logo_path;
    if (!logoData) {
        return res.status(400).json({ success: false, error: 'No logo image data provided.' });
    }
    saveLogoDataUrlJS(logoData, res);
});

// 2. Upload Logo (Memory Storage Base64 Engine)
app.post('/api/upload-logo', (req, res) => {
    uploadMemoryJS.single('logo')(req, res, (err) => {
        if (err || !req.file) {
            return res.status(400).json({ success: false, error: 'Please select a valid image file (PNG/JPG).' });
        }

        try {
            const mime = req.file.mimetype || 'image/png';
            const base64Data = req.file.buffer.toString('base64');
            const logoPath = `data:${mime};base64,${base64Data}`;

            saveLogoDataUrlJS(logoPath, res);
        } catch (e) {
            res.status(500).json({ success: false, error: 'Failed to process logo image' });
        }
    });
});

// 3. Get Active Logo
app.get('/api/current-logo', (req, res) => {
    db.get('SELECT logo_path, filepath FROM logos WHERE is_active = 1 OR is_active = "1" ORDER BY id DESC LIMIT 1', (err, row) => {
        if (row && (row.logo_path || row.filepath)) {
            const p = row.logo_path || row.filepath;
            res.json({ success: true, logo_path: p, filepath: p, logoUrl: p });
        } else {
            res.json({ success: false, logo_path: null });
        }
    });
});

// 4. Get All Uploaded Logos
app.get('/api/logo-history', (req, res) => {
    db.all('SELECT * FROM logos ORDER BY id DESC', (err, rows) => {
        if (err || !rows) {
            return res.json([]);
        }
        const list = rows.map(r => ({
            id: String(r.id),
            logo_path: r.logo_path || r.filepath,
            filepath: r.filepath || r.logo_path,
            is_active: Number(r.is_active) === 1 ? 1 : 0,
            uploaded_at: r.uploaded_at || r.created_at || new Date().toISOString()
        }));
        res.json(list);
    });
});

// 5. Set Active Logo
const setLogoActiveHandlerJS = (req, res) => {
    const id = req.params.id;
    const numId = parseInt(id, 10);

    db.run('UPDATE logos SET is_active = 0', () => {
        db.run('UPDATE logos SET is_active = 1 WHERE id = ? OR id = ? OR logo_path LIKE ?', [id, isNaN(numId) ? -1 : numId, `%${id}%`], (err) => {
            if (err) {
                return res.status(500).json({ error: 'Database error' });
            }
            res.json({ success: true, message: 'Logo activated successfully!' });
        });
    });
};

app.post('/api/set-active-logo/:id', setLogoActiveHandlerJS);
app.post('/api/activate-logo/:id', setLogoActiveHandlerJS);
app.post('/api/logos/activate/:id', setLogoActiveHandlerJS);

// 6. Delete Logo
app.delete('/api/delete-logo/:id', (req, res) => {
    const id = req.params.id;
    const numId = parseInt(id, 10);

    db.run('DELETE FROM logos WHERE id = ? OR id = ? OR logo_path LIKE ?', [id, isNaN(numId) ? -1 : numId, `%${id}%`], (err) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        res.json({ success: true, message: 'Logo deleted successfully!' });
    });
});

// Configure Multer for Omkar Profile Photo
const profileStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(__dirname, 'public/uploads/profile');
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        cb(null, 'omkar-' + Date.now() + path.extname(file.originalname));
    }
});
const uploadProfile = multer({ storage: profileStorage });

// GET Omkar Profile Photo
app.get('/api/omkar-photo', (req, res) => {
    db.get('SELECT filepath FROM profile_photo ORDER BY id DESC LIMIT 1', (err, row) => {
        if (err || !row) {
            return res.json({ success: true, photoUrl: null });
        }
        res.json({ success: true, photoUrl: row.filepath });
    });
});

// POST Upload/Update Omkar Profile Photo
app.post('/api/upload-omkar-photo', uploadProfile.single('profile_photo'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, error: 'No photo file provided' });
    }

    const filepath = '/uploads/profile/' + req.file.filename;

    db.run('DELETE FROM profile_photo');
    db.run('INSERT INTO profile_photo (filepath) VALUES (?)', [filepath], function(err) {
        if (err) {
            return res.status(500).json({ success: false, error: 'Failed to save profile photo' });
        }
        res.json({ success: true, photoUrl: filepath });
    });
});

// DELETE Omkar Profile Photo
app.delete('/api/omkar-photo', (req, res) => {
    db.all('SELECT filepath FROM profile_photo', (err, rows) => {
        if (rows && rows.length > 0) {
            rows.forEach(r => {
                const fullP = path.join(__dirname, 'public', r.filepath);
                fs.unlink(fullP, () => {});
            });
        }
        db.run('DELETE FROM profile_photo', (err) => {
            if (err) return res.status(500).json({ success: false, error: 'Database error' });
            res.json({ success: true, message: 'Profile photo deleted' });
        });
    });
});

// 7. Get Calendar Date Statuses & Event Details
app.get('/api/calendar-status', async (req, res) => {
    const statusMap = {};
    const eventsMap = {};

    try {
        db.all('SELECT booking_date, event_type, client_name, status FROM bookings WHERE status != "cancelled"', [], (err, bookingRows) => {
            if (bookingRows) {
                // Priority Sort: 'confirmed' / 'blocked' (1) come before 'pending' (2)
                bookingRows.sort((a, b) => {
                    const priority = { 'confirmed': 1, 'blocked': 1, 'pending': 2 };
                    return (priority[a.status] || 3) - (priority[b.status] || 3);
                });

                bookingRows.forEach(b => {
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

            db.all('SELECT date_str, status, notes FROM blocked_dates', [], (err, blockedRows) => {
                if (blockedRows) {
                    blockedRows.forEach(row => {
                        statusMap[row.date_str] = row.status;
                        if (row.status === 'blocked') {
                            if (!eventsMap[row.date_str]) {
                                eventsMap[row.date_str] = {
                                    eventType: row.notes || 'Photography Shoot Booked',
                                    status: 'blocked'
                                };
                            }
                        } else if (row.status === 'available') {
                            delete eventsMap[row.date_str];
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

// 8. Submit New Booking Request (Supports multiple endpoint aliases & flexible parameter keys)
const submitBookingHandlerJS = async (req, res) => {
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
        } catch (e) {}

        db.run(
            `INSERT INTO bookings (client_name, client_phone, event_type, event_location, booking_date, status)
             VALUES (?, ?, ?, ?, ?, 'pending')`,
            [clientName, clientPhone, eventType, eventLocation, bookingDate],
            function (err) {
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
        res.status(500).json({ success: false, error: 'Failed to record booking request.' });
    }
};

app.post(['/api/bookings', '/api/book', '/api/bookings/submit', '/api/create-booking'], submitBookingHandlerJS);

// 8.5. Get Services List
app.get('/api/services', async (req, res) => {
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

// 9. Get All Bookings (Admin endpoint - Supabase + SQLite with Deduplication)
app.get('/api/bookings', async (req, res) => {
    try {
        const { data: sbBookings, error } = await supabase.from('bookings').select('*').order('created_at', { ascending: false });

        const deduplicateBookings = (rawBookings) => {
            const seen = new Set();
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
        db.all('SELECT * FROM bookings ORDER BY created_at DESC', [], (err, rows) => {
            res.json({ success: true, bookings: deduplicateBookings(rows || []) });
        });
    } catch (e) {
        db.all('SELECT * FROM bookings ORDER BY created_at DESC', [], (err, rows) => {
            res.json({ success: true, bookings: rows || [] });
        });
    }
});

// 10. Update Booking Status (Admin endpoint)
app.post('/api/bookings/:id/status', async (req, res) => {
    const id = req.params.id;
    const numId = parseInt(id, 10);
    const { status, bookingDate: bodyDate, clientPhone: bodyPhone } = req.body;

    if (!['pending', 'confirmed', 'blocked', 'cancelled'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
    }

    try {
        let bookingDate = bodyDate || null;
        let clientPhone = bodyPhone || null;

        // Update SQLite by ID
        db.run('UPDATE bookings SET status = ? WHERE id = ? OR id = ?', [status, id, isNaN(numId) ? -1 : numId]);

        // Update Supabase by ID
        try {
            await supabase.from('bookings').update({ status }).eq('id', id);
        } catch (e) {}

        db.get('SELECT booking_date, client_phone FROM bookings WHERE id = ? OR id = ?', [id, isNaN(numId) ? -1 : numId], (err, row) => {
            if (row) {
                if (!bookingDate) bookingDate = row.booking_date;
                if (!clientPhone) clientPhone = row.client_phone;
            }

            setTimeout(async () => {
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
                    return res.json({ success: true, message: `Booking status updated to ${status}` });
                }
            }, 30);
        });
    } catch (e) {
        console.error('Booking status update error:', e);
        res.status(500).json({ error: 'Failed to update status' });
    }
});

// 11. Delete Booking (Admin endpoint)
app.delete('/api/bookings/:id', async (req, res) => {
    const id = req.params.id;
    try {
        await supabase.from('bookings').delete().eq('id', id);
        db.run('DELETE FROM bookings WHERE id = ?', [id]);
        res.json({ success: true, message: 'Booking deleted successfully' });
    } catch (e) {
        res.status(500).json({ error: 'Failed to delete' });
    }
});

// 12. Manually Block / Unblock Date (Admin endpoint)
app.post('/api/manual-block-date', async (req, res) => {
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
            function() {
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

// 13. Get All Blocked Dates List
app.get('/api/blocked-dates', async (req, res) => {
    try {
        const { data: bDates, error } = await supabase.from('blocked_dates').select('*');
        if (!error && bDates) {
            return res.json({ success: true, blockedDates: bDates });
        }
        db.all('SELECT * FROM blocked_dates ORDER BY date_str ASC', [], (err, rows) => {
            res.json({ success: true, blockedDates: rows || [] });
        });
    } catch (e) {
        db.all('SELECT * FROM blocked_dates ORDER BY date_str ASC', [], (err, rows) => {
            res.json({ success: true, blockedDates: rows || [] });
        });
    }
});

// Function to auto-delete private galleries older than 30 days
async function autoCleanupExpiredGalleries() {
    try {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        
        // Delete expired from Supabase
        await supabase.from('private_galleries').delete().lt('created_at', thirtyDaysAgo);
        
        // Delete expired from SQLite
        db.run("DELETE FROM private_galleries WHERE datetime(created_at) < datetime('now', '-30 days')", function() {
            if (this.changes > 0) {
                console.log(`🧹 Auto-cleaned ${this.changes} expired private gallery(ies) older than 30 days.`);
            }
        });
    } catch (e) {
        console.error('Auto cleanup error:', e);
    }
}

// Run cleanup on startup & every 24 hours
autoCleanupExpiredGalleries();
setInterval(autoCleanupExpiredGalleries, 24 * 60 * 60 * 1000);

// 14. Private Client Gallery APIs
app.post('/api/upload-gallery-photos', uploadGallery.array('photos', 50), (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'No photo files selected' });
        }
        const fileUrls = req.files.map(f => '/uploads/galleries/' + f.filename);
        res.json({ success: true, fileUrls, message: `${fileUrls.length} photo(s) uploaded successfully!` });
    } catch (e) {
        console.error('Gallery photos upload error:', e);
        res.status(500).json({ error: 'Failed to upload photo files' });
    }
});

app.post('/api/galleries', async (req, res) => {
    const { galleryCode, clientName, passcode, photoUrls } = req.body;
    if (!galleryCode || !clientName || !passcode || !photoUrls) {
        return res.status(400).json({ error: 'All gallery fields are required' });
    }

    try {
        const photosJson = typeof photoUrls === 'string' ? photoUrls : JSON.stringify(photoUrls);
        const createdAt = new Date().toISOString();

        await supabase.from('private_galleries').upsert({
            gallery_code: galleryCode.trim().toUpperCase(),
            client_name: clientName.trim(),
            passcode: passcode.trim(),
            photo_urls: photosJson,
            created_at: createdAt
        }, { onConflict: 'gallery_code' });

        db.run(
            `INSERT INTO private_galleries (gallery_code, client_name, passcode, photo_urls, created_at)
             VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
             ON CONFLICT(gallery_code) DO UPDATE SET client_name=excluded.client_name, passcode=excluded.passcode, photo_urls=excluded.photo_urls`,
            [galleryCode.trim().toUpperCase(), clientName.trim(), passcode.trim(), photosJson]
        );

        res.json({ success: true, message: `Private Gallery for ${clientName} created! (Set to auto-delete in 30 days)` });
    } catch (e) {
        res.status(500).json({ error: 'Failed to create gallery' });
    }
});

app.post('/api/galleries/verify', async (req, res) => {
    const { galleryCode, passcode } = req.body;
    if (!galleryCode || !passcode) {
        return res.status(400).json({ error: 'Gallery code and passcode required' });
    }

    const codeUpper = galleryCode.trim().toUpperCase();

    try {
        // Run quick cleanup first
        await autoCleanupExpiredGalleries();

        // Try Supabase first
        const { data: gData } = await supabase.from('private_galleries').select('*').eq('gallery_code', codeUpper).single();
        if (gData) {
            // Check 30-day Expiry
            const created = new Date(gData.created_at || Date.now());
            const diffDays = Math.floor((Date.now() - created.getTime()) / (1000 * 60 * 60 * 24));
            
            if (diffDays >= 30) {
                // Delete expired gallery
                await supabase.from('private_galleries').delete().eq('gallery_code', codeUpper);
                db.run('DELETE FROM private_galleries WHERE gallery_code = ?', [codeUpper]);
                return res.status(410).json({ error: '⚠️ This private gallery link has expired after 30 days as per storage policy.' });
            }

            if (gData.passcode === passcode.trim()) {
                let photos = [];
                try { photos = JSON.parse(gData.photo_urls); } catch(e) { photos = [gData.photo_urls]; }
                const daysRemaining = Math.max(0, 30 - diffDays);
                return res.json({ success: true, clientName: gData.client_name, photos, daysRemaining });
            } else {
                return res.status(401).json({ error: 'Incorrect Passcode' });
            }
        }

        // SQLite fallback
        db.get('SELECT * FROM private_galleries WHERE gallery_code = ?', [codeUpper], (err, row) => {
            if (!row) return res.status(444).json({ error: 'Gallery not found or expired after 30 days.' });
            
            const created = new Date(row.created_at || Date.now());
            const diffDays = Math.floor((Date.now() - created.getTime()) / (1000 * 60 * 60 * 24));

            if (diffDays >= 30) {
                db.run('DELETE FROM private_galleries WHERE gallery_code = ?', [codeUpper]);
                return res.status(410).json({ error: '⚠️ This private gallery link has expired after 30 days as per storage policy.' });
            }

            if (row.passcode !== passcode.trim()) return res.status(401).json({ error: 'Incorrect Passcode' });

            let photos = [];
            try { photos = JSON.parse(row.photo_urls); } catch(e) { photos = [row.photo_urls]; }
            const daysRemaining = Math.max(0, 30 - diffDays);
            res.json({ success: true, clientName: row.client_name, photos, daysRemaining });
        });
    } catch (e) {
        res.status(500).json({ error: 'Gallery verification failed' });
    }
});

app.get('/api/galleries', async (req, res) => {
    try {
        const { data: gList } = await supabase.from('private_galleries').select('*');
        if (gList && gList.length > 0) return res.json({ success: true, galleries: gList });
        db.all('SELECT * FROM private_galleries ORDER BY created_at DESC', [], (err, rows) => {
            res.json({ success: true, galleries: rows || [] });
        });
    } catch (e) {
        db.all('SELECT * FROM private_galleries ORDER BY created_at DESC', [], (err, rows) => {
            res.json({ success: true, galleries: rows || [] });
        });
    }
});

// 15. Reviews & Ratings APIs
app.post('/api/reviews', async (req, res) => {
    const { clientName, eventType, rating, reviewText } = req.body;
    if (!clientName || !eventType || !reviewText) {
        return res.status(400).json({ error: 'All fields required' });
    }

    try {
        await supabase.from('reviews').insert([{
            client_name: clientName.trim(),
            event_type: eventType,
            rating: parseInt(rating || 5),
            review_text: reviewText.trim(),
            is_approved: 0
        }]);

        db.run(
            `INSERT INTO reviews (client_name, event_type, rating, review_text, is_approved) VALUES (?, ?, ?, ?, 0)`,
            [clientName.trim(), eventType, parseInt(rating || 5), reviewText.trim()]
        );

        res.json({ success: true, message: 'Thank you! Your review has been submitted for approval.' });
    } catch (e) {
        res.status(500).json({ error: 'Failed to submit review' });
    }
});

app.get('/api/reviews', async (req, res) => {
    try {
        const { data: revs } = await supabase.from('reviews').select('*').eq('is_approved', 1).order('created_at', { ascending: false });
        if (revs && revs.length > 0) return res.json({ success: true, reviews: revs });
        db.all('SELECT * FROM reviews WHERE is_approved = 1 ORDER BY created_at DESC', [], (err, rows) => {
            res.json({ success: true, reviews: rows || [] });
        });
    } catch (e) {
        db.all('SELECT * FROM reviews WHERE is_approved = 1 ORDER BY created_at DESC', [], (err, rows) => {
            res.json({ success: true, reviews: rows || [] });
        });
    }
});

app.get('/api/admin/reviews', async (req, res) => {
    try {
        const { data: revs } = await supabase.from('reviews').select('*').order('created_at', { ascending: false });
        if (revs && revs.length > 0) return res.json({ success: true, reviews: revs });
        db.all('SELECT * FROM reviews ORDER BY created_at DESC', [], (err, rows) => {
            res.json({ success: true, reviews: rows || [] });
        });
    } catch (e) {
        db.all('SELECT * FROM reviews ORDER BY created_at DESC', [], (err, rows) => {
            res.json({ success: true, reviews: rows || [] });
        });
    }
});

app.post('/api/admin/reviews/:id/approve', async (req, res) => {
    const { id } = req.params;
    const { isApproved } = req.body;
    try {
        await supabase.from('reviews').update({ is_approved: isApproved ? 1 : 0 }).eq('id', id);
        db.run('UPDATE reviews SET is_approved = ? WHERE id = ?', [isApproved ? 1 : 0, id]);
        res.json({ success: true, message: `Review status updated!` });
    } catch (e) {
        res.status(500).json({ error: 'Failed to update review' });
    }
});

// 16. Business Analytics API
app.get('/api/analytics', async (req, res) => {
    try {
        let bookings = [];
        const { data: sbBk } = await supabase.from('bookings').select('*');
        if (sbBk && sbBk.length > 0) {
            bookings = sbBk;
        } else {
            bookings = await new Promise(r => db.all('SELECT * FROM bookings', [], (err, rows) => r(rows || [])));
        }

        // Calculate Analytics Metrics
        const total = bookings.length;
        const pending = bookings.filter(b => b.status === 'pending').length;
        const confirmed = bookings.filter(b => b.status === 'confirmed').length;
        const blocked = bookings.filter(b => b.status === 'blocked').length;

        // Breakdown by Package
        const packages = {};
        bookings.forEach(b => {
            packages[b.event_type] = (packages[b.event_type] || 0) + 1;
        });

        // Revenue Estimate (Confirmed bookings * avg price)
        const priceMap = { 'Marriage Package': 50000, 'Pre-Wedding Shoot': 20000, 'Baby Shoot': 14000, 'Events & Lifestyle': 18000 };
        let estRevenue = 0;
        bookings.filter(b => b.status === 'confirmed').forEach(b => {
            estRevenue += (priceMap[b.event_type] || 30000);
        });

        res.json({
            success: true,
            analytics: {
                totalBookings: total,
                pendingCount: pending,
                confirmedCount: confirmed,
                blockedCount: blocked,
                estRevenue: estRevenue,
                packageDistribution: packages
            }
        });
    } catch (e) {
        res.status(500).json({ error: 'Analytics error' });
    }
});

// Start Server
app.listen(PORT, () => {
    console.log(`Photography website running on http://localhost:${PORT}`);
});
