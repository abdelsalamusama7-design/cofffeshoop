import { useState, useRef, useEffect } from 'react';
import ScrollableList from '@/components/ScrollableList';
import { motion } from 'framer-motion';
import { Settings, Download, Upload, Mail, MessageCircle, Calendar, Clock, CheckCircle2, ShieldCheck, AlertTriangle, RotateCcw, Circle, Smartphone, Share, Plus, Chrome, MoreVertical } from 'lucide-react';

const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
const isAndroid = () => /android/i.test(navigator.userAgent);
const isInstalledPWA = () =>
  ('standalone' in window.navigator && (window.navigator as any).standalone) ||
  window.matchMedia('(display-mode: standalone)').matches;
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { getSales, getProducts, getInventory, getWorkers, getAttendance, getExpenses, getTransactions, getCurrentUser, syncLocalStorageToCloud } from '@/lib/store';
import { supabase } from '@/integrations/supabase/client';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { getLastBackupTime, getBackupStatus, createBackup, restoreLatestBackup, restoreBackupById, resetLocalSystem, listBackups, type BackupInfo } from '@/lib/backupService';

type BackupFrequency = 'daily' | 'weekly' | 'monthly';
type ShareMethod = 'pdf' | 'email' | 'whatsapp';

const BACKUP_STORAGE_KEYS = [
  'cafe_products', 'cafe_sales', 'cafe_inventory', 'cafe_workers',
  'cafe_attendance', 'cafe_categories', 'cafe_transactions', 'cafe_expenses',
  'cafe_worker_expenses',
];

const BackupStatusIndicator = () => {
  const [status, setStatus] = useState(getBackupStatus());
  useEffect(() => {
    const interval = setInterval(() => setStatus(getBackupStatus()), 30000);
    return () => clearInterval(interval);
  }, []);
  const color = status === 'ok' ? 'text-success' : status === 'warning' ? 'text-warning' : 'text-destructive';
  const title = status === 'ok' ? 'النسخ يعمل بشكل طبيعي' : status === 'warning' ? 'لم يتم النسخ بعد' : 'فشل النسخ لأكثر من ساعتين!';
  return <Circle size={10} className={`${color} fill-current`} aria-label={title} />;
};

const SettingsPage = () => {
  const [frequency, setFrequency] = useState<BackupFrequency>('daily');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [pendingRestore, setPendingRestore] = useState<Record<string, any> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const currentUser = getCurrentUser();
  const [isRestoring, setIsRestoring] = useState(false);
  const [showBackupList, setShowBackupList] = useState(false);
  const [backupList, setBackupList] = useState<BackupInfo[]>([]);
  const [loadingBackups, setLoadingBackups] = useState(false);
  const [selectedBackupId, setSelectedBackupId] = useState<string | null>(null);
  const [showBackupRestoreConfirm, setShowBackupRestoreConfirm] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [appInstalled, setAppInstalled] = useState(() => isInstalledPWA());
  const [showInstallGuide, setShowInstallGuide] = useState(false);

  useEffect(() => {
    if (isInstalledPWA()) { setAppInstalled(true); return; }
    const handler = (e: Event) => { e.preventDefault(); setInstallPrompt(e); };
    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => setAppInstalled(true));
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (installPrompt) {
      installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      if (outcome === 'accepted') { setInstallPrompt(null); setAppInstalled(true); }
    } else {
      setShowInstallGuide(true);
    }
  };

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
      window.open(`mailto:alameedbon1@gmail.com?subject=${encodeURIComponent(report.title)}&body=${encodeURIComponent(text)}`, '_blank');
      toast({ title: '✅', description: 'تم فتح البريد' });
    }
  };

  // === Backup & Restore ===
  const handleBackupDownload = async () => {
    const backupData: Record<string, any> = {};
    BACKUP_STORAGE_KEYS.forEach(key => {
      const val = localStorage.getItem(key);
      if (val) backupData[key] = JSON.parse(val);
    });
    // Also include returns and returns_log
    const returnsVal = localStorage.getItem('cafe_returns');
    if (returnsVal) backupData['cafe_returns'] = JSON.parse(returnsVal);
    const returnsLogVal = localStorage.getItem('cafe_returns_log');
    if (returnsLogVal) backupData['cafe_returns_log'] = JSON.parse(returnsLogVal);

    backupData._meta = {
      version: 1,
      date: new Date().toISOString(),
      app: 'بن العميد',
    };

    // Save to cloud
    const user = getCurrentUser();
    await (supabase.from('backups') as any).upsert({
      id: 'latest',
      backup_data: backupData,
      created_by: user?.name || 'غير معروف',
    }, { onConflict: 'id' });

    // Also download as file
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `نسخه احتياطيه العميد ${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: '✅ تم', description: 'تم حفظ النسخة الاحتياطية في السحاب وتحميلها' });
  };


  const handleRestoreClick = async () => {
    setIsRestoring(true);
    try {
      const { data, error } = await (supabase.from('backups') as any).select('backup_data, created_at, created_by').eq('id', 'latest').maybeSingle();
      if (error || !data) {
        toast({ title: '❌ لا توجد نسخة', description: 'لا توجد نسخة احتياطية محفوظة في السحاب. احفظ نسخة أولاً.', variant: 'destructive' });
        setIsRestoring(false);
        return;
      }
      setPendingRestore(data.backup_data);
      setShowRestoreConfirm(true);
    } catch {
      toast({ title: '❌ خطأ', description: 'فشل تحميل النسخة الاحتياطية من السحاب', variant: 'destructive' });
    }
    setIsRestoring(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        // Validate: must have _meta and at least one data key
        const hasData = ['cafe_products', 'cafe_workers', 'cafe_sales', 'cafe_inventory', 'cafe_attendance', 'cafe_expenses']
          .some(k => data[k] && Array.isArray(data[k]));
        if (!data._meta || !hasData) {
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

    // Step 1: Write to localStorage immediately (works offline)
    const ALL_RESTORE_KEYS = [
      ...BACKUP_STORAGE_KEYS,
      'cafe_returns', 'cafe_returns_log',
    ];
    ALL_RESTORE_KEYS.forEach(key => {
      if (pendingRestore[key] !== undefined) {
        localStorage.setItem(key, JSON.stringify(pendingRestore[key]));
      }
    });

    // Always enforce the permanent admin account after restore
    const workersKey = 'cafe_workers';
    const restoredWorkers: any[] = JSON.parse(localStorage.getItem(workersKey) || '[]');
    const adminIdx = restoredWorkers.findIndex((w: any) => w.id === 'admin');
    const permanentAdmin = { id: 'admin', name: 'admin', role: 'admin', password: 'admin1234', salary: 0 };
    if (adminIdx === -1) {
      restoredWorkers.unshift(permanentAdmin);
    } else {
      restoredWorkers[adminIdx] = { ...restoredWorkers[adminIdx], ...permanentAdmin };
    }
    localStorage.setItem(workersKey, JSON.stringify(restoredWorkers));

    setPendingRestore(null);
    setShowRestoreConfirm(false);

    const isOnline = navigator.onLine;

    if (!isOnline) {
      // Offline: data is saved locally, mark pending sync
      localStorage.setItem('cafe_pending_restore_sync', 'true');
      toast({ title: '✅ تم الاستعادة محلياً', description: 'البيانات اتعادت على الجهاز. هيتم مزامنتها مع السحاب فور اتصالك بالإنترنت.' });
      setTimeout(() => window.location.reload(), 1500);
      return;
    }

    // Step 2: Online — sync to cloud
    toast({ title: '⏳ جاري الرفع', description: 'جاري رفع البيانات للسحاب...' });
    const success = await syncLocalStorageToCloud();
    if (success) {
      localStorage.removeItem('cafe_pending_restore_sync');
      toast({ title: '✅ تم الاستعادة', description: 'تم استعادة البيانات ورفعها للسحاب بنجاح. جاري إعادة التحميل...' });
    } else {
      localStorage.setItem('cafe_pending_restore_sync', 'true');
      toast({ title: '✅ تم الاستعادة محلياً', description: 'البيانات اتعادت على الجهاز. فشل الرفع للسحاب وهيتم تلقائياً عند الاتصال.' });
    }
    setTimeout(() => window.location.reload(), 1500);
  };

  // ---- PWA Install Section (uses state from parent) ----
  const InstallSection = () => (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-2xl p-5 space-y-4">
      <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
        <Smartphone size={20} className="text-primary" />
        تثبيت التطبيق
      </h2>

      {appInstalled ? (
        <div className="flex items-center gap-3 bg-green-500/10 rounded-xl p-4">
          <CheckCircle2 size={22} className="text-green-500 shrink-0" />
          <div>
            <p className="text-sm font-bold text-foreground">التطبيق مثبّت بالفعل ✓</p>
            <p className="text-xs text-muted-foreground mt-0.5">يعمل بدون إنترنت ويحفظ البيانات محلياً</p>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2">
            {[
              { emoji: '📴', label: 'بدون إنترنت' },
              { emoji: '⚡', label: 'سريع جداً' },
              { emoji: '💾', label: 'بيانات محفوظة' },
            ].map(b => (
              <div key={b.label} className="bg-muted/50 rounded-xl p-3 text-center">
                <div className="text-2xl mb-1">{b.emoji}</div>
                <p className="text-[11px] font-medium text-muted-foreground">{b.label}</p>
              </div>
            ))}
          </div>

          <Button onClick={handleInstallClick} className="w-full gap-2" size="lg">
            <Smartphone size={18} />
            {installPrompt ? 'تثبيت التطبيق الآن' : 'عرض تعليمات التثبيت'}
          </Button>

          {!installPrompt && (
            <button onClick={() => setShowInstallGuide(!showInstallGuide)} className="text-xs text-muted-foreground hover:text-foreground transition-colors w-full text-center">
              {showInstallGuide ? 'إخفاء التعليمات ▲' : 'عرض الخطوات خطوة بخطوة ▼'}
            </button>
          )}

          {showInstallGuide && (
            <div className="space-y-2 pt-1">
              {isIOS() ? (
                <>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">iPhone / iPad</p>
                  {[
                    { n: 1, icon: <Share size={14} />, text: 'اضغط على زر المشاركة', sub: 'الأيقونة في أسفل المتصفح (Safari)' },
                    { n: 2, icon: <Plus size={14} />, text: 'اختر "إضافة إلى الشاشة الرئيسية"', sub: 'من قائمة المشاركة' },
                    { n: 3, icon: <Smartphone size={14} />, text: 'اضغط "إضافة"', sub: 'سيظهر التطبيق على شاشتك الرئيسية' },
                  ].map(s => (
                    <div key={s.n} className="flex items-start gap-3 bg-muted/50 rounded-xl p-3">
                      <div className="w-5 h-5 rounded-full bg-primary/15 flex items-center justify-center shrink-0 text-[10px] font-bold text-primary">{s.n}</div>
                      <div className="flex items-center gap-2 flex-1 text-muted-foreground">{s.icon}<div><p className="text-xs font-medium text-foreground">{s.text}</p><p className="text-[11px] text-muted-foreground">{s.sub}</p></div></div>
                    </div>
                  ))}
                </>
              ) : isAndroid() ? (
                <>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Android</p>
                  {[
                    { n: 1, icon: <Chrome size={14} />, text: 'افتح قائمة المتصفح', sub: 'النقاط الثلاث ⋮ في أعلى الشاشة' },
                    { n: 2, icon: <MoreVertical size={14} />, text: 'اختر "إضافة للشاشة الرئيسية"', sub: 'أو "تثبيت التطبيق" إن ظهر' },
                    { n: 3, icon: <Smartphone size={14} />, text: 'اضغط "إضافة"', sub: 'سيظهر التطبيق على شاشتك الرئيسية' },
                  ].map(s => (
                    <div key={s.n} className="flex items-start gap-3 bg-muted/50 rounded-xl p-3">
                      <div className="w-5 h-5 rounded-full bg-primary/15 flex items-center justify-center shrink-0 text-[10px] font-bold text-primary">{s.n}</div>
                      <div className="flex items-center gap-2 flex-1 text-muted-foreground">{s.icon}<div><p className="text-xs font-medium text-foreground">{s.text}</p><p className="text-[11px] text-muted-foreground">{s.sub}</p></div></div>
                    </div>
                  ))}
                </>
              ) : (
                <>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">كمبيوتر</p>
                  {[
                    { n: 1, icon: <Chrome size={14} />, text: 'ابحث عن أيقونة التثبيت', sub: 'في شريط العنوان على اليمين' },
                    { n: 2, icon: <Smartphone size={14} />, text: 'اضغط "تثبيت"', sub: 'سيتم تثبيت التطبيق كبرنامج مستقل' },
                  ].map(s => (
                    <div key={s.n} className="flex items-start gap-3 bg-muted/50 rounded-xl p-3">
                      <div className="w-5 h-5 rounded-full bg-primary/15 flex items-center justify-center shrink-0 text-[10px] font-bold text-primary">{s.n}</div>
                      <div className="flex items-center gap-2 flex-1 text-muted-foreground">{s.icon}<div><p className="text-xs font-medium text-foreground">{s.text}</p><p className="text-[11px] text-muted-foreground">{s.sub}</p></div></div>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </>
      )}
    </motion.div>
  );

  return (
    <div className="space-y-6">
      {/* PWA Install Section */}
      <InstallSection />
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
            disabled={isRestoring}
            variant="outline"
            className="h-12 text-sm font-bold gap-2 border-accent/30 text-accent hover:bg-accent/10"
          >
            <Upload size={18} />
            {isRestoring ? 'جاري التحميل من السحاب...' : 'استعادة نسخة احتياطية من السحاب'}
          </Button>

          <Button
            onClick={() => fileInputRef.current?.click()}
            variant="outline"
            className="h-12 text-sm font-bold gap-2 border-primary/30 text-primary hover:bg-primary/10"
          >
            <Upload size={18} />
            استعادة من ملف JSON (جهازك)
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
          {/* Status indicator */}
          <BackupStatusIndicator />
        </h2>

        <div className="bg-success/10 rounded-xl p-4 flex items-start gap-3">
          <CheckCircle2 size={20} className="text-success mt-0.5 shrink-0" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">النسخ التلقائي مُفعّل ✅</p>
            <p className="text-xs text-muted-foreground">
              يتم حفظ نسخة احتياطية تلقائياً كل 60 دقيقة (فقط عند وجود تغييرات). يتم الاحتفاظ بآخر 24 نسخة.
            </p>
            {getLastBackupTime() && (
              <p className="text-xs text-muted-foreground mt-1">
                آخر نسخة: <span className="font-bold text-foreground">{new Date(getLastBackupTime()!).toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' })}</span>
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Button
            onClick={async () => {
              const ok = await createBackup();
              if (ok) toast({ title: '✅ تم', description: 'تم حفظ نسخة احتياطية الآن' });
              else toast({ title: '❌ خطأ', description: 'فشل حفظ النسخة', variant: 'destructive' });
            }}
            variant="outline"
            className="h-12 text-sm font-medium gap-2 border-accent/30 text-accent hover:bg-accent/10"
          >
            <ShieldCheck size={18} />
            نسخ الآن
          </Button>
          <Button
            onClick={async () => {
              setIsRestoring(true);
              const ok = await restoreLatestBackup();
              if (ok) {
                toast({ title: '✅ تم الاستعادة', description: 'تم استعادة آخر نسخة احتياطية. جاري إعادة التحميل...' });
                setTimeout(() => window.location.reload(), 1500);
              } else {
                toast({ title: '❌ لا توجد نسخة', description: 'لا توجد نسخة احتياطية محفوظة', variant: 'destructive' });
              }
              setIsRestoring(false);
            }}
            disabled={isRestoring}
            variant="outline"
            className="h-12 text-sm font-medium gap-2 border-info/30 text-info hover:bg-info/10"
          >
            <Upload size={18} />
            {isRestoring ? 'جاري الاستعادة...' : 'استعادة آخر نسخة'}
          </Button>
        </div>

        {/* Browse all backups */}
        <Button
          onClick={async () => {
            setShowBackupList(!showBackupList);
            if (!showBackupList && backupList.length === 0) {
              setLoadingBackups(true);
              const list = await listBackups();
              setBackupList(list);
              setLoadingBackups(false);
            }
          }}
          variant="outline"
          className="w-full h-10 text-sm font-medium gap-2 border-muted-foreground/20"
        >
          <Clock size={16} />
          {showBackupList ? 'إخفاء قائمة النسخ' : 'عرض كل النسخ المحفوظة'}
        </Button>

        {showBackupList && (
          <ScrollableList maxHeight="max-h-64" className="bg-secondary/30 rounded-xl p-3 space-y-2">
            {loadingBackups ? (
              <p className="text-sm text-muted-foreground text-center py-4">جاري التحميل...</p>
            ) : backupList.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">لا توجد نسخ احتياطية محفوظة</p>
            ) : (
              backupList.map((backup, index) => (
                <div key={backup.id} className="flex items-center justify-between bg-background/60 rounded-lg p-3 border border-border/50">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      {index === 0 ? '🟢 ' : ''}نسخة #{backupList.length - index}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(backup.created_at).toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' })}
                    </p>
                    <p className="text-xs text-muted-foreground/70">بواسطة: {backup.created_by}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="shrink-0 text-xs gap-1 border-info/30 text-info hover:bg-info/10"
                    disabled={isRestoring}
                    onClick={() => {
                      setSelectedBackupId(backup.id);
                      setShowBackupRestoreConfirm(true);
                    }}
                  >
                    <Upload size={14} />
                    استعادة
                  </Button>
                </div>
              ))
            )}
          </ScrollableList>
        )}
      </motion.div>

      {currentUser?.role === 'admin' && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card rounded-2xl p-5 space-y-5 border border-destructive/20">
          <h2 className="text-lg font-bold text-destructive flex items-center gap-2">
            <RotateCcw size={20} />
            تصفير النظام
          </h2>

          <p className="text-sm text-muted-foreground">
            مسح كل البيانات المحلية والسحابية (ماعدا النسخ الاحتياطية). النسخ الاحتياطية تبقى محفوظة في السحاب.
          </p>

          <Button
            onClick={() => setShowResetConfirm(true)}
            variant="destructive"
            className="w-full h-12 text-sm font-bold gap-2"
          >
            <RotateCcw size={18} />
            تصفير النظام
          </Button>

          <div className="bg-destructive/10 rounded-xl p-3 flex items-start gap-2">
            <AlertTriangle size={16} className="text-destructive mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              تحذير: ده هيمسح كل البيانات نهائياً. النسخ الاحتياطية في السحاب مش هتتأثر.
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
              هل أنت متأكد إنك عايز تمسح كل البيانات؟ النسخ الاحتياطية في السحاب مش هتتأثر ويمكنك استعادتها في أي وقت.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex gap-2">
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                try {
                  const ok = await resetLocalSystem();
                  setShowResetConfirm(false);
                  if (ok) {
                    const isOffline = !navigator.onLine;
                    toast({
                      title: '✅ تم التصفير',
                      description: isOffline
                        ? 'تم مسح البيانات محلياً. سيتم مسحها من السحاب فور اتصالك بالإنترنت.'
                        : 'تم مسح كل البيانات (ماعدا النسخ الاحتياطية). جاري إعادة التحميل...',
                    });
                  } else {
                    toast({ title: '❌ خطأ', description: 'حصل مشكلة أثناء التصفير', variant: 'destructive' });
                  }
                  setTimeout(() => window.location.reload(), 1000);
                } catch {
                  toast({ title: '❌ خطأ', description: 'حصل مشكلة أثناء التصفير', variant: 'destructive' });
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              تصفير النظام
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Backup List Restore Confirmation */}
      <AlertDialog open={showBackupRestoreConfirm} onOpenChange={setShowBackupRestoreConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle size={20} className="text-warning" />
              تأكيد استعادة النسخة
            </AlertDialogTitle>
            <AlertDialogDescription className="text-right">
              هل أنت متأكد إنك عايز تستعيد النسخة دي؟ ده هيستبدل كل البيانات الحالية.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex gap-2">
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!selectedBackupId) return;
                setIsRestoring(true);
                setShowBackupRestoreConfirm(false);
                const ok = await restoreBackupById(selectedBackupId);
                if (ok) {
                  toast({ title: '✅ تم الاستعادة', description: 'جاري إعادة التحميل...' });
                  setTimeout(() => window.location.reload(), 1500);
                } else {
                  toast({ title: '❌ خطأ', description: 'فشل استعادة النسخة', variant: 'destructive' });
                }
                setIsRestoring(false);
                setSelectedBackupId(null);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              استعادة
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SettingsPage;
