# Omkar Doiphode Photography

> **Premium Candid Wedding & Event Photography Platform**  
> Serving Pune, Ahilyanagar (Ahmednagar), Mumbai, and across Maharashtra.

---

## 📸 About the Project

**Omkar Doiphode Photography** is a modern, high-performance web platform designed for a professional wedding and event photography business. The platform showcases high-resolution photo portfolios, handles live client booking schedules, provides a private photo selection gallery for clients, and includes an administrative control center to manage bookings and galleries.

---

## ✨ Features Implemented So Far

### 1. 🏠 Main Landing Page (`index.html`)
- **Top 100+ SEO Optimization**: Built-in JSON-LD Structured Data Schema (`LocalBusiness`, `Photographer`), Open Graph metadata, Twitter Cards, and Google Tag Manager (`G-8TCG61273V`).
- **Glassmorphic Navigation**: Sticky translucent glass header with dynamic monogram logo, responsive hamburger navigation, dark mode toggle, and quick portal links.
- **Interactive Hero Section**: Ambient animated light orbs, CSS shimmer text effects, floating badges, and call-to-action triggers.
- **Before/After Retouching Slider**: Visual interactive comparison showing raw versus professionally retouched wedding portraits.
- **Experience Counter & Stats**: Real-time counter metrics highlighting 500+ weddings covered, 5+ years experience, and client ratings.
- **Filterable Portfolio Grid**: Categorized portfolio filter (Weddings, Pre-Weddings, Maternity, Baby Shoots, Cinematic Films).
- **Package Estimator & Booking Modal**: Interactive package pricing calculator and instant date reservation form.
- **Luxury Dark Mode**: Seamless toggle between light cream aesthetics and dark mode.

### 2. 🔐 Admin Login Portal (`public/admin-login.html`)
- Secure login portal interface for studio administrators and team members.
- Styled with modern dark theme UI elements and credential validation forms.

### 3. 🎛️ Admin Control Center Dashboard (`public/admin-dashboard.html`)
- Complete management dashboard to monitor client bookings, inquiry pipelines, and lead statuses.
- Photo gallery management tool for creating client-specific upload links and tracking gallery storage.
- Real-time studio stats and revenue breakdown widgets.

### 4. 🖼️ Private Client Photo Portal (`public/client-gallery.html`)
- Dedicated client gallery where clients log in with a private access code or PIN.
- Interactive photo grid supporting high-resolution image previews, favorite bookmarking, selection for album printing, and batch download capabilities.

### 5. 🎨 3D Motion & Scroll Animation Engine (`src/client/animations.ts`)
- TypeScript animation engine handling:
  - 3D interactive card tilt and perspective depth on mouse move.
  - Smooth scroll-triggered reveal animations.
  - Hero background orb floating physics and particle ambient effects.

### 6. 📅 Client Booking Calendar Controller (`src/client/calendar.ts`)
- TypeScript controller driving the interactive booking calendar:
  - Real-time slot availability checking.
  - Month/year navigation with date pickers.
  - Booking conflict prevention and event scheduling logic.

---

## 📂 Project Directory Structure

```text
omkar-doiphode-photography/
├── index.html                  # Main Landing Page (SEO & Portfolio)
├── README.md                   # Project Documentation
├── public/
│   ├── admin-login.html        # Admin Login Portal
│   ├── admin-dashboard.html    # Studio Management Dashboard
│   └── client-gallery.html     # Private Client Photo Gallery
└── src/
    └── client/
        ├── animations.ts       # 3D Motion & Scroll Animation Engine
        └── calendar.ts         # Booking Calendar Logic & Controller
```

---

## 🛠️ Tech Stack

- **HTML5 & CSS3**: Modern semantic structure, CSS Variables, Glassmorphism, Keyframe Animations.
- **Tailwind CSS**: Utility-first styling framework via CDN.
- **TypeScript**: Strictly typed client-side scripts for animations and calendar controls.
- **Typography & Icons**: Playfair Display (Serif), Poppins (Sans-Serif), Google Fonts.
- **SEO & Analytics**: Schema.org LocalBusiness, Open Graph, Google Tag Manager.

---

## 🚀 Getting Started

### Local Preview
Simply open `index.html` in any web browser, or serve using a local development server such as VS Code Live Server or Vite:

```bash
# Using npx serve
npx serve .

# Or using Live Server in VS Code
# Open index.html and click 'Go Live'
```

---

## 🔗 Repository

GitHub Repository: [https://github.com/Saurabhdoiphode/photography.git](https://github.com/Saurabhdoiphode/photography.git)
