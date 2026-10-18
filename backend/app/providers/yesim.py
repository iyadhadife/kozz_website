"""Client de l'API partenaire Yesim (https://partners-api.yesim.biz).

Endpoints d'après la collection Postman publique « Yesim Partner API » :
  GET  /plans            liste/détail des forfaits (price = coût partenaire, retail_price = prix public)
  GET  /new_esim         crée une eSIM (+ forfait si plan_id) ; renvoie iccid, qrcode, img (PNG base64), ios_tap_link
  GET  /orders           commandes passées (id, iccid, plan_id, cost_eur, payment_id…) : sert à retrouver une commande
  GET  /sim_info         état et consommation d'une eSIM
Authentification : paramètre de requête `token`. Il apparaît donc dans l'URL : on ne logge jamais les URL.
"""
import logging
import os

import httpx

# httpx logge chaque URL (donc le jeton) au niveau INFO : on le coupe
logging.getLogger("httpx").setLevel(logging.WARNING)
logging.getLogger("httpcore").setLevel(logging.WARNING)
log = logging.getLogger("kozz.yesim")


class YesimError(Exception):
    """Erreur renvoyée par Yesim ou réseau. Le message ne contient jamais le jeton."""


class Yesim:
    def __init__(self, token: str, base_url: str, timeout: float = 20.0):
        self._token = token
        self._http = httpx.Client(base_url=base_url.rstrip("/"), timeout=timeout)

    def _call(self, method: str, path: str, **params):
        params = {k: v for k, v in params.items() if v is not None}
        try:
            r = self._http.request(method, path, params={"token": self._token, **params})
        except httpx.HTTPError as e:
            raise YesimError(f"Yesim injoignable ({type(e).__name__})") from None  # pas de chaîne d'exception : l'URL contient le jeton
        try:
            data = r.json()
        except ValueError:
            data = None
        if r.status_code >= 400:
            detail = ""
            if isinstance(data, dict):
                detail = str(data.get("message") or data.get("error") or data.get("detail") or "")[:150]
            raise YesimError(f"Yesim {r.status_code} sur {path}: {detail}".strip())
        return data

    def plans(self, plan_id: str | None = None) -> list[dict]:
        data = self._call("GET", "/plans", plan_id=plan_id)
        if isinstance(data, dict):  # la forme exacte n'est pas documentée : liste directe ou objet enveloppe
            data = data.get("plans") or data.get("data") or [data]
        return data or []

    def new_esim(self, plan_id: str, payment_id: str, user_id: int | None = None) -> dict:
        return self._call("GET", "/new_esim", plan_id=plan_id, payment_id=payment_id, user_id=user_id)

    def orders(self) -> list[dict]:
        data = self._call("GET", "/orders")
        if isinstance(data, dict):
            data = data.get("orders") or data.get("data") or []
        return data or []

    def find_order(self, payment_id: str) -> dict | None:
        """Retrouve une commande déjà passée avec notre payment_id (évite un doublon après un incident réseau)."""
        return next((o for o in self.orders() if o.get("payment_id") == payment_id), None)

    def sim_info(self, iccid: str) -> dict:
        return self._call("GET", "/sim_info", iccid=iccid)


def get_client() -> Yesim | None:
    token = os.getenv("YESIM_API_TOKEN", "").strip()
    if not token:
        return None
    return Yesim(token, os.getenv("YESIM_BASE_URL", "https://partners-api.yesim.biz"))
