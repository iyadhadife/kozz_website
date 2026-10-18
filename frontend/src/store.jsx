import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api } from "./api.js";

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

  useEffect(() => {
    api("/me").then(setUser).catch(() => setUser(null));
  }, []);

  const login = useCallback(async (email, password) => setUser(await api("/auth/login", { method: "POST", body: { email, password } })), []);
  // Étape 1 : envoie un code par e-mail (le compte n'existe pas encore). Étape 2 : le bon code crée le compte et connecte.
  const register = useCallback(async (email, password, first_name) => {
    let ref;
    try { ref = localStorage.getItem("kozz_ref") || undefined; } catch {}
    const r = await api("/auth/register", { method: "POST", body: { email, password, first_name, ref } });
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
  const resendRegister = useCallback((email) => api("/auth/register/resend", { method: "POST", body: { email } }), []);
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
  const checkout = () => setCart([]);

  return (
    <Ctx.Provider value={{ cart, add, remove, open, setOpen, checkout, user, setUser, login, register, verifyRegister, resendRegister, logout }}>
      {children}
    </Ctx.Provider>
  );
}
