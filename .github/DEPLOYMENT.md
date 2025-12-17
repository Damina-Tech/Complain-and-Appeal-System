# cPanel Deployment Guide

This guide explains how to deploy both the Frontend (Next.js) and API (Django) to cPanel using GitHub Actions.

## Prerequisites

1. cPanel hosting account with FTP access
2. GitHub repository with Actions enabled
3. SSH access (optional, for running migrations)

## GitHub Secrets Setup

Go to your GitHub repository → Settings → Secrets and variables → Actions, and add the following secrets:

### Required Secrets

- `FTP_SERVER` - Your cPanel FTP server (e.g., `ftp.yourdomain.com` or IP address)
- `FTP_USERNAME` - Your cPanel FTP username
- `FTP_PASSWORD` - Your cPanel FTP password
- `NEXT_PUBLIC_API_URL` - Your API URL (e.g., `https://yourdomain.com/api`)

### Optional Secrets

- `FRONTEND_DEPLOY_PATH` - Frontend deployment path on cPanel (default: `public_html`)
- `API_DEPLOY_PATH` - API deployment path on cPanel (default: `api`)
- `DJANGO_SECRET_KEY` - Django secret key (for collectstatic)
- `SSH_HOST` - SSH host for running migrations
- `SSH_USERNAME` - SSH username
- `SSH_PRIVATE_KEY` - SSH private key
- `SSH_PORT` - SSH port (default: 22)

## Deployment Workflows

### 1. Deploy Frontend Only (`deploy-frontend.yml`)

Triggers when files in `frontend/` directory change.

**Features:**
- Builds Next.js application
- Deploys to cPanel via FTP
- Creates `.htaccess` for proper routing

### 2. Deploy API Only (`deploy-api.yml`)

Triggers when files in `api/` directory change.

**Features:**
- Installs Python dependencies
- Runs Django checks
- Collects static files
- Deploys to cPanel via FTP
- Optionally runs migrations via SSH

### 3. Deploy All (`deploy-all.yml`)

Triggers on any push to main/master branch (except documentation).

**Features:**
- Deploys both frontend and API in parallel
- Most comprehensive deployment option

## cPanel Configuration

### Frontend Setup

1. **Directory Structure:**
   ```
   public_html/
   ├── .next/
   ├── public/
   ├── .htaccess
   └── package.json (if standalone build not used)
   ```

2. **Node.js Setup (if using standalone build):**
   - Go to cPanel → Software → Setup Node.js App
   - Create a new Node.js application
   - Set the application root to `public_html`
   - Set the application URL to your domain
   - Node.js version: 22.x
   - Application mode: Production
   - Application startup file: `server.js`

3. **.htaccess Configuration:**
   The workflow automatically creates an `.htaccess` file for Next.js routing.

### API Setup

1. **Directory Structure:**
   ```
   api/
   ├── cas_app/
   ├── CAS/
   ├── manage.py
   ├── requirements.txt
   ├── passenger_wsgi.py
   └── .htaccess
   ```

2. **Python Setup:**
   - Go to cPanel → Software → Setup Python App
   - Create a new Python application
   - Set the application root to `api`
   - Python version: 3.10
   - Application mode: Production
   - Application startup file: `passenger_wsgi.py`

3. **Virtual Environment:**
   ```bash
   cd ~/api
   python3.10 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```

4. **Environment Variables:**
   Create a `.env` file in the `api` directory with:
   ```
   SECRET_KEY=your-secret-key
   DEBUG=False
   ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com
   DATABASE_URL=your-database-url
   EMAIL_HOST=your-email-host
   EMAIL_PORT=587
   EMAIL_HOST_USER=your-email
   EMAIL_HOST_PASSWORD=your-password
   FRONTEND_BASE_URL=https://yourdomain.com
   ```

5. **Database Setup:**
   ```bash
   python manage.py migrate
   python manage.py createsuperuser
   ```

6. **Static Files:**
   The workflow automatically runs `collectstatic`. Ensure your `STATIC_ROOT` in `settings.py` points to a directory accessible by the web server.

## Manual Deployment Steps

If you need to deploy manually:

### Frontend

```bash
cd frontend
npm install
npm run build
# Upload .next and public folders to public_html
```

### API

```bash
cd api
pip install -r requirements.txt
python manage.py collectstatic --noinput
python manage.py migrate
# Upload all files to api directory
```

## Troubleshooting

### Frontend Issues

1. **404 Errors:**
   - Ensure `.htaccess` is properly configured
   - Check that `RewriteEngine On` is enabled in cPanel

2. **Build Failures:**
   - Check Node.js version (should be 22.18.0)
   - Verify all environment variables are set

### API Issues

1. **500 Errors:**
   - Check Python version (should be 3.10)
   - Verify virtual environment is activated
   - Check `.env` file exists and has correct values
   - Review error logs in cPanel

2. **Static Files Not Loading:**
   - Ensure `collectstatic` ran successfully
   - Check `STATIC_ROOT` and `STATIC_URL` in settings.py
   - Verify file permissions

3. **Database Errors:**
   - Ensure database is created in cPanel
   - Run migrations: `python manage.py migrate`
   - Check database credentials in `.env`

## Security Notes

1. Never commit `.env` files to the repository
2. Use strong secret keys
3. Set `DEBUG=False` in production
4. Configure `ALLOWED_HOSTS` properly
5. Use HTTPS for all connections
6. Keep dependencies updated

## Support

For issues or questions, check:
- GitHub Actions logs
- cPanel error logs
- Django error logs (if accessible)

