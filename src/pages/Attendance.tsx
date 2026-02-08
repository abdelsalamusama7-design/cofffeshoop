import { useState } from 'react';
import { motion } from 'framer-motion';
import { ClipboardCheck, Plus, Calendar, Clock, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getAttendance, setAttendance, getWorkers, getCurrentUser } from '@/lib/store';
import { AttendanceRecord } from '@/lib/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';

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
      hoursWorked: Math.round(hoursWorked * 100) / 100,
    };

    const updated = [...records, record];
    setRecords(updated);
    setAttendance(updated);
    setShowAdd(false);
    setNewRecord({ workerId: '', date: new Date().toISOString().split('T')[0], checkIn: '', checkOut: '', type: 'present' });
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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">الحضور والانصراف</h1>
        <Button onClick={() => setShowAdd(true)} className="cafe-gradient text-primary-foreground">
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
