"""Client de l'API Firsty (https://builders.firsty.app) : fournisseur d'eSIM.

Flux (doc « Provision your first eSIM via API ») :
  POST /auth/token                                             OAuth2 client_credentials (formulaire), jeton valable 24 h
  POST /esims                                                  crée une eSIM : profileReference, esimReference, iccid, activationCode (LPA)
  POST /profiles/{profile}/esims/{esim}/packages  {planReference}   rattache un forfait
Les réponses sont enveloppées dans {"data": {...}}. Base sandbox : https://connect.test.firsty.app/api/v3.

Idempotence : chaque POST envoie `X-Idempotency-Key` (valable 48 h). La clé est dérivée de notre identifiant interne,
donc rejouer la même livraison renvoie la réponse déjà enregistrée au lieu de créer une deuxième eSIM.
Même interface que providers/yesim.py (new_esim / find_order) pour que fulfillment.py reste générique.
"""
import logging
import os
import random
import threading
import time
import urllib.parse
import uuid

import httpx

logging.getLogger("httpx").setLevel(logging.WARNING)
log = logging.getLogger("kozz.firsty")
_NS = uuid.UUID("6f1c1f0e-8f0e-4b6e-9a5e-6b6f1f7c2a11")  # espace de noms fixe : mêmes entrées → même clé


class FirstyError(Exception):
    """Erreur Firsty ou réseau. Le message ne contient jamais d'identifiants."""


class Firsty:
    def __init__(self, client_id: str, client_secret: str, base_url: str, timeout: float = 20.0):
        self._id, self._secret = client_id, client_secret
        self._http = httpx.Client(base_url=base_url.rstrip("/"), timeout=timeout)
        self._token: tuple[str, float] | None = None
        self._lock = threading.Lock()

    # ---- authentification (jeton gardé en mémoire ~24 h) ----
    def _auth(self, force: bool = False) -> str:
        with self._lock:
            if not force and self._token and time.time() < self._token[1]:
                return self._token[0]
            try:
                r = self._http.post(
                    "/auth/token",
                    data={"grant_type": "client_credentials", "client_id": self._id, "client_secret": self._secret},
                )
            except httpx.HTTPError as e:
                raise FirstyError(f"Firsty injoignable ({type(e).__name__})") from None
            if r.status_code != 200:
                raise FirstyError(f"Authentification Firsty refusée ({r.status_code})")
            j = r.json()
            self._token = (j["access_token"], time.time() + int(j.get("expires_in", 86400)) - 300)
            return self._token[0]

    # ---- POST avec reprises ----
    def _post(self, path: str, body: dict, idem_key: str) -> dict:
        reauthed, errors_5xx = False, 0
        for attempt in range(1, 6):
            try:
                r = self._http.post(
                    path, json=body,
                    headers={"Authorization": f"Bearer {self._auth()}", "X-Idempotency-Key": idem_key},
                )
            except httpx.HTTPError as e:
                if attempt >= 3:
                    raise FirstyError(f"Firsty injoignable ({type(e).__name__})") from None
                time.sleep(2 ** attempt * 0.5 + random.random() * 0.5)
                continue
            if r.status_code < 300:
                j = r.json()
                return j.get("data", j) if isinstance(j, dict) else {}
            if r.status_code == 401 and not reauthed:  # jeton expiré : une seule ré-authentification
                reauthed = True
                self._auth(force=True)
                continue
            if r.status_code == 429 and attempt < 5:
                wait = float(r.headers.get("Retry-After") or 2 ** attempt * 0.5)
                time.sleep(wait + random.random() * 0.25)
                continue
            if r.status_code >= 500:
                errors_5xx += 1
                if errors_5xx < 3:
                    time.sleep(2 ** errors_5xx * 0.5 + random.random() * 0.5)
                    continue
            detail = ""
            try:
                detail = str((r.json() or {}).get("message") or "")[:150]
            except ValueError:
                pass
            raise FirstyError(f"Firsty {r.status_code} sur {path}: {detail}".strip())  # 4xx : pas de nouvelle tentative
        raise FirstyError(f"Firsty : trop de tentatives sur {path}")

    # ---- interface commune avec Yesim ----
    def new_esim(self, plan_id: str, payment_id: str, user_id: int | None = None) -> dict:
        """Crée l'eSIM puis y rattache le forfait. `payment_id` (notre clé interne) sert à dériver les clés d'idempotence."""
        e = self._post("/esims", {}, str(uuid.uuid5(_NS, f"{payment_id}:esim")))
        self._post(
            f"/profiles/{e['profileReference']}/esims/{e['esimReference']}/packages",
            {"planReference": plan_id},
            str(uuid.uuid5(_NS, f"{payment_id}:pkg")),
        )
        lpa = e.get("activationCode") or ""
        return {
            "iccid": e.get("iccid"),
            "qrcode": lpa,
            "img": _qr_png_b64(lpa) if lpa else None,
            "ios_tap_link": "https://esimsetup.apple.com/esim_qrcode_provisioning?carddata=" + urllib.parse.quote(lpa, safe="") if lpa else None,
        }

    def find_order(self, payment_id: str) -> dict | None:
        """Firsty n'a pas de recherche par référence : l'idempotence est assurée par les clés (voir plus haut)."""
        return None


def _qr_png_b64(data: str) -> str:
    import base64
    import io

    import segno

    buf = io.BytesIO()
    segno.make(data, error="m").save(buf, kind="png", scale=8, border=2)
    return base64.b64encode(buf.getvalue()).decode()


def get_client() -> Firsty | None:
    cid, secret = os.getenv("FIRSTY_CLIENT_ID", "").strip(), os.getenv("FIRSTY_CLIENT_SECRET", "").strip()
    if not (cid and secret):
        return None
    return Firsty(cid, secret, os.getenv("FIRSTY_BASE_URL", "https://connect.test.firsty.app/api/v3"))
