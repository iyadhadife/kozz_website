import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api } from "./api.js";

const Ctx = createContext(null);
export const useStore = () => useContext(Ctx);

const KEY = "kozzgo_passport";
const load = () => {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || [];
  } catch {
    return [];
  }
};

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
  const [passport, setPassport] = useState(load); // commandes passées (démo, stockées localement)
  const [user, setUser] = useState(undefined); // undefined = chargement, null = déconnecté

  useEffect(() => {
    api("/me").then(setUser).catch(() => setUser(null));
  }, []);

  const login = useCallback(async (email, password) => setUser(await api("/auth/login", { method: "POST", body: { email, password } })), []);
  const register = useCallback(async (email, password, first_name) => setUser(await api("/auth/register", { method: "POST", body: { email, password, first_name } })), []);
  const logout = useCallback(async () => {
    await api("/auth/logout", { method: "POST" }).catch(() => {});
    setUser(null);
    setPassport([]); // ordinateur partagé : on ne laisse pas l'impact du précédent utilisateur
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(passport));
    } catch {}
  }, [passport]);

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
  const checkout = (order) => {
    setPassport((p) => [order, ...p]);
    setCart([]);
  };

  return (
    <Ctx.Provider value={{ cart, add, remove, open, setOpen, passport, checkout, user, setUser, login, register, logout }}>
      {children}
    </Ctx.Provider>
  );
}
