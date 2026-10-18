#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Collecteur mondial d'offres eSIM (240 destinations ISO 3166-1 alpha-2)
Format de sortie CSV : pays,go,jours,prix_ttc,source
"""

import csv
import json
import time
import random
import logging
from typing import List, Dict, Optional
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
from bs4 import BeautifulSoup

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s"
)

# Dictionnaire exhaustif des 240 destinations mondiales (ISO 3166-1 alpha-2 -> Slug URL)
WORLD_DESTINATIONS: Dict[str, str] = {
    "ad": "andorra",
    "ae": "united-arab-emirates",
    "af": "afghanistan",
    "ag": "antigua-and-barbuda",
    "ai": "anguilla",
    "al": "albania",
    "am": "armenia",
    "ao": "angola",
    "ar": "argentina",
    "as": "samoa-(american)",
    "at": "austria",
    "au": "australia",
    "aw": "aruba",
    "ax": "åland-islands",
    "az": "azerbaijan",
    "ba": "bosnia-and-herzegovina",
    "bb": "barbados",
    "bd": "bangladesh",
    "be": "belgium",
    "bf": "burkina-faso",
    "bg": "bulgaria",
    "bh": "bahrain",
    "bi": "burundi",
    "bj": "benin",
    "bl": "st-barthelemy",
    "bm": "bermuda",
    "bn": "brunei",
    "bo": "bolivia",
    "bq": "caribbean-nl",
    "br": "brazil",
    "bs": "bahamas",
    "bt": "bhutan",
    "bw": "botswana",
    "by": "belarus",
    "bz": "belize",
    "ca": "canada",
    "cc": "cocos-(keeling)-islands",
    "cd": "democratic-republic-of-the-congo",
    "cf": "central-african-rep",
    "cg": "republic-of-the-congo",
    "ch": "switzerland",
    "ci": "ivory-coast",
    "ck": "cook-islands",
    "cl": "chile",
    "cm": "cameroon",
    "cn": "china",
    "co": "colombia",
    "cr": "costa-rica",
    "cu": "cuba",
    "cv": "cape-verde",
    "cw": "curaçao",
    "cx": "christmas-island",
    "cy": "cyprus",
    "cz": "czech-republic",
    "de": "germany",
    "dj": "djibouti",
    "dk": "denmark",
    "dm": "dominica",
    "do": "dominican-republic",
    "dz": "algeria",
    "ec": "ecuador",
    "ee": "estonia",
    "eg": "egypt",
    "eh": "western-sahara",
    "er": "eritrea",
    "es": "spain",
    "et": "ethiopia",
    "fi": "finland",
    "fj": "fiji",
    "fk": "falkland-islands",
    "fm": "micronesia",
    "fo": "faroe-islands",
    "fr": "france",
    "ga": "gabon",
    "gb": "united-kingdom",
    "gd": "grenada",
    "ge": "georgia",
    "gf": "french-guiana",
    "gg": "guernsey",
    "gh": "ghana",
    "gi": "gibraltar",
    "gl": "greenland",
    "gm": "gambia",
    "gn": "guinea",
    "gp": "guadeloupe",
    "gq": "equatorial-guinea",
    "gr": "greece",
    "gt": "guatemala",
    "gu": "guam",
    "gw": "guinea-bissau",
    "gy": "guyana",
    "hk": "hong-kong",
    "hn": "honduras",
    "hr": "croatia",
    "ht": "haiti",
    "hu": "hungary",
    "id": "indonesia",
    "ie": "ireland",
    "il": "israel",
    "im": "isle-of-man",
    "in": "india",
    "iq": "iraq",
    "ir": "iran",
    "is": "iceland",
    "it": "italy",
    "je": "jersey",
    "jm": "jamaica",
    "jo": "jordan",
    "jp": "japan",
    "ke": "kenya",
    "kg": "kyrgyzstan",
    "kh": "cambodia",
    "ki": "kiribati",
    "km": "comoros",
    "kn": "st-kitts-and-nevis",
    "kp": "korea-(north)",
    "kr": "south-korea",
    "kw": "kuwait",
    "ky": "cayman-islands",
    "kz": "kazakhstan",
    "la": "laos",
    "lb": "lebanon",
    "lc": "st-lucia",
    "li": "liechtenstein",
    "lk": "sri-lanka",
    "lr": "liberia",
    "ls": "lesotho",
    "lt": "lithuania",
    "lu": "luxembourg",
    "lv": "latvia",
    "ly": "libya",
    "ma": "morocco",
    "mc": "monaco",
    "md": "moldova",
    "me": "montenegro",
    "mf": "st-martin-(french)",
    "mg": "madagascar",
    "mh": "marshall-islands",
    "mk": "north-macedonia",
    "ml": "mali",
    "mm": "myanmar-(burma)",
    "mn": "mongolia",
    "mo": "macau",
    "mp": "northern-mariana-islands",
    "mq": "martinique",
    "mr": "mauritania",
    "ms": "montserrat",
    "mt": "malta",
    "mu": "mauritius",
    "mv": "maldives",
    "mw": "malawi",
    "mx": "mexico",
    "my": "malaysia",
    "mz": "mozambique",
    "na": "namibia",
    "nc": "new-caledonia",
    "ne": "niger",
    "nf": "norfolk-island",
    "ng": "nigeria",
    "ni": "nicaragua",
    "nl": "netherlands",
    "no": "norway",
    "np": "nepal",
    "nr": "nauru",
    "nu": "niue",
    "nz": "new-zealand",
    "om": "oman",
    "pa": "panama",
    "pe": "peru",
    "pf": "french-polynesia",
    "pg": "papua-new-guinea",
    "ph": "philippines",
    "pk": "pakistan",
    "pl": "poland",
    "pm": "st-pierre-and-miquelon",
    "pr": "puerto-rico",
    "ps": "palestine",
    "pt": "portugal",
    "pw": "palau",
    "py": "paraguay",
    "qa": "qatar",
    "re": "réunion",
    "ro": "romania",
    "rs": "serbia",
    "ru": "russia",
    "rw": "rwanda",
    "sa": "saudi-arabia",
    "sb": "solomon-islands",
    "sc": "seychelles",
    "sd": "sudan",
    "se": "sweden",
    "sg": "singapore",
    "sh": "st-helena",
    "si": "slovenia",
    "sk": "slovakia",
    "sl": "sierra-leone",
    "sm": "san-marino",
    "sn": "senegal",
    "so": "somalia",
    "sr": "suriname",
    "ss": "south-sudan",
    "st": "sao-tome-and-principe",
    "sv": "el-salvador",
    "sx": "st-maarten-(dutch)",
    "sy": "syria",
    "sz": "eswatini-(swaziland)",
    "tc": "turks-and-caicos-is",
    "td": "chad",
    "tg": "togo",
    "th": "thailand",
    "tj": "tajikistan",
    "tk": "tokelau",
    "tl": "east-timor",
    "tm": "turkmenistan",
    "tn": "tunisia",
    "to": "tonga",
    "tr": "turkey",
    "tt": "trinidad-and-tobago",
    "tv": "tuvalu",
    "tw": "taiwan",
    "tz": "tanzania",
    "ua": "ukraine",
    "ug": "uganda",
    "us": "united-states",
    "uy": "uruguay",
    "uz": "uzbekistan",
    "va": "vatican-city",
    "vc": "st-vincent",
    "ve": "venezuela",
    "vg": "virgin-islands-(uk)",
    "vi": "virgin-islands-(us)",
    "vn": "vietnam",
    "vu": "vanuatu",
    "wf": "wallis-and-futuna",
    "ws": "samoa-(western)",
    "ye": "yemen",
    "yt": "mayotte",
    "za": "south-africa",
    "zm": "zambia",
    "zw": "zimbabwe"
}


class PoliteScraperSession:
    """Session HTTP résiliente avec temporisation aléatoire, rotation d'en-têtes et Retry exponentiel."""
    USER_AGENTS = [
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_6_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Safari/605.1.15",
        "Mozilla/5.0 (X11; Linux x86_64; rv:130.0) Gecko/20100101 Firefox/130.0",
    ]

    def __init__(self, min_delay: float = 1.2, max_delay: float = 2.8):
        self.min_delay = min_delay
        self.max_delay = max_delay
        self.session = requests.Session()

        retry_strategy = Retry(
            total=4,
            backoff_factor=2,
            status_forcelist=[429, 500, 502, 503, 504],
            allowed_methods=["GET"]
        )
        adapter = HTTPAdapter(max_retries=retry_strategy)
        self.session.mount("https://", adapter)
        self.session.mount("http://", adapter)

    def get(self, url: str, **kwargs) -> Optional[requests.Response]:
        time.sleep(random.uniform(self.min_delay, self.max_delay))
        headers = {
            "User-Agent": random.choice(self.USER_AGENTS),
            "Accept": "application/json, text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7",
        }
        try:
            resp = self.session.get(url, headers=headers, timeout=15, **kwargs)
            if resp.status_code == 404:
                return None
            resp.raise_for_status()
            return resp
        except requests.RequestException as exc:
            logging.warning(f"Requête échouée pour {url}: {exc}")
            return None


def fetch_saily_all_destinations(client: PoliteScraperSession, destinations: Dict[str, str]) -> List[Dict]:
    """Parcourt les 240 destinations pour extraire les offres depuis les données structurées JSON."""
    offers = []
    for iso, slug in destinations.items():
        url = f"https://saily.com/esim-{slug}/"
        logging.info(f"[Saily] Analyse de [{iso.upper()}] ({slug}) -> {url}")
        resp = client.get(url)
        if not resp:
            continue

        soup = BeautifulSoup(resp.text, "html.parser")
        next_data = soup.find("script", id="__NEXT_DATA__")
        if next_data and next_data.string:
            try:
                data = json.loads(next_data.string)
                plans = data.get("props", {}).get("pageProps", {}).get("plans", [])
                for plan in plans:
                    offers.append({
                        "pays": iso,
                        "go": plan.get("data_gb"),
                        "jours": plan.get("validity_days"),
                        "prix_ttc": f"{float(plan.get('price', 0)):.2f}",
                        "source": "saily"
                    })
            except Exception as e:
                logging.debug(f"Erreur de parsing JSON sur {iso}: {e}")
    return offers


def fetch_global_json_catalog(client: PoliteScraperSession, api_url: str, source_name: str) -> List[Dict]:
    """
    Méthode optimale : récupère les 240 destinations en une seule requête JSON
    lorsque le fournisseur expose un point de terminaison de catalogue global.
    """
    offers = []
    logging.info(f"[{source_name}] Téléchargement du catalogue global : {api_url}")
    resp = client.get(api_url)
    if not resp:
        return offers

    try:
        payload = resp.json()
        for country_entry in payload.get("data", []):
            iso = str(country_entry.get("country_code", "")).lower()
            for pkg in country_entry.get("packages", []):
                offers.append({
                    "pays": iso,
                    "go": pkg.get("amount_gb"),
                    "jours": pkg.get("day"),
                    "prix_ttc": f"{float(pkg.get('price', 0)):.2f}",
                    "source": source_name.lower()
                })
    except Exception as e:
        logging.error(f"Erreur lecture JSON global [{source_name}]: {e}")
    return offers


def save_to_csv(offers: List[Dict], output_file: str = "esim_world_all_destinations.csv"):
    fieldnames = ["pays", "go", "jours", "prix_ttc", "source"]
    with open(output_file, mode="w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(offers)
    logging.info(f"Fichier CSV généré avec succès : {output_file} ({len(offers)} lignes)")


if __name__ == "__main__":
    logging.info(f"{len(WORLD_DESTINATIONS)} destinations mondiales ISO chargées.")
    scraper = PoliteScraperSession(min_delay=1.5, max_delay=3.0)
    all_offers = fetch_saily_all_destinations(scraper, WORLD_DESTINATIONS)
    save_to_csv(all_offers)
