# Where to Run Commands - Laptop vs Server

This guide clearly explains which commands to run on your **laptop** (original project) vs the **server** (online server).

## 🖥️ On Your LAPTOP (Original Project Folder)

These commands should be run in your **original project folder** on your laptop (where you develop).

### Step 1: Navigate to Your Project

```bash
# Open terminal/command prompt on your laptop
# Navigate to your project folder (where your code is)
cd C:\path\to\your\project  # Windows
# or
cd ~/path/to/your/project   # Mac/Linux
```

### Step 2: Check Current Status

```bash
# See what branch you're on
git branch

# Check if you have uncommitted changes
git status

# See recent commits
git log --oneline -5
```

### Step 3: Pull Latest from GitHub (Important!)

```bash
# Make sure you have the latest code
git pull origin main
# or if you're on feature branch:
git pull origin feature/advance-rent-and-updates
```

### Step 4: Verify Workflow File is Updated

```bash
# Check that the workflow file has the correct path
cat .github/workflows/deploy.yml | grep "APP_DIRECTORY"
# Should show: APP_DIRECTORY: /var/www/webapp
```

### Step 5: Push Changes to GitHub

```bash
# If you're on main branch:
git push origin main

# OR if you're on feature branch and want to merge to main:
git checkout main
git merge feature/advance-rent-and-updates
git push origin main
```

## 🖥️ On Your LAPTOP - Testing Commands

### Verify Workflow File Exists on GitHub

After pushing, you can verify on GitHub website:
1. Go to: `https://github.com/Ismailibrahim/Latest_RnetManager_V_1.0`
2. Navigate to: `.github/workflows/deploy.yml`
3. Check it shows `/var/www/webapp`

### Trigger Deployment (GitHub Website)

1. Go to: `https://github.com/Ismailibrahim/Latest_RnetManager_V_1.0/actions`
2. Click "🚀 Deploy to VPS via SSH"
3. Click "Run workflow"
4. Select branch and run

## 🖥️ On the SERVER (Online Server)

These commands are run **only if you SSH into the server** to verify things.

### SSH into Server First

```bash
# From your laptop, connect to server
ssh user@your-server-ip
# or
ssh -i ~/.ssh/your_key user@your-server-ip
```

### Then Run These on Server

```bash
# Navigate to app directory
cd /var/www/webapp

# Check current commit
git log --oneline -1

# Check if code matches GitHub
git status

# Check services
pm2 list
sudo systemctl status php8.2-fpm
```

## 📋 Complete Step-by-Step (Laptop Only)

You can do everything from your laptop without SSH:

### 1. Open Terminal on Laptop

```bash
# Navigate to your project folder
cd "C:\Users\YourName\Documents\YourProject"  # Windows example
# or wherever your project is located
```

### 2. Check What You Have

```bash
git status
git branch
```

### 3. Pull Latest Code

```bash
git pull origin main
```

### 4. Verify Workflow File

```bash
# Windows (PowerShell)
Get-Content .github\workflows\deploy.yml | Select-String "APP_DIRECTORY"

# Mac/Linux
cat .github/workflows/deploy.yml | grep "APP_DIRECTORY"
```

### 5. Push to GitHub

```bash
git push origin main
```

### 6. Go to GitHub Website

1. Open browser: `https://github.com/Ismailibrahim/Latest_RnetManager_V_1.0`
2. Click **Actions** tab
3. Click **🚀 Deploy to VPS via SSH**
4. Click **Run workflow** button
5. Select branch: `main`
6. Click **Run workflow**

### 7. Watch It Deploy

- You'll see the workflow running
- Green checkmarks = success
- Red X = error (click to see details)

## 🎯 Summary

| Command | Where to Run |
|---------|-------------|
| `git pull` | **Laptop** - Your project folder |
| `git push` | **Laptop** - Your project folder |
| `git status` | **Laptop** - Your project folder |
| `cat .github/workflows/deploy.yml` | **Laptop** - Your project folder |
| Trigger workflow | **GitHub Website** - No command needed |
| `cd /var/www/webapp` | **Server** - Only if you SSH in |
| `pm2 list` | **Server** - Only if you SSH in |

## ⚠️ Important Notes

1. **Most commands are on your LAPTOP** in your project folder
2. **Only push from laptop** - Don't push from server
3. **Trigger deployment from GitHub website** - No command needed
4. **Server commands are optional** - Only to verify after deployment

## 🚀 Quick Start (Laptop Only)

```bash
# 1. Open terminal in your project folder
cd "your/project/path"

# 2. Pull latest
git pull origin main

# 3. Push (if you have new commits)
git push origin main

# 4. Go to GitHub website and trigger workflow
# (No command - just click buttons)
```

That's it! You don't need to SSH into the server to test deployment.

---

**Remember:** Almost everything is done from your **laptop in your project folder**!

