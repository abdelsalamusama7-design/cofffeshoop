import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Users, Plus, Trash2, Key, Save, Mail, MessageCircle, TrendingUp, HandCoins, Gift, CircleDollarSign, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getWorkers, setWorkers, getCurrentUser, getAttendance, getSales, getTransactions, addTransaction, setTransactions } from '@/lib/store';
import { Worker, WorkerTransaction } from '@/lib/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

const Workers = () => {
  const user = getCurrentUser();
  const [workersList, setWorkersList] = useState(getWorkers());
  const [showAdd, setShowAdd] = useState(false);
  const [showChangePass, setShowChangePass] = useState<string | null>(null);
  const [showTransaction, setShowTransaction] = useState<string | null>(null);
  const [newWorker, setNewWorker] = useState({ name: '', password: '', salary: 0 });
  const [newPass, setNewPass] = useState('');
  const [txnType, setTxnType] = useState<'advance' | 'bonus'>('advance');
  const [txnAmount, setTxnAmount] = useState('');
  const [txnNote, setTxnNote] = useState('');
  const [transactions, setTransactionsState] = useState(getTransactions());
  const [showEditTxn, setShowEditTxn] = useState(false);
  const [editTxn, setEditTxn] = useState<WorkerTransaction | null>(null);
  const [editTxnType, setEditTxnType] = useState<'advance' | 'bonus'>('advance');
  const [editTxnAmount, setEditTxnAmount] = useState('');
  const [editTxnNote, setEditTxnNote] = useState('');

  const handleEditTransaction = () => {
    if (!editTxn || !editTxnAmount) return;
    const updated = transactions.map(t =>
      t.id === editTxn.id ? { ...t, type: editTxnType, amount: +editTxnAmount, note: editTxnNote } : t
    );
    setTransactions(updated);
    setTransactionsState(updated);
    setShowEditTxn(false);
    setEditTxn(null);
    toast.success('تم تعديل العملية');
  };

  if (user?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="text-muted-foreground text-lg">ليس لديك صلاحية للوصول لهذه الصفحة</p>
      </div>
    );
  }

  const addWorker = () => {
    if (!newWorker.name || !newWorker.password) return;
    const worker: Worker = {
      id: Date.now().toString(),
      name: newWorker.name,
      password: newWorker.password,
      role: 'worker',
      salary: newWorker.salary,
    };
    const updated = [...workersList, worker];
    setWorkersList(updated);
    setWorkers(updated);
    setNewWorker({ name: '', password: '', salary: 0 });
    setShowAdd(false);
    toast.success('تمت إضافة العامل');
  };

  const deleteWorker = (id: string) => {
    if (id === 'admin') return toast.error('لا يمكن حذف المدير');
    const updated = workersList.filter(w => w.id !== id);
    setWorkersList(updated);
    setWorkers(updated);
    toast.success('تم حذف العامل');
  };

  const changePassword = () => {
    if (!showChangePass || !newPass) return;
    const updated = workersList.map(w =>
      w.id === showChangePass ? { ...w, password: newPass } : w
    );
    setWorkersList(updated);
    setWorkers(updated);
    setShowChangePass(null);
    setNewPass('');
    toast.success('تم تغيير كلمة المرور');
  };

  const handleAddTransaction = () => {
    if (!showTransaction || !txnAmount) return;
    const worker = workersList.find(w => w.id === showTransaction);
    if (!worker) return;
    const txn: WorkerTransaction = {
      id: Date.now().toString(),
      workerId: worker.id,
      workerName: worker.name,
      type: txnType,
      amount: +txnAmount,
      note: txnNote,
      date: new Date().toISOString().split('T')[0],
    };
    addTransaction(txn);
    setTransactionsState(getTransactions());
    setShowTransaction(null);
    setTxnAmount('');
    setTxnNote('');
    setTxnType('advance');
    toast.success(txnType === 'advance' ? 'تم تسجيل السلفة' : 'تم تسجيل المكافأة');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">إدارة العمال</h1>
        <Button onClick={() => setShowAdd(true)} className="cafe-gradient text-primary-foreground">
          <Plus size={18} className="ml-2" />
          إضافة عامل
        </Button>
      </div>

      <div className="grid gap-3">
        {workersList.map((worker, i) => (
          <motion.div
            key={worker.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="glass-card rounded-xl p-4 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl cafe-gradient flex items-center justify-center">
                <Users size={22} className="text-primary-foreground" />
              </div>
              <div>
                <p className="font-semibold text-foreground">{worker.name}</p>
                <p className="text-sm text-muted-foreground">
                  {worker.role === 'admin' ? 'مدير' : 'عامل'} • المرتب: {worker.salary} ج.م
                </p>
              </div>
            </div>
            <div className="flex gap-1">
              {worker.role !== 'admin' && (
                <Button variant="ghost" size="icon" onClick={() => setShowTransaction(worker.id)} title="سلفة / مكافأة">
                  <CircleDollarSign size={16} />
                </Button>
              )}
              <Button variant="ghost" size="icon" onClick={() => setShowChangePass(worker.id)} title="تغيير كلمة المرور">
                <Key size={16} />
              </Button>
              {worker.role !== 'admin' && (
                <Button variant="ghost" size="icon" onClick={() => deleteWorker(worker.id)} className="text-destructive">
                  <Trash2 size={16} />
                </Button>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Salary Reports Section */}
      <SalaryReportsSection workers={workersList} transactions={transactions} />

      {/* Advances & Bonuses Detail Section */}
      <AdvancesSection
        workers={workersList}
        transactions={transactions}
        onDelete={(id) => {
          const updated = transactions.filter(t => t.id !== id);
          setTransactions(updated);
          setTransactionsState(updated);
          toast.success('تم حذف العملية');
        }}
        onEdit={(txn) => {
          setEditTxn(txn);
          setEditTxnType(txn.type);
          setEditTxnAmount(String(txn.amount));
          setEditTxnNote(txn.note);
          setShowEditTxn(true);
        }}
      />

      {/* Add Worker Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader><DialogTitle>إضافة عامل جديد</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="اسم العامل" value={newWorker.name} onChange={e => setNewWorker({ ...newWorker, name: e.target.value })} />
            <Input type="password" placeholder="كلمة المرور" value={newWorker.password} onChange={e => setNewWorker({ ...newWorker, password: e.target.value })} />
            <Input inputMode="numeric" pattern="[0-9]*" placeholder="المرتب" value={newWorker.salary || ''} onChange={e => setNewWorker({ ...newWorker, salary: +e.target.value.replace(/[^0-9.]/g, '') })} />
            <Button onClick={addWorker} className="w-full cafe-gradient text-primary-foreground">
              <Save size={16} className="ml-2" />
              حفظ
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Change Password Dialog */}
      <Dialog open={!!showChangePass} onOpenChange={() => setShowChangePass(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>تغيير كلمة المرور</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input type="password" placeholder="كلمة المرور الجديدة" value={newPass} onChange={e => setNewPass(e.target.value)} />
            <Button onClick={changePassword} className="w-full cafe-gradient text-primary-foreground">
              <Save size={16} className="ml-2" />
              تغيير
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Transaction Dialog */}
      <Dialog open={!!showTransaction} onOpenChange={() => setShowTransaction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تسجيل سلفة / مكافأة</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              العامل: {workersList.find(w => w.id === showTransaction)?.name}
            </p>
            <Select value={txnType} onValueChange={v => setTxnType(v as 'advance' | 'bonus')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="advance">
                  <span className="flex items-center gap-2"><HandCoins size={14} /> سلفة (خصم)</span>
                </SelectItem>
                <SelectItem value="bonus">
                  <span className="flex items-center gap-2"><Gift size={14} /> مكافأة (إضافة)</span>
                </SelectItem>
              </SelectContent>
            </Select>
            <Input
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="المبلغ"
              value={txnAmount}
              onChange={e => setTxnAmount(e.target.value.replace(/[^0-9.]/g, ''))}
            />
            <Input
              placeholder="ملاحظة (اختياري)"
              value={txnNote}
              onChange={e => setTxnNote(e.target.value)}
            />
            <Button onClick={handleAddTransaction} className="w-full cafe-gradient text-primary-foreground">
              <Save size={16} className="ml-2" />
              حفظ
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Transaction Dialog */}
      <Dialog open={showEditTxn} onOpenChange={setShowEditTxn}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تعديل العملية</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Select value={editTxnType} onValueChange={v => setEditTxnType(v as 'advance' | 'bonus')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="advance">
                  <span className="flex items-center gap-2"><HandCoins size={14} /> سلفة (خصم)</span>
                </SelectItem>
                <SelectItem value="bonus">
                  <span className="flex items-center gap-2"><Gift size={14} /> مكافأة (إضافة)</span>
                </SelectItem>
              </SelectContent>
            </Select>
            <Input
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="المبلغ"
              value={editTxnAmount}
              onChange={e => setEditTxnAmount(e.target.value.replace(/[^0-9.]/g, ''))}
            />
            <Input
              placeholder="ملاحظة (اختياري)"
              value={editTxnNote}
              onChange={e => setEditTxnNote(e.target.value)}
            />
            <Button onClick={handleEditTransaction} className="w-full cafe-gradient text-primary-foreground">
              <Save size={16} className="ml-2" />
              حفظ التعديل
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

/* ===================== Salary Reports ===================== */
const SalaryReportsSection = ({ workers, transactions }: { workers: Worker[]; transactions: WorkerTransaction[] }) => {
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('monthly');
  const today = new Date();

  const report = useMemo(() => {
    const attendance = getAttendance();
    const sales = getSales();
    const todayStr = today.toISOString().split('T')[0];
    const monthStr = todayStr.substring(0, 7);

    return workers
      .filter(w => w.role !== 'admin')
      .map(worker => {
        let filteredAttendance = attendance.filter(a => a.workerId === worker.id);
        let filteredSales = sales.filter(s => s.workerId === worker.id);
        let filteredTxns = transactions.filter(t => t.workerId === worker.id);

        if (period === 'daily') {
          filteredAttendance = filteredAttendance.filter(a => a.date === todayStr);
          filteredSales = filteredSales.filter(s => s.date === todayStr);
          filteredTxns = filteredTxns.filter(t => t.date === todayStr);
        } else if (period === 'weekly') {
          const weekAgo = new Date(today);
          weekAgo.setDate(weekAgo.getDate() - 7);
          const weekAgoStr = weekAgo.toISOString().split('T')[0];
          filteredAttendance = filteredAttendance.filter(a => a.date >= weekAgoStr && a.date <= todayStr);
          filteredSales = filteredSales.filter(s => s.date >= weekAgoStr && s.date <= todayStr);
          filteredTxns = filteredTxns.filter(t => t.date >= weekAgoStr && t.date <= todayStr);
        } else {
          filteredAttendance = filteredAttendance.filter(a => a.date.startsWith(monthStr));
          filteredSales = filteredSales.filter(s => s.date.startsWith(monthStr));
          filteredTxns = filteredTxns.filter(t => t.date.startsWith(monthStr));
        }

        const presentDays = filteredAttendance.filter(a => a.type === 'present').length;
        const absentDays = filteredAttendance.filter(a => a.type === 'absent').length;
        const totalSales = filteredSales.reduce((sum, s) => sum + s.total, 0);
        const advances = filteredTxns.filter(t => t.type === 'advance').reduce((sum, t) => sum + t.amount, 0);
        const bonuses = filteredTxns.filter(t => t.type === 'bonus').reduce((sum, t) => sum + t.amount, 0);
        const dailySalary = worker.salary / 30;
        const baseSalary = Math.round(dailySalary * presentDays);
        const netSalary = baseSalary - advances + bonuses;

        return {
          worker,
          presentDays,
          absentDays,
          totalSales,
          baseSalary,
          advances,
          bonuses,
          netSalary,
        };
      });
  }, [workers, period, transactions]);

  const totalNet = report.reduce((sum, r) => sum + r.netSalary, 0);

  const periodLabel = period === 'daily' ? 'اليوم' : period === 'weekly' ? 'هذا الأسبوع' : 'هذا الشهر';

  const generateReportText = () => {
    let text = `📊 تقرير المرتبات - ${periodLabel}\n`;
    text += `📅 ${today.toLocaleDateString('ar-EG')}\n`;
    text += `━━━━━━━━━━━━━━━━━━\n\n`;

    report.forEach(r => {
      text += `👤 ${r.worker.name}\n`;
      text += `  ✅ حضور: ${r.presentDays} | ❌ غياب: ${r.absentDays}\n`;
      text += `  💰 المبيعات: ${r.totalSales} ج.م\n`;
      text += `  💵 المرتب الأساسي: ${r.baseSalary} ج.م\n`;
      if (r.advances > 0) text += `  🔻 سلف: -${r.advances} ج.م\n`;
      if (r.bonuses > 0) text += `  🔺 مكافآت: +${r.bonuses} ج.م\n`;
      text += `  💰 الصافي: ${r.netSalary} ج.م\n\n`;
    });

    text += `━━━━━━━━━━━━━━━━━━\n`;
    text += `💰 إجمالي الصافي: ${totalNet} ج.م\n`;
    return text;
  };

  const shareViaWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(generateReportText())}`, '_blank');
  };

  const shareViaEmail = () => {
    window.open(`mailto:?subject=${encodeURIComponent(`تقرير المرتبات - ${periodLabel}`)}&body=${encodeURIComponent(generateReportText())}`, '_blank');
  };

  return (
    <div className="space-y-4 mt-8">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
          <TrendingUp size={22} />
          تقرير المرتبات
        </h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={shareViaWhatsApp}>
            <MessageCircle size={14} className="ml-1" />
            واتساب
          </Button>
          <Button variant="outline" size="sm" onClick={shareViaEmail}>
            <Mail size={14} className="ml-1" />
            إيميل
          </Button>
        </div>
      </div>

      <Tabs value={period} onValueChange={v => setPeriod(v as any)} dir="rtl">
        <TabsList className="w-full">
          <TabsTrigger value="daily" className="flex-1">يومي</TabsTrigger>
          <TabsTrigger value="weekly" className="flex-1">أسبوعي</TabsTrigger>
          <TabsTrigger value="monthly" className="flex-1">شهري</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Total Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card rounded-xl p-4 text-center"
      >
        <p className="text-sm text-muted-foreground">إجمالي المرتبات الصافية - {periodLabel}</p>
        <p className="text-3xl font-bold text-primary mt-1">{totalNet} ج.م</p>
      </motion.div>

      {/* Per Worker Cards */}
      <div className="grid gap-3">
        {report.map((r, i) => (
          <motion.div
            key={r.worker.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className="glass-card rounded-xl p-4"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-lg cafe-gradient flex items-center justify-center">
                  <Users size={18} className="text-primary-foreground" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">{r.worker.name}</p>
                  <p className="text-xs text-muted-foreground">الأساسي: {r.worker.salary} ج.م/شهر</p>
                </div>
              </div>
              <p className="text-lg font-bold text-primary">{r.netSalary} ج.م</p>
            </div>
            <div className="grid grid-cols-5 gap-1.5 text-center text-sm">
              <div className="bg-muted/50 rounded-lg p-2">
                <p className="text-muted-foreground text-[10px]">حضور</p>
                <p className="font-bold text-foreground text-xs">{r.presentDays}</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-2">
                <p className="text-muted-foreground text-[10px]">غياب</p>
                <p className="font-bold text-destructive text-xs">{r.absentDays}</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-2">
                <p className="text-muted-foreground text-[10px]">مرتب</p>
                <p className="font-bold text-foreground text-xs">{r.baseSalary}</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-2">
                <p className="text-muted-foreground text-[10px]">سلف</p>
                <p className="font-bold text-destructive text-xs">-{r.advances}</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-2">
                <p className="text-muted-foreground text-[10px]">مكافآت</p>
                <p className="font-bold text-foreground text-xs">+{r.bonuses}</p>
              </div>
            </div>
          </motion.div>
        ))}
        {report.length === 0 && (
          <p className="text-center text-muted-foreground py-8">لا يوجد عمال لعرض التقرير</p>
        )}
      </div>
    </div>
  );
};

/* ===================== Advances & Bonuses Detail ===================== */
const AdvancesSection = ({
  workers,
  transactions,
  onDelete,
  onEdit,
}: {
  workers: Worker[];
  transactions: WorkerTransaction[];
  onDelete: (id: string) => void;
  onEdit: (txn: WorkerTransaction) => void;
}) => {
  const [filterWorker, setFilterWorker] = useState<string>('all');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const filteredTxns = useMemo(() => {
    let txns = [...transactions].sort((a, b) => b.date.localeCompare(a.date));
    if (filterWorker !== 'all') txns = txns.filter(t => t.workerId === filterWorker);
    return txns;
  }, [transactions, filterWorker]);

  const workersList = workers.filter(w => w.role !== 'admin');

  const totalAdvances = filteredTxns.filter(t => t.type === 'advance').reduce((s, t) => s + t.amount, 0);
  const totalBonuses = filteredTxns.filter(t => t.type === 'bonus').reduce((s, t) => s + t.amount, 0);

  return (
    <div className="space-y-4 mt-8">
      <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
        <HandCoins size={22} className="text-accent" />
        سجل السلف والمكافآت
      </h2>

      {/* Filter */}
      <Select value={filterWorker} onValueChange={setFilterWorker}>
        <SelectTrigger className="w-full bg-secondary">
          <SelectValue placeholder="كل العمال" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">كل العمال</SelectItem>
          {workersList.map(w => (
            <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="glass-card rounded-xl p-4 text-center">
          <p className="text-xs text-muted-foreground mb-1">إجمالي السلف</p>
          <p className="text-xl font-bold text-destructive">{totalAdvances} ج.م</p>
          <p className="text-[10px] text-muted-foreground mt-1">{filteredTxns.filter(t => t.type === 'advance').length} سلفة</p>
        </div>
        <div className="glass-card rounded-xl p-4 text-center">
          <p className="text-xs text-muted-foreground mb-1">إجمالي المكافآت</p>
          <p className="text-xl font-bold text-primary">{totalBonuses} ج.م</p>
          <p className="text-[10px] text-muted-foreground mt-1">{filteredTxns.filter(t => t.type === 'bonus').length} مكافأة</p>
        </div>
      </div>

      {/* Transactions List */}
      <div className="space-y-2">
        {filteredTxns.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">لا توجد سلف أو مكافآت مسجلة</p>
        ) : (
          filteredTxns.map((txn, i) => (
            <motion.div
              key={txn.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="glass-card rounded-xl p-3 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${txn.type === 'advance' ? 'bg-destructive/15' : 'bg-primary/15'}`}>
                  {txn.type === 'advance' ? <HandCoins size={18} className="text-destructive" /> : <Gift size={18} className="text-primary" />}
                </div>
                <div>
                  <p className="font-semibold text-foreground text-sm">{txn.workerName}</p>
                  <p className="text-xs text-muted-foreground">
                    {txn.type === 'advance' ? 'سلفة' : 'مكافأة'} • {txn.date}
                  </p>
                  {txn.note && <p className="text-xs text-muted-foreground/70 mt-0.5">📝 {txn.note}</p>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <p className={`font-bold text-sm ${txn.type === 'advance' ? 'text-destructive' : 'text-primary'}`}>
                  {txn.type === 'advance' ? '-' : '+'}{txn.amount} ج.م
                </p>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(txn)}>
                  <Pencil size={14} />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteConfirm(txn.id)}>
                  <Trash2 size={14} />
                </Button>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف العملية</AlertDialogTitle>
            <AlertDialogDescription>هل أنت متأكد من حذف هذه العملية؟ لا يمكن التراجع عن هذا.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (deleteConfirm) { onDelete(deleteConfirm); setDeleteConfirm(null); } }}>
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Workers;
