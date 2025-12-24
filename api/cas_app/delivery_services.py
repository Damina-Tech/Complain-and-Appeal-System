"""
Delivery services for announcements via different channels.
"""
import os
import logging
from typing import List, Dict
from django.conf import settings
from django.core.mail import send_mail
from .models import User, Announcement

logger = logging.getLogger(__name__)


def send_in_app_notification(announcement: Announcement, users: List[User]) -> Dict[str, int]:
    """
    Send in-app notifications for an announcement.
    Returns dict with success/failure counts.
    """
    from .models import Notification
    
    success_count = 0
    try:
        message_preview = announcement.content[:200] + ("..." if len(announcement.content) > 200 else "")
        notifications = [
            Notification(
                user=user,
                notification_type="announcement",
                title=f"New Announcement: {announcement.title}",
                message=message_preview,
                related_announcement_id=announcement,
            )
            for user in users
        ]
        
        # Bulk create in chunks of 100
        chunk_size = 100
        for i in range(0, len(notifications), chunk_size):
            Notification.objects.bulk_create(
                notifications[i:i + chunk_size], 
                ignore_conflicts=True
            )
            success_count += len(notifications[i:i + chunk_size])
        
        logger.info(f"Created {success_count} in-app notifications for announcement {announcement.id}")
    except Exception as e:
        logger.error(f"Error creating in-app notifications: {e}")
    
    return {"success": success_count, "failed": len(users) - success_count}


def send_email_notification(announcement: Announcement, users: List[User]) -> Dict[str, int]:
    """
    Send email notifications for an announcement.
    Returns dict with success/failure counts.
    """
    success_count = 0
    failed_count = 0
    
    from_email = getattr(settings, "DEFAULT_FROM_EMAIL", getattr(settings, "EMAIL_HOST_USER", "noreply@example.com"))
    subject = f"Announcement: {announcement.title}"
    
    for user in users:
        if not user.email:
            failed_count += 1
            continue
        
        try:
            send_mail(
                subject=subject,
                message=announcement.content,
                from_email=from_email,
                recipient_list=[user.email],
                fail_silently=False,
            )
            success_count += 1
        except Exception as e:
            logger.error(f"Error sending email to {user.email}: {e}")
            failed_count += 1
    
    logger.info(f"Sent {success_count} emails for announcement {announcement.id}, {failed_count} failed")
    return {"success": success_count, "failed": failed_count}


def send_sms_notification(announcement: Announcement, users: List[User]) -> Dict[str, int]:
    """
    Send SMS notifications for an announcement.
    Uses configured SMS service (Twilio, etc.).
    Returns dict with success/failure counts.
    """
    # Check if SMS is enabled
    sms_enabled = os.environ.get("SMS_ENABLED", "false").lower() == "true"
    if not sms_enabled:
        logger.warning("SMS notifications are disabled. Set SMS_ENABLED=true in .env")
        return {"success": 0, "failed": len(users)}
    
    # TODO: Implement actual SMS sending using Twilio or other service
    # For now, just log
    logger.info(f"SMS notification would be sent to {len(users)} users for announcement {announcement.id}")
    logger.warning("SMS sending not yet implemented. Configure SMS service in delivery_services.py")
    
    return {"success": 0, "failed": len(users)}


def send_whatsapp_notification(announcement: Announcement, users: List[User]) -> Dict[str, int]:
    """
    Send WhatsApp notifications for an announcement.
    Uses configured WhatsApp Business API.
    Returns dict with success/failure counts.
    """
    # Check if WhatsApp is enabled
    whatsapp_enabled = os.environ.get("WHATSAPP_ENABLED", "false").lower() == "true"
    if not whatsapp_enabled:
        logger.warning("WhatsApp notifications are disabled. Set WHATSAPP_ENABLED=true in .env")
        return {"success": 0, "failed": len(users)}
    
    # TODO: Implement actual WhatsApp sending using WhatsApp Business API
    # For now, just log
    logger.info(f"WhatsApp notification would be sent to {len(users)} users for announcement {announcement.id}")
    logger.warning("WhatsApp sending not yet implemented. Configure WhatsApp Business API in delivery_services.py")
    
    return {"success": 0, "failed": len(users)}


def send_telegram_notification(announcement: Announcement, users: List[User]) -> Dict[str, int]:
    """
    Send Telegram notifications for an announcement.
    Uses configured Telegram Bot API.
    Returns dict with success/failure counts.
    """
    # Check if Telegram is enabled
    telegram_enabled = os.environ.get("TELEGRAM_ENABLED", "false").lower() == "true"
    if not telegram_enabled:
        logger.warning("Telegram notifications are disabled. Set TELEGRAM_ENABLED=true in .env")
        return {"success": 0, "failed": len(users)}
    
    # TODO: Implement actual Telegram sending using Telegram Bot API
    # For now, just log
    logger.info(f"Telegram notification would be sent to {len(users)} users for announcement {announcement.id}")
    logger.warning("Telegram sending not yet implemented. Configure Telegram Bot API in delivery_services.py")
    
    return {"success": 0, "failed": len(users)}


def send_announcement_via_channels(announcement: Announcement, users: List[User], delivery_modes: List[str]) -> Dict[str, Dict[str, int]]:
    """
    Send announcement via specified delivery channels.
    Returns dict with results for each channel.
    """
    results = {}
    
    # If "all" is selected, use all available channels
    if "all" in delivery_modes:
        delivery_modes = ["in_app", "email", "sms", "whatsapp", "telegram"]
    
    for mode in delivery_modes:
        if mode == "in_app":
            results["in_app"] = send_in_app_notification(announcement, users)
        elif mode == "email":
            results["email"] = send_email_notification(announcement, users)
        elif mode == "sms":
            results["sms"] = send_sms_notification(announcement, users)
        elif mode == "whatsapp":
            results["whatsapp"] = send_whatsapp_notification(announcement, users)
        elif mode == "telegram":
            results["telegram"] = send_telegram_notification(announcement, users)
    
    return results

