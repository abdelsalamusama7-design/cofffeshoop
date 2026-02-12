import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RotateCcw, ArrowLeftRight, Search, Calendar, Package, Coffee, Plus, Minus, Check, Share2, Printer, Trash2, ClipboardList } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getSales, getReturns, addReturn, deleteReturn, getInventory, setInventory, getProducts, getReturnsLog } from '@/lib/store';
import { getCurrentUser } from '@/lib/store';
import { Sale, SaleItem, ReturnRecord } from '@/lib/types';
import { toast } from 'sonner';
import PasswordConfirmDialog from '@/components/PasswordConfirmDialog';

const Returns = () => {
  const [, forceUpdate] = useState(0);
  const [showDialog, setShowDialog] = useState(false);
  const [returnType, setReturnType] = useState<'return' | 'exchange'>('return');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [selectedItems, setSelectedItems] = useState<Record<string, number>>({});
  const [exchangeItems, setExchangeItems] = useState<SaleItem[]>([]);
  const [reason, setReason] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [saleSearch, setSaleSearch] = useState('');
  const [pendingDeleteReturn, setPendingDeleteReturn] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'returns' | 'log'>('returns');
  const returns = getReturns();
  const sales = getSales();
  const user = getCurrentUser();
  const inventory = getInventory();
  const products = getProducts();

  // All sellable items for exchange
  const sellableItems = useMemo(() => {
    const items: { id: string; name: string; sellPrice: number; type: 'product' | 'inventory' }[] = [];
    products.forEach(p => items.push({ id: `product_${p.id}`, name: p.name, sellPrice: p.sellPrice, type: 'product' }));
    inventory.filter(i => i.sellPrice).forEach(i => items.push({ id: `inv_${i.id}`, name: i.name, sellPrice: i.sellPrice!, type: 'inventory' }));
    return items;
  }, [products, inventory]);

  const filteredReturns = useMemo(() => {
    return returns
      .filter(r => {
        if (searchTerm && !r.items.some(i => i.productName.includes(searchTerm)) && !r.reason.includes(searchTerm)) return false;
        if (filterDate && r.date !== filterDate) return false;
        return true;
      })
      .sort((a, b) => new Date(b.date + ' ' + b.time).getTime() - new Date(a.date + ' ' + a.time).getTime());
  }, [returns, searchTerm, filterDate]);

  const filteredSales = useMemo(() => {
    if (!saleSearch) return sales.slice(-20).reverse();
    return sales.filter(s =>
      s.id.includes(saleSearch) ||
      s.workerName.includes(saleSearch) ||
      s.items.some(i => i.productName.includes(saleSearch))
    ).reverse();
  }, [sales, saleSearch]);

  const toggleItem = (productId: string, maxQty: number) => {
    setSelectedItems(prev => {
      const current = prev[productId] || 0;
      if (current >= maxQty) {
        const { [productId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [productId]: current + 1 };
    });
  };

  const decrementItem = (productId: string) => {
    setSelectedItems(prev => {
      const current = prev[productId] || 0;
      if (current <= 1) {
        const { [productId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [productId]: current - 1 };
    });
  };

  const addExchangeItem = (itemId: string) => {
    const item = sellableItems.find(i => i.id === itemId);
    if (!item) return;
    setExchangeItems(prev => {
      const existing = prev.find(i => i.productId === itemId);
      if (existing) {
        return prev.map(i => i.productId === itemId ? { ...i, quantity: i.quantity + 1, total: (i.quantity + 1) * i.unitPrice } : i);
      }
      return [...prev, { productId: itemId, productName: item.name, quantity: 1, unitPrice: item.sellPrice, total: item.sellPrice }];
    });
  };

  const removeExchangeItem = (productId: string) => {
    setExchangeItems(prev => {
      const item = prev.find(i => i.productId === productId);
      if (item && item.quantity > 1) {
        return prev.map(i => i.productId === productId ? { ...i, quantity: i.quantity - 1, total: (i.quantity - 1) * i.unitPrice } : i);
      }
      return prev.filter(i => i.productId !== productId);
    });
  };

  const returnTotal = useMemo(() => {
    if (!selectedSale) return 0;
    return Object.entries(selectedItems).reduce((sum, [productId, qty]) => {
      const item = selectedSale.items.find(i => i.productId === productId);
      return sum + (item ? item.unitPrice * qty : 0);
    }, 0);
  }, [selectedItems, selectedSale]);

  const exchangeTotal = exchangeItems.reduce((sum, i) => sum + i.total, 0);
  const refundAmount = returnType === 'exchange' ? returnTotal - exchangeTotal : returnTotal;

  const restoreInventory = (items: SaleItem[]) => {
    let updatedInventory = [...inventory];
    items.forEach(cartItem => {
      // Check if it's a direct inventory item
      if (cartItem.productId.startsWith('inv_')) {
        const invId = cartItem.productId.replace('inv_', '');
        updatedInventory = updatedInventory.map(inv =>
          inv.id === invId ? { ...inv, quantity: inv.quantity + cartItem.quantity } : inv
        );
      } else if (cartItem.productId.startsWith('product_')) {
        // Restore ingredients
        const prodId = cartItem.productId.replace('product_', '');
        const product = products.find(p => p.id === prodId);
        if (product?.ingredients) {
          product.ingredients.forEach(ing => {
            if (ing.inventoryItemId && ing.quantityUsed) {
              updatedInventory = updatedInventory.map(inv =>
                inv.id === ing.inventoryItemId ? { ...inv, quantity: inv.quantity + (ing.quantityUsed! * cartItem.quantity) } : inv
              );
            }
          });
        }
      }
    });
    setInventory(updatedInventory);
  };

  const processReturn = () => {
    if (!selectedSale || !user || Object.keys(selectedItems).length === 0) return;
    if (!reason.trim()) {
      toast.error('يرجى إدخال سبب المرتجع');
      return;
    }

    const returnedItems: SaleItem[] = Object.entries(selectedItems).map(([productId, qty]) => {
      const item = selectedSale.items.find(i => i.productId === productId)!;
      return { ...item, quantity: qty, total: qty * item.unitPrice };
    });

    const now = new Date();
    const record: ReturnRecord = {
      id: Date.now().toString(),
      saleId: selectedSale.id,
      type: returnType,
      items: returnedItems,
      exchangeItems: returnType === 'exchange' ? exchangeItems : undefined,
      refundAmount: Math.max(0, refundAmount),
      reason,
      workerId: user.id,
      workerName: user.name,
      date: now.toISOString().split('T')[0],
      time: now.toLocaleTimeString('ar-EG'),
    };

    // Restore returned items to inventory
    restoreInventory(returnedItems);

    addReturn(record);
    toast.success(returnType === 'return' ? 'تم تسجيل المرتجع بنجاح' : 'تم تسجيل البدل بنجاح');
    resetDialog();
  };

  const resetDialog = () => {
    setShowDialog(false);
    setSelectedSale(null);
    setSelectedItems({});
    setExchangeItems([]);
    setReason('');
    setReturnType('return');
    setSaleSearch('');
  };

  const buildReturnText = (r: ReturnRecord) => {
    let text = `إيصال ${r.type === 'return' ? 'مرتجع' : 'بدل'} - بن العميد\n`;
    text += `التاريخ: ${r.date} - ${r.time}\n`;
    text += `رقم الفاتورة: #${r.saleId}\n`;
    text += `بواسطة: ${r.workerName}\n`;
    text += `────────────\n`;
    text += `الأصناف المرتجعة:\n`;
    r.items.forEach(i => { text += `• ${i.productName} x${i.quantity} = ${i.total} ج.م\n`; });
    if (r.type === 'exchange' && r.exchangeItems?.length) {
      text += `\nأصناف البدل:\n`;
      r.exchangeItems.forEach(i => { text += `• ${i.productName} x${i.quantity} = ${i.total} ج.م\n`; });
    }
    text += `────────────\n`;
    if (r.refundAmount > 0) text += `المبلغ المسترد: ${r.refundAmount} ج.م\n`;
    text += `السبب: ${r.reason}\n`;
    return text;
  };

  const shareReturn = (r: ReturnRecord, method: 'whatsapp' | 'email') => {
    const text = buildReturnText(r);
    if (method === 'whatsapp') {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    } else {
      window.open(`mailto:?subject=${encodeURIComponent(`إيصال ${r.type === 'return' ? 'مرتجع' : 'بدل'} - بن العميد`)}&body=${encodeURIComponent(text)}`, '_blank');
    }
  };

  const printReturn = (r: ReturnRecord) => {
    const html = `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8"><title>إيصال مرتجع</title>
    <style>body{font-family:'Segoe UI',Tahoma,Arial,sans-serif;direction:rtl;padding:40px;max-width:400px;margin:0 auto;color:#1a1a1a}
    .header{text-align:center;border-bottom:2px solid #8B4513;padding-bottom:12px;margin-bottom:16px}
    h1{font-size:20px;color:#8B4513;margin:0 0 4px}
    .badge{display:inline-block;padding:2px 12px;border-radius:12px;font-size:12px;font-weight:bold}
    .return{background:#fee2e2;color:#dc2626}.exchange{background:#d1fae5;color:#059669}
    .line{display:flex;justify-content:space-between;padding:4px 0;font-size:14px;border-bottom:1px solid #f0f0f0}
    .section{font-weight:bold;color:#8B4513;margin-top:12px;font-size:13px}
    .total{font-size:16px;font-weight:bold;color:#dc2626;text-align:center;margin-top:12px;padding:8px;background:#fef2f2;border-radius:8px}
    .footer{text-align:center;color:#999;font-size:11px;margin-top:20px;border-top:1px solid #eee;padding-top:8px}
    @media print{@page{margin:10mm;size:80mm auto}}</style></head><body>
    <div class="header"><h1>بن العميد</h1>
    <span class="badge ${r.type === 'return' ? 'return' : 'exchange'}">${r.type === 'return' ? 'مرتجع' : 'بدل'}</span>
    <p style="font-size:12px;color:#666;margin:8px 0 0">${r.date} - ${r.time}<br/>فاتورة #${r.saleId} | ${r.workerName}</p></div>
    <p class="section">الأصناف المرتجعة:</p>
    ${r.items.map(i => `<div class="line"><span>${i.productName} x${i.quantity}</span><span>${i.total} ج.م</span></div>`).join('')}
    ${r.type === 'exchange' && r.exchangeItems?.length ? `<p class="section">أصناف البدل:</p>${r.exchangeItems.map(i => `<div class="line"><span>${i.productName} x${i.quantity}</span><span>${i.total} ج.م</span></div>`).join('')}` : ''}
    ${r.refundAmount > 0 ? `<div class="total">المبلغ المسترد: ${r.refundAmount} ج.م</div>` : ''}
    <p style="font-size:12px;color:#666;margin-top:8px">السبب: ${r.reason}</p>
    <div class="footer">تم الإنشاء تلقائياً</div></body></html>`;
    const w = window.open('', '_blank');
    if (w) { w.document.write(html); w.document.close(); setTimeout(() => w.print(), 300); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">المرتجعات والبدل</h1>
        <Button onClick={() => setShowDialog(true)} className="cafe-gradient text-primary-foreground">
          <RotateCcw size={18} className="ml-2" />
          مرتجع / بدل جديد
        </Button>
      </div>

      {/* Tabs */}
      {user?.role === 'admin' && (
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('returns')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'returns' ? 'bg-primary/15 text-primary ring-2 ring-primary' : 'bg-secondary text-secondary-foreground'
            }`}
          >
            <RotateCcw size={16} />
            المرتجعات الحالية
          </button>
          <button
            onClick={() => setActiveTab('log')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'log' ? 'bg-primary/15 text-primary ring-2 ring-primary' : 'bg-secondary text-secondary-foreground'
            }`}
          >
            <ClipboardList size={16} />
            سجل المرتجعات
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="بحث..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pr-10"
          />
        </div>
        <div className="relative">
          <Calendar size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="date"
            value={filterDate}
            onChange={e => setFilterDate(e.target.value)}
            className="pr-10 w-44"
          />
        </div>
      </div>

      {/* Returns Log Tab */}
      {activeTab === 'log' && user?.role === 'admin' ? (
        <ReturnsLogView searchTerm={searchTerm} filterDate={filterDate} />
      ) : (
      <>
      {/* Returns List */}

      {/* Returns Log */}
      {filteredReturns.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <RotateCcw size={48} className="mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium">لا توجد مرتجعات مسجلة</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredReturns.map(r => (
            <motion.div
              key={r.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card rounded-2xl p-4 space-y-3 border-2 border-muted"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    r.type === 'return' ? 'bg-destructive/15 text-destructive' : 'bg-accent/15 text-accent'
                  }`}>
                    {r.type === 'return' ? 'مرتجع' : 'بدل'}
                  </span>
                  <span className="text-xs text-muted-foreground">#{r.saleId}</span>
                </div>
                <div className="text-left text-xs text-muted-foreground">
                  <p>{r.date}</p>
                  <p>{r.time}</p>
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">الأصناف المرتجعة:</p>
                {r.items.map((item, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-foreground">{item.productName} x{item.quantity}</span>
                    <span className="font-medium text-foreground">{item.total} ج.م</span>
                  </div>
                ))}
              </div>

              {r.type === 'exchange' && r.exchangeItems && r.exchangeItems.length > 0 && (
                <div className="space-y-1 border-t border-border pt-2">
                  <p className="text-xs text-muted-foreground">أصناف البدل:</p>
                  {r.exchangeItems.map((item, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span className="text-accent">{item.productName} x{item.quantity}</span>
                      <span className="font-medium text-accent">{item.total} ج.م</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-between items-center border-t border-border pt-2">
                <div>
                  <p className="text-xs text-muted-foreground">السبب: {r.reason}</p>
                  <p className="text-xs text-muted-foreground">بواسطة: {r.workerName}</p>
                </div>
                {r.refundAmount > 0 && (
                  <span className="font-bold text-destructive">مسترد: {r.refundAmount} ج.م</span>
                )}
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => shareReturn(r, 'whatsapp')}
                  className="flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-lg bg-secondary text-secondary-foreground text-xs font-medium hover:bg-accent/20 transition-colors"
                >
                  <Share2 size={12} />
                  واتساب
                </button>
                <button
                  onClick={() => printReturn(r)}
                  className="flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-lg bg-secondary text-secondary-foreground text-xs font-medium hover:bg-accent/20 transition-colors"
                >
                  <Printer size={12} />
                  طباعة
                </button>
                <button
                  onClick={() => setPendingDeleteReturn(r.id)}
                  className="flex items-center justify-center gap-1 px-3 py-2 rounded-lg bg-destructive/10 text-destructive text-xs font-medium hover:bg-destructive/20 transition-colors"
                >
                  <Trash2 size={12} />
                  حذف
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
      </>
      )}

      {/* New Return/Exchange Dialog */}
      <Dialog open={showDialog} onOpenChange={open => { if (!open) resetDialog(); }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>مرتجع / بدل جديد</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Type Selection */}
            <div className="flex gap-2">
              <button
                onClick={() => setReturnType('return')}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  returnType === 'return' ? 'bg-destructive/15 text-destructive ring-2 ring-destructive' : 'bg-secondary text-secondary-foreground'
                }`}
              >
                <RotateCcw size={16} />
                مرتجع
              </button>
              <button
                onClick={() => setReturnType('exchange')}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  returnType === 'exchange' ? 'bg-accent/15 text-accent ring-2 ring-accent' : 'bg-secondary text-secondary-foreground'
                }`}
              >
                <ArrowLeftRight size={16} />
                بدل
              </button>
            </div>

            {/* Sale Selection */}
            {!selectedSale ? (
              <div className="space-y-3">
                <label className="text-sm font-medium text-foreground">اختر الفاتورة</label>
                <Input
                  placeholder="بحث برقم الفاتورة أو اسم العامل..."
                  value={saleSearch}
                  onChange={e => setSaleSearch(e.target.value)}
                />
                <div className="max-h-48 overflow-y-auto space-y-2">
                  {filteredSales.map(sale => {
                    const hasReturn = returns.some(r => r.saleId === sale.id);
                    return (
                      <button
                        key={sale.id}
                        onClick={() => !hasReturn && setSelectedSale(sale)}
                        disabled={hasReturn}
                        className={`w-full text-right rounded-xl p-3 transition-colors ${
                          hasReturn
                            ? 'bg-muted/50 opacity-50 cursor-not-allowed border border-muted'
                            : 'bg-secondary hover:bg-accent/10'
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">#{sale.id}</span>
                            {hasReturn && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-destructive/15 text-destructive">تم الإرجاع</span>
                            )}
                          </div>
                          <span className="font-bold text-sm text-foreground">{sale.total} ج.م</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {sale.date} - {sale.workerName} - {sale.items.map(i => i.productName).join('، ')}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <>
                {/* Selected Sale Info */}
                <div className="bg-secondary rounded-xl p-3">
                  <div className="flex justify-between items-center">
                    <Button variant="ghost" size="sm" onClick={() => { setSelectedSale(null); setSelectedItems({}); }}>
                      تغيير
                    </Button>
                    <div className="text-right">
                      <p className="text-sm font-bold text-foreground">فاتورة #{selectedSale.id}</p>
                      <p className="text-xs text-muted-foreground">{selectedSale.date} - {selectedSale.total} ج.م</p>
                    </div>
                  </div>
                </div>

                {/* Items to return */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">اختر الأصناف للإرجاع</label>
                  {selectedSale.items.map(item => {
                    const qty = selectedItems[item.productId] || 0;
                    return (
                      <div key={item.productId} className={`flex items-center justify-between rounded-xl p-3 transition-all ${
                        qty > 0 ? 'bg-destructive/10 ring-1 ring-destructive/30' : 'bg-secondary'
                      }`}>
                        <div className="flex items-center gap-2">
                          {qty > 0 ? (
                            <>
                              <button onClick={() => decrementItem(item.productId)} className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center">
                                <Minus size={14} />
                              </button>
                              <span className="w-6 text-center font-bold text-sm">{qty}</span>
                              <button
                                onClick={() => toggleItem(item.productId, item.quantity)}
                                className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center"
                                disabled={qty >= item.quantity}
                              >
                                <Plus size={14} />
                              </button>
                            </>
                          ) : (
                            <button onClick={() => toggleItem(item.productId, item.quantity)} className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center">
                              <Plus size={14} />
                            </button>
                          )}
                        </div>
                        <div className="text-right flex-1 mr-3">
                          <p className="text-sm font-medium text-foreground">{item.productName}</p>
                          <p className="text-xs text-muted-foreground">x{item.quantity} - {item.unitPrice} ج.م/وحدة</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Exchange items */}
                {returnType === 'exchange' && (
                  <div className="space-y-2 border-t border-border pt-3">
                    <label className="text-sm font-medium text-foreground">أصناف البدل</label>
                    <Select onValueChange={addExchangeItem}>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر صنف للبدل..." />
                      </SelectTrigger>
                      <SelectContent>
                        {sellableItems.map(item => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.name} - {item.sellPrice} ج.م
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {exchangeItems.length > 0 && (
                      <div className="space-y-1">
                        {exchangeItems.map(item => (
                          <div key={item.productId} className="flex items-center justify-between bg-accent/10 rounded-xl p-3">
                            <div className="flex items-center gap-2">
                              <button onClick={() => removeExchangeItem(item.productId)} className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center">
                                <Minus size={14} />
                              </button>
                              <span className="w-6 text-center font-bold text-sm">{item.quantity}</span>
                              <button onClick={() => addExchangeItem(item.productId)} className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center">
                                <Plus size={14} />
                              </button>
                            </div>
                            <div className="text-right flex-1 mr-3">
                              <p className="text-sm font-medium text-foreground">{item.productName}</p>
                              <p className="text-xs text-accent">{item.total} ج.م</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Reason */}
                <Textarea
                  placeholder="سبب المرتجع أو البدل..."
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  rows={2}
                />

                {/* Summary */}
                {Object.keys(selectedItems).length > 0 && (
                  <div className="bg-secondary rounded-xl p-3 space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">قيمة المرتجع</span>
                      <span className="font-bold text-foreground">{returnTotal} ج.م</span>
                    </div>
                    {returnType === 'exchange' && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">قيمة البدل</span>
                          <span className="font-bold text-accent">{exchangeTotal} ج.م</span>
                        </div>
                        <div className="flex justify-between border-t border-border pt-1">
                          <span className="font-medium text-foreground">{refundAmount >= 0 ? 'مسترد للعميل' : 'مطلوب من العميل'}</span>
                          <span className="font-bold text-destructive">{Math.abs(refundAmount)} ج.م</span>
                        </div>
                      </>
                    )}
                  </div>
                )}

                <Button
                  onClick={processReturn}
                  disabled={Object.keys(selectedItems).length === 0 || !reason.trim()}
                  className="w-full cafe-gradient text-primary-foreground"
                >
                  <Check size={18} className="ml-2" />
                  {returnType === 'return' ? 'تأكيد المرتجع' : 'تأكيد البدل'}
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <PasswordConfirmDialog
        open={!!pendingDeleteReturn}
        onOpenChange={(open) => { if (!open) setPendingDeleteReturn(null); }}
        title="تأكيد حذف المرتجع"
        description="أدخل كلمة المرور لحذف هذا المرتجع"
        onConfirm={() => {
          if (pendingDeleteReturn) {
            deleteReturn(pendingDeleteReturn);
            setPendingDeleteReturn(null);
            forceUpdate(n => n + 1);
            toast.success('تم حذف المرتجع');
          }
        }}
      />
    </div>
  );
};

// Returns Log View Component
const ReturnsLogView = ({ searchTerm, filterDate }: { searchTerm: string; filterDate: string }) => {
  const log = getReturnsLog();

  const filteredLog = useMemo(() => {
    return log
      .filter(entry => {
        if (searchTerm && !entry.returnRecord.items.some(i => i.productName.includes(searchTerm)) && !entry.actionBy.includes(searchTerm)) return false;
        if (filterDate && entry.actionDate !== filterDate) return false;
        return true;
      })
      .sort((a, b) => new Date(b.actionDate + ' ' + b.actionTime).getTime() - new Date(a.actionDate + ' ' + a.actionTime).getTime());
  }, [log, searchTerm, filterDate]);

  if (filteredLog.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <ClipboardList size={48} className="mx-auto mb-4 opacity-30" />
        <p className="text-lg font-medium">لا توجد سجلات</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {filteredLog.map(entry => (
        <motion.div
          key={entry.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`glass-card rounded-2xl p-4 space-y-2 border-2 ${
            entry.action === 'deleted' ? 'border-destructive/30 bg-destructive/5' : 'border-muted'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                entry.action === 'created' ? 'bg-green-500/15 text-green-600' : 'bg-destructive/15 text-destructive'
              }`}>
                {entry.action === 'created' ? 'تم الإنشاء' : 'تم الحذف'}
              </span>
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                entry.returnRecord.type === 'return' ? 'bg-destructive/15 text-destructive' : 'bg-accent/15 text-accent'
              }`}>
                {entry.returnRecord.type === 'return' ? 'مرتجع' : 'بدل'}
              </span>
              <span className="text-xs text-muted-foreground">#{entry.returnRecord.saleId}</span>
            </div>
            <div className="text-left text-xs text-muted-foreground">
              <p>{entry.actionDate}</p>
              <p>{entry.actionTime}</p>
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">الأصناف:</p>
            {entry.returnRecord.items.map((item, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-foreground">{item.productName} x{item.quantity}</span>
                <span className="font-medium text-foreground">{item.total} ج.م</span>
              </div>
            ))}
          </div>

          <div className="flex justify-between items-center border-t border-border pt-2 text-xs text-muted-foreground">
            <div>
              <p>السبب: {entry.returnRecord.reason}</p>
              <p>بواسطة: {entry.returnRecord.workerName}</p>
            </div>
            <div className="text-left">
              <p>العملية بواسطة: <span className="font-bold text-foreground">{entry.actionBy}</span></p>
              {entry.returnRecord.refundAmount > 0 && (
                <span className="font-bold text-destructive">مسترد: {entry.returnRecord.refundAmount} ج.م</span>
              )}
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
};

export default Returns;
