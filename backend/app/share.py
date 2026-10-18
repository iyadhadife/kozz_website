"""Partage du passeport d'impact par e-mail : un e-mail HTML aux couleurs de KozzGo, envoyé à un proche, avec l'image du passeport
et un bouton « Créer mon compte » qui porte le code de parrainage de l'expéditeur.

Garde-fous (c'est un envoi vers un tiers) : compte connecté et au moins une commande payée ; 5 envois / 24 h par compte ; un même destinataire
reçoit au plus 1 message / 7 j du même compte et 2 / 7 j au total ; jamais vers sa propre adresse. L'adresse du destinataire n'est PAS conservée :
seule une empreinte SHA-256 sert à appliquer ces plafonds.
"""
import hashlib
import logging
import re
from html import escape
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy import text

from . import emailkit, notify, texts
from . import security as sec
from .auth import _impact
from .db import engine
from .og import passport_png_for

log = logging.getLogger("kozz.share")
router = APIRouter(prefix="/api")
SITE_URL = emailkit.SITE_URL
EMAIL = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")

S = {
    "fr": {
        "subject_named": "{name} te recommande KozzGo", "subject": "Un ami te recommande KozzGo",
        "title_named": "{name} t'invite sur KozzGo", "title": "Un ami t'invite sur KozzGo",
        "lead": "KozzGo, c'est l'eSIM pour voyager connecté sans frais de roaming, et chaque achat finance une cause. Voici l'impact déjà généré :",
        "total": "{amount} de dons générés", "orders": "{n} commande(s) solidaire(s)",
        "cta": "Créer mon compte", "code": "Code de parrainage : {code}",
        "see": "Voir le passeport d'impact complet",
        "gift": "En créant ton compte avec ce lien, ton code de parrainage est appliqué automatiquement.",
        "why": "Tu reçois ce message parce que {who} l'a envoyé depuis KozzGo. Nous ne conservons pas ton adresse e-mail et ne t'écrirons pas d'autre message.",
        "who_named": "{name}", "who": "un ami", "note": "Son message :",
        "text": "{title}\n\n{lead}\n{total} · {orders}\n\nCrée ton compte avec son code de parrainage {code} : {link}\nSon passeport d'impact : {passport}\n\n{why}",
    },
    "en": {
        "subject_named": "{name} recommends KozzGo", "subject": "A friend recommends KozzGo",
        "title_named": "{name} invites you to KozzGo", "title": "A friend invites you to KozzGo",
        "lead": "KozzGo is the travel eSIM with no roaming fees, and every purchase funds a cause. Here is the impact already generated:",
        "total": "{amount} in donations generated", "orders": "{n} solidarity order(s)",
        "cta": "Create my account", "code": "Referral code: {code}",
        "see": "See the full impact passport",
        "gift": "When you create your account with this link, the referral code is applied automatically.",
        "why": "You are receiving this message because {who} sent it from KozzGo. We do not keep your email address and will not write to you again.",
        "who_named": "{name}", "who": "a friend", "note": "Their message:",
        "text": "{title}\n\n{lead}\n{total} · {orders}\n\nCreate your account with their referral code {code}: {link}\nTheir impact passport: {passport}\n\n{why}",
    },
}


class ShareIn(BaseModel):
    email: str = Field(max_length=255)
    note: Optional[str] = Field(None, max_length=280)
    lang: Optional[str] = Field(None, max_length=8)


def _h(email: str) -> str:
    return hashlib.sha256(("share:" + email.lower()).encode()).hexdigest()


def _build(cust: dict, data: dict, note: str | None, lang: str):
    lg = texts.lang_for(lang)
    s = S[lg]
    name = (cust.get("first_name") or "").strip()
    code = cust["referral_code"]
    link, passport = f"{SITE_URL}/?ref={code}", f"{SITE_URL}/passeport/{code}"
    title = s["title_named"].format(name=name) if name else s["title"]
    subject = s["subject_named"].format(name=name) if name else s["subject"]
    who = s["who_named"].format(name=name) if name else s["who"]
    amount = texts.money(lg, data["total"])
    orders = s["orders"].format(n=data["orders"])
    note_html = ""
    if note and note.strip():
        note_html = (f'<table role="presentation" cellpadding="0" cellspacing="0" style="margin:6px 0 16px"><tr><td style="border-left:4px solid {emailkit.CORAL};padding:4px 0 4px 14px;'
                     f'font:italic 400 15px/1.5 {emailkit.FONT};color:{emailkit.MUTED}">{escape(note.strip())}</td></tr></table>')
    body = (
        emailkit.p(escape(s["lead"]))
        + note_html
        + f'<a href="{passport}" style="text-decoration:none"><img src="cid:passport" alt="{escape(s["total"].format(amount=amount))}" width="532" style="display:block;width:100%;max-width:532px;height:auto;border:0;border-radius:14px"></a>'
        + '<div style="height:6px"></div>'
        + emailkit.button(s["cta"], link)
        + emailkit.p(escape(s["code"].format(code=code)), muted=True)
        + emailkit.p(escape(s["gift"]), muted=True)
        + f'<p style="margin:0"><a href="{passport}" style="color:{emailkit.CORAL_INK};font:600 14px {emailkit.FONT}">{escape(s["see"])}</a></p>'
    )
    footer = escape(s["why"].format(who=who)) + "<br>"
    html = emailkit.layout(title, body, preheader=f'{s["total"].format(amount=amount)} · {orders}', footer_html=footer, lang=lg)
    plain = s["text"].format(title=title, lead=s["lead"], total=s["total"].format(amount=amount), orders=orders, code=code, link=link, passport=passport, why=s["why"].format(who=who))
    if note and note.strip():
        plain = plain.replace("\n\n" + s["lead"], "\n\n" + s["lead"] + f"\n{s['note']} {note.strip()}", 1)
    return subject, plain, html


def _send(to: str, cust: dict, data: dict, note: str | None, lang: str | None) -> None:
    try:
        subject, plain, html = _build(cust, data, note, lang or "fr")
        png = passport_png_for(cust["referral_code"], data)
        notify.send_email(to, subject, plain, html, inline=[("logo", emailkit.logo_png()), ("passport", png)])
    except notify.NotConfigured:
        log.error("Partage du passeport : SMTP non configuré")
    except Exception as e:  # noqa: BLE001
        log.error("Envoi du partage échoué: %s", type(e).__name__)


@router.post("/me/share/passport", status_code=202)
def share_passport(body: ShareIn, request: Request, tasks: BackgroundTasks, cust=Depends(sec.require_customer)):
    to = body.email.strip().lower()
    if not EMAIL.match(to):
        raise HTTPException(422, "Adresse e-mail invalide.")
    if to == cust["email"].lower():
        raise HTTPException(422, "Entre l'adresse d'un proche, pas la tienne.")
    data = _impact(cust["id"])
    if not data["orders"]:
        raise HTTPException(409, "Ton passeport est encore vide : passe une première commande pour le partager.")
    if not cust.get("referral_code"):
        raise HTTPException(409, "Code de parrainage indisponible.")
    sec.rate_limit(f"share:{cust['id']}", limit=30, window=3600)
    th = _h(to)
    with engine.begin() as c:
        day = c.execute(text("SELECT COUNT(*) FROM share_log WHERE customer_id=:c AND created_at > DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 DAY)"), {"c": cust["id"]}).scalar()
        if day >= 5:
            raise HTTPException(429, "Tu as atteint la limite de 5 partages par e-mail aujourd'hui. Réessaie demain.")
        same = c.execute(text("SELECT COUNT(*) FROM share_log WHERE customer_id=:c AND to_hash=:h AND created_at > DATE_SUB(UTC_TIMESTAMP(), INTERVAL 7 DAY)"), {"c": cust["id"], "h": th}).scalar()
        anyone = c.execute(text("SELECT COUNT(*) FROM share_log WHERE to_hash=:h AND created_at > DATE_SUB(UTC_TIMESTAMP(), INTERVAL 7 DAY)"), {"h": th}).scalar()
        if same or anyone >= 2:
            raise HTTPException(429, "Cette personne a déjà reçu une invitation récemment.")
        c.execute(text("INSERT INTO share_log (customer_id, to_hash) VALUES (:c, :h)"), {"c": cust["id"], "h": th})
        c.execute(text("DELETE FROM share_log WHERE created_at < DATE_SUB(UTC_TIMESTAMP(), INTERVAL 30 DAY)"))
    tasks.add_task(_send, to, dict(cust), data, body.note, body.lang)
    return {"status": "sent"}
