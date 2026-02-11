import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart, Plus, Minus, Receipt, Share2, Printer, Coffee, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getProducts, getCurrentUser, addSale, getInventory, setInventory } from '@/lib/store';
import { SaleItem, Sale, SELLABLE_CATEGORIES, ItemCategory } from '@/lib/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';

type SellableItem = {
  id: string;
  name: string;
  sellPrice: number;
  costPrice: number;
  type: 'product' | 'inventory';
  category?: ItemCategory;
  ingredients?: { inventoryItemId?: string; quantityUsed?: number }[];
};

const Sales = () => {
  const [activeTab, setActiveTab] = useState<'all' | ItemCategory>('all');
  const [cart, setCart] = useState<SaleItem[]>([]);
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastSale, setLastSale] = useState<Sale | null>(null);
  const [discountPercent, setDiscountPercent] = useState<number>(0);

  const products = getProducts();
  const inventory = getInventory();
  const user = getCurrentUser();

  // Combine products and sellable inventory items
  const sellableItems: SellableItem[] = useMemo(() => {
    const items: SellableItem[] = [];
    products.forEach(p => items.push({
      id: `product_${p.id}`,
      name: p.name,
      sellPrice: p.sellPrice,
      costPrice: p.costPrice,
      type: 'product',
      category: p.category,
      ingredients: p.ingredients,
    }));
    inventory.filter(i => i.sellPrice).forEach(i => items.push({
      id: `inv_${i.id}`,
      name: i.name,
      sellPrice: i.sellPrice!,
      costPrice: i.costPerUnit,
      type: 'inventory',
      category: i.category,
    }));
    return items;
  }, [products, inventory]);

  const filteredItems = useMemo(() => {
    if (activeTab === 'all') return sellableItems;
    return sellableItems.filter(i => i.category === activeTab);
  }, [activeTab, sellableItems]);

  const cartTotal = cart.reduce((sum, item) => sum + item.total, 0);
  const discountAmount = Math.round(cartTotal * discountPercent / 100 * 100) / 100;
  const finalTotal = cartTotal - discountAmount;

  const addToCart = (item: SellableItem) => {
    setCart(prev => {
      const existing = prev.find(i => i.productId === item.id);
      if (existing) {
        return prev.map(i =>
          i.productId === item.id
            ? { ...i, quantity: i.quantity + 1, total: (i.quantity + 1) * i.unitPrice }
            : i
        );
      }
      return [...prev, {
        productId: item.id,
        productName: item.name,
        quantity: 1,
        unitPrice: item.sellPrice,
        total: item.sellPrice,
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
      total: finalTotal,
      discount: discountPercent > 0 ? { percent: discountPercent, amount: discountAmount } : undefined,
      workerId: user.id,
      workerName: user.name,
      date: now.toISOString().split('T')[0],
      time: now.toLocaleTimeString('ar-EG'),
    };

    // Deduct from inventory
    let updatedInventory = [...inventory];

    cart.forEach(cartItem => {
      const sellable = sellableItems.find(s => s.id === cartItem.productId);
      if (!sellable) return;

      if (sellable.type === 'product' && sellable.ingredients) {
        // Product with ingredients: deduct each ingredient from inventory
        sellable.ingredients.forEach(ing => {
          if (ing.inventoryItemId && ing.quantityUsed) {
            updatedInventory = updatedInventory.map(inv =>
              inv.id === ing.inventoryItemId
                ? { ...inv, quantity: Math.max(0, inv.quantity - (ing.quantityUsed! * cartItem.quantity)) }
                : inv
            );
          }
        });
      } else if (sellable.type === 'inventory') {
        // Direct inventory item: deduct quantity
        const invId = cartItem.productId.replace('inv_', '');
        updatedInventory = updatedInventory.map(inv =>
          inv.id === invId
            ? { ...inv, quantity: Math.max(0, inv.quantity - cartItem.quantity) }
            : inv
        );
      }
    });

    setInventory(updatedInventory);
    addSale(sale);
    setLastSale(sale);
    setShowReceipt(true);
    setCart([]);
    setDiscountPercent(0);
    toast.success('تم البيع بنجاح!');
  };

  const shareReceipt = (method: 'whatsapp' | 'email') => {
    if (!lastSale) return;
    const discountLine = lastSale.discount && lastSale.discount.percent > 0
      ? `\nخصم ${lastSale.discount.percent}%: -${lastSale.discount.amount} ج.م`
      : '';
    const text = `إيصال بيع - بن العميد\n` +
      `التاريخ: ${lastSale.date}\nالوقت: ${lastSale.time}\n` +
      `العامل: ${lastSale.workerName}\n` +
      `---\n` +
      lastSale.items.map(i => `${i.productName} x${i.quantity} = ${i.total} ج.م`).join('\n') +
      discountLine +
      `\n---\nالإجمالي: ${lastSale.total} ج.م`;

    if (method === 'whatsapp') {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    } else {
      window.open(`mailto:?subject=${encodeURIComponent('إيصال بيع - بن العميد')}&body=${encodeURIComponent(text)}`, '_blank');
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

      {/* Filter tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
            activeTab === 'all' ? 'bg-primary text-primary-foreground shadow-md' : 'bg-secondary text-secondary-foreground hover:bg-accent'
          }`}
        >
          الكل
        </button>
        {SELLABLE_CATEGORIES.map(cat => {
          const count = sellableItems.filter(i => i.category === cat).length;
          if (count === 0) return null;
          return (
            <button
              key={cat}
              onClick={() => setActiveTab(cat)}
              className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                activeTab === cat ? 'bg-primary text-primary-foreground shadow-md' : 'bg-secondary text-secondary-foreground hover:bg-accent'
              }`}
            >
              {cat}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Items Grid */}
        <div className="lg:col-span-2">
          <div className="grid grid-cols-2 gap-3">
            {filteredItems.map(item => {
              const inCart = cart.find(i => i.productId === item.id);
              return (
                <motion.button
                  key={item.id}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => addToCart(item)}
                  className={`glass-card rounded-2xl p-4 text-right hover:shadow-xl transition-all relative ${
                    inCart ? 'ring-2 ring-accent' : ''
                  }`}
                >
                  {inCart && (
                    <span className="absolute top-2 left-2 w-6 h-6 rounded-full bg-accent text-accent-foreground text-xs font-bold flex items-center justify-center">
                      {inCart.quantity}
                    </span>
                  )}
                  <div className="flex items-center gap-2 mb-1">
                    {item.type === 'product' ? (
                      <Coffee size={14} className="text-primary" />
                    ) : (
                      <Package size={14} className="text-muted-foreground" />
                    )}
                    <span className="text-[10px] text-muted-foreground">
                      {item.type === 'product' ? 'منتج' : 'مخزون'}
                    </span>
                  </div>
                  <h3 className="font-semibold text-foreground">{item.name}</h3>
                  <p className="text-lg font-bold text-accent mt-2">{item.sellPrice} ج.م</p>
                  {user?.role === 'admin' && (
                    <p className="text-xs text-muted-foreground">تكلفة: {item.costPrice} ج.م</p>
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Cart */}
        <div className="glass-card rounded-2xl p-4 h-fit sticky top-4">
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

              <div className="border-t border-border pt-3 mt-3 space-y-3">
                {/* Discount input */}
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-foreground whitespace-nowrap">خصم %</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={discountPercent || ''}
                    onChange={(e) => {
                      const val = Math.min(100, Math.max(0, Number(e.target.value)));
                      setDiscountPercent(val);
                    }}
                    placeholder="0"
                    dir="ltr"
                    lang="en"
                    className="flex h-9 w-20 rounded-lg border border-input bg-background px-2 py-1 text-sm text-center ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>

                {discountPercent > 0 && (
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between text-muted-foreground">
                      <span>المجموع قبل الخصم</span>
                      <span>{cartTotal} ج.م</span>
                    </div>
                    <div className="flex justify-between text-destructive font-medium">
                      <span>خصم {discountPercent}%</span>
                      <span>- {discountAmount} ج.م</span>
                    </div>
                  </div>
                )}

                <div className="flex justify-between items-center">
                  <span className="font-bold text-foreground">الإجمالي</span>
                  <span className="text-xl font-bold text-accent">{finalTotal} ج.م</span>
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
                <h3 className="font-bold text-lg text-foreground">بن العميد</h3>
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
              {lastSale.discount && lastSale.discount.percent > 0 && (
                <div className="border-t border-border pt-2 space-y-1 text-sm">
                  <div className="flex justify-between text-muted-foreground">
                    <span>المجموع قبل الخصم</span>
                    <span>{(lastSale.total + lastSale.discount.amount).toFixed(2)} ج.م</span>
                  </div>
                  <div className="flex justify-between text-destructive font-medium">
                    <span>خصم {lastSale.discount.percent}%</span>
                    <span>- {lastSale.discount.amount} ج.م</span>
                  </div>
                </div>
              )}
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
              <Button onClick={() => { setShowReceipt(false); toast.success('تم حفظ الإيصال بنجاح'); }} className="w-full cafe-gradient text-primary-foreground hover:opacity-90 mt-2">
                تم
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Sales;