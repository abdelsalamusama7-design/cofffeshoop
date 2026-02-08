import { useState } from 'react';
import { motion } from 'framer-motion';
import { Users, Plus, Trash2, Key, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getWorkers, setWorkers, getCurrentUser } from '@/lib/store';
import { Worker } from '@/lib/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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

export default Workers;
