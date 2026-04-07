from django.conf import settings
from django.core.mail import send_mail


def send_email_with_logging(*, subject: str, message: str, recipient_list: list[str], logger, context: str, from_email: str | None = None) -> bool:
    """Send email and log explicit diagnostics on failures.

    Returns True only when Django reports at least one delivered message.
    """
    sender = from_email or settings.DEFAULT_FROM_EMAIL

    try:
        sent_count = send_mail(
            subject=subject,
            message=message,
            from_email=sender,
            recipient_list=recipient_list,
            fail_silently=False,
        )
        if sent_count > 0:
            logger.info("Correo enviado (%s) a %s", context, ", ".join(recipient_list))
            return True

        logger.warning("No se enviaron correos (%s) a %s", context, ", ".join(recipient_list))
        return False
    except Exception:
        logger.exception(
            "Fallo enviando correo (%s) via %s %s:%s (TLS=%s) hacia %s",
            context,
            settings.EMAIL_BACKEND,
            settings.EMAIL_HOST,
            settings.EMAIL_PORT,
            settings.EMAIL_USE_TLS,
            ", ".join(recipient_list),
        )
        return False
