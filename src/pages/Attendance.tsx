import { useState, useMemo } from 'react';
import { calcHoursWorked, formatHoursDetailed } from '@/lib/utils';
import ScrollableList from '@/components/ScrollableList';
import { motion } from 'framer-motion';
import { ClipboardCheck, Plus, Calendar, Clock, Save, Share2, BarChart3, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getAttendance, setAttendance, getWorkers, getCurrentUser, getSales } from '@/lib/store';
import { AttendanceRecord } from '@/lib/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import PasswordConfirmDialog from '@/components/PasswordConfirmDialog';


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

    const completedShifts = filteredRecords.filter(r => r.type === 'present' && r.checkOut && (r.hoursWorked || 0) >= 12);
    const presentDays = completedShifts.length;
    const partialShifts = filteredRecords.filter(r => r.type === 'present' && r.checkOut && (r.hoursWorked || 0) < 12);
    const leaveDays = filteredRecords.filter(r => r.type === 'leave').length;
    // Auto-calculate absent days for monthly
    const now = new Date();
    const monthStartDate = new Date(now.getFullYear(), now.getMonth(), 1);
    const todayDateObj = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const daysInMonth = Math.floor((todayDateObj.getTime() - monthStartDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const daysWithRecs = new Set(filteredRecords.map(r => r.date)).size;
    const absentDays = isMonthly ? Math.max(0, daysInMonth - daysWithRecs) : filteredRecords.filter(r => r.type === 'absent').length;
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
      window.open(`mailto:alameedbon1@gmail.com?subject=${encodeURIComponent(`تقرير ${period} - بن العميد`)}&body=${encodeURIComponent(text)}`, '_blank');
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
  const [viewDate, setViewDate] = useState(new Date().toISOString().split('T')[0]);
  const todayStr = new Date().toISOString().split('T')[0];
  const [adminDetail, setAdminDetail] = useState<{ workerId: string; workerName: string; type: 'present' | 'absent' | 'leave' | 'hours' | 'partial' } | null>(null);
  const [editRecord, setEditRecord] = useState<AttendanceRecord | null>(null);
  const [deleteRecordId, setDeleteRecordId] = useState<string | null>(null);
  const [showDeletePassword, setShowDeletePassword] = useState(false);
  const [editForm, setEditForm] = useState({ checkIn: '', checkOut: '', type: 'present' as 'present' | 'absent' | 'leave', shift: 'morning' as 'morning' | 'evening' });
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
    return calcHoursWorked(checkIn, checkOut);
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

  const handleEditRecord = (record: AttendanceRecord) => {
    setEditRecord(record);
    setEditForm({
      checkIn: record.checkIn || '',
      checkOut: record.checkOut || '',
      type: record.type,
      shift: (record.shift || 'morning') as 'morning' | 'evening',
    });
  };

  const saveEditRecord = () => {
    if (!editRecord) return;
    const hoursWorked = calcHours(editForm.checkIn, editForm.checkOut);
    const updated = records.map(r => r.id === editRecord.id ? {
      ...r,
      checkIn: editForm.type === 'present' ? editForm.checkIn : undefined,
      checkOut: editForm.type === 'present' ? editForm.checkOut : undefined,
      type: editForm.type,
      shift: editForm.type === 'present' ? editForm.shift : undefined,
      hoursWorked: editForm.type === 'present' ? Math.round(hoursWorked * 100) / 100 : 0,
    } : r);
    setRecords(updated);
    setAttendance(updated);
    setEditRecord(null);
    toast.success('تم تعديل السجل');
  };

  const confirmDeleteRecord = () => {
    if (!deleteRecordId) return;
    const updated = records.filter(r => r.id !== deleteRecordId);
    setRecords(updated);
    setAttendance(updated);
    setDeleteRecordId(null);
    toast.success('تم حذف السجل');
  };

  const todayRecords = records.filter(r => r.date === viewDate);
  const currentMonth = new Date().toISOString().slice(0, 7);
  const monthlyRecords = records.filter(r => r.date.startsWith(currentMonth));

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const daysPassedInMonth = Math.floor((todayDate.getTime() - monthStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  const workerSummaries = workers.map(w => {
    const workerRecords = monthlyRecords.filter(r => r.workerId === w.id);
    const totalHours = workerRecords.reduce((sum, r) => sum + (r.hoursWorked || 0), 0);
    // Only count completed shifts (12+ hours) as full present days
    const completedShifts = workerRecords.filter(r => r.type === 'present' && r.checkOut && (r.hoursWorked || 0) >= 12);
    const presentDays = completedShifts.length;
    // Partial shifts: checked out but less than 12 hours
    const partialShifts = workerRecords.filter(r => r.type === 'present' && r.checkOut && (r.hoursWorked || 0) < 12);
    const partialHours = partialShifts.reduce((s, r) => s + (r.hoursWorked || 0), 0);
    const leaveDays = workerRecords.filter(r => r.type === 'leave').length;
    // Auto-calculate absent days
    const daysWithRecords = new Set(workerRecords.map(r => r.date)).size;
    const absentDays = Math.max(0, daysPassedInMonth - daysWithRecords);
    // Simple salary calculation (assuming 30 working days)
    const dailyRate = w.salary / 30;
    const deductions = absentDays * dailyRate;
    const netSalary = Math.round(w.salary - deductions);

    return { worker: w, totalHours: Math.round(totalHours * 10) / 10, presentDays, leaveDays, absentDays, netSalary, partialShifts: partialShifts.length, partialHours };
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

      {/* Date filter + Today's attendance */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-foreground flex items-center gap-2">
            <Calendar size={18} />
            {viewDate === todayStr ? 'حضور اليوم' : `حضور يوم ${viewDate}`}
          </h2>
        </div>
        <div className="flex items-center gap-2 mb-3">
          <Calendar size={16} className="text-muted-foreground shrink-0" />
          <Input type="date" value={viewDate} onChange={e => setViewDate(e.target.value || todayStr)} className="w-auto h-9 text-sm" />
          {viewDate !== todayStr && (
            <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setViewDate(todayStr)}>اليوم</Button>
          )}
        </div>
        {todayRecords.length === 0 ? (
          <div className="glass-card rounded-xl p-6 text-center">
            <p className="text-muted-foreground">لم يتم تسجيل حضور اليوم بعد</p>
          </div>
        ) : (
          <ScrollableList maxHeight="max-h-[50vh]" className="grid gap-3">
            {todayRecords.map((record, i) => (
              <motion.div
                key={record.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="glass-card rounded-xl p-4 space-y-2"
              >
                <div className="flex items-center justify-between">
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
                      {formatHoursDetailed(record.hoursWorked)}
                    </div>
                  )}
                </div>
                <div className="flex gap-1 justify-end">
                  <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => handleEditRecord(record)}>
                    <Pencil size={12} className="ml-1" /> تعديل
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-destructive hover:text-destructive" onClick={() => { setDeleteRecordId(record.id); setShowDeletePassword(true); }}>
                    <Trash2 size={12} className="ml-1" /> حذف
                  </Button>
                </div>
              </motion.div>
            ))}
          </ScrollableList>
        )}
      </div>

      {/* Monthly Summary */}
      <div>
        <h2 className="font-bold text-foreground mb-3">
          ملخص الشهر ({monthStart.toLocaleDateString('ar-EG-u-nu-latn', { day: 'numeric', month: 'long' })} - {todayDate.toLocaleDateString('ar-EG-u-nu-latn', { day: 'numeric', month: 'long' })}) • {daysPassedInMonth} يوم
        </h2>
        <ScrollableList maxHeight="max-h-[50vh]" className="grid gap-3">
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
                <div className="bg-success/10 rounded-lg p-2 cursor-pointer hover:ring-2 ring-success/40 transition-all" onClick={() => setAdminDetail({ workerId: summary.worker.id, workerName: summary.worker.name, type: 'present' })}>
                  <p className="font-bold text-success">{summary.presentDays}</p>
                  <p className="text-xs text-muted-foreground">حضور (12+ ساعة)</p>
                </div>
                <div className="bg-warning/10 rounded-lg p-2 cursor-pointer hover:ring-2 ring-warning/40 transition-all" onClick={() => setAdminDetail({ workerId: summary.worker.id, workerName: summary.worker.name, type: 'leave' })}>
                  <p className="font-bold text-warning">{summary.leaveDays}</p>
                  <p className="text-xs text-muted-foreground">إجازة</p>
                </div>
                <div className="bg-destructive/10 rounded-lg p-2 cursor-pointer hover:ring-2 ring-destructive/40 transition-all" onClick={() => setAdminDetail({ workerId: summary.worker.id, workerName: summary.worker.name, type: 'absent' })}>
                  <p className="font-bold text-destructive">{summary.absentDays}</p>
                  <p className="text-xs text-muted-foreground">غياب</p>
                </div>
                <div className="bg-info/10 rounded-lg p-2 cursor-pointer hover:ring-2 ring-info/40 transition-all" onClick={() => setAdminDetail({ workerId: summary.worker.id, workerName: summary.worker.name, type: 'hours' })}>
                  <p className="font-bold text-info">{formatHoursDetailed(summary.totalHours)}</p>
                  <p className="text-xs text-muted-foreground">ساعات العمل</p>
                </div>
              </div>
              {summary.partialShifts > 0 && (
                <div className="bg-warning/10 rounded-lg p-2 text-center mt-2 cursor-pointer hover:ring-2 ring-warning/40 transition-all" onClick={() => setAdminDetail({ workerId: summary.worker.id, workerName: summary.worker.name, type: 'partial' })}>
                  <p className="font-bold text-warning text-sm">
                    {Math.floor(summary.partialHours)} س {Math.round((summary.partialHours - Math.floor(summary.partialHours)) * 60)} د
                  </p>
                  <p className="text-xs text-muted-foreground">ساعات غير مكتملة ({summary.partialShifts} شيفت أقل من 12 ساعة)</p>
                </div>
              )}
            </motion.div>
          ))}
        </ScrollableList>
      </div>

      {/* Admin Attendance Detail Dialog */}
      <Dialog open={adminDetail !== null} onOpenChange={(open) => { if (!open) setAdminDetail(null); }}>
        <DialogContent className="max-w-sm max-h-[80vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-lg text-center">
              {adminDetail?.workerName} - {adminDetail?.type === 'present' && '✅ أيام الحضور'}
              {adminDetail?.type === 'absent' && '❌ أيام الغياب'}
              {adminDetail?.type === 'leave' && '📋 أيام الإجازة'}
              {adminDetail?.type === 'hours' && '⏱ ساعات العمل'}
              {adminDetail?.type === 'partial' && '⚠️ شيفتات غير مكتملة'}
            </DialogTitle>
          </DialogHeader>
          {(() => {
            if (!adminDetail) return null;
            const wRecords = monthlyRecords.filter(r => r.workerId === adminDetail.workerId);

            const formatTime = (hw: number) => {
              const hrs = Math.floor(hw);
              const mins = Math.floor((hw - hrs) * 60);
              const secs = Math.round(((hw - hrs) * 60 - mins) * 60);
              return `${hrs} ساعة${mins > 0 ? ` ${mins} دقيقة` : ''}${secs > 0 ? ` ${secs} ثانية` : ''}`;
            };

            const RecordActions = ({ record }: { record: AttendanceRecord }) => (
              <div className="flex gap-1 mt-1">
                <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => handleEditRecord(record)}>
                  <Pencil size={12} className="ml-1" /> تعديل
                </Button>
                <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-destructive hover:text-destructive" onClick={() => { setDeleteRecordId(record.id); setShowDeletePassword(true); }}>
                  <Trash2 size={12} className="ml-1" /> حذف
                </Button>
              </div>
            );

            if (adminDetail.type === 'present') {
              const completed = wRecords.filter(r => r.type === 'present' && r.checkOut && (r.hoursWorked || 0) >= 12);
              return completed.length === 0 ? <p className="text-center text-muted-foreground text-sm py-4">لا توجد أيام حضور مكتملة</p> : (
                <div className="space-y-2">{completed.sort((a, b) => a.date.localeCompare(b.date)).map(r => (
                  <div key={r.id} className="bg-success/5 border border-success/20 rounded-xl p-3 space-y-1">
                    <p className="font-bold text-foreground text-sm">📅 {new Date(r.date).toLocaleDateString('ar-EG-u-nu-latn', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                    <div className="flex justify-between text-xs text-muted-foreground"><span>🕐 حضور: {r.checkIn}</span><span>🕐 انصراف: {r.checkOut}</span></div>
                    <p className="text-xs text-success font-medium">⏱ {formatTime(r.hoursWorked || 0)}</p>
                    {r.shift && <p className="text-xs text-muted-foreground">{r.shift === 'morning' ? '☀️ صباحي' : '🌙 مسائي'}</p>}
                    <RecordActions record={r} />
                  </div>
                ))}</div>
              );
            }

            if (adminDetail.type === 'absent') {
              const absentDates: string[] = [];
              for (let d = 1; d <= daysPassedInMonth; d++) {
                const ds = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                if (!wRecords.some(r => r.date === ds)) absentDates.push(ds);
              }
              return absentDates.length === 0 ? <p className="text-center text-muted-foreground text-sm py-4">لا توجد أيام غياب 🎉</p> : (
                <div className="space-y-2">{absentDates.map(ds => (
                  <div key={ds} className="bg-destructive/5 border border-destructive/20 rounded-xl p-3">
                    <p className="font-bold text-foreground text-sm">📅 {new Date(ds).toLocaleDateString('ar-EG-u-nu-latn', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                    <p className="text-xs text-destructive font-medium mt-1">❌ لم يتم تسجيل أي حضور</p>
                  </div>
                ))}</div>
              );
            }

            if (adminDetail.type === 'leave') {
              const leaves = wRecords.filter(r => r.type === 'leave');
              return leaves.length === 0 ? <p className="text-center text-muted-foreground text-sm py-4">لا توجد إجازات</p> : (
                <div className="space-y-2">{leaves.sort((a, b) => a.date.localeCompare(b.date)).map(r => (
                  <div key={r.id} className="bg-warning/5 border border-warning/20 rounded-xl p-3">
                    <p className="font-bold text-foreground text-sm">📅 {new Date(r.date).toLocaleDateString('ar-EG-u-nu-latn', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                    <p className="text-xs text-warning font-medium mt-1">📋 إجازة / إذن</p>
                    <RecordActions record={r} />
                  </div>
                ))}</div>
              );
            }

            if (adminDetail.type === 'hours') {
              const withHours = wRecords.filter(r => r.type === 'present' && r.checkOut);
              return withHours.length === 0 ? <p className="text-center text-muted-foreground text-sm py-4">لا توجد ساعات عمل</p> : (
                <div className="space-y-2">{withHours.sort((a, b) => a.date.localeCompare(b.date)).map(r => {
                  const isComplete = (r.hoursWorked || 0) >= 12;
                  return (
                    <div key={r.id} className={`${isComplete ? 'bg-success/5 border-success/20' : 'bg-warning/5 border-warning/20'} border rounded-xl p-3 space-y-1`}>
                      <p className="font-bold text-foreground text-sm">📅 {new Date(r.date).toLocaleDateString('ar-EG-u-nu-latn', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                      <div className="flex justify-between text-xs text-muted-foreground"><span>🕐 {r.checkIn}</span><span>🕐 {r.checkOut}</span></div>
                      <p className={`text-xs font-medium ${isComplete ? 'text-success' : 'text-warning'}`}>⏱ {formatTime(r.hoursWorked || 0)} {isComplete ? '✅' : '⚠️'}</p>
                      <RecordActions record={r} />
                    </div>
                  );
                })}</div>
              );
            }

            if (adminDetail.type === 'partial') {
              const partials = wRecords.filter(r => r.type === 'present' && r.checkOut && (r.hoursWorked || 0) < 12);
              return partials.length === 0 ? <p className="text-center text-muted-foreground text-sm py-4">لا توجد شيفتات غير مكتملة</p> : (
                <div className="space-y-2">{partials.sort((a, b) => a.date.localeCompare(b.date)).map(r => (
                  <div key={r.id} className="bg-warning/5 border border-warning/20 rounded-xl p-3 space-y-1">
                    <p className="font-bold text-foreground text-sm">📅 {new Date(r.date).toLocaleDateString('ar-EG-u-nu-latn', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                    <div className="flex justify-between text-xs text-muted-foreground"><span>🕐 حضور: {r.checkIn}</span><span>🕐 انصراف: {r.checkOut}</span></div>
                    <p className="text-xs text-warning font-medium">⏱ {formatTime(r.hoursWorked || 0)}</p>
                    <RecordActions record={r} />
                  </div>
                ))}</div>
              );
            }

            return null;
          })()}
        </DialogContent>
      </Dialog>

      {/* Edit Record Dialog */}
      <Dialog open={editRecord !== null} onOpenChange={(open) => { if (!open) setEditRecord(null); }}>
        <DialogContent className="max-w-sm" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-center">تعديل سجل الحضور</DialogTitle>
          </DialogHeader>
          {editRecord && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground text-center">
                {editRecord.workerName} - {new Date(editRecord.date).toLocaleDateString('ar-EG-u-nu-latn', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
              <select
                value={editForm.type}
                onChange={e => setEditForm({ ...editForm, type: e.target.value as any })}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
              >
                <option value="present">حاضر</option>
                <option value="absent">غائب</option>
                <option value="leave">إجازة</option>
              </select>
              {editForm.type === 'present' && (
                <>
                  <select
                    value={editForm.shift}
                    onChange={e => setEditForm({ ...editForm, shift: e.target.value as 'morning' | 'evening' })}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
                  >
                    <option value="morning">☀️ صباحي</option>
                    <option value="evening">🌙 مسائي</option>
                  </select>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="text-sm text-muted-foreground mb-1 block">وقت الحضور</label>
                      <Input type="time" step="1" value={editForm.checkIn} onChange={e => setEditForm({ ...editForm, checkIn: e.target.value })} />
                    </div>
                    <div className="flex-1">
                      <label className="text-sm text-muted-foreground mb-1 block">وقت الانصراف</label>
                      <Input type="time" step="1" value={editForm.checkOut} onChange={e => setEditForm({ ...editForm, checkOut: e.target.value })} />
                    </div>
                  </div>
                  {editForm.checkIn && editForm.checkOut && (
                    <div className="bg-info/10 rounded-lg p-2 text-center">
                      <p className="text-sm font-medium text-info">⏱ {formatHoursDetailed(calcHours(editForm.checkIn, editForm.checkOut))}</p>
                    </div>
                  )}
                </>
              )}
              <DialogFooter className="flex gap-2 sm:justify-center">
                <Button onClick={saveEditRecord} className="flex-1 cafe-gradient text-primary-foreground">
                  <Save size={16} className="ml-1" /> حفظ
                </Button>
                <Button variant="outline" className="flex-1" onClick={() => setEditRecord(null)}>إلغاء</Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Password Confirm */}
      <PasswordConfirmDialog
        open={showDeletePassword}
        onOpenChange={(open) => { if (!open) { setShowDeletePassword(false); setDeleteRecordId(null); } }}
        onConfirm={confirmDeleteRecord}
        title="حذف سجل حضور"
        description="أدخل كلمة المرور لتأكيد الحذف"
      />

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
