import { useState, useMemo } from 'react';
import { compareDateTime } from '@/lib/utils';
import { motion } from 'framer-motion';
import { Clock, LogIn, LogOut, HandCoins, Gift, ShoppingCart, CalendarCheck, TrendingUp, RotateCcw, Lock, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getCurrentUser, getAttendance, setAttendance, getTransactions, getSales, getWorkers, addShiftReset, getReturns, setReturns, getWorkerExpenses, setWorkerExpenses, getReturnsLog, setReturnsLog } from '@/lib/store';
import { AttendanceRecord } from '@/lib/types';
import ScrollableList from '@/components/ScrollableList';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import WorkerExpensesTab from '@/components/WorkerExpensesTab';

const WorkerDashboard = () => {
  const user = getCurrentUser();
  const [records, setRecords] = useState(getAttendance());
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [resetPassword, setResetPassword] = useState('');
  const [resetError, setResetError] = useState('');
  const [detailType, setDetailType] = useState<'present' | 'absent' | null>(null);
  const today = new Date().toISOString().split('T')[0];
  const now = new Date();

  if (!user || user.role !== 'worker') {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="text-muted-foreground text-lg">ليس لديك صلاحية للوصول لهذه الصفحة</p>
      </div>
    );
  }

  const todayRecord = records.find(r => r.workerId === user.id && r.date === today && r.type === 'present');
  const hasCheckedIn = !!todayRecord?.checkIn;
  const hasCheckedOut = !!todayRecord?.checkOut;

  const handleCheckIn = (shift: 'morning' | 'evening') => {
    const timeNow = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

    if (todayRecord) {
      toast.error('لقد سجلت حضورك اليوم بالفعل');
      return;
    }

    const record: AttendanceRecord = {
      id: Date.now().toString(),
      workerId: user.id,
      workerName: user.name,
      date: today,
      checkIn: timeNow,
      type: 'present',
      shift,
      hoursWorked: 0,
    };

    const updated = [...records, record];
    setRecords(updated);
    setAttendance(updated);
    toast.success(`تم تسجيل الحضور - شيفت ${shift === 'morning' ? 'صباحي' : 'مسائي'} ☀️`);
  };

  const handleCheckOut = () => {
    if (!todayRecord) {
      toast.error('لم تسجل حضورك اليوم بعد');
      return;
    }
    if (hasCheckedOut) {
      toast.error('لقد سجلت انصرافك بالفعل');
      return;
    }

    const timeNow = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    const [h1, m1, s1 = 0] = todayRecord.checkIn!.split(':').map(Number);
    const [h2, m2, s2 = 0] = timeNow.split(':').map(Number);
    const hoursWorked = Math.max(0, Math.round(((h2 + m2 / 60 + s2 / 3600) - (h1 + m1 / 60 + s1 / 3600)) * 100) / 100);

    const updated = records.map(r =>
      r.id === todayRecord.id ? { ...r, checkOut: timeNow, hoursWorked } : r
    );
    setRecords(updated);
    setAttendance(updated);
    toast.success(`تم تسجيل الانصراف - عملت ${hoursWorked.toFixed(1)} ساعة 👋`);
  };

  // Transactions (advances & bonuses)
  const transactions = getTransactions().filter(t => t.workerId === user.id);
  const currentMonth = today.substring(0, 7);
  const monthTxns = transactions.filter(t => t.date.startsWith(currentMonth));
  const totalAdvances = monthTxns.filter(t => t.type === 'advance').reduce((s, t) => s + t.amount, 0);
  const totalBonuses = monthTxns.filter(t => t.type === 'bonus').reduce((s, t) => s + t.amount, 0);

  // Daily sales
  const allSales = getSales();
  const todaySales = allSales.filter(s => s.workerId === user.id && s.date === today);
  const todaySalesTotal = todaySales.reduce((s, sale) => s + sale.total, 0);
  const todayItemsSold = todaySales.reduce((s, sale) => s + sale.items.reduce((c, i) => c + i.quantity, 0), 0);

  // Monthly attendance summary
  const myMonthRecords = records.filter(r => r.workerId === user.id && r.date.startsWith(currentMonth));
  // Only count completed shifts (12+ hours) as full present days
  const completedShifts = myMonthRecords.filter(r => r.type === 'present' && r.checkOut && (r.hoursWorked || 0) >= 12);
  const presentDays = completedShifts.length;
  // Partial shifts: checked out but less than 12 hours
  const partialShifts = myMonthRecords.filter(r => r.type === 'present' && r.checkOut && (r.hoursWorked || 0) < 12);
  const partialHoursDecimal = partialShifts.reduce((s, r) => s + (r.hoursWorked || 0), 0);
  const leaveDays = myMonthRecords.filter(r => r.type === 'leave').length;
  
  // Auto-calculate absent days: days passed this month (including today) without any attendance record
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  // +1 to include today in the count (so Feb 20 = 20 days)
  const daysPassedInMonth = Math.floor((todayDate.getTime() - monthStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  const daysWithRecords = new Set(myMonthRecords.map(r => r.date)).size;
  const absentDays = Math.max(0, daysPassedInMonth - daysWithRecords);
  
  // Total hours as hours and minutes
  const totalHoursDecimal = myMonthRecords.reduce((s, r) => s + (r.hoursWorked || 0), 0);
  const totalHoursInt = Math.floor(totalHoursDecimal);
  const totalMinutes = Math.round((totalHoursDecimal - totalHoursInt) * 60);

  return (
    <Tabs defaultValue="dashboard" dir="rtl" className="space-y-4">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="dashboard">📊 لوحتي</TabsTrigger>
        <TabsTrigger value="expenses" className="flex items-center gap-1">
          <Wallet size={14} />
          مصروفي
        </TabsTrigger>
      </TabsList>

      <TabsContent value="dashboard">
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-2xl font-bold text-foreground">مرحباً {user.name} 👋</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {new Date().toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Check In / Check Out */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card rounded-2xl p-5 space-y-4"
      >
        <h2 className="font-bold text-foreground flex items-center gap-2">
          <Clock size={20} />
          الحضور والانصراف
        </h2>

        {!hasCheckedIn ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">اختر الشيفت وسجّل حضورك</p>
            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={() => handleCheckIn('morning')}
                className="cafe-gradient text-primary-foreground h-14 text-base"
              >
                <LogIn size={20} className="ml-2" />
                ☀️ شيفت صباحي
              </Button>
              <Button
                onClick={() => handleCheckIn('evening')}
                variant="outline"
                className="h-14 text-base border-primary text-primary hover:bg-primary/10"
              >
                <LogIn size={20} className="ml-2" />
                🌙 شيفت مسائي
              </Button>
            </div>
          </div>
        ) : !hasCheckedOut ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between bg-success/10 rounded-xl p-3">
              <div>
                <p className="text-sm font-medium text-success">✅ أنت حاضر</p>
                <p className="text-xs text-muted-foreground">
                  وقت الحضور: {todayRecord?.checkIn} • شيفت {todayRecord?.shift === 'morning' ? 'صباحي ☀️' : 'مسائي 🌙'}
                </p>
              </div>
            </div>
            <Button
              onClick={handleCheckOut}
              variant="destructive"
              className="w-full h-14 text-base"
            >
              <LogOut size={20} className="ml-2" />
              تسجيل الانصراف 👋
            </Button>
          </div>
        ) : (
          <div className="bg-muted/50 rounded-xl p-4 text-center space-y-2">
            <p className="text-sm font-medium text-foreground">✅ تم تسجيل حضورك وانصرافك اليوم</p>
            <p className="text-xs text-muted-foreground">
              {todayRecord?.checkIn} → {todayRecord?.checkOut} • {todayRecord?.hoursWorked?.toFixed(1)} ساعة
            </p>
          </div>
        )}
      </motion.div>

      {/* Monthly Attendance Summary */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-card rounded-2xl p-5"
      >
        <h2 className="font-bold text-foreground flex items-center gap-2 mb-3">
          <CalendarCheck size={20} />
          ملخص الحضور - الشهر الحالي
        </h2>
        <div className="grid grid-cols-2 gap-3 text-center">
          <div className="bg-success/10 rounded-xl p-3 cursor-pointer hover:ring-2 ring-success/40 transition-all" onClick={() => setDetailType('present')}>
            <p className="text-2xl font-bold text-success">{presentDays}</p>
            <p className="text-xs text-muted-foreground">يوم حضور (12+ ساعة)</p>
            <p className="text-[10px] text-success/60 mt-1">اضغط للتفاصيل</p>
          </div>
          <div className="bg-destructive/10 rounded-xl p-3 cursor-pointer hover:ring-2 ring-destructive/40 transition-all" onClick={() => setDetailType('absent')}>
            <p className="text-2xl font-bold text-destructive">{absentDays}</p>
            <p className="text-xs text-muted-foreground">يوم غياب</p>
            <p className="text-[10px] text-destructive/60 mt-1">اضغط للتفاصيل</p>
          </div>
        </div>
        {partialShifts.length > 0 && (
          <div className="bg-warning/10 rounded-xl p-3 text-center mt-3">
            <p className="text-2xl font-bold text-warning">
              {Math.floor(partialHoursDecimal)} س {Math.round((partialHoursDecimal - Math.floor(partialHoursDecimal)) * 60)} د
            </p>
            <p className="text-xs text-muted-foreground">ساعات غير مكتملة ({partialShifts.length} شيفت أقل من 12 ساعة)</p>
          </div>
        )}
        {leaveDays > 0 && (
          <div className="bg-warning/10 rounded-xl p-3 text-center mt-3">
            <p className="text-2xl font-bold text-warning">{leaveDays}</p>
            <p className="text-xs text-muted-foreground">يوم إذن / عذر</p>
          </div>
        )}
        <div className="bg-info/10 rounded-xl p-3 text-center mt-3">
          <p className="text-2xl font-bold text-info">
            {totalHoursInt > 0 ? `${totalHoursInt} س` : ''}{totalMinutes > 0 ? ` ${totalMinutes} د` : ''}{totalHoursInt === 0 && totalMinutes === 0 ? '0' : ''}
          </p>
          <p className="text-xs text-muted-foreground">إجمالي ساعات العمل</p>
        </div>
      </motion.div>

      {/* Attendance Detail Dialog */}
      <Dialog open={detailType !== null} onOpenChange={(open) => { if (!open) setDetailType(null); }}>
        <DialogContent className="max-w-sm max-h-[80vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-lg text-center">
              {detailType === 'present' ? '✅ أيام الحضور' : '❌ أيام الغياب'}
            </DialogTitle>
          </DialogHeader>
          {detailType === 'present' ? (
            <div className="space-y-2">
              {completedShifts.length === 0 ? (
                <p className="text-center text-muted-foreground text-sm py-4">لا توجد أيام حضور مكتملة</p>
              ) : (
                completedShifts.sort((a, b) => a.date.localeCompare(b.date)).map(r => {
                  const hrs = Math.floor(r.hoursWorked || 0);
                  const mins = Math.floor(((r.hoursWorked || 0) - hrs) * 60);
                  const secs = Math.round((((r.hoursWorked || 0) - hrs) * 60 - mins) * 60);
                  return (
                    <div key={r.id} className="bg-success/5 border border-success/20 rounded-xl p-3 space-y-1">
                      <p className="font-bold text-foreground text-sm">
                        📅 {new Date(r.date).toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long' })}
                      </p>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>🕐 حضور: {r.checkIn}</span>
                        <span>🕐 انصراف: {r.checkOut}</span>
                      </div>
                      <p className="text-xs text-success font-medium">
                        ⏱ مدة العمل: {hrs} ساعة {mins > 0 ? `${mins} دقيقة` : ''} {secs > 0 ? `${secs} ثانية` : ''}
                      </p>
                      {r.shift && (
                        <p className="text-xs text-muted-foreground">
                          {r.shift === 'morning' ? '☀️ شيفت صباحي' : '🌙 شيفت مسائي'}
                        </p>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {(() => {
                const absentDatesList: string[] = [];
                for (let d = 1; d <= daysPassedInMonth; d++) {
                  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                  const hasRecord = myMonthRecords.some(r => r.date === dateStr);
                  if (!hasRecord) absentDatesList.push(dateStr);
                }
                return absentDatesList.length === 0 ? (
                  <p className="text-center text-muted-foreground text-sm py-4">لا توجد أيام غياب 🎉</p>
                ) : (
                  absentDatesList.map(dateStr => (
                    <div key={dateStr} className="bg-destructive/5 border border-destructive/20 rounded-xl p-3">
                      <p className="font-bold text-foreground text-sm">
                        📅 {new Date(dateStr).toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long' })}
                      </p>
                      <p className="text-xs text-destructive font-medium mt-1">❌ لم يتم تسجيل أي حضور</p>
                    </div>
                  ))
                );
              })()}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Daily Sales Report */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass-card rounded-2xl p-5 space-y-3"
      >
        <h2 className="font-bold text-foreground flex items-center gap-2">
          <ShoppingCart size={20} />
          مبيعاتك اليوم
        </h2>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-primary/10 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-primary">{todaySalesTotal}</p>
            <p className="text-xs text-muted-foreground">ج.م إجمالي</p>
          </div>
          <div className="bg-accent/10 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-accent-foreground">{todayItemsSold}</p>
            <p className="text-xs text-muted-foreground">منتج مباع</p>
          </div>
        </div>

        {todaySales.length > 0 ? (
          <ScrollableList className="space-y-2">
            {[...todaySales].sort((a, b) => compareDateTime(a.date, a.time, b.date, b.time)).map((sale, i) => (
              <div key={sale.id} className="bg-muted/30 rounded-lg p-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {sale.items.map(item => `${item.productName} x${item.quantity}`).join('، ')}
                  </p>
                  <p className="text-xs text-muted-foreground">{sale.time}</p>
                </div>
                <p className="font-bold text-primary text-sm">{sale.total} ج.م</p>
              </div>
            ))}
          </ScrollableList>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-2">لم تسجل مبيعات اليوم بعد</p>
        )}
      </motion.div>

      {/* Advances & Bonuses */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="glass-card rounded-2xl p-5 space-y-3"
      >
        <h2 className="font-bold text-foreground flex items-center gap-2">
          <HandCoins size={20} />
          السلف والمكافآت - الشهر الحالي
        </h2>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-destructive/10 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-destructive">{totalAdvances}</p>
            <p className="text-xs text-muted-foreground">ج.م سلف</p>
          </div>
          <div className="bg-success/10 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-success">{totalBonuses}</p>
            <p className="text-xs text-muted-foreground">ج.م مكافآت</p>
          </div>
        </div>

        {monthTxns.length > 0 ? (
          <ScrollableList className="space-y-2">
            {monthTxns.sort((a, b) => b.date.localeCompare(a.date)).map(txn => (
              <div key={txn.id} className="bg-muted/30 rounded-lg p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {txn.type === 'advance' ? (
                    <HandCoins size={16} className="text-destructive" />
                  ) : (
                    <Gift size={16} className="text-success" />
                  )}
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {txn.type === 'advance' ? 'سلفة' : 'مكافأة'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {txn.date} {txn.note && `• ${txn.note}`}
                    </p>
                  </div>
                </div>
                <p className={`font-bold text-sm ${txn.type === 'advance' ? 'text-destructive' : 'text-success'}`}>
                  {txn.type === 'advance' ? '-' : '+'}{txn.amount} ج.م
                </p>
              </div>
            ))}
          </ScrollableList>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-2">لا توجد سلف أو مكافآت هذا الشهر</p>
        )}
      </motion.div>

      {/* Reset Shift Dialog */}
      <Dialog open={showResetDialog} onOpenChange={(open) => { setShowResetDialog(open); if (!open) { setResetPassword(''); setResetError(''); } }}>
        <DialogContent className="max-w-sm" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-lg flex items-center gap-2 justify-center">
              <RotateCcw size={20} />
              تصفير الشيفت
            </DialogTitle>
            <DialogDescription className="text-center">
              ⚠️ سيتم مسح جميع بيانات الشيفت الحالي نهائياً
            </DialogDescription>
          </DialogHeader>

          {/* Summary of what will be deleted */}
          {(() => {
            const todaySalesCount = getSales().filter(s => s.workerId === user.id && s.date === today).length;
            const todayReturnsCount = getReturns().filter(r => r.workerId === user.id && r.date === today).length;
            const todayExpensesCount = getWorkerExpenses().filter(e => e.workerId === user.id && e.date === today).length;
            const todayExpensesTotal = getWorkerExpenses().filter(e => e.workerId === user.id && e.date === today).reduce((s, e) => s + e.amount, 0);
            const todaySalesTotal = getSales().filter(s => s.workerId === user.id && s.date === today).reduce((s, sale) => s + sale.total, 0);
            const todayReturnsTotal = getReturns().filter(r => r.workerId === user.id && r.date === today).reduce((s, r) => s + r.refundAmount, 0);
            return (
              <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-3 space-y-1.5 text-sm">
                <p className="font-bold text-destructive text-center text-xs mb-2">سيتم حذف:</p>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">📋 سجل الحضور</span>
                  <span className="font-medium text-success">✅ سيتم الاحتفاظ به</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">🧾 المبيعات</span>
                  <span className="font-medium text-foreground">{todaySalesCount} فاتورة ({todaySalesTotal} ج.م)</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">🔄 المرتجعات</span>
                  <span className="font-medium text-foreground">{todayReturnsCount} مرتجع ({todayReturnsTotal} ج.م)</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">💸 مصروفي</span>
                  <span className="font-medium text-foreground">{todayExpensesCount} عملية ({todayExpensesTotal} ج.م)</span>
                </div>
              </div>
            );
          })()}
          <form onSubmit={(e) => {
            e.preventDefault();
            if (!user) return;
            const workers = getWorkers();
            const worker = workers.find(w => w.id === user.id && w.password === resetPassword);
            if (!worker) {
              setResetError('كلمة المرور غير صحيحة');
              return;
            }
            // Auto check-out and KEEP attendance record (count as a worked day)
            const nowTime = new Date();
            const checkOutTime = `${String(nowTime.getHours()).padStart(2, '0')}:${String(nowTime.getMinutes()).padStart(2, '0')}`;
            const updated = records.map(r => {
              if (r.workerId === user.id && r.date === today && r.type === 'present' && r.checkIn && !r.checkOut) {
                const [h1, m1] = r.checkIn.split(':').map(Number);
                const hoursWorked = Math.max(0, Math.round(((nowTime.getHours() + nowTime.getMinutes() / 60) - (h1 + m1 / 60)) * 10) / 10);
                return { ...r, checkOut: checkOutTime, hoursWorked };
              }
              return r;
            });
            setRecords(updated);
            setAttendance(updated);

            // Remove today's returns for this worker
            const allReturns = getReturns();
            const updatedReturns = allReturns.filter(r => !(r.workerId === user.id && r.date === today));
            setReturns(updatedReturns);

            // Remove today's returns log for this worker
            const allReturnsLog = getReturnsLog();
            const updatedReturnsLog = allReturnsLog.filter(e => !(e.returnRecord.workerId === user.id && e.actionDate === today));
            setReturnsLog(updatedReturnsLog);

            // Remove today's worker expenses (مصروفي)
            const allWorkerExp = getWorkerExpenses();
            const updatedWorkerExp = allWorkerExp.filter(e => !(e.workerId === user.id && e.date === today));
            setWorkerExpenses(updatedWorkerExp);

            // Log the shift reset
            const now = new Date();
            addShiftReset({
              id: Date.now().toString(),
              workerId: user.id,
              workerName: user.name,
              resetDate: today,
              resetTime: now.toLocaleTimeString('ar-EG'),
              reportSummary: `تصفير حضور العامل ${user.name}`,
            });

            setShowResetDialog(false);
            setResetPassword('');
            setResetError('');
            window.dispatchEvent(new Event('shift-reset'));
            toast.success('تم تصفير الشيفت بنجاح ✅ تم حفظ سجل الحضور والساعات');
          }} className="space-y-4 mt-2">
            <div className="relative">
              <Lock size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="password"
                placeholder="كلمة المرور"
                value={resetPassword}
                onChange={e => setResetPassword(e.target.value)}
                className="pr-10 text-right"
                autoFocus
              />
            </div>
            {resetError && <p className="text-sm text-destructive text-center">{resetError}</p>}
            <DialogFooter className="flex gap-2 justify-center sm:justify-center">
              <Button type="submit" variant="destructive">تأكيد التصفير</Button>
              <Button type="button" variant="outline" onClick={() => setShowResetDialog(false)}>إلغاء</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
      </TabsContent>

      <TabsContent value="expenses">
        <WorkerExpensesTab />
      </TabsContent>
    </Tabs>
  );
};

export default WorkerDashboard;
