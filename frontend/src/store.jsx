import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api } from "./api.js";
import { localizeData, setCurrencyState } from "./data.js";
import { currentLang, initialLang, loadLang } from "./i18n.js";

const Ctx = createContext(null);
export const useStore = () => useContext(Ctx);

const CART_KEY = "kozzgo_cart";
const loadCart = () => {
  try {
    return JSON.parse(sessionStorage.getItem(CART_KEY)) || [];
  } catch {
    return [];
  }
};

export function StoreProvider({ children }) {
  const [cart, setCart] = useState(loadCart);
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState(undefined); // undefined = chargement, null = déconnecté
  const [lang, setLangCode] = useState(initialLang);
  const setLang = async (code) => {
    const l = await loadLang(code); // charge le dictionnaire avant de redessiner
    localizeData(); // forfaits, causes, FAQ, noms de pays dans la nouvelle langue
    setCurrencyState({ locale: l.locale }); // formats de nombres et de devises dans la langue
    setLangCode(l.code);
    try { localStorage.setItem("kozz_lang", l.code); } catch {}
  };
  const [fx, setFx] = useState(null); // taux du jour : { rates, currencies, updated_at }
  const [currency, setCurrencyCode] = useState(() => {
    try { return localStorage.getItem("kozz_currency") || "EUR"; } catch { return "EUR"; }
  });

  const apply = (code, data) => {
    const c = data?.currencies?.[code];
    if (!c || !data.rates[code]) code = "EUR";
    const info = data?.currencies?.[code] || { decimals: 2, step: 0 };
    setCurrencyState({ code, rate: data?.rates?.[code] || 1, decimals: info.decimals, step: info.step });
    return code;
  };
  useEffect(() => {
    api("/fx").then((d) => { setFx(d); setCurrencyCode(apply(currency, d)); }).catch(() => apply("EUR", null));
  }, []);
  const setCurrency = (code) => {
    const final = apply(code, fx);
    setCurrencyCode(final);
    try { localStorage.setItem("kozz_currency", final); } catch {}
  };

  useEffect(() => {
    api("/me").then(setUser).catch(() => setUser(null));
  }, []);

  const login = useCallback(async (email, password) => setUser(await api("/auth/login", { method: "POST", body: { email, password } })), []);
  // Étape 1 : envoie un code par e-mail (le compte n'existe pas encore). Étape 2 : le bon code crée le compte et connecte.
  const register = useCallback(async (email, password, first_name) => {
    let ref;
    try { ref = localStorage.getItem("kozz_ref") || undefined; } catch {}
    const r = await api("/auth/register", { method: "POST", body: { email, password, first_name, ref, lang: currentLang().code } });
    if (r?.id) {  // vérification désactivée côté serveur : le compte est déjà créé et connecté
      setUser(r);
      try { localStorage.removeItem("kozz_ref"); } catch {}
    }
    return r;
  }, []);
  const verifyRegister = useCallback(async (email, code) => {
    setUser(await api("/auth/register/verify", { method: "POST", body: { email, code } }));
    try { localStorage.removeItem("kozz_ref"); } catch {}
  }, []);
  const resendRegister = useCallback((email) => api("/auth/register/resend", { method: "POST", body: { email, lang: currentLang().code } }), []);
  const logout = useCallback(async () => {
    await api("/auth/logout", { method: "POST" }).catch(() => {});
    setUser(null);
  }, []);

  useEffect(() => {
    try {
      sessionStorage.setItem(CART_KEY, JSON.stringify(cart));
    } catch {}
  }, [cart]);

  const add = (item) => {
    setCart((c) => [...c, { ...item, uid: crypto.randomUUID() }]);
    setOpen(true);
  };
  const remove = (uid) => setCart((c) => c.filter((i) => i.uid !== uid));
  const checkout = () => setCart([]); return ( <Ctx.Provider value={{ cart, add, remove, open, setOpen, checkout, currency, setCurrency, fx, lang, setLang, user, setUser, login, register, verifyRegister, resendRegister, logout }}>
      {children}
    </Ctx.Provider>
  );
}
