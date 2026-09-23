# 📷 Omkar Doiphode Photography — Full-Stack Web Platform & Studio Booking System

![Omkar Doiphode Photography Banner](public/visiting_card.jpg)

A high-end, full-stack photography studio web application, client booking management system, and passcode-protected private photo delivery portal designed for **Omkar Doiphode Photography**. Built with modern JavaScript/TypeScript, Node.js, Express, Supabase Cloud SQL Database, embedded SQLite3 fallback, Netlify Serverless support, and a mobile-first responsive glassmorphism UI.

---

## 🚀 Live Demo & Portals

| Portal | URL | Description |
| :--- | :--- | :--- |
| **Client Public Website (Netlify)** | [https://omkardoiphodephotographyy.netlify.app](https://omkardoiphodephotographyy.netlify.app) | Primary client-facing website & booking platform |
| **Client Public Website (Render)** | [https://omkar-doiphode-photography.onrender.com](https://omkar-doiphode-photography.onrender.com) | Node.js backend hosted server instance |
| **Admin Control Portal** | [`/admin-login.html`](https://omkardoiphodephotographyy.netlify.app/admin-login.html) | Secure login portal for studio management |
| **Client Private Gallery** | [`/client-gallery.html`](https://omkardoiphodephotographyy.netlify.app/client-gallery.html) | Passcode-protected shoot photo delivery portal |

---

## 🔒 Security & Admin Access

Admin access is restricted to authorized studio personnel only via the secure Admin Login Portal (`/admin-login.html`). 

- **Default Username**: `admin`
- **Default Password**: `admin123` *(configurable in `src/server.ts`)*

---

## ✨ Key Features & Capabilities

### 🌐 Client-Facing Web App ([`index.html`](file:///c:/Users/saura/OneDrive/Desktop/photography/index.html))
- **Hero & Brand Header**: Dynamic studio logo and photographer profile photo fetched in real-time from Supabase cloud storage, direct WhatsApp booking button, and interactive **🎴 Visiting Card Lightbox Modal** with 1-click HD download.
- **Featured Shoot Packages**: 8 Photography Categories (`Marriage Package 💍`, `Pre-Wedding Shoot 👩‍❤️‍👨`, `Baby Shoot 👶`, `Maternity Shoot 🤰`, `Birthday Shoot 🎂`, `Model Photoshoots 📸`, `Corporate Events 🏢`, `Event Photography 🎥`).
- **Interactive Availability Booking Calendar**:
  - Real-time monthly calendar view.
  - Date status indicators: **Available (Green 🟢)**, **Pending Request (Yellow ⏳)**, **Blocked/Booked (Red 🔴)**.
  - Interactive multi-event hover/click breakdown.
  - Direct booking modal form with date picker, time slot, shoot type, event location, and client contact details.
- **Instant WhatsApp Integration**: Pre-filled automated WhatsApp messaging sent directly to Lead Photographer Omkar Doiphode (`+91 9146929608`).
- **Client Testimonials & Reviews**: Live public testimonial section with 5-star ratings and interactive submission modal (with admin moderation filter).
- **Direct Private Gallery Entry**: Quick access input for clients entering secret passcode to access private shoot photo galleries.

### 🖼️ Client Private Gallery Delivery ([`public/client-gallery.html`](file:///c:/Users/saura/OneDrive/Desktop/photography/public/client-gallery.html))
- **Passcode Verification**: Client authenticates using secret gallery code created by the studio admin.
- **High-Resolution Photo Grid & Lightbox**: Responsive photo masonry view with full-screen slideshow lightbox.
- **1-Click Image Downloads**: Client download capability for individual high-res photos or bulk gallery zip archives.

### ⚙️ Admin Control Center ([`public/admin-dashboard.html`](file:///c:/Users/saura/OneDrive/Desktop/photography/public/admin-dashboard.html))
- **Mobile-Native Touch Card Views**: Smartphone-optimized booking request cards with 1-tap `📞 Call`, `💬 WhatsApp`, `Confirm ✅`, `Cancel 🔴`, and `Delete 🗑️` quick actions.
- **Chronological Confirmed Shoots Sorting**: Confirmed bookings auto-sort in **Ascending Order by upcoming event date** to facilitate event preparation.
- **Interactive Admin Calendar Controller**: Ability to manually mark dates or time slots as **Blocked 🔴** or **Available 🟢**.
- **🧹 Automatic 6-Month Database Cleanup Engine**: Integrated automated background task (`cleanupSixMonthOldBookings()`) that automatically purges booking records older than 180 days across Supabase Cloud SQL, SQLite, and JSON fail-safe stores upon server startup and on a daily interval.
- **Private Gallery Creator & Bulk Uploader**: Admin interface to create new client galleries, generate secret access codes, and upload single or bulk photo files.
- **Review Moderation System**: Moderate incoming client reviews (Approve to publish on public site or Delete).
- **Branding & Profile Manager**: Upload and manage active studio brand logo and photographer profile photo.
- **Business Analytics Suite**: Real-time KPI summary cards and Chart.js analytical charts tracking monthly booking volume, shoot category demand breakdown, conversion rates, and calendar booking density.

---

## 🛠️ Technology Stack

| Layer | Technology | Description |
| :--- | :--- | :--- |
| **Frontend** | HTML5, CSS3, JavaScript (ES6+) | Glassmorphism responsive design system, Chart.js analytics |
| **Backend API** | Node.js, Express.js, TypeScript | Core application logic in [`src/server.ts`](file:///c:/Users/saura/OneDrive/Desktop/photography/src/server.ts) with direct TS execution (`--experimental-strip-types`) |
| **Serverless API** | `serverless-http`, Netlify Functions | CJS API wrapper in [`functions/api.js`](file:///c:/Users/saura/OneDrive/Desktop/photography/functions/api.js) for serverless deployment on Netlify |
| **Primary Cloud DB** | Supabase PostgreSQL | Remote SQL Cloud database storing bookings, calendar status, galleries, photos, logos, and client reviews |
| **Local Embedded DB**| SQLite3 (`photography.db` / `database.db`) | Local disk database for offline fallback and local development |
| **Fail-Safe Store** | `database.json` | Local persistent JSON fallback data store ensuring 100% data durability |
| **File Uploads** | Multer Storage Engine | Disk & memory storage engines for logo, profile, and gallery photo uploads |
| **Deployment** | Netlify & Render | Dual deployment support (Static + Netlify Functions serverless API, or Express server on Render) |

---

## 📂 Project Directory Structure

```
photography/
├── index.html                 # Main Client Website & Availability Booking Calendar
├── server.js                  # Express Server Entry Point (JavaScript Wrapper)
├── package.json               # Node.js Dependencies & Scripts
├── tsconfig.json              # TypeScript Configuration
├── netlify.toml               # Netlify Deployment Configuration & Redirect Rules
├── supabase-setup.sql         # Supabase PostgreSQL SQL Schema & Table Setup Script
├── README.md                  # Project Documentation
├── SETUP_GUIDE.md             # Complete Admin Setup & Troubleshooting Guide
├── database.json              # Fail-safe Persistent Local Data Store
├── database.db                # Local SQLite Embedded Database File
├── src/
│   ├── server.ts              # Core TypeScript Express API Server & Database Sync Engine
│   ├── client/
│   │   ├── calendar.ts        # Client-side Calendar Engine
│   │   └── animations.ts      # UI Animations & Effects
│   └── types/
│       └── index.ts           # TypeScript Interfaces & Data Models
├── public/
│   ├── index.html             # Client Public Website Copy
│   ├── admin-login.html       # Admin Login Portal
│   ├── admin-dashboard.html   # Admin Control Dashboard & Analytics Center
│   ├── client-gallery.html    # Passcode-Protected Client Photo Delivery Portal
│   ├── visiting_card.jpg      # Digital Visiting Card Image Asset
│   ├── sitemap.xml            # SEO Sitemap Document
│   └── uploads/               # Dynamic Upload Directory for Logos, Profile & Gallery Photos
├── functions/
│   └── api.js                 # Netlify Serverless Function Handler
└── netlify/
    └── functions/
        └── sitemap-custom.js  # Dynamic Sitemap Netlify Function
```

---

## 🔧 Local Development & Installation

### 1. Prerequisites
Ensure you have **Node.js (v18+)** and **npm** installed on your machine.

```bash
node --version
npm --version
```

### 2. Clone Repository & Install Dependencies
```bash
git clone https://github.com/Saurabhdoiphode/Omkar_Doiphode_Photography.git
cd Omkar_Doiphode_Photography
npm install
```

### 3. Start Development Server

Run the TypeScript server directly using Node's built-in TypeScript execution flag:

```bash
npm start
# OR
npm run dev
```

### 4. Access Local Endpoints
- **Main Client Website**: `http://localhost:3001`
- **Admin Login Portal**: `http://localhost:3001/admin-login.html`
- **Client Private Gallery**: `http://localhost:3001/client-gallery.html`

---

## 📡 REST API Reference

| Endpoint | Method | Access | Description |
| :--- | :--- | :--- | :--- |
| `/api/calendar-status` | `GET` | Public | Fetch month availability, booked dates, and event details |
| `/api/bookings` | `POST` | Public | Submit new booking request |
| `/api/bookings` | `GET` | Admin | Retrieve all bookings (sorted chronologically) |
| `/api/bookings/:id/status` | `POST` | Admin | Update booking status (`confirmed`, `cancelled`, `pending`) |
| `/api/bookings/:id` | `DELETE` | Admin | Delete booking record |
| `/api/manual-block-date` | `POST` | Admin | Manually block or unblock dates on calendar |
| `/api/reviews` | `GET` | Public | Fetch approved client reviews |
| `/api/reviews` | `POST` | Public | Submit client review |
| `/api/admin/reviews` | `GET` | Admin | Fetch all reviews (approved & pending) |
| `/api/reviews/:id/approve` | `POST` | Admin | Approve pending client review |
| `/api/reviews/:id` | `DELETE` | Admin | Delete review record |
| `/api/current-logo` | `GET` | Public | Get active studio brand logo |
| `/api/upload-logo` | `POST` | Admin | Upload new logo file |
| `/api/omkar-photo` | `GET` | Public | Fetch photographer profile photo |
| `/api/upload-omkar-photo` | `POST` | Admin | Upload photographer profile photo |
| `/api/galleries` | `GET` | Admin | Retrieve list of private client galleries |
| `/api/galleries` | `POST` | Admin | Create new passcode-protected client gallery |
| `/api/galleries/verify` | `POST` | Public | Verify gallery secret passcode & fetch photo items |
| `/api/upload-gallery-photos` | `POST` | Admin | Upload bulk photo images to gallery |
| `/api/analytics` | `GET` | Admin | Fetch studio metrics & analytics data |

---

## ☁️ Supabase Cloud SQL Setup (REQUIRED for Cloud Storage)

To ensure permanent cloud persistence for uploaded logos, profile images, reviews, and client galleries on cloud platforms like Netlify or Render:

1. Open your [Supabase Dashboard](https://supabase.com/dashboard) → Select Project.
2. Go to **SQL Editor** → Click **New Query**.
3. Copy and paste the complete SQL script from [`supabase-setup.sql`](file:///c:/Users/saura/OneDrive/Desktop/photography/supabase-setup.sql).
4. Click **Run**.

This initializes the necessary PostgreSQL tables (`bookings`, `blocked_dates`, `logos`, `profile_photo`, `reviews`, `private_galleries`, `gallery_items`) with Row Level Security policies configured.

---

## 🧹 Automatic 6-Month Database Cleanup Engine

The server includes an automatic data retention policy engine to keep the database lightweight and fast:

```typescript
// Auto-purges booking records older than 180 days across Supabase, SQLite, and database.json
async function cleanupSixMonthOldBookings() {
  const cutoffMs = Date.now() - (180 * 24 * 60 * 60 * 1000); // 180 Days
  // Execution runs on server startup and schedules every 24 hours automatically
}
```

---

## 🌐 Environment Variables

When deploying to Render, Netlify, or Vercel, set the following environment variables in your deployment dashboard:

| Variable | Example Value | Description |
| :--- | :--- | :--- |
| `PORT` | `3001` | Server port (for Node.js Express environment) |
| `SUPABASE_URL` | `https://your-project.supabase.co` | Supabase API URL |
| `SUPABASE_ANON_KEY` | `your-supabase-anon-key` | Supabase Anon API Key |

---

## 🚀 Netlify Deployment Guide (Primary Deployment)

This application is fully optimized for **Netlify Deployment** using a hybrid architecture: static site hosting for the frontend files (`public/`) combined with **Netlify Serverless Functions** (`functions/api.js`) powered by `serverless-http` and Express.js.

### 🌐 Live Netlify URL
- **Production Site**: [https://omkardoiphodephotographyy.netlify.app](https://omkardoiphodephotographyy.netlify.app)

---

### 📋 Netlify Build & Configuration Settings

The project contains a pre-configured [`netlify.toml`](file:///c:/Users/saura/OneDrive/Desktop/photography/netlify.toml) file in the root directory:

```toml
[build]
  command = "echo 'Static site + serverless API - no build step required'"
  functions = "functions"
  publish = "public"

[functions]
  node_bundler = "esbuild"

[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/api/:splat"
  status = 200

[[redirects]]
  from = "/admin"
  to = "/admin-login.html"
  status = 200

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

---

### ⚡ Step-by-Step Netlify Deployment Process

#### Step 1: Push Code to GitHub
Ensure all your latest changes are pushed to your GitHub repository:
```bash
git add .
git commit -m "Deploy to Netlify"
git push origin main
```

#### Step 2: Import Project in Netlify
1. Log in to [Netlify Dashboard](https://app.netlify.com/).
2. Click **"Add new site"** → Select **"Import an existing project"**.
3. Choose **GitHub** as your Git provider and authorize access.
4. Select the repository: **`Saurabhdoiphode/Omkar_Doiphode_Photography`**.

#### Step 3: Configure Build & Deploy Settings
Netlify will automatically detect [`netlify.toml`](file:///c:/Users/saura/OneDrive/Desktop/photography/netlify.toml). Verify the settings:
- **Branch to deploy**: `main`
- **Build command**: *(Leave default or uses `netlify.toml`)*
- **Publish directory**: `public`
- **Functions directory**: `functions`

#### Step 4: Add Required Environment Variables
In the Netlify Site Setup screen (or navigate to **Site configuration** → **Environment variables**):

| Key | Value | Description |
| :--- | :--- | :--- |
| `SUPABASE_URL` | `https://wrirqfaewmuukxlowiuj.supabase.co` | Supabase Cloud Database URL |
| `SUPABASE_ANON_KEY` | `your_supabase_anon_key` | Supabase Cloud Anonymous API Key |

#### Step 5: Click "Deploy Site"
- Netlify will instantly build your serverless functions and publish your static assets.
- Any future `git push` to `main` will trigger an automatic continuous deployment (CD) build.

---

### 🔄 Netlify Serverless Architecture Explained

1. **Static Asset Serving**: Files inside `public/` (`index.html`, `admin-login.html`, `admin-dashboard.html`, `client-gallery.html`) are served globally via Netlify's high-speed CDN.
2. **Serverless API Handler**: Requests to `/api/*` are automatically routed to `functions/api.js`, which wraps Express.js with `serverless-http`.
3. **Binary Image Response Encoding**: `functions/api.js` is configured with `binary: ['image/*']` to guarantee full binary safety for photo/logo uploads and image delivery without corruption.
4. **Supabase Cloud Sync**: Since serverless functions are stateless, all database writes (bookings, calendar statuses, galleries, photo uploads, reviews) sync directly with **Supabase Cloud SQL Database**.

---

### 🔄 Alternative Deployment Options

#### Deploying to Render (Node.js Express Web Service)
If you prefer running a traditional full Node.js server instead of serverless:
1. Create a new **Web Service** on [Render](https://render.com/).
2. Connect your GitHub repository: `Omkar_Doiphode_Photography`.
3. **Build Command**: `npm install`
4. **Start Command**: `npm start` (Runs `node --experimental-strip-types src/server.ts`).
5. Add Environment Variables: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `PORT=3001`.

---

## 📞 Contact & Support

- **Lead Photographer**: Omkar Doiphode
- **Phone / WhatsApp**: +91 9146929608
- **GitHub Repository**: [https://github.com/Saurabhdoiphode/Omkar_Doiphode_Photography.git](https://github.com/Saurabhdoiphode/Omkar_Doiphode_Photography.git)

---
*Created with ❤️ for Omkar Doiphode Photography*