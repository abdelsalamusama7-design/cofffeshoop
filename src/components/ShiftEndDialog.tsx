import { useState, useMemo, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Lock, Clock, ShoppingCart, Share2, Mail, FileText, MessageCircle, RotateCcw, Trash2, Package } from 'lucide-react';
import { getCurrentUser, getSales, setSales, getAttendance, setAttendance, getWorkers, getReturns, setReturns, getReturnsLog, setReturnsLog, getInventory, getProducts, addShiftReset, getWorkerExpenses, setWorkerExpenses } from '@/lib/store';
import { Sale, ReturnRecord, ReturnLogEntry, InventoryItem, WorkerExpense } from '@/lib/types';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface ShiftEndDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ShiftEndDialog = ({ open, onOpenChange }: ShiftEndDialogProps) => {
  const [step, setStep] = useState<'password' | 'report'>('password');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [shiftSales, setShiftSales] = useState<Sale[]>([]);
  const [shiftReturnsLog, setShiftReturnsLog] = useState<ReturnLogEntry[]>([]);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetPassword, setResetPassword] = useState('');
  const [resetError, setResetError] = useState('');
  const [inventoryEndShift, setInventoryEndShift] = useState<InventoryItem[]>([]);
  const [shiftWorkerExpenses, setShiftWorkerExpenses] = useState<WorkerExpense[]>([]);
  const [inventoryStartShift, setInventoryStartShift] = useState<InventoryItem[]>([]);

  const user = getCurrentUser();

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    // Verify password against stored workers
    const workers = getWorkers();
    const worker = workers.find(w => w.id === user.id && w.password === password);
    
    if (!worker) {
      setError('كلمة المرور غير صحيحة');
      return;
    }

    // Get today's attendance to find shift start time
    const today = new Date().toISOString().slice(0, 10);
    const attendance = getAttendance();
    const todayRecord = attendance.find(
      a => a.workerId === user.id && a.date === today && a.checkIn && !a.checkOut
    );

    // Get all sales by this worker today
    const allSales = getSales();
    const todaySales = allSales.filter(s => s.workerId === user.id && s.date === today);

    // Get returns log for this worker today
    const allReturnsLog = getReturnsLog();
    const todayReturnsLog = allReturnsLog.filter(
      e => e.returnRecord.workerId === user.id && e.returnRecord.date === today
    );

    let finalSales: Sale[];
    let finalReturnsLog: ReturnLogEntry[];
    
    if (todayRecord?.checkIn) {
      const checkInTime = todayRecord.checkIn;
      finalSales = todaySales.filter(s => s.time >= checkInTime);
      finalReturnsLog = todayReturnsLog.filter(e => e.returnRecord.time >= checkInTime);
    } else {
      finalSales = todaySales;
      finalReturnsLog = todayReturnsLog;
    }
    
    setShiftSales(finalSales);
    setShiftReturnsLog(finalReturnsLog);

    // Get worker expenses for today
    const allWorkerExpenses = getWorkerExpenses();
    const todayWorkerExpenses = allWorkerExpenses.filter(e => e.workerId === user.id && e.date === today);
    setShiftWorkerExpenses(todayWorkerExpenses);

    const currentInventory = getInventory();
    setInventoryEndShift(currentInventory);

    // Calculate start-of-shift inventory by reversing sold quantities
    const products = getProducts();
    const quantityChanges: Record<string, number> = {};
    
    // Add back quantities sold from inventory items (direct sell) and product ingredients
    finalSales.forEach(sale => {
      sale.items.forEach(item => {
        // Check if it's an inventory item sold directly (productId may have 'inv_' prefix)
        const rawId = item.productId.startsWith('inv_') ? item.productId.replace('inv_', '') : item.productId;
        const invItem = currentInventory.find(inv => inv.id === rawId);
        if (invItem) {
          quantityChanges[rawId] = (quantityChanges[rawId] || 0) + item.quantity;
        }
        // Check if it's a product with ingredients (strip 'product_' prefix)
        const productId = item.productId.startsWith('product_') ? item.productId.replace('product_', '') : item.productId;
        const product = products.find(p => p.id === productId);
        if (product?.ingredients) {
          product.ingredients.forEach(ing => {
            if (ing.inventoryItemId && ing.quantityUsed) {
              quantityChanges[ing.inventoryItemId] = (quantityChanges[ing.inventoryItemId] || 0) + (ing.quantityUsed * item.quantity);
            }
          });
        }
      });
    });

    // Subtract returned quantities (they were added back to inventory)
    const activeReturnEntries = finalReturnsLog.filter(e => e.action === 'created');
    const deletedIds = new Set(finalReturnsLog.filter(e => e.action === 'deleted').map(e => e.returnRecord.id));
    activeReturnEntries.filter(e => !deletedIds.has(e.returnRecord.id)).forEach(entry => {
      entry.returnRecord.items.forEach(item => {
        const rawId = item.productId.startsWith('inv_') ? item.productId.replace('inv_', '') : item.productId;
        const invItem = currentInventory.find(inv => inv.id === rawId);
        if (invItem) {
          quantityChanges[rawId] = (quantityChanges[rawId] || 0) - item.quantity;
        }
        const retProductId = item.productId.startsWith('product_') ? item.productId.replace('product_', '') : item.productId;
        const product = products.find(p => p.id === retProductId);
        if (product?.ingredients) {
          product.ingredients.forEach(ing => {
            if (ing.inventoryItemId && ing.quantityUsed) {
              quantityChanges[ing.inventoryItemId] = (quantityChanges[ing.inventoryItemId] || 0) - (ing.quantityUsed * item.quantity);
            }
          });
        }
      });
    });

    const startInventory = currentInventory.map(item => ({
      ...item,
      quantity: Math.round((item.quantity + (quantityChanges[item.id] || 0)) * 1000) / 1000,
    }));
    setInventoryStartShift(startInventory);

    setStep('report');
    setError('');
  };

  const handleClose = () => {
    setStep('password');
    setPassword('');
    setError('');
    setShiftSales([]);
    setShiftReturnsLog([]);
    setShowResetConfirm(false);
    setResetPassword('');
    setResetError('');
    onOpenChange(false);
  };

  const totalAmount = useMemo(() => shiftSales.reduce((sum, s) => sum + s.total, 0), [shiftSales]);
  const totalDiscount = useMemo(() => shiftSales.reduce((sum, s) => sum + (s.discount?.amount || 0), 0), [shiftSales]);
  const totalItems = useMemo(() => shiftSales.reduce((sum, s) => sum + s.items.reduce((is, i) => is + i.quantity, 0), 0), [shiftSales]);

  // Returns calculations - only count active (created) returns, not deleted ones
  const activeReturns = useMemo(() => shiftReturnsLog.filter(e => e.action === 'created'), [shiftReturnsLog]);
  const deletedReturns = useMemo(() => shiftReturnsLog.filter(e => e.action === 'deleted'), [shiftReturnsLog]);
  
  // Check if a created return was later deleted (same returnRecord.id appears in deleted)
  const deletedReturnIds = useMemo(() => new Set(deletedReturns.map(e => e.returnRecord.id)), [deletedReturns]);
  
  const totalReturnsAmount = useMemo(() => 
    activeReturns
      .filter(e => !deletedReturnIds.has(e.returnRecord.id))
      .reduce((sum, e) => sum + e.returnRecord.refundAmount, 0), 
    [activeReturns, deletedReturnIds]
  );
  
  const netTotal = useMemo(() => totalAmount - totalReturnsAmount, [totalAmount, totalReturnsAmount]);
  const totalWorkerExpenses = useMemo(() => shiftWorkerExpenses.reduce((s, e) => s + e.amount, 0), [shiftWorkerExpenses]);

  // Aggregate sales by product
  const salesByProduct = useMemo(() => {
    const map: Record<string, { name: string; quantity: number; unitPrice: number; total: number }> = {};
    shiftSales.forEach(sale => {
      sale.items.forEach(item => {
        if (map[item.productId]) {
          map[item.productId].quantity += item.quantity;
          map[item.productId].total += item.total;
        } else {
          map[item.productId] = {
            name: item.productName,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total: item.total,
          };
        }
      });
    });
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [shiftSales]);

  const generateReportText = () => {
    if (!user) return '';
    const today = new Date().toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    let text = `📋 تقرير إنهاء الشيفت\n`;
    text += `━━━━━━━━━━━━━━━\n`;
    text += `👤 العامل: ${user.name}\n`;
    text += `📅 التاريخ: ${today}\n`;
    text += `━━━━━━━━━━━━━━━\n\n`;
    text += `📊 ملخص الشيفت:\n`;
    text += `• عدد الفواتير: ${shiftSales.length}\n`;
    text += `• عدد الأصناف: ${totalItems}\n`;
    text += `• إجمالي المبيعات: ${totalAmount.toFixed(2)} ج.م\n`;
    if (totalDiscount > 0) {
      text += `• إجمالي الخصومات: ${totalDiscount.toFixed(2)} ج.م\n`;
    }
    if (activeReturns.length > 0) {
      text += `• عدد المرتجعات: ${activeReturns.length}\n`;
      text += `• إجمالي المرتجعات: -${totalReturnsAmount.toFixed(2)} ج.م\n`;
    }
    text += `\n━━━━━━━━━━━━━━━\n`;
    // Aggregated sales by product
    if (salesByProduct.length > 0) {
      text += `🛒 تفصيل المبيعات بالأصناف:\n\n`;
      salesByProduct.forEach(item => {
        text += `• ${item.name} — ${item.quantity} × ${item.unitPrice.toFixed(2)} = ${item.total.toFixed(2)} ج.م\n`;
      });
      text += `\n`;
    }

    text += `━━━━━━━━━━━━━━━\n`;
    text += `📝 تفاصيل الفواتير:\n\n`;

    shiftSales.forEach((sale, idx) => {
      text += `🧾 فاتورة #${idx + 1} — ${sale.time}\n`;
      sale.items.forEach(item => {
        text += `   • ${item.productName} × ${item.quantity} = ${item.total.toFixed(2)} ج.م\n`;
      });
      if (sale.discount && sale.discount.amount > 0) {
        text += `   🏷️ خصم: ${sale.discount.percent}% (-${sale.discount.amount.toFixed(2)} ج.م)\n`;
      }
      text += `   💰 الإجمالي: ${sale.total.toFixed(2)} ج.م\n\n`;
    });

    // Returns section
    if (activeReturns.length > 0 || deletedReturns.length > 0) {
      text += `━━━━━━━━━━━━━━━\n`;
      text += `🔄 المرتجعات:\n\n`;
      activeReturns.forEach((entry) => {
        const isDeleted = deletedReturnIds.has(entry.returnRecord.id);
        text += `🔄 مرتجع — ${entry.returnRecord.time}${isDeleted ? ' [محذوف]' : ''}\n`;
        entry.returnRecord.items.forEach(item => {
          text += `   • ${item.productName} × ${item.quantity}${isDeleted ? '' : ` = -${item.total.toFixed(2)} ج.م`}\n`;
        });
        if (!isDeleted) {
          text += `   💰 المبلغ المسترد: -${entry.returnRecord.refundAmount.toFixed(2)} ج.م\n`;
        }
        text += `\n`;
      });
    }

    // Inventory section - start and end of shift
    if (inventoryStartShift.length > 0) {
      text += `━━━━━━━━━━━━━━━\n`;
      text += `📦 رصيد المخزون أول الشيفت:\n\n`;
      inventoryStartShift.forEach(item => {
        text += `• ${item.name}: ${item.quantity} ${item.unit}\n`;
      });
      
      text += `\n📦 رصيد المخزون آخر الشيفت:\n\n`;
      inventoryEndShift.forEach(item => {
        const startItem = inventoryStartShift.find(s => s.id === item.id);
        const diff = startItem ? item.quantity - startItem.quantity : 0;
        const diffText = diff !== 0 ? ` (${diff > 0 ? '+' : ''}${Math.round(diff * 1000) / 1000})` : '';
        const warning = item.quantity <= 5 ? ' ⚠️' : '';
        text += `• ${item.name}: ${item.quantity} ${item.unit}${diffText}${warning}\n`;
      });
    }

    // Worker expenses section
    if (shiftWorkerExpenses.length > 0) {
      text += `━━━━━━━━━━━━━━━\n`;
      text += `💸 مصروفات العامل:\n\n`;
      shiftWorkerExpenses.forEach(exp => {
        text += `• ${exp.reason} — ${exp.amount} ج.م (${exp.time})\n`;
      });
      text += `\n📊 إجمالي المصروفات: ${totalWorkerExpenses.toFixed(2)} ج.م\n`;
    }

    text += `\n━━━━━━━━━━━━━━━\n`;
    text += `💵 إجمالي المبيعات: ${totalAmount.toFixed(2)} ج.م\n`;
    if (totalReturnsAmount > 0) {
      text += `🔄 إجمالي المرتجعات: -${totalReturnsAmount.toFixed(2)} ج.م\n`;
    }
    if (totalWorkerExpenses > 0) {
      text += `💸 مصروفات العامل: -${totalWorkerExpenses.toFixed(2)} ج.م\n`;
    }
    text += `💰 صافي المبلغ للتسليم: ${(netTotal - totalWorkerExpenses).toFixed(2)} ج.م\n`;
    text += `━━━━━━━━━━━━━━━\n`;
    text += `بن العميد ☕`;
    return text;
  };

  const shareWhatsApp = () => {
    const text = generateReportText();
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const shareEmail = () => {
    const text = generateReportText();
    const subject = `تقرير شيفت ${user?.name} - ${new Date().toLocaleDateString('ar-EG')}`;
    window.open(`mailto:alameedbon1@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`, '_blank');
  };

  const sharePDF = () => {
    const text = generateReportText();
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html dir="rtl">
        <head>
          <title>تقرير الشيفت</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap');
            body { font-family: 'Cairo', sans-serif; padding: 40px; line-height: 2; white-space: pre-wrap; background: #fff; color: #1a1a1a; font-size: 14px; }
            @media print { body { padding: 20px; } }
          </style>
        </head>
        <body>${text}</body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 500);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className={`${step === 'report' ? 'max-w-4xl w-[95vw]' : 'max-w-sm'} max-h-[90vh] flex flex-col overflow-hidden`} dir="rtl">
        {step === 'password' && (
          <>
            <DialogHeader>
              <DialogTitle className="text-lg flex items-center gap-2 justify-center">
                <Clock size={20} />
                إنهاء الشيفت
              </DialogTitle>
              <DialogDescription>أدخل كلمة المرور للتأكيد وعرض تقرير الشيفت</DialogDescription>
            </DialogHeader>
            <form onSubmit={handlePasswordSubmit} className="space-y-4 mt-2">
              <div className="relative">
                <Lock size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="password"
                  placeholder="كلمة المرور"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="pr-10 text-right"
                  autoFocus
                />
              </div>
              {error && <p className="text-sm text-destructive text-center">{error}</p>}
              <DialogFooter className="flex gap-2 justify-center sm:justify-center">
                <Button type="submit">تأكيد</Button>
                <Button type="button" variant="outline" onClick={handleClose}>إلغاء</Button>
              </DialogFooter>
            </form>
          </>
        )}

        {step === 'report' && (
          <>
            <DialogHeader>
              <DialogTitle className="text-lg flex items-center gap-2 justify-center">
                <FileText size={20} />
                تقرير الشيفت
              </DialogTitle>
              <DialogDescription>{user?.name} — {new Date().toLocaleDateString('ar-EG')}</DialogDescription>
            </DialogHeader>

            {/* Scroll Up Arrow */}
            <div className="flex justify-center">
              <button
                onClick={() => {
                  const el = document.getElementById('shift-report-body');
                  el?.scrollBy({ top: -200, behavior: 'smooth' });
                }}
                className="w-8 h-8 flex items-center justify-center rounded-md text-primary hover:bg-primary/10 active:bg-primary/20 transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 14 14" fill="none"><path d="M7 3L12 10H2L7 3Z" fill="currentColor" /></svg>
              </button>
            </div>

            {/* Report Body - Scrollable */}
            <div id="shift-report-body" className="flex-1 overflow-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                {/* Right Column - Summary & Sales by Product */}
                <div className="flex flex-col gap-2 pl-1 md:pl-2">
                  {/* Summary Cards */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-primary/10 rounded-xl p-3 text-center">
                      <p className="text-xs text-muted-foreground">الفواتير</p>
                      <p className="text-xl font-bold text-primary">{shiftSales.length}</p>
                    </div>
                    <div className="bg-accent/50 rounded-xl p-3 text-center">
                      <p className="text-xs text-muted-foreground">الأصناف</p>
                      <p className="text-xl font-bold text-foreground">{totalItems}</p>
                    </div>
                    <div className="bg-primary/10 rounded-xl p-3 text-center">
                      <p className="text-xs text-muted-foreground">المبيعات</p>
                      <p className="text-xl font-bold text-primary">{totalAmount.toFixed(0)}</p>
                    </div>
                  </div>

                  {/* Returns & Discount Summary */}
                  <div className="flex flex-wrap gap-2">
                    {totalDiscount > 0 && (
                      <div className="bg-accent/50 rounded-xl p-2 text-center flex-1">
                        <p className="text-xs text-muted-foreground">الخصومات: <span className="font-bold text-foreground">{totalDiscount.toFixed(2)} ج.م</span></p>
                      </div>
                    )}
                    {activeReturns.length > 0 && (
                      <div className="bg-destructive/10 rounded-xl p-2 text-center flex-1">
                        <p className="text-xs text-muted-foreground">المرتجعات: <span className="font-bold text-destructive">-{totalReturnsAmount.toFixed(2)} ج.م</span></p>
                      </div>
                    )}
                    {totalWorkerExpenses > 0 && (
                      <div className="bg-destructive/10 rounded-xl p-2 text-center flex-1">
                        <p className="text-xs text-muted-foreground">مصروفات العامل: <span className="font-bold text-destructive">-{totalWorkerExpenses.toFixed(2)} ج.م</span></p>
                      </div>
                    )}
                  </div>

                  {/* Net Total */}
                  <div className="bg-primary/15 rounded-xl p-3 text-center border border-primary/20">
                    <p className="text-xs text-muted-foreground">💰 صافي المبلغ للتسليم</p>
                    <p className="text-2xl font-bold text-primary">{(netTotal - totalWorkerExpenses).toFixed(2)} ج.م</p>
                  </div>

                  {/* Aggregated Sales by Product */}
                  {salesByProduct.length > 0 && (
                    <div>
                      <p className="text-xs font-bold text-muted-foreground flex items-center gap-1 mb-2">
                        🛒 تفصيل المبيعات بالأصناف
                      </p>
                      <div className="bg-primary/5 rounded-xl p-3 space-y-1 overflow-auto border border-primary/10">
                        {salesByProduct.map((item, i) => (
                          <div key={i} className="flex items-center justify-between text-xs">
                            <span className="text-foreground">{item.name} <span className="text-muted-foreground">×{item.quantity}</span></span>
                            <span className="font-bold text-primary">{item.total.toFixed(2)} ج.م</span>
                          </div>
                        ))}
                        <div className="border-t border-primary/10 pt-1 mt-1 flex items-center justify-between text-xs font-bold">
                          <span className="text-foreground">الإجمالي</span>
                          <span className="text-primary">{totalAmount.toFixed(2)} ج.م</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Inventory */}
                  {inventoryStartShift.length > 0 && (
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs font-bold text-muted-foreground flex items-center gap-1 mb-2">
                          <Package size={12} /> 📥 رصيد المخزون أول الشيفت
                        </p>
                        <div className="bg-muted/30 rounded-xl p-3 space-y-1 overflow-auto">
                          {inventoryStartShift.map(item => (
                            <div key={item.id} className="flex items-center justify-between text-xs">
                              <span className="text-foreground">{item.name}</span>
                              <span className="font-bold text-muted-foreground">{item.quantity} {item.unit}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-muted-foreground flex items-center gap-1 mb-2">
                          <Package size={12} /> 📤 رصيد المخزون آخر الشيفت
                        </p>
                        <div className="bg-muted/30 rounded-xl p-3 space-y-1 overflow-auto">
                          {inventoryEndShift.map(item => {
                            const startItem = inventoryStartShift.find(s => s.id === item.id);
                            const diff = startItem ? Math.round((item.quantity - startItem.quantity) * 1000) / 1000 : 0;
                            return (
                              <div key={item.id} className="flex items-center justify-between text-xs">
                                <span className="text-foreground">{item.name}</span>
                                <div className="flex items-center gap-2">
                                  {diff !== 0 && (
                                    <span className={`text-[10px] ${diff < 0 ? 'text-destructive' : 'text-success'}`}>
                                      ({diff > 0 ? '+' : ''}{diff})
                                    </span>
                                  )}
                                  <span className={`font-bold ${item.quantity <= 5 ? 'text-destructive' : 'text-muted-foreground'}`}>
                                    {item.quantity} {item.unit}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Left Column - Invoices & Returns */}
                <div className="flex flex-col gap-2 pr-1 md:pr-2 md:border-r md:border-border">
                  {shiftSales.length === 0 && activeReturns.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <ShoppingCart size={32} className="mx-auto mb-2 opacity-50" />
                      <p className="text-sm">لا توجد مبيعات في هذا الشيفت</p>
                    </div>
                  ) : (
                    <>
                      {shiftSales.length > 0 && (
                        <p className="text-xs font-bold text-muted-foreground flex items-center gap-1">
                          <ShoppingCart size={12} /> الفواتير ({shiftSales.length})
                        </p>
                      )}
                      {shiftSales.map((sale, idx) => (
                        <div key={sale.id} className="bg-muted/50 rounded-xl p-3 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">🕐 {sale.time}</span>
                            <span className="text-sm font-bold text-foreground">{sale.total.toFixed(2)} ج.م</span>
                          </div>
                          <div className="space-y-0.5">
                            {sale.items.map((item, i) => (
                              <div key={i} className="flex items-center justify-between text-xs text-muted-foreground">
                                <span>{item.productName} × {item.quantity}</span>
                                <span>{item.total.toFixed(2)} ج.م</span>
                              </div>
                            ))}
                          </div>
                          {sale.discount && sale.discount.amount > 0 && (
                            <p className="text-xs text-muted-foreground/70">خصم {sale.discount.percent}% (-{sale.discount.amount.toFixed(2)} ج.م)</p>
                          )}
                        </div>
                      ))}

                      {(activeReturns.length > 0 || deletedReturns.length > 0) && (
                        <p className="text-xs font-bold text-muted-foreground flex items-center gap-1 mt-3">
                          <RotateCcw size={12} /> المرتجعات ({activeReturns.length})
                        </p>
                      )}
                      {activeReturns.map((entry) => {
                        const isDeleted = deletedReturnIds.has(entry.returnRecord.id);
                        return (
                          <div key={entry.id} className={`rounded-xl p-3 space-y-1 border ${isDeleted ? 'bg-muted/30 border-dashed border-muted-foreground/20 opacity-60' : 'bg-destructive/5 border-destructive/15'}`}>
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-medium text-muted-foreground">🕐 {entry.returnRecord.time}</span>
                              <div className="flex items-center gap-1">
                                {isDeleted && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground flex items-center gap-0.5">
                                    <Trash2 size={10} /> محذوف
                                  </span>
                                )}
                                <span className={`text-sm font-bold ${isDeleted ? 'line-through text-muted-foreground' : 'text-destructive'}`}>
                                  -{entry.returnRecord.refundAmount.toFixed(2)} ج.م
                                </span>
                              </div>
                            </div>
                            <div className="space-y-0.5">
                              {entry.returnRecord.items.map((item, i) => (
                                <div key={i} className={`flex items-center justify-between text-xs ${isDeleted ? 'text-muted-foreground/50 line-through' : 'text-muted-foreground'}`}>
                                  <span>{item.productName} × {item.quantity}</span>
                                  <span>-{item.total.toFixed(2)} ج.م</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Scroll Down Arrow */}
            <div className="flex justify-center">
              <button
                onClick={() => {
                  const el = document.getElementById('shift-report-body');
                  el?.scrollBy({ top: 200, behavior: 'smooth' });
                }}
                className="w-8 h-8 flex items-center justify-center rounded-md text-primary hover:bg-primary/10 active:bg-primary/20 transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 14 14" fill="none"><path d="M7 11L2 4H12L7 11Z" fill="currentColor" /></svg>
              </button>
            </div>

            {/* Share & Actions - Full width */}
            <div className="flex gap-2 mt-3">
              <Button onClick={shareWhatsApp} className="flex-1 bg-green-600 hover:bg-green-700 text-white" size="sm">
                <MessageCircle size={16} className="ml-1" />
                واتساب
              </Button>
              <Button onClick={shareEmail} variant="outline" className="flex-1" size="sm">
                <Mail size={16} className="ml-1" />
                إيميل
              </Button>
              <Button onClick={sharePDF} variant="outline" className="flex-1" size="sm">
                <FileText size={16} className="ml-1" />
                PDF
              </Button>
            </div>

            {!showResetConfirm ? (
              <Button
                variant="outline"
                size="sm"
                className="w-full border-destructive/30 text-destructive hover:bg-destructive/10"
                onClick={() => setShowResetConfirm(true)}
              >
                <RotateCcw size={14} className="ml-1" />
                تصفير الشيفت
              </Button>
            ) : (
              <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-3 space-y-3">
                {/* Summary of what will be deleted */}
                <div className="space-y-1 text-xs">
                  <p className="font-bold text-destructive text-center mb-1">⚠️ سيتم حذف:</p>
                  <div className="flex justify-between"><span className="text-muted-foreground">🧾 المبيعات</span><span className="font-medium text-foreground">{shiftSales.length} فاتورة ({totalAmount.toFixed(0)} ج.م)</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">🔄 المرتجعات</span><span className="font-medium text-foreground">{activeReturns.filter(e => !deletedReturnIds.has(e.returnRecord.id)).length} مرتجع ({totalReturnsAmount.toFixed(0)} ج.م)</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">💸 مصروفي</span><span className="font-medium text-foreground">{shiftWorkerExpenses.length} عملية ({totalWorkerExpenses.toFixed(0)} ج.م)</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">📋 سجل الحضور</span><span className="font-medium text-foreground">سيتم الحذف</span></div>
                </div>
                <p className="text-xs text-center text-muted-foreground">أدخل كلمة المرور لتأكيد تصفير الشيفت</p>
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  if (!user) return;
                  const workers = getWorkers();
                  const worker = workers.find(w => w.id === user.id && w.password === resetPassword);
                  if (!worker) {
                    setResetError('كلمة المرور غير صحيحة');
                    return;
                  }

                  const reportText = generateReportText();
                  try {
                    const { data, error } = await supabase.functions.invoke('send-shift-report', {
                      body: {
                        reportText,
                        workerName: user.name,
                        date: new Date().toLocaleDateString('ar-EG'),
                      },
                    });
                    if (error) {
                      console.error('Email send error:', error);
                      toast.error('تم التصفير لكن فشل إرسال الإيميل');
                    } else {
                      toast.success('تم إرسال التقرير بالإيميل بنجاح 📧');
                    }
                  } catch (err) {
                    console.error('Email send error:', err);
                  }

                  // Auto check-out before clearing attendance
                  const today = new Date().toISOString().slice(0, 10);
                  const now2 = new Date();
                  const checkOutTime = now2.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
                  const attendance = getAttendance();
                  const updatedAttendance = attendance.map(r => {
                    if (r.workerId === user.id && r.date === today && r.type === 'present' && r.checkIn && !r.checkOut) {
                      // Calculate hours worked
                      const checkInParts = r.checkIn.match(/(\d+):(\d+)/);
                      let hoursWorked = 0;
                      if (checkInParts) {
                        const startMinutes = parseInt(checkInParts[1]) * 60 + parseInt(checkInParts[2]);
                        const endMinutes = now2.getHours() * 60 + now2.getMinutes();
                        hoursWorked = Math.round(((endMinutes - startMinutes) / 60) * 10) / 10;
                        if (hoursWorked < 0) hoursWorked += 24;
                      }
                      return { ...r, checkOut: checkOutTime, hoursWorked };
                    }
                    return r;
                  });
                  // Remove today's attendance (fresh start) - admin clears all, worker clears own
                  const isAdminUser = user.role === 'admin';
                  const finalAttendance = updatedAttendance.filter(r => !((isAdminUser || r.workerId === user.id) && r.date === today));
                  setAttendance(finalAttendance);
                  toast.success(`✅ تم تسجيل انصرافك تلقائياً — ${checkOutTime}`, { duration: 4000 });
                  const isAdmin = user.role === 'admin';
                  const matchWorker = (workerId: string) => isAdmin || workerId === user.id;

                  const sales = getSales();
                  const updatedSales = sales.filter(s => !(matchWorker(s.workerId) && s.date === today));
                  setSales(updatedSales);

                  const returns = getReturns();
                  const updatedReturns = returns.filter(r => !(matchWorker(r.workerId) && r.date === today));
                  setReturns(updatedReturns);

                  const returnsLog = getReturnsLog();
                  const updatedLog = returnsLog.filter(e => !(matchWorker(e.returnRecord.workerId) && e.actionDate === today));
                  setReturnsLog(updatedLog);

                  // Clear worker expenses for today
                  const allWorkerExp = getWorkerExpenses();
                  const updatedWorkerExp = allWorkerExp.filter(e => !(matchWorker(e.workerId) && e.date === today));
                  setWorkerExpenses(updatedWorkerExp);

                  // Save last shift reset timestamp so initializeFromDatabase filters out pre-reset records
                  localStorage.setItem('cafe_last_shift_reset', JSON.stringify({ date: today, timestamp: Date.now().toString() }));

                  const now = new Date();
                  addShiftReset({
                    id: Date.now().toString(),
                    workerId: user.id,
                    workerName: user.name,
                    resetDate: today,
                    resetTime: now.toLocaleTimeString('ar-EG'),
                    reportSummary: reportText,
                  });

                  setShowResetConfirm(false);
                  setResetPassword('');
                  setResetError('');
                  handleClose();
                  window.dispatchEvent(new Event('shift-reset'));
                  toast.success('تم تصفير الشيفت بنجاح ✅ تم مسح جميع المعاملات');
                }} className="space-y-2">
                  <div className="relative">
                    <Lock size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type="password"
                      placeholder="كلمة المرور"
                      value={resetPassword}
                      onChange={e => setResetPassword(e.target.value)}
                      className="pr-9 text-right h-9 text-sm"
                      autoFocus
                    />
                  </div>
                  {resetError && <p className="text-xs text-destructive text-center">{resetError}</p>}
                  <div className="flex gap-2">
                    <Button type="submit" variant="destructive" size="sm" className="flex-1">تأكيد التصفير</Button>
                    <Button type="button" variant="outline" size="sm" className="flex-1" onClick={() => { setShowResetConfirm(false); setResetPassword(''); setResetError(''); }}>إلغاء</Button>
                  </div>
                </form>
              </div>
            )}

            <Button variant="ghost" onClick={handleClose} className="w-full mt-1">إغلاق</Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ShiftEndDialog;
