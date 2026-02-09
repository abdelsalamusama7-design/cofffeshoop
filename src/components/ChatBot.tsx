import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, X, Send, Loader2 } from 'lucide-react';
import { getProducts, getCategories, getInventory } from '@/lib/store';

type Msg = { role: 'user' | 'assistant'; content: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;

const ChatBot = () => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const getSiteData = useCallback(() => {
    const products = getProducts();
    const categories = getCategories();
    const inventory = getInventory();
    return {
      categories: categories.map(c => c.name),
      products: products.map(p => ({
        name: p.name,
        price: p.sellPrice,
        category: categories.find(c => c.id === p.categoryId)?.name,
      })),
      inventoryItems: inventory.map(i => ({ name: i.name, qty: i.quantity, unit: i.unit })),
    };
  }, []);

  const send = async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    const userMsg: Msg = { role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    let assistantSoFar = '';
    const allMessages = [...messages, userMsg];

    try {
      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: allMessages, siteData: getSiteData() }),
      });

      if (!resp.ok || !resp.body) {
        const errData = await resp.json().catch(() => ({}));
        throw new Error(errData.error || 'فشل الاتصال');
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantSoFar += content;
              setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === 'assistant') {
                  return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantSoFar } : m);
                }
                return [...prev, { role: 'assistant', content: assistantSoFar }];
              });
            }
          } catch {
            textBuffer = line + '\n' + textBuffer;
            break;
          }
        }
      }
    } catch (e: any) {
      setMessages(prev => [...prev, { role: 'assistant', content: `❌ ${e.message || 'حصل مشكلة، جرب تاني'}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating Robot Button */}
      <AnimatePresence>
        {!open && (
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setOpen(true)}
            className="fixed bottom-24 left-4 md:bottom-6 md:left-6 z-50 w-14 h-14 rounded-full cafe-gradient shadow-2xl flex items-center justify-center"
          >
            <motion.div
              animate={{ y: [0, -3, 0] }}
              transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
            >
              <Bot size={28} className="text-primary-foreground" />
            </motion.div>
            {/* Pulse ring */}
            <span className="absolute inset-0 rounded-full cafe-gradient animate-ping opacity-30" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Window */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-24 left-4 right-4 md:bottom-6 md:left-6 md:right-auto md:w-96 z-50 rounded-2xl overflow-hidden shadow-2xl border border-border bg-card flex flex-col"
            style={{ maxHeight: 'calc(100dvh - 140px)' }}
          >
            {/* Header */}
            <div className="cafe-gradient p-4 flex items-center justify-between">
              <button onClick={() => setOpen(false)} className="p-1 rounded-lg hover:bg-white/20">
                <X size={20} className="text-primary-foreground" />
              </button>
              <div className="flex items-center gap-2 text-primary-foreground">
                <span className="font-bold text-sm">روبوت بن العميد 🤖</span>
                <motion.div animate={{ rotate: [0, 10, -10, 0] }} transition={{ repeat: Infinity, duration: 3 }}>
                  <Bot size={24} />
                </motion.div>
              </div>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3" style={{ minHeight: 250, maxHeight: 350 }}>
              {messages.length === 0 && (
                <div className="text-center py-8 space-y-3">
                  <motion.div
                    animate={{ y: [0, -8, 0] }}
                    transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
                    className="text-5xl"
                  >
                    🤖
                  </motion.div>
                  <p className="text-sm text-muted-foreground">أهلاً! أنا روبوت بن العميد ☕</p>
                  <p className="text-xs text-muted-foreground">اسألني عن المنتجات أو الأسعار أو أي حاجة!</p>
                  <div className="flex flex-wrap gap-2 justify-center mt-2">
                    {['إيه المنتجات عندكم؟', 'سعر القهوة كام؟', 'إيه أرخص مشروب؟'].map(q => (
                      <button
                        key={q}
                        onClick={() => { setInput(q); }}
                        className="text-xs bg-secondary text-secondary-foreground px-3 py-1.5 rounded-full hover:bg-accent hover:text-accent-foreground transition-colors"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'cafe-gradient text-primary-foreground rounded-br-md'
                        : 'bg-secondary text-secondary-foreground rounded-bl-md'
                    }`}
                  >
                    {msg.content}
                  </div>
                </motion.div>
              ))}
              {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                  <div className="bg-secondary rounded-2xl rounded-bl-md px-4 py-3">
                    <Loader2 size={16} className="animate-spin text-muted-foreground" />
                  </div>
                </motion.div>
              )}
            </div>

            {/* Input */}
            <div className="p-3 border-t border-border bg-card">
              <div className="flex gap-2">
                <button
                  onClick={send}
                  disabled={!input.trim() || isLoading}
                  className="w-10 h-10 rounded-xl cafe-gradient text-primary-foreground flex items-center justify-center disabled:opacity-50 shrink-0"
                >
                  <Send size={18} />
                </button>
                <input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
                  placeholder="اكتب رسالتك..."
                  className="flex-1 bg-secondary text-secondary-foreground rounded-xl px-4 py-2 text-sm outline-none placeholder:text-muted-foreground"
                  dir="rtl"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default ChatBot;
