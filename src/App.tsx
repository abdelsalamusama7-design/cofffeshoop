import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { AnimatePresence } from "framer-motion";
import { getCurrentUser, initializeFromDatabase } from "@/lib/store";
import { startAutoBackup } from "@/lib/backupService";
import { flushQueue, getQueueCount } from "@/lib/offlineQueue";
import { toast } from "sonner";
import AppLayout from "@/components/AppLayout";
import SplashScreen from "@/components/SplashScreen";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Sales from "./pages/Sales";
import Returns from "./pages/Returns";
import Inventory from "./pages/Inventory";
import Reports from "./pages/Reports";
import Workers from "./pages/Workers";
import Attendance from "./pages/Attendance";
import Expenses from "./pages/Expenses";
import SettingsPage from "./pages/SettingsPage";
import WorkerDashboard from "./pages/WorkerDashboard";
import WorkerExpensesPage from "./pages/WorkerExpensesPage";
import NotFound from "./pages/NotFound";
import { useRegisterSW } from "virtual:pwa-register/react";


const queryClient = new QueryClient();

const ProtectedRoute = ({ children, adminOnly }: { children: React.ReactNode; adminOnly?: boolean }) => {
  const user = getCurrentUser();
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && user.role !== 'admin') return <Navigate to="/" replace />;
  return <AppLayout>{children}</AppLayout>;
};

const App = () => {
  const [showSplash, setShowSplash] = useState(true);
  const [dbReady, setDbReady] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<any>(null);

  // PWA update registration
  const { needRefresh, updateServiceWorker } = useRegisterSW({
    onRegistered(r) { console.log('SW registered:', r); },
    onRegisterError(error) { console.log('SW registration error:', error); },
  });

  // Listen for install prompt
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  // Show update notification
  useEffect(() => {
    if (needRefresh) {
      toast.info('🔄 يوجد تحديث جديد للتطبيق', {
        duration: 0,
        action: {
          label: 'تحديث الآن',
          onClick: () => updateServiceWorker(true),
        },
      });
    }
  }, [needRefresh]);

  useEffect(() => {
    // Load data from database on startup — with 5s timeout for offline mode
    const initTimeout = setTimeout(() => {
      console.log('⚠️ DB init timeout — using localStorage (offline mode)');
      setDbReady(true);
    }, 5000);

    initializeFromDatabase().then(() => {
      clearTimeout(initTimeout);
      setDbReady(true);
    }).catch(() => {
      clearTimeout(initTimeout);
      setDbReady(true); // fallback to localStorage
    });

    startAutoBackup((success) => {
      const user = getCurrentUser();
      if (user?.role === 'admin') {
        if (success) {
          toast.success('✅ تم حفظ نسخة احتياطية تلقائية', {
            description: `${new Date().toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' })}`,
            duration: 5000,
          });
        }
      }
    });

    // Re-sync from cloud when internet reconnects - flush queue first then sync
    const handleOnline = async () => {
      const queueCount = getQueueCount();
      // Check if there's a pending restore sync
      const hasPendingRestore = localStorage.getItem('cafe_pending_restore_sync');
      if (hasPendingRestore) {
        toast.info('🌐 تم استعادة الاتصال، جاري رفع البيانات المستعادة للسحاب...');
        const { syncLocalStorageToCloud } = await import('@/lib/store');
        const ok = await syncLocalStorageToCloud();
        if (ok) {
          localStorage.removeItem('cafe_pending_restore_sync');
          toast.success('✅ تم رفع البيانات المستعادة للسحاب بنجاح');
        }
        return;
      }
      if (queueCount > 0) {
        toast.info(`🌐 تم استعادة الاتصال، جاري رفع ${queueCount} عملية معلقة...`);
        const flushed = await flushQueue();
        if (flushed) {
          toast.success('✅ تمت مزامنة جميع العمليات المعلقة');
        }
      } else {
        toast.info('🌐 تم استعادة الاتصال، جاري المزامنة...');
      }
      initializeFromDatabase().then((success) => {
        if (success && queueCount === 0) {
          toast.success('✅ تم مزامنة البيانات بنجاح');
        }
      });
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
      setInstallPrompt(null);
      toast.success('✅ تم تثبيت التطبيق بنجاح!');
    }
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AnimatePresence>
          {(showSplash || !dbReady) && <SplashScreen onFinish={() => setShowSplash(false)} />}
        </AnimatePresence>
        {!showSplash && dbReady && (
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
              <Route path="/sales" element={<ProtectedRoute><Sales /></ProtectedRoute>} />
              <Route path="/returns" element={<ProtectedRoute><Returns /></ProtectedRoute>} />
              <Route path="/inventory" element={<ProtectedRoute><Inventory /></ProtectedRoute>} />
              <Route path="/reports" element={<ProtectedRoute adminOnly><Reports /></ProtectedRoute>} />
              <Route path="/workers" element={<ProtectedRoute adminOnly><Workers /></ProtectedRoute>} />
              <Route path="/attendance" element={<ProtectedRoute adminOnly><Attendance /></ProtectedRoute>} />
              <Route path="/expenses" element={<ProtectedRoute adminOnly><Expenses /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute adminOnly><SettingsPage /></ProtectedRoute>} />
              <Route path="/my-dashboard" element={<ProtectedRoute><WorkerDashboard /></ProtectedRoute>} />
              <Route path="/my-expenses" element={<ProtectedRoute><WorkerExpensesPage /></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
            {/* Install App Banner */}
            {installPrompt && (
              <div className="fixed bottom-20 md:bottom-4 left-4 right-4 md:left-auto md:right-72 z-50 bg-primary text-primary-foreground rounded-2xl shadow-2xl p-3 flex items-center gap-3">
                <span className="text-sm font-medium flex-1">📱 ثبّت التطبيق على جهازك للعمل بدون إنترنت</span>
                <button onClick={handleInstall} className="bg-primary-foreground text-primary text-xs font-bold px-3 py-1.5 rounded-lg">تثبيت</button>
                <button onClick={() => setInstallPrompt(null)} className="text-primary-foreground/70 text-lg leading-none">×</button>
              </div>
            )}
          </BrowserRouter>
        )}
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;

