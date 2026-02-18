import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Smartphone, X, Share, Plus, Chrome, MoreVertical, Download } from 'lucide-react';

const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
const isAndroid = () => /android/i.test(navigator.userAgent);
const isInStandaloneMode = () =>
  ('standalone' in window.navigator && (window.navigator as any).standalone) ||
  window.matchMedia('(display-mode: standalone)').matches;

const InstallPWA = () => {
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [showInstructions, setShowInstructions] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (isInStandaloneMode()) {
      setInstalled(true);
      return;
    }

    // Check if user dismissed before
    const wasDismissed = localStorage.getItem('pwa_install_dismissed');
    if (wasDismissed) {
      setDismissed(true);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => setInstalled(true));
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (installPrompt) {
      installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      if (outcome === 'accepted') {
        setInstallPrompt(null);
        setInstalled(true);
      }
    } else {
      // iOS or manual instructions
      setShowInstructions(true);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem('pwa_install_dismissed', '1');
  };

  // Don't show if already installed
  if (installed) return null;
  // Don't show if dismissed (unless showing instructions manually)
  if (dismissed && !showInstructions) return null;

  const showBanner = installPrompt || isIOS() || isAndroid();

  return (
    <>
      {/* Install Banner */}
      <AnimatePresence>
        {showBanner && !dismissed && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="relative bg-gradient-to-l from-primary/90 to-primary rounded-2xl p-4 flex items-center gap-3 overflow-hidden"
          >
            {/* Background decoration */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute -top-4 -left-4 w-24 h-24 rounded-full bg-primary-foreground" />
              <div className="absolute -bottom-6 -right-6 w-32 h-32 rounded-full bg-primary-foreground" />
            </div>

            <div className="w-10 h-10 rounded-xl bg-primary-foreground/20 flex items-center justify-center shrink-0">
              <Smartphone size={22} className="text-primary-foreground" />
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-primary-foreground">ثبّت التطبيق على جهازك</p>
              <p className="text-xs text-primary-foreground/80 mt-0.5">يعمل بدون إنترنت • سريع • مثل تطبيق أصلي</p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleInstall}
                className="bg-primary-foreground text-primary text-xs font-bold px-3 py-2 rounded-xl hover:opacity-90 transition-opacity flex items-center gap-1.5"
              >
                <Download size={14} />
                تثبيت
              </button>
              <button onClick={handleDismiss} className="p-1 text-primary-foreground/70 hover:text-primary-foreground">
                <X size={16} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Instructions Modal */}
      <AnimatePresence>
        {showInstructions && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={(e) => { if (e.target === e.currentTarget) setShowInstructions(false); }}
          >
            <motion.div
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 60, opacity: 0 }}
              className="bg-card border border-border rounded-3xl p-6 w-full max-w-sm shadow-2xl"
              dir="rtl"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
                    <Smartphone size={22} className="text-primary" />
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground text-base">تثبيت بن العميد</h3>
                    <p className="text-xs text-muted-foreground">خطوات التثبيت</p>
                  </div>
                </div>
                <button onClick={() => setShowInstructions(false)} className="p-2 rounded-xl hover:bg-muted text-muted-foreground">
                  <X size={18} />
                </button>
              </div>

              {/* iOS Instructions */}
              {isIOS() && (
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">iPhone / iPad</p>
                  <Step number={1} icon={<Share size={16} className="text-blue-500" />} text='اضغط على زر "مشاركة"' sub="الأيقونة الموجودة في أسفل المتصفح" />
                  <Step number={2} icon={<Plus size={16} className="text-blue-500" />} text='"إضافة إلى الشاشة الرئيسية"' sub='اختر هذا الخيار من القائمة' />
                  <Step number={3} icon={<Smartphone size={16} className="text-green-500" />} text='اضغط "إضافة"' sub="سيظهر التطبيق على شاشتك" />
                </div>
              )}

              {/* Android Instructions */}
              {isAndroid() && !installPrompt && (
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Android</p>
                  <Step number={1} icon={<Chrome size={16} className="text-blue-500" />} text='افتح قائمة المتصفح' sub='اضغط على النقاط الثلاث ⋮ في الأعلى' />
                  <Step number={2} icon={<MoreVertical size={16} className="text-blue-500" />} text='"إضافة إلى الشاشة الرئيسية"' sub='أو "تثبيت التطبيق"' />
                  <Step number={3} icon={<Smartphone size={16} className="text-green-500" />} text='اضغط "إضافة"' sub="سيظهر التطبيق على شاشتك" />
                </div>
              )}

              {/* Generic (Desktop or unknown) */}
              {!isIOS() && !isAndroid() && (
                <div className="space-y-3">
                  <Step number={1} icon={<Chrome size={16} className="text-blue-500" />} text='ابحث عن أيقونة التثبيت' sub='في شريط العنوان (أيقونة كمبيوتر صغير)' />
                  <Step number={2} icon={<Download size={16} className="text-green-500" />} text='اضغط "تثبيت"' sub="في النافذة التي ستظهر" />
                </div>
              )}

              {/* Benefits */}
              <div className="mt-5 pt-4 border-t border-border">
                <p className="text-xs font-semibold text-muted-foreground mb-2">مميزات التطبيق</p>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { emoji: '📴', label: 'بدون إنترنت' },
                    { emoji: '⚡', label: 'سريع جداً' },
                    { emoji: '💾', label: 'بيانات محفوظة' },
                  ].map(b => (
                    <div key={b.label} className="bg-muted rounded-xl p-2 text-center">
                      <div className="text-xl mb-1">{b.emoji}</div>
                      <p className="text-[10px] font-medium text-muted-foreground">{b.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

const Step = ({ number, icon, text, sub }: { number: number; icon: React.ReactNode; text: string; sub: string }) => (
  <div className="flex items-start gap-3 bg-muted/50 rounded-xl p-3">
    <div className="w-6 h-6 rounded-full bg-primary/15 flex items-center justify-center shrink-0 text-xs font-bold text-primary mt-0.5">
      {number}
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2 mb-0.5">
        {icon}
        <p className="text-sm font-medium text-foreground">{text}</p>
      </div>
      <p className="text-xs text-muted-foreground">{sub}</p>
    </div>
  </div>
);

export default InstallPWA;
