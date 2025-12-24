# Delivery Services Configuration Guide

This document explains how to configure delivery services for announcements.

## Overview

The system supports multiple delivery channels for announcements:
- **In-App**: Push notifications within the application (always enabled)
- **Email**: Email notifications via SMTP
- **SMS**: SMS notifications via Twilio or similar services
- **WhatsApp**: WhatsApp messages via WhatsApp Business API
- **Telegram**: Telegram messages via Telegram Bot API

## Environment Variables

Add these variables to your `.env` file in the `api/` directory:

### Email Configuration (Required for email delivery)

```env
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password
DEFAULT_FROM_EMAIL=your-email@gmail.com
```

### SMS Configuration (Optional)

```env
SMS_ENABLED=true
SMS_PROVIDER=twilio
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=+1234567890
```

### WhatsApp Configuration (Optional)

```env
WHATSAPP_ENABLED=true
WHATSAPP_API_URL=https://graph.facebook.com/v18.0
WHATSAPP_PHONE_NUMBER_ID=your-phone-number-id
WHATSAPP_ACCESS_TOKEN=your-whatsapp-access-token
WHATSAPP_BUSINESS_ACCOUNT_ID=your-business-account-id
```

### Telegram Configuration (Optional)

```env
TELEGRAM_ENABLED=true
TELEGRAM_BOT_TOKEN=your-telegram-bot-token
TELEGRAM_CHAT_ID=your-telegram-chat-id
```

## Setup Instructions

### Email Setup

1. For Gmail, enable 2-factor authentication
2. Generate an App Password: https://myaccount.google.com/apppasswords
3. Use the app password in `EMAIL_HOST_PASSWORD`

### SMS Setup (Twilio)

1. Sign up for Twilio: https://www.twilio.com/
2. Get your Account SID and Auth Token from the dashboard
3. Purchase a phone number or use a trial number
4. Add credentials to `.env`

### WhatsApp Setup

1. Create a Facebook Business Account
2. Set up WhatsApp Business API: https://developers.facebook.com/docs/whatsapp
3. Get your Phone Number ID and Access Token
4. Add credentials to `.env`

### Telegram Setup

1. Create a bot with @BotFather on Telegram
2. Get your bot token
3. Get your chat ID (use @userinfobot)
4. Add credentials to `.env`

## Implementation Status

- ✅ **In-App**: Fully implemented
- ✅ **Email**: Fully implemented
- ⚠️ **SMS**: Framework ready, needs Twilio integration
- ⚠️ **WhatsApp**: Framework ready, needs API integration
- ⚠️ **Telegram**: Framework ready, needs Bot API integration

## Notes

- In-app notifications are always sent regardless of delivery mode selection
- If a service is disabled, it will be skipped automatically
- Delivery results are logged for debugging
- Maximum 500 users per announcement for performance

