import { useState } from 'react';
import { motion } from 'framer-motion';
import { Lock, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getWorkers, setCurrentUser } from '@/lib/store';
import { useNavigate } from 'react-router-dom';
import logo from '@/assets/logo.jpg';

const Login = () => {
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const workers = getWorkers();
    const worker = workers.find(w => w.name === name && w.password === password);
    if (worker) {
      setCurrentUser(worker);
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
                type="password"
                placeholder="كلمة المرور"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="pr-10 text-right"
              />
            </div>
            {error && (
              <p className="text-sm text-destructive text-center">{error}</p>
            )}
            <Button type="submit" className="w-full cafe-gradient text-primary-foreground hover:opacity-90 transition-opacity">
              تسجيل الدخول
            </Button>
          </form>

          <div className="text-center text-xs text-muted-foreground space-y-1">
            <p>المدير: المدير / admin123</p>
            <p>العامل: أحمد / 1234</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
