# Web App — Full Project Plan & Dev Handoff

> Updated for **automated deployments (Option 2: GitHub Actions)** and **modern responsive UI** for Laravel + Next.js stack.

---

## 1) Project Overview

**Backend:** Laravel  
**Frontend:** Next.js + React + JavaScript  
**Database:** MySQL  
**Local environment:** Laragon (Windows)  
**Hosting:** VPS / DigitalOcean  
**Version control:** GitHub (main & staging branches)  
**Deployment strategy:** Automatic deployment via GitHub Actions to VPS using SSH and server-side `deploy.sh` script.  
**UI Strategy:** Mobile-first responsive design using TailwindCSS and Headless UI components. Tables on large screens, cards on mobile devices.

---

## 2) Environment-Driven Configuration

**Backend (`.env`):**

```bash
APP_NAME=WebApp
APP_ENV=local
APP_DEBUG=true
APP_URL=${APP_URL:-http://localhost:8000}
DB_CONNECTION=mysql
DB_HOST=${DB_HOST:-127.0.0.1}
DB_PORT=${DB_PORT:-3306}
DB_DATABASE=${DB_DATABASE:-webapp}
DB_USERNAME=${DB_USERNAME:-root}
DB_PASSWORD=${DB_PASSWORD:-}
FRONTEND_URL=${FRONTEND_URL:-http://localhost:3000}
```

**Frontend (`.env.local`):**

```bash
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
NEXT_PUBLIC_APP_NAME=WebApp
NEXT_PUBLIC_APP_ENV=development
```

**Rule:** Keep `.env.example` in repo for onboarding new developers; never commit actual secrets.

---

## 3) Repository & Branch Strategy

- `main` → Production branch  
- `staging` → Testing branch  
- `feature/*` → Active development branches

**Deployment targets:**

- `main` → `/var/www/webapp` (production)  
- `staging` → `/var/www/webapp-staging` (optional)

---

## 4) Automated Deployment (GitHub Actions)

### A) Server-Side Setup

**`deploy.sh`** at `/var/www/webapp/deploy.sh`:

```bash
#!/bin/bash

set -e

APP_DIR=/var/www/webapp

cd $APP_DIR

# Pull latest code
git fetch --all
git reset --hard origin/main

# Backend setup
cd backend
composer install --no-interaction --prefer-dist --optimize-autoloader
php artisan migrate --force
php artisan optimize

# Frontend setup
cd ../frontend
npm ci
npm run build

# Restart services
sudo systemctl restart nginx
sudo systemctl restart php8.2-fpm

echo "✅ Deployment complete!"
```

Make it executable:

```bash
chmod +x /var/www/webapp/deploy.sh
```

**SSH Setup:**

- Generate SSH key on GitHub Actions server or local machine.  
- Add public key to VPS `~/.ssh/authorized_keys`.  
- Store private key in GitHub Secrets: `SSH_PRIVATE_KEY`.  
- Also set `SSH_USER` and `SSH_HOST` secrets.

### B) GitHub Actions Workflow (`.github/workflows/deploy.yml`)

```yaml
name: 🚀 Deploy to VPS via SSH

on:
  push:
    branches:
      - main

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Set up SSH
        uses: webfactory/ssh-agent@v0.9.0
        with:
          ssh-private-key: ${{ secrets.SSH_PRIVATE_KEY }}

      - name: Deploy to VPS
        run: |
          ssh -o StrictHostKeyChecking=no ${{ secrets.SSH_USER }}@${{ secrets.SSH_HOST }} << 'EOF'
          cd /var/www/webapp
          ./deploy.sh
          EOF
```

---

## 5) Rollback & Safety

- Optional pre-deploy backup:

  ```bash
  git tag -a backup-$(date +%F-%H%M) -m "pre-deploy backup"
  git push origin --tags
  ```

- Rollback by checking out the backup tag:

  ```bash
  git checkout backup-<timestamp>
  ```

---

## 6) Modern Responsive UI Strategy

**Frontend stack:**

- Next.js + React  
- TailwindCSS (utility-first responsive design)  
- Headless UI / shadcn/ui for accessible components  
- TanStack Table (React Table v8) for desktop tables  
- Framer Motion for animations  
- Lucide Icons for clean icons

**Responsive behavior:**

- Mobile (<768px): Card/Grid view  
- Desktop (≥768px): Table view

**Component example (`DataDisplay.jsx`):**

```jsx
import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableCell, TableBody } from '@/components/ui/table';

export default function DataDisplay({ data }) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (isMobile) {
    return (
      <div className="grid gap-4 p-4">
        {data.map((item, index) => (
          <Card key={index} className="p-4 shadow-lg rounded-2xl">
            <h2 className="font-semibold text-lg">{item.name}</h2>
            <p className="text-sm text-gray-600">{item.description}</p>
            <div className="mt-2 text-xs text-gray-500">Updated: {item.updated_at}</div>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto p-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Updated</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((item, index) => (
            <TableRow key={index}>
              <TableCell>{item.name}</TableCell>
              <TableCell>{item.description}</TableCell>
              <TableCell>{item.updated_at}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
```

✅ Mobile-first, responsive, modern look with smooth transition between **card view (mobile)** and **table view (desktop)**.  
✅ Tailwind breakpoints handle all screen sizes automatically.  
✅ Components are modular and reusable.

---

## 7) Daily Development Workflow

1. Develop locally on Laragon.
2. Commit & push to `main` (or `staging` for testing):

   ```bash
   git add .
   git commit -m "Feature X completed"
   git push origin main
   ```

3. GitHub Actions automatically deploys to VPS.
4. Site updates live with zero manual intervention.

---

## ✅ Summary

| Component      | Tech / Tool        | Notes                                                    |
| -------------- | ------------------ | -------------------------------------------------------- |
| Backend        | Laravel            | API routes under `/api/v1`, .env config                  |
| Frontend       | Next.js + React    | Responsive cards & tables, API via `NEXT_PUBLIC_API_URL` |
| Database       | MySQL              | Managed via Laravel migrations                           |
| Local Dev      | Laragon            | Mirrors production environment                           |
| Source Control | GitHub             | Main & staging branches                                  |
| Deployment     | GitHub Actions     | Automated via SSH deploy script                          |
| Hosting        | VPS / DigitalOcean | Automatic production updates                             |

✅ Fully automated CI/CD deployment pipeline.  
✅ Modern, mobile-first, responsive UI.  
✅ Environment-driven configuration and security.  
✅ Zero manual steps after push; team sees daily progress immediately.

