"""Adresse publique du site : SITE_URL, ou https://NGROK_HOST quand NGROK=true (.env)."""
import os

if os.getenv("NGROK", "false").lower() == "true" and os.getenv("NGROK_HOST"):
    SITE_URL = "https://" + os.environ["NGROK_HOST"].strip().rstrip("/")
else:
    SITE_URL = os.getenv("SITE_URL", "https://localhost").rstrip("/")
