# Email Configuration

This document explains how to configure email settings for the password reset functionality.

## Environment Variables

All email-related constants are stored in environment variables. Create a `.env` file in the `api/` directory with the following variables:

```env
# Frontend Configuration
FRONTEND_BASE_URL=http://localhost:3000

# Email Configuration
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password-here
DEFAULT_FROM_EMAIL=your-email@gmail.com
```

## Gmail Setup

If you're using Gmail:

1. **Enable 2-Factor Authentication** on your Google account
2. **Generate an App Password**:
   - Go to https://myaccount.google.com/apppasswords
   - Select "Mail" and "Other (Custom name)"
   - Enter "Django CAS App" as the name
   - Copy the generated 16-character password
   - Use this password as `EMAIL_HOST_PASSWORD`

3. **Update your `.env` file**:
   ```env
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USE_TLS=True
   EMAIL_HOST_USER=your-email@gmail.com
   EMAIL_HOST_PASSWORD=xxxx xxxx xxxx xxxx  # The 16-character app password
   DEFAULT_FROM_EMAIL=your-email@gmail.com
   ```

## Other Email Providers

### Outlook/Hotmail
```env
EMAIL_HOST=smtp-mail.outlook.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
```

### Custom SMTP Server
```env
EMAIL_HOST=your-smtp-server.com
EMAIL_PORT=587  # or 465 for SSL
EMAIL_USE_TLS=True  # or False if using SSL
```

## Security Notes

- **Never commit `.env` files** to version control
- Use **App Passwords** instead of your regular account password
- The `.env` file is already included in `.gitignore`
- For production, use environment variables set by your hosting provider

## Testing

To test the forgot password functionality:

1. Ensure all email environment variables are set
2. Start the Django server: `python manage.py runserver`
3. Navigate to `/auth/forgot-password` in the frontend
4. Enter an active user's email address
5. Check the email inbox for the password reset link

## Troubleshooting

### Email not sending
- Verify `EMAIL_HOST_USER` and `EMAIL_HOST_PASSWORD` are correct
- Check that `EMAIL_USE_TLS` matches your provider's requirements
- Ensure firewall/network allows SMTP connections
- Check Django logs for detailed error messages

### "User does not exist" error
- The forgot password function only works for **active users** (`is_active=True`)
- Deleted users (`is_deleted=True`) cannot reset passwords
- Check user status in Django admin or database

