import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParams } from 'react-router-dom';
import { ShoppingCart, Plus, Minus, X, Receipt, Share2, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getCategories, getProducts, getCurrentUser, addSale } from '@/lib/store';
import { SaleItem, Sale } from '@/lib/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';

const Sales = () => {
  const [searchParams] = useSearchParams();
  const initialCategory = searchParams.get('category') || '';
  const [activeCategory, setActiveCategory] = useState(initialCategory);
  const [cart, setCart] = useState<SaleItem[]>([]);
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastSale, setLastSale] = useState<Sale | null>(null);

  const categories = getCategories();
  const products = getProducts();
  const user = getCurrentUser();

  const filteredProducts = useMemo(() =>
    activeCategory ? products.filter(p => p.categoryId === activeCategory) : products,
    [activeCategory, products]
  );

  const cartTotal = cart.reduce((sum, item) => sum + item.total, 0);

  const addToCart = (productId: string) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    setCart(prev => {
      const existing = prev.find(i => i.productId === productId);
      if (existing) {
        return prev.map(i =>
          i.productId === productId
            ? { ...i, quantity: i.quantity + 1, total: (i.quantity + 1) * i.unitPrice }
            : i
        );
      }
      return [...prev, {
        productId: product.id,
        productName: product.name,
        quantity: 1,
        unitPrice: product.sellPrice,
        total: product.sellPrice,
      }];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev => {
      return prev.map(i => {
        if (i.productId !== productId) return i;
        const newQty = i.quantity + delta;
        if (newQty <= 0) return null as any;
        return { ...i, quantity: newQty, total: newQty * i.unitPrice };
      }).filter(Boolean);
    });
  };

  const completeSale = () => {
    if (cart.length === 0 || !user) return;

    const now = new Date();
    const sale: Sale = {
      id: Date.now().toString(),
      items: cart,
      total: cartTotal,
      workerId: user.id,
      workerName: user.name,
      date: now.toISOString().split('T')[0],
      time: now.toLocaleTimeString('ar-EG'),
    };

    addSale(sale);
    setLastSale(sale);
    setShowReceipt(true);
    setCart([]);
    toast.success('تم البيع بنجاح!');
  };

  const shareReceipt = (method: 'whatsapp' | 'email') => {
    if (!lastSale) return;
    const text = `إيصال بيع - كافيه مانجر\n` +
      `التاريخ: ${lastSale.date}\nالوقت: ${lastSale.time}\n` +
      `العامل: ${lastSale.workerName}\n` +
      `---\n` +
      lastSale.items.map(i => `${i.productName} x${i.quantity} = ${i.total} ج.م`).join('\n') +
      `\n---\nالإجمالي: ${lastSale.total} ج.م`;

    if (method === 'whatsapp') {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    } else {
      window.open(`mailto:?subject=${encodeURIComponent('إيصال بيع - كافيه مانجر')}&body=${encodeURIComponent(text)}`, '_blank');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">المبيعات</h1>
        <div className="flex items-center gap-2 text-muted-foreground">
          <ShoppingCart size={20} />
          <span className="font-medium">{cart.length} عنصر</span>
        </div>
      </div>

      {/* Categories filter */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        <button
          onClick={() => setActiveCategory('')}
          className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
            !activeCategory ? 'bg-primary text-primary-foreground shadow-md' : 'bg-secondary text-secondary-foreground hover:bg-accent'
          }`}
        >
          الكل
        </button>
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
              activeCategory === cat.id ? 'bg-primary text-primary-foreground shadow-md' : 'bg-secondary text-secondary-foreground hover:bg-accent'
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Products Grid */}
        <div className="lg:col-span-2">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {filteredProducts.map(product => {
              const inCart = cart.find(i => i.productId === product.id);
              return (
                <motion.button
                  key={product.id}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => addToCart(product.id)}
                  className={`glass-card rounded-2xl p-4 text-right hover:shadow-xl transition-all relative ${
                    inCart ? 'ring-2 ring-accent' : ''
                  }`}
                >
                  {inCart && (
                    <span className="absolute top-2 left-2 w-6 h-6 rounded-full bg-accent text-accent-foreground text-xs font-bold flex items-center justify-center">
                      {inCart.quantity}
                    </span>
                  )}
                  <h3 className="font-semibold text-foreground">{product.name}</h3>
                  <p className="text-lg font-bold text-accent mt-2">{product.sellPrice} ج.م</p>
                  {user?.role === 'admin' && (
                    <p className="text-xs text-muted-foreground">تكلفة: {product.costPrice} ج.م</p>
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Cart */}
        <div className="glass-card rounded-2xl p-5 h-fit sticky top-4">
          <h2 className="font-bold text-foreground mb-4 flex items-center gap-2">
            <ShoppingCart size={20} />
            سلة المبيعات
          </h2>

          {cart.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-8">السلة فارغة</p>
          ) : (
            <div className="space-y-3">
              <AnimatePresence>
                {cart.map(item => (
                  <motion.div
                    key={item.productId}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="flex items-center justify-between bg-secondary rounded-xl p-3"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-sm text-foreground">{item.productName}</p>
                      <p className="text-xs text-muted-foreground">{item.unitPrice} ج.م</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => updateQuantity(item.productId, -1)} className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center text-foreground hover:bg-destructive hover:text-destructive-foreground transition-colors">
                        <Minus size={14} />
                      </button>
                      <span className="w-6 text-center font-bold text-sm text-foreground">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.productId, 1)} className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center text-foreground hover:bg-accent hover:text-accent-foreground transition-colors">
                        <Plus size={14} />
                      </button>
                    </div>
                    <p className="font-bold text-sm mr-3 text-foreground">{item.total} ج.م</p>
                  </motion.div>
                ))}
              </AnimatePresence>

              <div className="border-t border-border pt-3 mt-3">
                <div className="flex justify-between items-center mb-4">
                  <span className="font-bold text-foreground">الإجمالي</span>
                  <span className="text-xl font-bold text-accent">{cartTotal} ج.م</span>
                </div>
                <Button onClick={completeSale} className="w-full cafe-gradient text-primary-foreground hover:opacity-90">
                  <Receipt size={18} className="ml-2" />
                  إتمام البيع
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Receipt Dialog */}
      <Dialog open={showReceipt} onOpenChange={setShowReceipt}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center">إيصال البيع</DialogTitle>
          </DialogHeader>
          {lastSale && (
            <div className="space-y-4">
              <div className="text-center border-b border-border pb-3">
                <h3 className="font-bold text-lg text-foreground">كافيه مانجر</h3>
                <p className="text-sm text-muted-foreground">{lastSale.date} - {lastSale.time}</p>
                <p className="text-sm text-muted-foreground">العامل: {lastSale.workerName}</p>
              </div>
              <div className="space-y-2">
                {lastSale.items.map((item, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-foreground">{item.productName} x{item.quantity}</span>
                    <span className="font-medium text-foreground">{item.total} ج.م</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-border pt-3 flex justify-between font-bold text-lg">
                <span className="text-foreground">الإجمالي</span>
                <span className="text-accent">{lastSale.total} ج.م</span>
              </div>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => shareReceipt('whatsapp')}>
                  <Share2 size={16} className="ml-1" />
                  واتساب
                </Button>
                <Button variant="outline" className="flex-1" onClick={() => shareReceipt('email')}>
                  <Printer size={16} className="ml-1" />
                  إيميل
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Sales;
