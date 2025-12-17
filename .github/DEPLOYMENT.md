# cPanel Deployment Guide

This guide explains how to deploy both the Frontend (Next.js) and API (Django) to cPanel using GitHub Actions.

## Directory Structure

- **Frontend**: Deploys to `komi.ciroocity.com` directory on cPanel
- **API**: Deploys to `komi-api.ciroocity.com` directory on cPanel

Both are in the same repository but different directories:
- `frontend/` - Next.js application
- `api/` - Django application

## Prerequisites

1. cPanel hosting account with FTP access
2. GitHub repository with Actions enabled
3. SSH access (optional, for running migrations)
4. Two subdomains configured in cPanel:
   - `komi.ciroocity.com` (for frontend)
   - `komi-api.ciroocity.com` (for API)

## Step 1: GitHub Secrets Setup this is the first steps of all

Go to your GitHub repository → **Settings** → **Secrets and variables** → **Actions**, and add the following secrets:

### Required Secrets

| Secret Name | Description | Example |
|------------|-------------|---------|
| `FRONTEND_FTP_USERNAME` | Frontend FTP username | `komi@komi.ciroocity.com` |
| `FRONTEND_FTP_PASSWORD` | Frontend FTP password | `your_password` |
| `API_FTP_USERNAME` | API FTP username | `komi-api@komi-api.ciroocity.com` |
| `API_FTP_PASSWORD` | API FTP password | `your_password` |
| `NEXT_PUBLIC_API_URL` | Your API URL | `https://komi-api.ciroocity.com/api` |

### Optional Secrets (Recommended)

| Secret Name | Description | Default Value |
|------------|-------------|---------------|
| `FTP_SERVER` | Your cPanel FTP server (fallback if separate servers not set) | `ftp.ciroocity.com` |
| `FRONTEND_FTP_SERVER` | Frontend FTP server (if different from default) | Uses `FTP_SERVER` if not set |
| `API_FTP_SERVER` | API FTP server (if different from default) | Uses `FTP_SERVER` if not set |
| `FRONTEND_DEPLOY_PATH` | Frontend deployment path on cPanel | `komi.ciroocity.com` |
| `API_DEPLOY_PATH` | API deployment path on cPanel | `komi-api.ciroocity.com` |
| `DJANGO_SECRET_KEY` | Django secret key (for collectstatic) | - |
| `SSH_HOST` | SSH host for running migrations | - |
| `SSH_USERNAME` | SSH username | - |
| `SSH_PRIVATE_KEY` | SSH private key | - |
| `SSH_PORT` | SSH port | `22` |

### How to Add Secrets

1. Go to your GitHub repository
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Enter the secret name and value
5. Click **Add secret**

## Step 2: cPanel Subdomain Setup

### Frontend Subdomain (`komi.ciroocity.com`)

1. **Create Subdomain in cPanel:**
   - Go to cPanel → **Subdomains**
   - Create subdomain: `komi`
   - Document root: `komi.ciroocity.com` (or `public_html/komi.ciroocity.com`)
   - Click **Create**

2. **Verify Directory Structure:**
   ```
   ~/komi.ciroocity.com/
   (This is where frontend files will be deployed)
   ```

### API Subdomain (`komi-api.ciroocity.com`)

1. **Create Subdomain in cPanel:**
   - Go to cPanel → **Subdomains**
   - Create subdomain: `komi-api`
   - Document root: `komi-api.ciroocity.com` (or `public_html/komi-api.ciroocity.com`)
   - Click **Create**

2. **Verify Directory Structure:**
   ```
   ~/komi-api.ciroocity.com/
   (This is where API files will be deployed)
   ```

## Step 3: cPanel Application Setup

### Frontend Setup (Node.js)

1. **Setup Node.js Application:**
   - Go to cPanel → **Software** → **Setup Node.js App**
   - Click **Create Application**
   - **Node.js version**: `22.18.0` (or latest 22.x)
   - **Application root**: `komi.ciroocity.com`
   - **Application URL**: `komi.ciroocity.com`
   - **Application startup file**: `server.js`
   - **Application mode**: Production
   - Click **Create**

2. **Install Dependencies (First Time Only):**
   ```bash
   cd ~/komi.ciroocity.com
   npm install
   ```

### API Setup (Python)

1. **Setup Python Application:**
   - Go to cPanel → **Software** → **Setup Python App**
   - Click **Create Application**
   - **Python version**: `3.10`
   - **Application root**: `komi-api.ciroocity.com`
   - **Application URL**: `komi-api.ciroocity.com`
   - **Application startup file**: `passenger_wsgi.py`
   - **Application mode**: Production
   - Click **Create**

2. **Create Virtual Environment (First Time Only):**
   ```bash
   cd ~/komi-api.ciroocity.com
   python3.10 -m venv venv
   source venv/bin/activate
   pip install --upgrade pip
   pip install -r requirements.txt
   ```

3. **Create Environment File:**
   Create `.env` file in `~/komi-api.ciroocity.com/`:
   ```env
   SECRET_KEY=your-secret-key-here
   DEBUG=False
   ALLOWED_HOSTS=komi-api.ciroocity.com
   DATABASE_URL=your-database-url
   CORS_ALLOWED_ORIGINS=https://komi.ciroocity.com
   FRONTEND_BASE_URL=https://komi.ciroocity.com
   ```

4. **Database Setup (First Time Only):**
   ```bash
   cd ~/komi-api.ciroocity.com
   source venv/bin/activate
   python manage.py migrate
   python manage.py createsuperuser
   ```

## Step 4: Deployment Workflows

### Workflow Files

1. **`deploy-frontend.yml`** - Deploys frontend only
   - Triggers when files in `frontend/` directory change
   - Deploys to `komi.ciroocity.com`

2. **`deploy-api.yml`** - Deploys API only
   - Triggers when files in `api/` directory change
   - Deploys to `komi-api.ciroocity.com`

3. **`deploy-all.yml`** - Deploys both frontend and API
   - Triggers on any push to `main` or `master` branch
   - Deploys both in parallel

### How Deployment Works

1. **Automatic Trigger:**
   - Push to `main` or `master` branch
   - Workflows automatically detect changes in `frontend/` or `api/` directories

2. **Frontend Deployment Process:**
   - Installs Node.js dependencies
   - Builds Next.js application
   - Prepares deployment files
   - Uploads to `komi.ciroocity.com` via FTP

3. **API Deployment Process:**
   - Installs Python dependencies
   - Runs Django checks
   - Collects static files
   - Uploads to `komi-api.ciroocity.com` via FTP
   - Optionally runs migrations via SSH

## Step 5: Verify Deployment

### Check Frontend

1. Visit `https://komi.ciroocity.com`
2. Check browser console for errors
3. Verify API calls are working

### Check API

1. Visit `https://komi-api.ciroocity.com/api/`
2. Check API health endpoint (if available)
3. Verify CORS settings allow frontend domain

## Troubleshooting

### Frontend Issues

1. **404 Errors:**
   - Check `.htaccess` file exists in `komi.ciroocity.com/`
   - Verify `RewriteEngine On` is enabled in cPanel
   - Check Node.js application is running in cPanel

2. **Build Failures:**
   - Check GitHub Actions logs
   - Verify `NEXT_PUBLIC_API_URL` secret is set correctly
   - Ensure Node.js version is 22.18.0

3. **API Connection Errors:**
   - Verify `NEXT_PUBLIC_API_URL` points to `https://komi-api.ciroocity.com/api`
   - Check CORS settings in Django

### API Issues

1. **500 Errors:**
   - Check Python application is running in cPanel
   - Verify virtual environment is activated
   - Check `.env` file exists and has correct values
   - Review error logs in cPanel → **Errors**

2. **Static Files Not Loading:**
   - Ensure `collectstatic` ran successfully (check GitHub Actions logs)
   - Verify `STATIC_ROOT` and `STATIC_URL` in Django settings
   - Check file permissions in cPanel

3. **Database Errors:**
   - Ensure database is created in cPanel → **MySQL Databases**
   - Run migrations: `python manage.py migrate`
   - Check database credentials in `.env`

4. **CORS Errors:**
   - Verify `CORS_ALLOWED_ORIGINS` includes `https://komi.ciroocity.com`
   - Check Django CORS settings

### FTP Deployment Issues

1. **Connection Failed:**
   - Verify FTP credentials in GitHub Secrets
   - Check FTP server address is correct
   - Ensure FTP is enabled in cPanel

2. **Permission Denied:**
   - Check directory permissions in cPanel
   - Verify deployment paths are correct
   - Ensure FTP user has write access

3. **Files Not Uploading:**
   - Check GitHub Actions logs for specific errors
   - Verify `server-dir` matches your cPanel directory structure
   - Check if files are being excluded by the exclude patterns

## Manual Deployment (If Needed)

### Frontend Manual Deployment

```bash
cd frontend
npm install
npm run build
# Upload .next/standalone/* and public/ to komi.ciroocity.com via FTP
```

### API Manual Deployment

```bash
cd api
source venv/bin/activate
pip install -r requirements.txt
python manage.py collectstatic --noinput
python manage.py migrate
# Upload all files to komi-api.ciroocity.com via FTP
```

## Security Best Practices

1. **Never commit sensitive files:**
   - `.env` files
   - `db.sqlite3`
   - Private keys

2. **Use strong secrets:**
   - Generate strong `SECRET_KEY` for Django
   - Use complex FTP passwords
   - Rotate secrets regularly

3. **Production Settings:**
   - Set `DEBUG=False` in Django
   - Configure `ALLOWED_HOSTS` properly
   - Use HTTPS for all connections
   - Enable security headers

4. **Keep Dependencies Updated:**
   - Regularly update npm packages
   - Regularly update Python packages
   - Monitor security advisories

## Monitoring

1. **GitHub Actions:**
   - Check Actions tab for deployment status
   - Review logs for any errors

2. **cPanel Logs:**
   - Check error logs in cPanel → **Errors**
   - Monitor access logs for traffic

3. **Application Logs:**
   - Django logs (if configured)
   - Next.js logs (if configured)

## Support

For issues or questions:
- Check GitHub Actions logs
- Review cPanel error logs
- Check Django error logs (if accessible)
- Verify all secrets are set correctly
- Ensure subdomains are properly configured
