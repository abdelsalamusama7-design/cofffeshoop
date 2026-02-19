import { useState, useMemo } from 'react';
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
    const timeNow = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

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

    const timeNow = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const [h1, m1] = todayRecord.checkIn!.split(':').map(Number);
    const [h2, m2] = timeNow.split(':').map(Number);
    const hoursWorked = Math.max(0, Math.round(((h2 + m2 / 60) - (h1 + m1 / 60)) * 100) / 100);

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
  const presentDays = myMonthRecords.filter(r => r.type === 'present').length;
  const absentDays = myMonthRecords.filter(r => r.type === 'absent').length;
  const totalHours = Math.round(myMonthRecords.reduce((s, r) => s + (r.hoursWorked || 0), 0) * 10) / 10;

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
            <Button
              onClick={() => setShowResetDialog(true)}
              variant="outline"
              size="sm"
              className="mt-2 border-destructive/30 text-destructive hover:bg-destructive/10"
            >
              <RotateCcw size={14} className="ml-1" />
              تصفير الشيفت
            </Button>
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
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="bg-success/10 rounded-xl p-3">
            <p className="text-2xl font-bold text-success">{presentDays}</p>
            <p className="text-xs text-muted-foreground">يوم حضور</p>
          </div>
          <div className="bg-destructive/10 rounded-xl p-3">
            <p className="text-2xl font-bold text-destructive">{absentDays}</p>
            <p className="text-xs text-muted-foreground">يوم غياب</p>
          </div>
          <div className="bg-info/10 rounded-xl p-3">
            <p className="text-2xl font-bold text-info">{totalHours}</p>
            <p className="text-xs text-muted-foreground">ساعة عمل</p>
          </div>
        </div>
      </motion.div>

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
            {todaySales.map((sale, i) => (
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
              سيتم مسح سجل الحضور والانصراف اليوم حتى تتمكن من تسجيل شيفت جديد غداً. أدخل كلمة المرور للتأكيد.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            if (!user) return;
            const workers = getWorkers();
            const worker = workers.find(w => w.id === user.id && w.password === resetPassword);
            if (!worker) {
              setResetError('كلمة المرور غير صحيحة');
              return;
            }
            // Remove today's attendance record for this worker
            const updated = records.filter(r => !(r.workerId === user.id && r.date === today));
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
            toast.success('تم تصفير الشيفت بنجاح ✅ يمكنك تسجيل حضور جديد');
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
