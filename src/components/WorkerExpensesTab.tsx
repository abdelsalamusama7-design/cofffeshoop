import { useState } from 'react';
import { motion } from 'framer-motion';
import { Wallet, Plus, Trash2, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getCurrentUser, getWorkerExpenses, addWorkerExpense, deleteWorkerExpense, getWorkers } from '@/lib/store';
import { WorkerExpense } from '@/lib/types';
import ScrollableList from '@/components/ScrollableList';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

const WorkerExpensesTab = () => {
  const user = getCurrentUser();
  const [expenses, setExpenses] = useState(getWorkerExpenses());
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState('');

  if (!user) return null;

  const today = new Date().toISOString().split('T')[0];
  const currentMonth = today.substring(0, 7);
  const myExpenses = expenses.filter(e => e.workerId === user.id);
  const todayExpenses = myExpenses.filter(e => e.date === today);
  const monthExpenses = myExpenses.filter(e => e.date.startsWith(currentMonth));
  const todayTotal = todayExpenses.reduce((s, e) => s + e.amount, 0);
  const monthTotal = monthExpenses.reduce((s, e) => s + e.amount, 0);

  const handleAdd = async () => {
    if (!amount || Number(amount) <= 0) {
      toast.error('أدخل مبلغ صحيح');
      return;
    }
    if (!reason.trim()) {
      toast.error('أدخل سبب السحب');
      return;
    }

    const now = new Date();
    const expense: WorkerExpense = {
      id: Date.now().toString(),
      workerId: user.id,
      workerName: user.name,
      amount: Number(amount),
      reason: reason.trim(),
      date: today,
      time: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
    };

    addWorkerExpense(expense);
    setExpenses([...getWorkerExpenses()]);
    setAmount('');
    setReason('');
    setShowAddDialog(false);
    toast.success('تم تسجيل المصروف بنجاح ✅');

    // Send notification to admin
    try {
      await supabase.functions.invoke('send-shift-report', {
        body: {
          reportText: `⚠️ إشعار سحب نقدية\n━━━━━━━━━━━━━━━\n👤 العامل: ${user.name}\n💰 المبلغ: ${expense.amount} ج.م\n📝 السبب: ${expense.reason}\n📅 التاريخ: ${today}\n🕐 الوقت: ${expense.time}\n━━━━━━━━━━━━━━━\nبن العميد ☕`,
          workerName: user.name,
          date: today,
        },
      });
    } catch (err) {
      console.error('Failed to send notification:', err);
    }
  };

  const handleDelete = () => {
    if (!deleteId) return;
    const workers = getWorkers();
    const worker = workers.find(w => w.id === user.id && w.password === deletePassword);
    if (!worker) {
      setDeleteError('كلمة المرور غير صحيحة');
      return;
    }
    deleteWorkerExpense(deleteId);
    setExpenses([...getWorkerExpenses()]);
    setDeleteId(null);
    setDeletePassword('');
    setDeleteError('');
    toast.success('تم حذف المصروف ✅');
  };

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-destructive/10 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-destructive">{todayTotal}</p>
          <p className="text-xs text-muted-foreground">ج.م مصروفات اليوم</p>
        </div>
        <div className="bg-primary/10 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-primary">{monthTotal}</p>
          <p className="text-xs text-muted-foreground">ج.م مصروفات الشهر</p>
        </div>
      </div>

      {/* Add Button */}
      <Button
        onClick={() => setShowAddDialog(true)}
        className="w-full cafe-gradient text-primary-foreground h-12"
      >
        <Plus size={20} className="ml-2" />
        تسجيل مصروف جديد
      </Button>

      {/* Expenses List */}
      {todayExpenses.length > 0 ? (
        <div>
          <p className="text-sm font-bold text-muted-foreground mb-2">مصروفات اليوم</p>
          <ScrollableList className="space-y-2">
            {todayExpenses.sort((a, b) => b.time.localeCompare(a.time)).map(exp => (
              <motion.div
                key={exp.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-muted/30 rounded-lg p-3 flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <Wallet size={16} className="text-destructive" />
                  <div>
                    <p className="text-sm font-medium text-foreground">{exp.reason}</p>
                    <p className="text-xs text-muted-foreground">{exp.time}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <p className="font-bold text-sm text-destructive">-{exp.amount} ج.م</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-destructive/50 hover:text-destructive"
                    onClick={() => setDeleteId(exp.id)}
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              </motion.div>
            ))}
          </ScrollableList>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground text-center py-4">لا توجد مصروفات اليوم</p>
      )}

      {/* Monthly History */}
      {monthExpenses.filter(e => e.date !== today).length > 0 && (
        <div>
          <p className="text-sm font-bold text-muted-foreground mb-2">مصروفات سابقة هذا الشهر</p>
          <ScrollableList className="space-y-2">
            {monthExpenses
              .filter(e => e.date !== today)
              .sort((a, b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time))
              .map(exp => (
                <div key={exp.id} className="bg-muted/20 rounded-lg p-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">{exp.reason}</p>
                    <p className="text-xs text-muted-foreground">{exp.date} • {exp.time}</p>
                  </div>
                  <p className="font-bold text-sm text-destructive">-{exp.amount} ج.م</p>
                </div>
              ))}
          </ScrollableList>
        </div>
      )}

      {/* Add Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-sm" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-lg flex items-center gap-2 justify-center">
              <Wallet size={20} />
              تسجيل مصروف
            </DialogTitle>
            <DialogDescription className="text-center">
              سجّل أي مبلغ تم سحبه من الصندوق مع توضيح السبب
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">المبلغ (ج.م)</label>
              <Input
                type="number"
                placeholder="0"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                className="text-right text-lg"
                autoFocus
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">سبب السحب</label>
              <Input
                type="text"
                placeholder="مثال: مشتريات، أكل، مواصلات..."
                value={reason}
                onChange={e => setReason(e.target.value)}
                className="text-right"
              />
            </div>
            <DialogFooter className="flex gap-2 justify-center sm:justify-center">
              <Button onClick={handleAdd} className="cafe-gradient text-primary-foreground">تسجيل</Button>
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>إلغاء</Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteId} onOpenChange={(open) => { if (!open) { setDeleteId(null); setDeletePassword(''); setDeleteError(''); } }}>
        <DialogContent className="max-w-sm" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-lg flex items-center gap-2 justify-center">
              <Trash2 size={20} className="text-destructive" />
              حذف المصروف
            </DialogTitle>
            <DialogDescription className="text-center">أدخل كلمة المرور لتأكيد الحذف</DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); handleDelete(); }} className="space-y-4 mt-2">
            <div className="relative">
              <Lock size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="password"
                placeholder="كلمة المرور"
                value={deletePassword}
                onChange={e => setDeletePassword(e.target.value)}
                className="pr-10 text-right"
                autoFocus
              />
            </div>
            {deleteError && <p className="text-sm text-destructive text-center">{deleteError}</p>}
            <DialogFooter className="flex gap-2 justify-center sm:justify-center">
              <Button type="submit" variant="destructive">تأكيد الحذف</Button>
              <Button type="button" variant="outline" onClick={() => { setDeleteId(null); setDeletePassword(''); setDeleteError(''); }}>إلغاء</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WorkerExpensesTab;
