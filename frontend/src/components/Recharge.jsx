import { useState } from "react";
import { motion } from "framer-motion";
import Section from "./Section.jsx";
import { CORRIDORS, TOPUP_AMOUNTS, eur } from "../data.js";
import { useStore } from "../store.jsx";

export default function Recharge() {
  const { add } = useStore();
  const [cid, setCid] = useState("ma");
  const corridor = CORRIDORS.find((c) => c.id === cid);
  const [operator, setOperator] = useState(corridor.operators[0]);
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState(10);

  const pick = (c) => {
    setCid(c.id);
    setOperator(c.operators[0]);
  };
  const valid = !corridor.soon && phone.replace(/\D/g, "").length >= 8;

  return (
    <Section id="recharge" title="Recharge pour un proche" subtitle="Crédite la SIM locale de ta famille, sans rien installer. Chaque recharge finance aussi une cause.">
      <div className="chips">
        {CORRIDORS.map((c) => (
          <button key={c.id} className={`chip ${c.id === cid ? "on" : ""}`} onClick={() => pick(c)}>
            {c.id === cid && <motion.span layoutId="chip2" className="chip-bg" />}
            <span>{c.country}{c.soon && " · bientôt"}</span>
          </button>
        ))}
      </div>

      <div className="card form recharge">
        <label>
          Opérateur
          <select value={operator} onChange={(e) => setOperator(e.target.value)}>
            {corridor.operators.map((o) => <option key={o}>{o}</option>)}
          </select>
        </label>
        <label>
          Numéro du proche
          <input type="tel" placeholder="+212 6 12 34 56 78" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </label>
        <div>
          <span className="lbl">Montant</span>
          <div className="amounts">
            {TOPUP_AMOUNTS.map((a) => (
              <motion.button key={a} type="button" className={`amt ${a === amount ? "on" : ""}`} whileTap={{ scale: 0.92 }} onClick={() => setAmount(a)}>
                {a} €
                {a === 10 && <small>populaire</small>}
              </motion.button>
            ))}
          </div>
        </div>
        <button
          className="btn"
          disabled={!valid}
          onClick={() => add({ kind: "topup", corridor_id: corridor.id, operator, phone, amount, label: `Recharge ${corridor.country} · ${operator} · ${phone}`, price: amount, qty: 1 })}
        >
          {corridor.soon ? "Corridor bientôt disponible" : `Recharger pour ${eur(amount)}`}
        </button>
      </div>
    </Section>
  );
}
