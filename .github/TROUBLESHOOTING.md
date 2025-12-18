# GitHub Actions Troubleshooting

## Why Workflows Aren't Triggering

### Issue: "This workflow has no runs yet"

**Common Causes:**

1. **Path Filters**: The workflows only trigger when specific paths change:
   - `deploy-frontend.yml` - Only triggers when `frontend/**` changes
   - `deploy-api.yml` - Only triggers when `api/**` changes
   - `deploy-all.yml` - Ignores markdown files (`**.md`)

2. **Branch Name**: Workflows only trigger on `main` or `master` branch

3. **No Code Changes**: If you only pushed documentation (`.md` files), workflows won't trigger automatically

## Solutions

### Option 1: Manual Trigger (Recommended for Testing)

All workflows now support manual triggering:

1. Go to your GitHub repository
2. Click **Actions** tab
3. Select the workflow you want to run (e.g., "Deploy Frontend to cPanel")
4. Click **Run workflow** button (top right)
5. Select branch: `main`
6. Click **Run workflow**

### Option 2: Trigger by Making Code Changes

To trigger workflows automatically, make changes to:

- **Frontend workflow**: Change any file in `frontend/` directory
- **API workflow**: Change any file in `api/` directory
- **Deploy All workflow**: Change any file except markdown files

**Quick Test:**
```bash
# Make a small change to trigger frontend deployment
echo "// Test" >> frontend/src/app/page.tsx
git add frontend/src/app/page.tsx
git commit -m "Trigger frontend deployment"
git push origin main
```

### Option 3: Remove Path Filters (Not Recommended)

If you want workflows to trigger on every push, you can remove the `paths` filters, but this will cause unnecessary deployments.

## Verification Steps

1. **Check Workflow Files Exist:**
   ```bash
   ls .github/workflows/
   ```
   Should show:
   - `deploy-frontend.yml`
   - `deploy-api.yml`
   - `deploy-all.yml`

2. **Check Secrets Are Set:**
   - Go to: Repository → Settings → Secrets and variables → Actions
   - Verify all required secrets are present:
     - `FRONTEND_FTP_USERNAME`
     - `FRONTEND_FTP_PASSWORD`
     - `API_FTP_USERNAME`
     - `API_FTP_PASSWORD`
     - `NEXT_PUBLIC_API_URL`

3. **Check Branch Name:**
   ```bash
   git branch --show-current
   ```
   Should be `main` or `master`

4. **Check Recent Commits:**
   ```bash
   git log --oneline -5
   ```
   Verify you've pushed changes

## Testing Workflow

To test if workflows work:

1. **Manual Trigger:**
   - Go to Actions tab → Select workflow → Run workflow

2. **Automatic Trigger:**
   ```bash
   # Create a test file in frontend
   touch frontend/test-trigger.txt
   git add frontend/test-trigger.txt
   git commit -m "Test: Trigger frontend deployment"
   git push origin main
   ```

3. **Check Actions Tab:**
   - You should see the workflow running
   - Click on it to see logs
   - Check for any errors

## Common Errors

### Error: "Secret not found"
- **Solution**: Add missing secrets in Repository Settings → Secrets

### Error: "FTP connection failed"
- **Solution**: Verify FTP credentials are correct
- Check FTP server address
- Verify username/password

### Error: "Path not found"
- **Solution**: Verify deployment paths match your cPanel directory structure
- Check `FRONTEND_DEPLOY_PATH` and `API_DEPLOY_PATH` secrets

## cPanel Node.js App Lock Issues

### Error: "Can't acquire lock for app: komi.ciroocity.com"

This is a common cPanel issue when the Node.js app is stuck or has a lock file.

**Quick Solutions:**

1. **Wait 5-10 minutes** - Locks usually expire automatically
2. **Kill stuck processes via SSH:**
   ```bash
   ssh your-username@your-server.com
   pkill -f "komi.ciroocity.com"
   ```
3. **Remove lock files via SSH:**
   ```bash
   ssh your-username@your-server.com
   cd ~/komi.ciroocity.com
   rm -f .nodejs-lock *.lock .lock
   ```
4. **Contact hosting support** if the above don't work

See `.github/DEPLOYMENT.md` for detailed troubleshooting steps.

## Next Steps

After workflows are working:
1. Test manual trigger first
2. Make a small code change to test automatic trigger
3. Monitor the Actions tab for successful deployments
4. Check your cPanel to verify files are deployed

