import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Settings, Download, Upload, Mail, MessageCircle, Calendar, Clock, CheckCircle2, ShieldCheck, AlertTriangle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { getSales, getProducts, getInventory, getWorkers, getAttendance, getExpenses, getTransactions, getCurrentUser, getLastAutoBackupTime, downloadAutoBackup, performAutoBackup, syncLocalStorageToCloud } from '@/lib/store';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

type BackupFrequency = 'daily' | 'weekly' | 'monthly';
type ShareMethod = 'pdf' | 'email' | 'whatsapp';

const BACKUP_STORAGE_KEYS = [
  'cafe_products', 'cafe_sales', 'cafe_inventory', 'cafe_workers',
  'cafe_attendance', 'cafe_categories', 'cafe_transactions', 'cafe_expenses',
];

const SettingsPage = () => {
  const [frequency, setFrequency] = useState<BackupFrequency>('daily');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [pendingRestore, setPendingRestore] = useState<Record<string, any> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const currentUser = getCurrentUser();

  const getDateRange = () => {
    const now = new Date();
    const start = new Date();
    if (frequency === 'daily') start.setDate(now.getDate() - 1);
    else if (frequency === 'weekly') start.setDate(now.getDate() - 7);
    else start.setMonth(now.getMonth() - 1);
    return { start, end: now };
  };

  const generateReportContent = () => {
    const { start, end } = getDateRange();
    const sales = getSales().filter(s => {
      const d = new Date(s.date);
      return d >= start && d <= end;
    });
    const products = getProducts();
    const inventory = getInventory();
    const workers = getWorkers();
    const attendance = getAttendance().filter(a => {
      const d = new Date(a.date);
      return d >= start && d <= end;
    });
    const expenses = getExpenses().filter(e => {
      const d = new Date(e.date);
      return d >= start && d <= end;
    });
    const transactions = getTransactions().filter(t => {
      const d = new Date(t.date);
      return d >= start && d <= end;
    });

    const totalSales = sales.reduce((s, sale) => s + sale.total, 0);
    const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
    const totalAdvances = transactions.filter(t => t.type === 'advance').reduce((s, t) => s + t.amount, 0);
    const inventoryValue = inventory.reduce((s, i) => s + i.quantity * i.costPerUnit, 0);
    const periodLabel = frequency === 'daily' ? 'يومي' : frequency === 'weekly' ? 'أسبوعي' : 'شهري';

    return {
      title: `تقرير ${periodLabel} - بن العميد`,
      date: `من ${start.toLocaleDateString('ar-EG')} إلى ${end.toLocaleDateString('ar-EG')}`,
      sections: [
        { label: '💰 إجمالي المبيعات', value: `${totalSales.toFixed(0)} ج.م`, detail: `${sales.length} عملية بيع` },
        { label: '📊 إجمالي المصروفات', value: `${totalExpenses.toFixed(0)} ج.م`, detail: `${expenses.length} مصروف` },
        { label: '💵 السلف المدفوعة', value: `${totalAdvances.toFixed(0)} ج.م`, detail: '' },
        { label: '📦 قيمة المخزون', value: `${inventoryValue.toFixed(0)} ج.م`, detail: `${inventory.length} صنف` },
        { label: '👥 عدد العمال', value: `${workers.length}`, detail: '' },
        { label: '✅ أيام الحضور', value: `${attendance.filter(a => a.type === 'present').length}`, detail: `غياب: ${attendance.filter(a => a.type === 'absent').length}` },
        { label: '📈 صافي الربح', value: `${(totalSales - totalExpenses - totalAdvances).toFixed(0)} ج.م`, detail: '' },
      ],
      salesDetails: sales.slice(0, 20).map(s => `${s.date} - ${s.workerName} - ${s.total} ج.م`),
      expenseDetails: expenses.map(e => `${e.date} - ${e.name} - ${e.amount} ج.م`),
    };
  };

  const handlePDF = () => {
    setIsGenerating(true);
    const report = generateReportContent();

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast({ title: 'خطأ', description: 'فعّل النوافذ المنبثقة في المتصفح', variant: 'destructive' });
      setIsGenerating(false);
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <title>${report.title}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap');
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Cairo', sans-serif; padding: 40px; background: #fff; color: #333; direction: rtl; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #8B5E3C; padding-bottom: 20px; }
          .header h1 { font-size: 24px; color: #8B5E3C; }
          .header p { color: #666; margin-top: 5px; }
          .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin: 20px 0; }
          .card { background: #f9f5f0; border: 1px solid #e0d5c8; border-radius: 12px; padding: 16px; text-align: center; }
          .card .label { font-size: 13px; color: #666; }
          .card .value { font-size: 22px; font-weight: 700; color: #8B5E3C; margin: 5px 0; }
          .card .detail { font-size: 11px; color: #999; }
          .section { margin-top: 25px; }
          .section h3 { font-size: 16px; color: #8B5E3C; margin-bottom: 10px; border-bottom: 1px solid #e0d5c8; padding-bottom: 5px; }
          .section p { font-size: 13px; line-height: 1.8; color: #555; }
          .footer { text-align: center; margin-top: 40px; color: #999; font-size: 11px; border-top: 1px solid #e0d5c8; padding-top: 15px; }
          @media print { body { padding: 20px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>☕ ${report.title}</h1>
          <p>${report.date}</p>
        </div>
        <div class="grid">
          ${report.sections.map(s => `
            <div class="card">
              <div class="label">${s.label}</div>
              <div class="value">${s.value}</div>
              ${s.detail ? `<div class="detail">${s.detail}</div>` : ''}
            </div>
          `).join('')}
        </div>
        ${report.salesDetails.length > 0 ? `
          <div class="section">
            <h3>📋 تفاصيل المبيعات</h3>
            ${report.salesDetails.map(d => `<p>${d}</p>`).join('')}
          </div>
        ` : ''}
        ${report.expenseDetails.length > 0 ? `
          <div class="section">
            <h3>📋 تفاصيل المصروفات</h3>
            ${report.expenseDetails.map(d => `<p>${d}</p>`).join('')}
          </div>
        ` : ''}
        <div class="footer">
          <p>بن العميد - تنفيذ InstaTech للبرمجيات - 01227080430</p>
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
      setIsGenerating(false);
    }, 500);

    toast({ title: '✅ تم', description: 'تم إنشاء التقرير' });
  };

  const handleShare = (method: ShareMethod) => {
    const report = generateReportContent();
    const text = `${report.title}\n${report.date}\n\n${report.sections.map(s => `${s.label}: ${s.value}`).join('\n')}\n\nبن العميد ☕`;

    if (method === 'pdf') {
      handlePDF();
    } else if (method === 'whatsapp') {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
      toast({ title: '✅', description: 'تم فتح الواتساب' });
    } else if (method === 'email') {
      window.open(`mailto:?subject=${encodeURIComponent(report.title)}&body=${encodeURIComponent(text)}`, '_blank');
      toast({ title: '✅', description: 'تم فتح البريد' });
    }
  };

  // === Backup & Restore ===
  const handleBackupDownload = () => {
    const backupData: Record<string, any> = {};
    BACKUP_STORAGE_KEYS.forEach(key => {
      const val = localStorage.getItem(key);
      if (val) backupData[key] = JSON.parse(val);
    });
    backupData._meta = {
      version: 1,
      date: new Date().toISOString(),
      app: 'بن العميد',
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup-بن-العميد-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: '✅ تم', description: 'تم تحميل النسخة الاحتياطية بنجاح' });
  };

  const handleRestoreClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        if (!data._meta || !data.cafe_products) {
          toast({ title: '❌ خطأ', description: 'الملف مش ملف نسخة احتياطية صحيح', variant: 'destructive' });
          return;
        }
        setPendingRestore(data);
        setShowRestoreConfirm(true);
      } catch {
        toast({ title: '❌ خطأ', description: 'الملف تالف أو مش صحيح', variant: 'destructive' });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const confirmRestore = async () => {
    if (!pendingRestore) return;
    BACKUP_STORAGE_KEYS.forEach(key => {
      if (pendingRestore[key]) {
        localStorage.setItem(key, JSON.stringify(pendingRestore[key]));
      }
    });
    // Also handle returns and returns_log if present in backup
    if (pendingRestore['cafe_returns']) {
      localStorage.setItem('cafe_returns', JSON.stringify(pendingRestore['cafe_returns']));
    }
    if (pendingRestore['cafe_returns_log']) {
      localStorage.setItem('cafe_returns_log', JSON.stringify(pendingRestore['cafe_returns_log']));
    }
    setPendingRestore(null);
    setShowRestoreConfirm(false);
    toast({ title: '⏳ جاري الرفع', description: 'جاري رفع البيانات للسحاب...' });
    const success = await syncLocalStorageToCloud();
    if (success) {
      toast({ title: '✅ تم الاستعادة', description: 'تم استعادة البيانات ورفعها للسحاب بنجاح. جاري إعادة التحميل...' });
    } else {
      toast({ title: '⚠️ تم الاستعادة محلياً', description: 'تم استعادة البيانات محلياً لكن فشل الرفع للسحاب. حاول مرة أخرى.', variant: 'destructive' });
    }
    setTimeout(() => window.location.reload(), 1500);
  };

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Settings className="text-accent" size={28} />
          الإعدادات
        </h1>
      </motion.div>

      {/* Backup & Share Section */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card rounded-2xl p-5 space-y-5">
        <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
          <Download size={20} className="text-accent" />
          النسخ الاحتياطي والمشاركة
        </h2>

        {/* Frequency Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground flex items-center gap-2">
            <Calendar size={16} className="text-muted-foreground" />
            فترة التقرير
          </label>
          <Select value={frequency} onValueChange={(v) => setFrequency(v as BackupFrequency)}>
            <SelectTrigger className="w-full bg-secondary">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">
                <span className="flex items-center gap-2"><Clock size={14} /> يومي</span>
              </SelectItem>
              <SelectItem value="weekly">
                <span className="flex items-center gap-2"><Calendar size={14} /> أسبوعي</span>
              </SelectItem>
              <SelectItem value="monthly">
                <span className="flex items-center gap-2"><Calendar size={14} /> شهري</span>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 gap-3">
          <Button
            onClick={() => handleShare('pdf')}
            disabled={isGenerating}
            className="cafe-gradient text-primary-foreground h-12 text-sm font-bold gap-2"
          >
            <Download size={18} />
            {isGenerating ? 'جاري الإنشاء...' : 'تحميل تقرير PDF'}
          </Button>

          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={() => handleShare('whatsapp')}
              variant="outline"
              className="h-12 text-sm font-medium gap-2 border-success/30 text-success hover:bg-success/10"
            >
              <MessageCircle size={18} />
              واتساب
            </Button>
            <Button
              onClick={() => handleShare('email')}
              variant="outline"
              className="h-12 text-sm font-medium gap-2 border-info/30 text-info hover:bg-info/10"
            >
              <Mail size={18} />
              بريد إلكتروني
            </Button>
          </div>
        </div>

        <div className="bg-secondary/50 rounded-xl p-3 flex items-start gap-2">
          <CheckCircle2 size={16} className="text-accent mt-0.5 shrink-0" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            التقرير يشمل: المبيعات، المصروفات، الأرباح، المخزون، الحضور، والسلف.
          </p>
        </div>
      </motion.div>

      {/* Data Backup & Restore Section */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card rounded-2xl p-5 space-y-5">
        <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
          <ShieldCheck size={20} className="text-accent" />
          النسخ الاحتياطي للبيانات
        </h2>

        <p className="text-sm text-muted-foreground">
          احفظ نسخة من كل بيانات السيستم (منتجات، مبيعات، مخزون، عمال، حضور، مصروفات) واستعيدها في أي وقت.
        </p>

        <div className="grid grid-cols-1 gap-3">
          <Button
            onClick={handleBackupDownload}
            className="cafe-gradient text-primary-foreground h-12 text-sm font-bold gap-2"
          >
            <Download size={18} />
            حفظ نسخة احتياطية (JSON)
          </Button>

          <Button
            onClick={handleRestoreClick}
            variant="outline"
            className="h-12 text-sm font-bold gap-2 border-accent/30 text-accent hover:bg-accent/10"
          >
            <Upload size={18} />
            استعادة نسخة احتياطية
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={handleFileSelect}
          />
        </div>

        <div className="bg-warning/10 rounded-xl p-3 flex items-start gap-2">
          <AlertTriangle size={16} className="text-warning mt-0.5 shrink-0" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            عند الاستعادة، هيتم استبدال كل البيانات الحالية بالبيانات الموجودة في النسخة الاحتياطية. تأكد إنك محتفظ بنسخة حديثة قبل الاستعادة.
          </p>
        </div>
      </motion.div>

      {/* Auto Backup Section */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="glass-card rounded-2xl p-5 space-y-5">
        <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
          <Clock size={20} className="text-accent" />
          النسخ الاحتياطي التلقائي
        </h2>

        <div className="bg-success/10 rounded-xl p-4 flex items-start gap-3">
          <CheckCircle2 size={20} className="text-success mt-0.5 shrink-0" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">النسخ التلقائي مُفعّل ✅</p>
            <p className="text-xs text-muted-foreground">
              يتم حفظ نسخة احتياطية تلقائياً كل 24 ساعة عند فتح التطبيق.
            </p>
            {getLastAutoBackupTime() && (
              <p className="text-xs text-muted-foreground mt-1">
                آخر نسخة تلقائية: <span className="font-bold text-foreground">{new Date(getLastAutoBackupTime()!).toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' })}</span>
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Button
            onClick={() => {
              performAutoBackup();
              toast({ title: '✅ تم', description: 'تم حفظ نسخة احتياطية تلقائية الآن' });
              // force re-render
              window.dispatchEvent(new Event('storage'));
            }}
            variant="outline"
            className="h-12 text-sm font-medium gap-2 border-accent/30 text-accent hover:bg-accent/10"
          >
            <ShieldCheck size={18} />
            نسخ الآن
          </Button>
          <Button
            onClick={() => {
              // If no auto backup exists yet, perform one first
              if (!getLastAutoBackupTime()) {
                performAutoBackup();
              }
              const ok = downloadAutoBackup();
              if (ok) toast({ title: '✅ تم', description: 'تم تحميل آخر نسخة تلقائية' });
              else toast({ title: '❌', description: 'حدث خطأ أثناء التحميل', variant: 'destructive' });
            }}
            variant="outline"
            className="h-12 text-sm font-medium gap-2 border-info/30 text-info hover:bg-info/10"
          >
            <Download size={18} />
            تحميل النسخة
          </Button>
        </div>
      </motion.div>

      {currentUser?.role === 'admin' && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card rounded-2xl p-5 space-y-5 border border-destructive/20">
          <h2 className="text-lg font-bold text-destructive flex items-center gap-2">
            <RotateCcw size={20} />
            إعادة تعيين النظام
          </h2>

          <p className="text-sm text-muted-foreground">
            حذف جميع البيانات (منتجات، مبيعات، مخزون، عمال، حضور، مصروفات، سلف، مكافآت) وإرجاع السيستم للوضع الافتراضي. العملية دي مش ممكن التراجع عنها!
          </p>

          <Button
            onClick={() => setShowResetConfirm(true)}
            variant="destructive"
            className="w-full h-12 text-sm font-bold gap-2"
          >
            <RotateCcw size={18} />
            تصفير النظام بالكامل
          </Button>

          <div className="bg-destructive/10 rounded-xl p-3 flex items-start gap-2">
            <AlertTriangle size={16} className="text-destructive mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              تحذير: ده هيمسح كل البيانات نهائياً. ننصحك تاخد نسخة احتياطية قبل ما تعمل تصفير.
            </p>
          </div>
        </motion.div>
      )}

      {/* Restore Confirmation Dialog */}
      <AlertDialog open={showRestoreConfirm} onOpenChange={setShowRestoreConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle size={20} className="text-warning" />
              تأكيد الاستعادة
            </AlertDialogTitle>
            <AlertDialogDescription className="text-right">
              {pendingRestore?._meta && (
                <span className="block mb-2 text-sm">
                  📅 تاريخ النسخة: {new Date(pendingRestore._meta.date).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
              هل أنت متأكد؟ ده هيستبدل كل البيانات الحالية بالبيانات من النسخة الاحتياطية. العملية دي مش ممكن التراجع عنها.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex gap-2">
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRestore} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              استعادة البيانات
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset Confirmation Dialog */}
      <AlertDialog open={showResetConfirm} onOpenChange={setShowResetConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle size={20} />
              ⚠️ تأكيد تصفير النظام
            </AlertDialogTitle>
            <AlertDialogDescription className="text-right">
              هل أنت متأكد إنك عايز تمسح كل البيانات؟ ده هيرجع السيستم للوضع الافتراضي بالكامل. العملية دي نهائية ومش ممكن التراجع عنها!
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex gap-2">
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                BACKUP_STORAGE_KEYS.forEach(key => localStorage.removeItem(key));
                localStorage.removeItem('cafe_current_user');
                setShowResetConfirm(false);
                toast({ title: '✅ تم التصفير', description: 'تم مسح كل البيانات. جاري إعادة التحميل...' });
                setTimeout(() => window.location.reload(), 1000);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              تصفير النظام
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SettingsPage;
