import { useState } from 'react';
import { motion } from 'framer-motion';
import { Lock, User, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getWorkers, setCurrentUser, getAttendance, setAttendance } from '@/lib/store';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import logo from '@/assets/logo.jpg';

const Login = () => {
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const autoCheckIn = (worker: { id: string; name: string; role: string }) => {
    const today = new Date().toISOString().slice(0, 10);
    const attendance = getAttendance();
    // Check if already has attendance record today (present with check-in)
    const existingRecord = attendance.find(
      a => a.workerId === worker.id && a.date === today && a.type === 'present' && a.checkIn
    );
    if (existingRecord) return; // Already checked in today

    const now = new Date();
    const hour = now.getHours();
    const shift: 'morning' | 'evening' = hour < 14 ? 'morning' : 'evening';
    const checkInTime = now.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });

    const newRecord = {
      id: Date.now().toString(),
      workerId: worker.id,
      workerName: worker.name,
      date: today,
      checkIn: checkInTime,
      checkOut: null as string | null,
      type: 'present' as const,
      shift,
      hoursWorked: 0,
    };

    const updatedAttendance = [...attendance, newRecord];
    setAttendance(updatedAttendance);
    toast.success(
      `✅ بداية شيفت جديد!`, 
      { 
        description: `مرحباً ${worker.name} — شيفت ${shift === 'morning' ? '☀️ صباحي' : '🌙 مسائي'}\nوقت الحضور: ${checkInTime}\nيوم: ${new Date().toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`,
        duration: 6000 
      }
    );
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const workers = getWorkers();
    const worker = workers.find(w => (w.name === name || w.id === name) && w.password === password);
    if (worker) {
      setCurrentUser(worker);
      // Auto check-in for workers (and admins)
      autoCheckIn(worker);
      navigate('/');
    } else {
      setError('اسم المستخدم أو كلمة المرور غير صحيحة');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="glass-card rounded-2xl p-8 space-y-6">
          {/* Header */}
          <div className="text-center space-y-4">
            <img src={logo} alt="بن العميد" className="w-24 h-24 mx-auto rounded-full shadow-lg object-cover" />
            <div>
              <h1 className="text-3xl font-bold text-foreground">بن العميد</h1>
              <p className="text-muted-foreground mt-1">نظام إدارة الكافيه</p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="relative">
              <User size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="اسم المستخدم"
                value={name}
                onChange={e => setName(e.target.value)}
                className="pr-10 text-right"
              />
            </div>
            <div className="relative">
              <Lock size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="كلمة المرور"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="pr-10 pl-10 text-right"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {error && (
              <p className="text-sm text-destructive text-center">{error}</p>
            )}
            <Button type="submit" className="w-full cafe-gradient text-primary-foreground hover:opacity-90 transition-opacity">
              تسجيل الدخول
            </Button>
          </form>

        </div>
      </motion.div>
    </div>
  );
};

export default Login;
