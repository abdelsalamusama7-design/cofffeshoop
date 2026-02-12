import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ClipboardCheck, Plus, Calendar, Clock, Save, Share2, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getAttendance, setAttendance, getWorkers, getCurrentUser, getSales } from '@/lib/store';
import { AttendanceRecord } from '@/lib/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';


const WorkerReportsSection = ({ workers, records }: { workers: { id: string; name: string; role: string; salary: number; password: string }[]; records: AttendanceRecord[] }) => {
  const sales = getSales();
  const today = new Date().toISOString().split('T')[0];
  const currentMonth = new Date().toISOString().slice(0, 7);

  const getWorkerReport = (workerId: string, startDate: string, isMonthly: boolean) => {
    const filteredRecords = isMonthly
      ? records.filter(r => r.workerId === workerId && r.date.startsWith(startDate))
      : records.filter(r => r.workerId === workerId && r.date === startDate);
    const filteredSales = isMonthly
      ? sales.filter(s => s.workerId === workerId && s.date.startsWith(startDate))
      : sales.filter(s => s.workerId === workerId && s.date === startDate);

    const presentDays = filteredRecords.filter(r => r.type === 'present').length;
    const absentDays = filteredRecords.filter(r => r.type === 'absent').length;
    const leaveDays = filteredRecords.filter(r => r.type === 'leave').length;
    const totalHours = Math.round(filteredRecords.reduce((sum, r) => sum + (r.hoursWorked || 0), 0) * 10) / 10;
    const totalSales = filteredSales.reduce((sum, s) => sum + s.total, 0);
    const salesCount = filteredSales.length;
    const itemsSold = filteredSales.reduce((sum, s) => sum + s.items.reduce((c, i) => c + i.quantity, 0), 0);

    return { presentDays, absentDays, leaveDays, totalHours, totalSales, salesCount, itemsSold };
  };

  const generateReportText = (period: string, isMonthly: boolean) => {
    const dateKey = isMonthly ? currentMonth : today;
    let text = `📋 تقرير ${period} - بن العميد\n`;
    text += `التاريخ: ${isMonthly ? currentMonth : today}\n`;
    text += `────────────────\n`;
    workers.forEach(w => {
      const r = getWorkerReport(w.id, dateKey, isMonthly);
      text += `\n👤 ${w.name}\n`;
      text += `  حضور: ${r.presentDays} يوم | غياب: ${r.absentDays} | إجازة: ${r.leaveDays}\n`;
      text += `  ساعات العمل: ${r.totalHours} ساعة\n`;
      text += `  المبيعات: ${r.salesCount} طلب - ${r.totalSales} ج.م (${r.itemsSold} منتج)\n`;
    });
    text += `\n────────────────\nتنفيذ شركة InstaTech للبرمجيات 📱 01227080430`;
    return text;
  };

  const shareReport = (period: string, isMonthly: boolean, method: 'whatsapp' | 'email') => {
    const text = generateReportText(period, isMonthly);
    if (method === 'whatsapp') {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    } else {
      window.open(`mailto:?subject=${encodeURIComponent(`تقرير ${period} - بن العميد`)}&body=${encodeURIComponent(text)}`, '_blank');
    }
  };

  const ReportTab = ({ period, isMonthly }: { period: string; isMonthly: boolean }) => {
    const dateKey = isMonthly ? currentMonth : today;
    return (
      <div className="space-y-3">
        {workers.map((w, i) => {
          const r = getWorkerReport(w.id, dateKey, isMonthly);
          return (
            <motion.div
              key={w.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="glass-card rounded-xl p-4 space-y-3"
            >
              <p className="font-bold text-foreground">{w.name}</p>
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="bg-success/10 rounded-lg p-2">
                  <p className="font-bold text-success text-lg">{r.presentDays}</p>
                  <p className="text-muted-foreground">حضور</p>
                </div>
                <div className="bg-destructive/10 rounded-lg p-2">
                  <p className="font-bold text-destructive text-lg">{r.absentDays}</p>
                  <p className="text-muted-foreground">غياب</p>
                </div>
                <div className="bg-warning/10 rounded-lg p-2">
                  <p className="font-bold text-warning text-lg">{r.leaveDays}</p>
                  <p className="text-muted-foreground">إجازة</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-center text-xs">
                <div className="bg-info/10 rounded-lg p-2">
                  <p className="font-bold text-info">{r.totalHours} ساعة</p>
                  <p className="text-muted-foreground">ساعات العمل</p>
                </div>
                <div className="bg-accent/10 rounded-lg p-2">
                  <p className="font-bold text-accent">{r.totalSales} ج.م</p>
                  <p className="text-muted-foreground">{r.salesCount} طلب ({r.itemsSold} منتج)</p>
                </div>
              </div>
            </motion.div>
          );
        })}
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={() => shareReport(period, isMonthly, 'whatsapp')}>
            <Share2 size={16} className="ml-2" />
            واتساب
          </Button>
          <Button variant="outline" className="flex-1" onClick={() => shareReport(period, isMonthly, 'email')}>
            <Share2 size={16} className="ml-2" />
            إيميل
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div>
      <h2 className="font-bold text-foreground mb-3 flex items-center gap-2">
        <BarChart3 size={18} />
        تقارير العمال
      </h2>
      <Tabs defaultValue="daily" dir="rtl">
        <TabsList className="w-full grid grid-cols-2 mb-3">
          <TabsTrigger value="daily">يومي</TabsTrigger>
          <TabsTrigger value="monthly">شهري</TabsTrigger>
        </TabsList>
        <TabsContent value="daily"><ReportTab period="يومي" isMonthly={false} /></TabsContent>
        <TabsContent value="monthly"><ReportTab period="شهري" isMonthly={true} /></TabsContent>
      </Tabs>
    </div>
  );
};

const Attendance = () => {
  const user = getCurrentUser();
  const workers = getWorkers().filter(w => w.role === 'worker');
  const [records, setRecords] = useState(getAttendance());
  const [showAdd, setShowAdd] = useState(false);
  const [newRecord, setNewRecord] = useState({
    workerId: '',
    date: new Date().toISOString().split('T')[0],
    checkIn: '',
    checkOut: '',
    type: 'present' as 'present' | 'absent' | 'leave',
    shift: 'morning' as 'morning' | 'evening',
  });

  if (user?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="text-muted-foreground text-lg">ليس لديك صلاحية للوصول لهذه الصفحة</p>
      </div>
    );
  }

  const calcHours = (checkIn: string, checkOut: string): number => {
    if (!checkIn || !checkOut) return 0;
    const [h1, m1] = checkIn.split(':').map(Number);
    const [h2, m2] = checkOut.split(':').map(Number);
    return Math.max(0, (h2 + m2 / 60) - (h1 + m1 / 60));
  };

  const addRecord = () => {
    if (!newRecord.workerId || !newRecord.date) return;
    const worker = workers.find(w => w.id === newRecord.workerId);
    if (!worker) return;

    const hoursWorked = calcHours(newRecord.checkIn, newRecord.checkOut);
    const record: AttendanceRecord = {
      id: Date.now().toString(),
      workerId: newRecord.workerId,
      workerName: worker.name,
      date: newRecord.date,
      checkIn: newRecord.checkIn,
      checkOut: newRecord.checkOut,
      type: newRecord.type,
      shift: newRecord.type === 'present' ? newRecord.shift : undefined,
      hoursWorked: Math.round(hoursWorked * 100) / 100,
    };

    const updated = [...records, record];
    setRecords(updated);
    setAttendance(updated);
    setShowAdd(false);
    setNewRecord({ workerId: '', date: new Date().toISOString().split('T')[0], checkIn: '', checkOut: '', type: 'present', shift: 'morning' });
    toast.success('تم تسجيل الحضور');
  };

  const todayRecords = records.filter(r => r.date === new Date().toISOString().split('T')[0]);

  // Calculate monthly summary per worker
  const currentMonth = new Date().toISOString().slice(0, 7);
  const monthlyRecords = records.filter(r => r.date.startsWith(currentMonth));

  const workerSummaries = workers.map(w => {
    const workerRecords = monthlyRecords.filter(r => r.workerId === w.id);
    const totalHours = workerRecords.reduce((sum, r) => sum + (r.hoursWorked || 0), 0);
    const presentDays = workerRecords.filter(r => r.type === 'present').length;
    const leaveDays = workerRecords.filter(r => r.type === 'leave').length;
    const absentDays = workerRecords.filter(r => r.type === 'absent').length;
    // Simple salary calculation (assuming 30 working days)
    const dailyRate = w.salary / 30;
    const deductions = absentDays * dailyRate;
    const netSalary = Math.round(w.salary - deductions);

    return { worker: w, totalHours: Math.round(totalHours * 10) / 10, presentDays, leaveDays, absentDays, netSalary };
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">الحضور والانصراف</h1>
        <Button onClick={() => setShowAdd(true)} className="cafe-gradient text-primary-foreground w-full sm:w-auto">
          <Plus size={18} className="ml-2" />
          تسجيل حضور
        </Button>
      </div>

      {/* Today's attendance */}
      <div>
        <h2 className="font-bold text-foreground mb-3 flex items-center gap-2">
          <Calendar size={18} />
          حضور اليوم
        </h2>
        {todayRecords.length === 0 ? (
          <div className="glass-card rounded-xl p-6 text-center">
            <p className="text-muted-foreground">لم يتم تسجيل حضور اليوم بعد</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {todayRecords.map((record, i) => (
              <motion.div
                key={record.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="glass-card rounded-xl p-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    record.type === 'present' ? 'bg-success/20' :
                    record.type === 'leave' ? 'bg-warning/20' : 'bg-destructive/20'
                  }`}>
                    <ClipboardCheck size={20} className={
                      record.type === 'present' ? 'text-success' :
                      record.type === 'leave' ? 'text-warning' : 'text-destructive'
                    } />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{record.workerName}</p>
                    <p className="text-sm text-muted-foreground">
                      {record.type === 'present' ? 'حاضر' : record.type === 'leave' ? 'إجازة' : 'غائب'}
                      {record.shift && (
                        <span className={`mr-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${
                          record.shift === 'morning' ? 'bg-warning/20 text-warning' : 'bg-info/20 text-info'
                        }`}>
                          {record.shift === 'morning' ? 'صباحي' : 'مسائي'}
                        </span>
                      )}
                      {record.checkIn && ` • ${record.checkIn}`}
                      {record.checkOut && ` - ${record.checkOut}`}
                    </p>
                  </div>
                </div>
                {record.hoursWorked !== undefined && record.hoursWorked > 0 && (
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Clock size={14} />
                    {record.hoursWorked} ساعة
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Monthly Summary */}
      <div>
        <h2 className="font-bold text-foreground mb-3">ملخص الشهر</h2>
        <div className="grid gap-3">
          {workerSummaries.map((summary, i) => (
            <motion.div
              key={summary.worker.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="glass-card rounded-xl p-4"
            >
              <div className="flex items-center justify-between mb-3">
                <p className="font-bold text-foreground">{summary.worker.name}</p>
                <p className="text-sm font-medium text-accent">المرتب: {summary.netSalary} ج.م</p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-sm">
                <div className="bg-success/10 rounded-lg p-2">
                  <p className="font-bold text-success">{summary.presentDays}</p>
                  <p className="text-xs text-muted-foreground">حضور</p>
                </div>
                <div className="bg-warning/10 rounded-lg p-2">
                  <p className="font-bold text-warning">{summary.leaveDays}</p>
                  <p className="text-xs text-muted-foreground">إجازة</p>
                </div>
                <div className="bg-destructive/10 rounded-lg p-2">
                  <p className="font-bold text-destructive">{summary.absentDays}</p>
                  <p className="text-xs text-muted-foreground">غياب</p>
                </div>
                <div className="bg-info/10 rounded-lg p-2">
                  <p className="font-bold text-info">{summary.totalHours}</p>
                  <p className="text-xs text-muted-foreground">ساعة</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Worker Reports Section */}
      <WorkerReportsSection workers={workers} records={records} />

      {/* Add Attendance Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader><DialogTitle>تسجيل الحضور</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <select
              value={newRecord.workerId}
              onChange={e => setNewRecord({ ...newRecord, workerId: e.target.value })}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
            >
              <option value="">اختر العامل</option>
              {workers.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
            <Input type="date" value={newRecord.date} onChange={e => setNewRecord({ ...newRecord, date: e.target.value })} />
            <select
              value={newRecord.type}
              onChange={e => setNewRecord({ ...newRecord, type: e.target.value as any })}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
            >
              <option value="present">حاضر</option>
              <option value="absent">غائب</option>
              <option value="leave">إجازة</option>
            </select>
            {newRecord.type === 'present' && (
              <>
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">الشيفت</label>
                  <select
                    value={newRecord.shift}
                    onChange={e => setNewRecord({ ...newRecord, shift: e.target.value as 'morning' | 'evening' })}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
                  >
                    <option value="morning">☀️ شيفت صباحي</option>
                    <option value="evening">🌙 شيفت مسائي</option>
                  </select>
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="text-sm text-muted-foreground mb-1 block">وقت الحضور</label>
                    <Input type="time" value={newRecord.checkIn} onChange={e => setNewRecord({ ...newRecord, checkIn: e.target.value })} />
                  </div>
                  <div className="flex-1">
                    <label className="text-sm text-muted-foreground mb-1 block">وقت الانصراف</label>
                    <Input type="time" value={newRecord.checkOut} onChange={e => setNewRecord({ ...newRecord, checkOut: e.target.value })} />
                  </div>
                </div>
              </>
            )}
            <Button onClick={addRecord} className="w-full cafe-gradient text-primary-foreground">
              <Save size={16} className="ml-2" />
              حفظ
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Attendance;
