import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Lock, Clock, ShoppingCart, Share2, Mail, FileText, MessageCircle, RotateCcw, Trash2, Package } from 'lucide-react';
import { getCurrentUser, getSales, setSales, getAttendance, setAttendance, getWorkers, getReturns, setReturns, getReturnsLog, setReturnsLog, getInventory } from '@/lib/store';
import { Sale, ReturnRecord, ReturnLogEntry } from '@/lib/types';
import { toast } from 'sonner';

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

    // If there's a check-in time, filter sales and returns after check-in
    if (todayRecord?.checkIn) {
      const checkInTime = todayRecord.checkIn;
      const filtered = todaySales.filter(s => s.time >= checkInTime);
      const filteredReturns = todayReturnsLog.filter(e => e.returnRecord.time >= checkInTime);
      setShiftSales(filtered);
      setShiftReturnsLog(filteredReturns);
    } else {
      setShiftSales(todaySales);
      setShiftReturnsLog(todayReturnsLog);
    }

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

    // Inventory section
    const inventoryItems = getInventory();
    if (inventoryItems.length > 0) {
      text += `━━━━━━━━━━━━━━━\n`;
      text += `📦 الكمية الحالية في المخزون:\n\n`;
      inventoryItems.forEach(item => {
        const warning = item.quantity <= 5 ? ' ⚠️' : '';
        text += `• ${item.name}: ${item.quantity} ${item.unit}${warning}\n`;
      });
    }

    text += `\n━━━━━━━━━━━━━━━\n`;
    text += `💵 إجمالي المبيعات: ${totalAmount.toFixed(2)} ج.م\n`;
    if (totalReturnsAmount > 0) {
      text += `🔄 إجمالي المرتجعات: -${totalReturnsAmount.toFixed(2)} ج.م\n`;
    }
    text += `💰 صافي المبلغ للتسليم: ${netTotal.toFixed(2)} ج.م\n`;
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
    window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`, '_blank');
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
      <DialogContent className={`${step === 'report' ? 'max-w-lg' : 'max-w-sm'} max-h-[85vh] flex flex-col`} dir="rtl">
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

            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-2 mt-2">
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
            <div className="flex flex-wrap gap-2 mt-1">
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
            </div>

            {/* Net Total */}
            <div className="bg-primary/15 rounded-xl p-3 text-center border border-primary/20">
              <p className="text-xs text-muted-foreground">💰 صافي المبلغ للتسليم</p>
              <p className="text-2xl font-bold text-primary">{netTotal.toFixed(2)} ج.م</p>
            </div>

            {/* Sales List */}
            <div className="flex-1 overflow-auto space-y-2 mt-2 max-h-[35vh]">
              {shiftSales.length === 0 && activeReturns.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <ShoppingCart size={32} className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm">لا توجد مبيعات في هذا الشيفت</p>
                </div>
              ) : (
                <>
                  {/* Sales */}
                  {shiftSales.length > 0 && (
                    <p className="text-xs font-bold text-muted-foreground flex items-center gap-1">
                      <ShoppingCart size={12} /> المبيعات ({shiftSales.length})
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

                  {/* Returns */}
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

            {/* Current Inventory */}
            {(() => {
              const inventoryItems = getInventory();
              return inventoryItems.length > 0 ? (
                <div className="mt-2">
                  <p className="text-xs font-bold text-muted-foreground flex items-center gap-1 mb-2">
                    <Package size={12} /> الكمية الحالية في المخزون
                  </p>
                  <div className="bg-muted/30 rounded-xl p-3 space-y-1 max-h-[20vh] overflow-auto">
                    {inventoryItems.map(item => (
                      <div key={item.id} className="flex items-center justify-between text-xs">
                        <span className="text-foreground">{item.name}</span>
                        <span className={`font-bold ${item.quantity <= 5 ? 'text-destructive' : 'text-muted-foreground'}`}>
                          {item.quantity} {item.unit}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null;
            })()}

            {/* Share Buttons */}
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

            {/* Reset Shift Button */}
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
                <p className="text-xs text-center text-muted-foreground">أدخل كلمة المرور لتأكيد تصفير الشيفت</p>
                <form onSubmit={(e) => {
                  e.preventDefault();
                  if (!user) return;
                  const workers = getWorkers();
                  const worker = workers.find(w => w.id === user.id && w.password === resetPassword);
                  if (!worker) {
                    setResetError('كلمة المرور غير صحيحة');
                    return;
                  }
                  const today = new Date().toISOString().slice(0, 10);
                  // Clear attendance
                  const attendance = getAttendance();
                  const updatedAttendance = attendance.filter(r => !(r.workerId === user.id && r.date === today));
                  setAttendance(updatedAttendance);
                  // Clear sales
                  const sales = getSales();
                  const updatedSales = sales.filter(s => !(s.workerId === user.id && s.date === today));
                  setSales(updatedSales);
                  // Clear returns
                  const returns = getReturns();
                  const updatedReturns = returns.filter(r => !(r.workerId === user.id && r.date === today));
                  setReturns(updatedReturns);
                  // Clear returns log
                  const returnsLog = getReturnsLog();
                  const updatedLog = returnsLog.filter(e => !(e.returnRecord.workerId === user.id && e.actionDate === today));
                  setReturnsLog(updatedLog);
                  setShowResetConfirm(false);
                  setResetPassword('');
                  setResetError('');
                  handleClose();
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
