# FTP Credentials Reference

This document contains the FTP credentials for deployment. **DO NOT commit this file to the repository!**

## Frontend FTP Credentials

- **Username**: `komi@komi.ciroocity.com`
- **Password**: `Abdurhaman1@`
- **Server**: (Use default FTP server or set `FRONTEND_FTP_SERVER` secret)
- **Deployment Path**: `komi.ciroocity.com`

## API FTP Credentials

- **Username**: `komi-api@komi-api.ciroocity.com`
- **Password**: `Abdurhaman1@`
- **Server**: (Use default FTP server or set `API_FTP_SERVER` secret)
- **Deployment Path**: `komi-api.ciroocity.com`

## GitHub Secrets to Add

Add these secrets in: **Repository → Settings → Secrets and variables → Actions**

### Required Secrets:

1. `FRONTEND_FTP_USERNAME` = `komi@komi.ciroocity.com`
2. `FRONTEND_FTP_PASSWORD` = `Abdurhaman1@`
3. `API_FTP_USERNAME` = `komi-api@komi-api.ciroocity.com`
4. `API_FTP_PASSWORD` = `Abdurhaman1@`
5. `NEXT_PUBLIC_API_URL` = `https://komi-api.ciroocity.com/api`

### Optional Secrets:

- `FTP_SERVER` - Your FTP server (if different from default)
- `FRONTEND_FTP_SERVER` - Frontend FTP server (if different)
- `API_FTP_SERVER` - API FTP server (if different)
- `FRONTEND_DEPLOY_PATH` - `komi.ciroocity.com` (default)
- `API_DEPLOY_PATH` - `komi-api.ciroocity.com` (default)
- `DJANGO_SECRET_KEY` - Your Django secret key

## Security Note

⚠️ **IMPORTANT**: Delete this file after adding secrets to GitHub, or add it to `.gitignore` to prevent committing credentials to the repository.

