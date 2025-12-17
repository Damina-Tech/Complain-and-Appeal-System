# Quick Setup Checklist

Follow these steps in order to set up automated deployment to cPanel.

## ✅ Step 1: cPanel Configuration

- [ ] Create subdomain `komi.ciroocity.com` in cPanel
- [ ] Create subdomain `komi-api.ciroocity.com` in cPanel
- [ ] Note the exact directory paths (usually `komi.ciroocity.com` and `komi-api.ciroocity.com`)

## ✅ Step 2: GitHub Secrets

Go to: **Repository → Settings → Secrets and variables → Actions**

Add these secrets:

**Required:**
- [ ] `FRONTEND_FTP_USERNAME` - `komi@komi.ciroocity.com`
- [ ] `FRONTEND_FTP_PASSWORD` - `Abdurhaman1@`
- [ ] `API_FTP_USERNAME` - `komi-api@komi-api.ciroocity.com`
- [ ] `API_FTP_PASSWORD` - `Abdurhaman1@`
- [ ] `NEXT_PUBLIC_API_URL` - `https://komi-api.ciroocity.com/api`

**Optional (but recommended):**
- [ ] `FTP_SERVER` - Your FTP server (e.g., `ftp.ciroocity.com`) - Only needed if different from default
- [ ] `FRONTEND_DEPLOY_PATH` - `komi.ciroocity.com` (optional, this is the default)
- [ ] `API_DEPLOY_PATH` - `komi-api.ciroocity.com` (optional, this is the default)
- [ ] `DJANGO_SECRET_KEY` - Your Django secret key (optional, but recommended)

## ✅ Step 3: cPanel Applications

### Frontend (Node.js)
- [ ] Go to cPanel → Software → Setup Node.js App
- [ ] Create application for `komi.ciroocity.com`
- [ ] Set Node.js version to `22.18.0`
- [ ] Set startup file to `server.js`

### API (Python)
- [ ] Go to cPanel → Software → Setup Python App
- [ ] Create application for `komi-api.ciroocity.com`
- [ ] Set Python version to `3.10`
- [ ] Set startup file to `passenger_wsgi.py`
- [ ] Create virtual environment: `python3.10 -m venv venv`
- [ ] Create `.env` file with required variables

## ✅ Step 4: First Manual Setup (One Time)

### API Setup
```bash
cd ~/komi-api.ciroocity.com
source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser
```

## ✅ Step 5: Test Deployment

- [ ] Push a change to `frontend/` directory
- [ ] Check GitHub Actions tab for `Deploy Frontend to cPanel` workflow
- [ ] Verify deployment succeeded
- [ ] Push a change to `api/` directory
- [ ] Check GitHub Actions tab for `Deploy API to cPanel` workflow
- [ ] Verify deployment succeeded

## ✅ Step 6: Verify Websites

- [ ] Visit `https://komi.ciroocity.com` - Frontend should load
- [ ] Visit `https://komi-api.ciroocity.com/api/` - API should respond
- [ ] Check browser console for any errors
- [ ] Test API connection from frontend

## 🆘 Troubleshooting

If deployment fails:
1. Check GitHub Actions logs
2. Verify all secrets are set correctly
3. Check FTP credentials
4. Verify directory paths match your cPanel structure
5. Check cPanel error logs

## 📝 Notes

- Frontend deploys automatically when `frontend/` files change
- API deploys automatically when `api/` files change
- Both deploy when pushing to `main` or `master` branch
- First deployment may take longer (installing dependencies)

