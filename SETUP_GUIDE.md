# Setup Guide

## Requirements

- Node.js 18 or newer
- A Supabase project for database features

## Install and type-check

```bash
npm install
npm run typecheck
```

## Local preview

Open `index.html` directly, or serve the repository with a static server such as `npx serve .`.

## Supabase

1. Open the SQL Editor in your Supabase project.
2. Run `supabase-setup.sql`.
3. Configure authentication and storage policies in the Supabase dashboard for the environment.

The table inventory is recorded in `database.json`.
