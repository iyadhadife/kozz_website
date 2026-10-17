import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

const threadId = crypto.randomUUID();

export default function Chat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([{ role: "bot", text: "Salut ! Une question sur ton eSIM ou une recharge ?" }]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const log = useRef(null);

  useEffect(() => {
    log.current?.scrollTo({ top: log.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  async function send(e) {
    e.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", text }]);
    setBusy(true);
    try {
      const res = await fetch("/chat/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, thread_id: threadId }),
      });
      const data = await res.json();
      setMessages((m) => [...m, { role: "bot", text: data.reply }]);
    } catch {
      setMessages((m) => [...m, { role: "bot", text: "Oups, je n'arrive pas à te répondre pour le moment." }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="chat-wrap">
      <AnimatePresence>
        {open && (
          <motion.form
            className="chat"
            onSubmit={send}
            initial={{ opacity: 0, y: 30, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 280, damping: 24 }}
          >
            <div className="log" ref={log}>
              {messages.map((m, i) => (
                <motion.div key={i} className={`msg ${m.role}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                  {m.text}
                </motion.div>
              ))}
              {busy && <div className="msg bot typing"><i /><i /><i /></div>}
            </div>
            <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Écris un message…" />
          </motion.form>
        )}
      </AnimatePresence>
      <motion.button className="chat-fab" onClick={() => setOpen((o) => !o)} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} aria-label="Ouvrir le chat">
        {open ? "✕" : "💬"}
      </motion.button>
    </div>
  );
}
