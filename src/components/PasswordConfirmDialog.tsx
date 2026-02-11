import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Lock } from 'lucide-react';
import { getCurrentUser, getWorkers } from '@/lib/store';

interface PasswordConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  title?: string;
  description?: string;
}

const PasswordConfirmDialog = ({
  open,
  onOpenChange,
  onConfirm,
  title = 'تأكيد العملية',
  description = 'أدخل كلمة المرور للمتابعة',
}: PasswordConfirmDialogProps) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const user = getCurrentUser();
    if (!user) return;
    const worker = getWorkers().find(w => w.id === user.id);
    if (worker && worker.password === password) {
      setPassword('');
      setError('');
      onConfirm();
      onOpenChange(false);
    } else {
      setError('كلمة المرور غير صحيحة');
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { setPassword(''); setError(''); } onOpenChange(v); }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 justify-center">
            <Lock size={20} />
            {title}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-sm text-muted-foreground text-center">{description}</p>
          <Input
            type="password"
            placeholder="كلمة المرور"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(''); }}
            autoFocus
            className="text-center"
          />
          {error && <p className="text-destructive text-sm text-center">{error}</p>}
          <DialogFooter className="flex gap-2 sm:justify-center">
            <Button type="submit" className="flex-1 cafe-gradient text-primary-foreground">تأكيد</Button>
            <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>إلغاء</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default PasswordConfirmDialog;
