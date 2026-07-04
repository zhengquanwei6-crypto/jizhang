from __future__ import annotations

import smtplib
from email.mime.text import MIMEText

from app.config import settings


def send_email(to: str, subject: str, body: str) -> bool:
    if not settings.smtp_host or not settings.smtp_from:
        return False
    msg = MIMEText(body, "plain", "utf-8")
    msg["Subject"] = subject
    msg["From"] = settings.smtp_from
    msg["To"] = to
    with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as server:
        server.starttls()
        if settings.smtp_user:
            server.login(settings.smtp_user, settings.smtp_password)
        server.send_message(msg)
    return True
