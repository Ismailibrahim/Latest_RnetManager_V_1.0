# How to Test Your Deployment Workflow

This guide will help you verify that your GitHub Actions deployment is working correctly.

## Quick Test Checklist

- [ ] Changes pushed to GitHub
- [ ] GitHub Secrets configured
- [ ] Workflow file exists in repository
- [ ] Can trigger workflow manually
- [ ] Deployment completes successfully
- [ ] Server updates correctly

## Step-by-Step Testing

### Step 1: Verify Changes Are on GitHub

1. Go to your repository: `https://github.com/Ismailibrahim/Latest_RnetManager_V_1.0`
2. Check that `.github/workflows/deploy.yml` exists
3. Open the file and verify it shows `/var/www/webapp` (not `/var/www/Rent_V2`)
4. Check the branch you're working with (main or feature branch)

**If changes aren't on GitHub:**
```bash
# From your laptop
git add .
git commit -m "Update deployment workflow"
git push origin main  # or your branch name
```

### Step 2: Verify GitHub Secrets

1. Go to: `https://github.com/Ismailibrahim/Latest_RnetManager_V_1.0/settings/secrets/actions`
2. You should see these secrets:
   - ✅ `SSH_PRIVATE_KEY`
   - ✅ `SSH_USER`
   - ✅ `SSH_HOST`
   - ✅ `APP_URL` (optional)

**If secrets are missing:**
- Follow the guide in `documents/GITHUB_SECRETS_SETUP.md`
- Or set them up in GitHub: Settings → Secrets and variables → Actions → New repository secret

### Step 3: Test SSH Connection (Optional but Recommended)

Before running the workflow, test SSH connection manually:

```bash
# On your laptop, test SSH connection
ssh -i ~/.ssh/github_actions_deploy user@your-server-ip

# If it connects without password, SSH is working!
```

### Step 4: Trigger the Workflow

1. Go to GitHub Actions: `https://github.com/Ismailibrahim/Latest_RnetManager_V_1.0/actions`
2. Click on **🚀 Deploy to VPS via SSH** in the left sidebar
3. Click the **Run workflow** button (top right, blue button)
4. Select your branch (usually `main`)
5. Click the green **Run workflow** button

### Step 5: Monitor the Deployment

Watch the workflow run in real-time:

1. You'll see a new workflow run appear
2. Click on it to see detailed logs
3. Watch each step:
   - ✅ 📥 Checkout code
   - ✅ 🔑 Set up SSH
   - ✅ 🔍 Verify SSH connection
   - ✅ 📋 Pre-deployment checks
   - ✅ 🚀 Deploy to VPS
   - ✅ 🏥 Health check
   - ✅ ✅ Deployment status

### Step 6: Check for Errors

**Green checkmark (✅)** = Step succeeded
**Red X (❌)** = Step failed - click to see error details

**Common issues:**
- **SSH connection failed** → Check SSH secrets
- **Directory not found** → Verify APP_DIRECTORY path
- **Permission denied** → Check file permissions on server
- **Deploy script failed** → Check deploy.sh logs

### Step 7: Verify Server Updated

After deployment completes successfully:

```bash
# SSH into your server
ssh user@your-server-ip

# Check current commit
cd /var/www/webapp
git log --oneline -1

# Verify services are running
pm2 list
sudo systemctl status php8.2-fpm
sudo systemctl status nginx

# Check application
curl http://localhost:8000/api/v1
```

### Step 8: Test Your Application

1. Visit your application URL in a browser
2. Test the login functionality (we improved error handling)
3. Verify everything works as expected

## Quick Test Commands

### Check Workflow File on GitHub
```bash
# From your laptop
git pull origin main
cat .github/workflows/deploy.yml | grep "APP_DIRECTORY"
# Should show: APP_DIRECTORY: /var/www/webapp
```

### Check Server Status
```bash
# On server
cd /var/www/webapp
git status
pm2 status
sudo systemctl status nginx
```

### View Deployment Logs
- GitHub Actions → Latest workflow run → Click on failed step to see logs
- Or check server logs: `pm2 logs rentapp-frontend`

## Troubleshooting

### Workflow Doesn't Appear
- Make sure `.github/workflows/deploy.yml` is in your repository
- Check you're looking at the correct branch
- Refresh the GitHub Actions page

### SSH Connection Fails
1. Verify `SSH_PRIVATE_KEY` includes BEGIN/END lines
2. Check `SSH_USER` and `SSH_HOST` are correct
3. Test SSH manually: `ssh -i key user@host`

### Deployment Fails
1. Check the error message in GitHub Actions logs
2. SSH into server and run deploy.sh manually:
   ```bash
   cd /var/www/webapp
   ./deploy.sh
   ```
3. Check server logs for details

### Services Not Running
```bash
# Restart services
pm2 restart rentapp-frontend
sudo systemctl restart php8.2-fpm
sudo systemctl restart nginx
```

## Success Indicators

✅ **Workflow completes with green checkmarks**
✅ **All steps show success (no red X)**
✅ **Health check passes**
✅ **Server code matches GitHub**
✅ **Application works correctly**

## Next Steps After Testing

Once deployment works:
1. Make a small test change on your laptop
2. Commit and push
3. Trigger deployment
4. Verify change appears on server

This confirms your complete workflow is working!

---

**Need Help?** Check `documents/DEPLOYMENT_WORKFLOW.md` for detailed workflow guide.

