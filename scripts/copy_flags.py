"""Copie les drapeaux SVG (paquet npm flag-icons, licence MIT) dans frontend/public/flags, en minuscules.
Ne remplace pas les drapeaux déjà présents. À lancer depuis la racine : python scripts/copy_flags.py"""
import shutil
from pathlib import Path

src = Path("frontend/node_modules/flag-icons/flags/4x3")
dst = Path("frontend/public/flags")
n = 0
for f in src.glob("*.svg"):
    if len(f.stem) == 2 and not (dst / f.name.lower()).exists():
        shutil.copy(f, dst / f.name.lower())
        n += 1
print(n, "drapeaux copiés ;", len(list(dst.glob("*.svg"))), "au total")
