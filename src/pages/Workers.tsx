import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Users, Plus, Trash2, Key, Save, Calendar, Share2, Mail, MessageCircle, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getWorkers, setWorkers, getCurrentUser, getAttendance, getSales } from '@/lib/store';
import { Worker } from '@/lib/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

const Workers = () => {
  const user = getCurrentUser();
  const [workersList, setWorkersList] = useState(getWorkers());
  const [showAdd, setShowAdd] = useState(false);
  const [showChangePass, setShowChangePass] = useState<string | null>(null);
  const [newWorker, setNewWorker] = useState({ name: '', password: '', salary: 0 });
  const [newPass, setNewPass] = useState('');

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
            <div className="flex gap-2">
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
      <SalaryReportsSection workers={workersList} />

      {/* Add Worker Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader><DialogTitle>إضافة عامل جديد</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="اسم العامل" value={newWorker.name} onChange={e => setNewWorker({ ...newWorker, name: e.target.value })} />
            <Input type="password" placeholder="كلمة المرور" value={newWorker.password} onChange={e => setNewWorker({ ...newWorker, password: e.target.value })} />
            <Input type="number" placeholder="المرتب" value={newWorker.salary || ''} onChange={e => setNewWorker({ ...newWorker, salary: +e.target.value })} />
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
    </div>
  );
};

/* ===================== Salary Reports ===================== */
const SalaryReportsSection = ({ workers }: { workers: Worker[] }) => {
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('monthly');
  const today = new Date();

  const report = useMemo(() => {
    const attendance = getAttendance();
    const sales = getSales();

    return workers
      .filter(w => w.role !== 'admin')
      .map(worker => {
        // Filter attendance by period
        let filteredAttendance = attendance.filter(a => a.workerId === worker.id);
        let filteredSales = sales.filter(s => s.workerId === worker.id);
        let periodDays = 1;

        const todayStr = today.toISOString().split('T')[0];
        const monthStr = todayStr.substring(0, 7);

        if (period === 'daily') {
          filteredAttendance = filteredAttendance.filter(a => a.date === todayStr);
          filteredSales = filteredSales.filter(s => s.date === todayStr);
          periodDays = 1;
        } else if (period === 'weekly') {
          const weekAgo = new Date(today);
          weekAgo.setDate(weekAgo.getDate() - 7);
          const weekAgoStr = weekAgo.toISOString().split('T')[0];
          filteredAttendance = filteredAttendance.filter(a => a.date >= weekAgoStr && a.date <= todayStr);
          filteredSales = filteredSales.filter(s => s.date >= weekAgoStr && s.date <= todayStr);
          periodDays = 7;
        } else {
          filteredAttendance = filteredAttendance.filter(a => a.date.startsWith(monthStr));
          filteredSales = filteredSales.filter(s => s.date.startsWith(monthStr));
          periodDays = 30;
        }

        const presentDays = filteredAttendance.filter(a => a.type === 'present').length;
        const absentDays = filteredAttendance.filter(a => a.type === 'absent').length;
        const totalSales = filteredSales.reduce((sum, s) => sum + s.total, 0);
        const dailySalary = worker.salary / 30;
        const salaryDue = Math.round(dailySalary * presentDays);

        return {
          worker,
          presentDays,
          absentDays,
          totalSales,
          salaryDue,
          periodDays,
        };
      });
  }, [workers, period]);

  const totalSalariesDue = report.reduce((sum, r) => sum + r.salaryDue, 0);

  const periodLabel = period === 'daily' ? 'اليوم' : period === 'weekly' ? 'هذا الأسبوع' : 'هذا الشهر';

  const generateReportText = () => {
    let text = `📊 تقرير المرتبات - ${periodLabel}\n`;
    text += `📅 ${today.toLocaleDateString('ar-EG')}\n`;
    text += `━━━━━━━━━━━━━━━━━━\n\n`;

    report.forEach(r => {
      text += `👤 ${r.worker.name}\n`;
      text += `  ✅ أيام الحضور: ${r.presentDays}\n`;
      text += `  ❌ أيام الغياب: ${r.absentDays}\n`;
      text += `  💰 المبيعات: ${r.totalSales} ج.م\n`;
      text += `  💵 المرتب المستحق: ${r.salaryDue} ج.م\n\n`;
    });

    text += `━━━━━━━━━━━━━━━━━━\n`;
    text += `💰 إجمالي المرتبات المستحقة: ${totalSalariesDue} ج.م\n`;
    return text;
  };

  const shareViaWhatsApp = () => {
    const text = generateReportText();
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const shareViaEmail = () => {
    const text = generateReportText();
    window.open(`mailto:?subject=${encodeURIComponent(`تقرير المرتبات - ${periodLabel}`)}&body=${encodeURIComponent(text)}`, '_blank');
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
        <p className="text-sm text-muted-foreground">إجمالي المرتبات المستحقة - {periodLabel}</p>
        <p className="text-3xl font-bold text-primary mt-1">{totalSalariesDue} ج.م</p>
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
                  <p className="text-xs text-muted-foreground">المرتب الأساسي: {r.worker.salary} ج.م/شهر</p>
                </div>
              </div>
              <p className="text-lg font-bold text-primary">{r.salaryDue} ج.م</p>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center text-sm">
              <div className="bg-muted/50 rounded-lg p-2">
                <p className="text-muted-foreground text-xs">حضور</p>
                <p className="font-bold text-foreground">{r.presentDays} يوم</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-2">
                <p className="text-muted-foreground text-xs">غياب</p>
                <p className="font-bold text-destructive">{r.absentDays} يوم</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-2">
                <p className="text-muted-foreground text-xs">مبيعات</p>
                <p className="font-bold text-foreground">{r.totalSales} ج.م</p>
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

export default Workers;
