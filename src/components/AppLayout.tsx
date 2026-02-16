import { ReactNode, useState, useMemo, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  BarChart3,
  Users,
  ClipboardCheck,
  Wallet,
  Settings,
  LogOut,
  Bell,
  AlertTriangle,
  X,
  RotateCcw,
  Clock,
  Wifi,
  WifiOff,
} from 'lucide-react';
import logo from '@/assets/logo.jpg';
import { getCurrentUser, setCurrentUser, getInventory } from '@/lib/store';
import ChatBot from './ChatBot';
import ShiftEndDialog from './ShiftEndDialog';

interface LayoutProps {
  children: ReactNode;
}

const navItems = [
  { path: '/', label: 'الرئيسية', icon: LayoutDashboard },
  { path: '/sales', label: 'المبيعات', icon: ShoppingCart },
  { path: '/returns', label: 'المرتجعات', icon: RotateCcw },
  { path: '/inventory', label: 'المخزون', icon: Package },
  { path: '/reports', label: 'التقارير', icon: BarChart3 },
  { path: '/workers', label: 'العمال', icon: Users },
  { path: '/attendance', label: 'الحضور', icon: ClipboardCheck },
  { path: '/expenses', label: 'المصروفات', icon: Wallet },
  { path: '/settings', label: 'الإعدادات', icon: Settings },
];

const workerNavItems = [
  { path: '/', label: 'الرئيسية', icon: LayoutDashboard },
  { path: '/sales', label: 'المبيعات', icon: ShoppingCart },
  { path: '/returns', label: 'المرتجعات', icon: RotateCcw },
  { path: '/inventory', label: 'المخزون', icon: Package },
  { path: '/my-dashboard', label: 'حسابي', icon: ClipboardCheck },
];

const AppLayout = ({ children }: LayoutProps) => {
  const location = useLocation();
  const user = getCurrentUser();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showShiftEnd, setShowShiftEnd] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const LOW_STOCK_THRESHOLD = 5;
  const lowStockItems = useMemo(() => {
    const inventory = getInventory();
    return inventory.filter(item => item.quantity <= LOW_STOCK_THRESHOLD);
  }, [location.pathname]);
  if (!user) return <>{children}</>;

  const filteredNav = user.role === 'worker' ? workerNavItems : navItems;

  const handleLogout = () => {
    setCurrentUser(null);
    window.location.href = '/login';
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen min-h-[100dvh]">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex fixed inset-y-0 right-0 z-40 w-64 bg-sidebar text-sidebar-foreground flex-col">
        <div className="flex items-center justify-between p-6 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <img src={logo} alt="بن العميد" className="w-10 h-10 rounded-full object-cover" />
            <div>
              <h1 className="font-bold text-lg text-sidebar-foreground">بن العميد</h1>
              <p className="text-xs text-sidebar-foreground/60">{user.name} - {user.role === 'admin' ? 'مدير' : 'عامل'}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {/* Online/Offline indicator */}
            <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium ${isOnline ? 'bg-green-500/15 text-green-400' : 'bg-destructive/15 text-destructive'}`}>
              {isOnline ? <Wifi size={12} /> : <WifiOff size={12} />}
              {isOnline ? 'متصل' : 'غير متصل'}
            </div>
            {user.role === 'admin' && (
              <button onClick={() => setShowNotifications(!showNotifications)} className="p-2 rounded-lg text-sidebar-foreground/70 hover:bg-sidebar-accent relative">
                <Bell size={20} />
                {lowStockItems.length > 0 && (
                  <span className="absolute top-1 left-1 w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
                    {lowStockItems.length}
                  </span>
                )}
              </button>
            )}
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {filteredNav.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all
                  ${isActive
                    ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-md'
                    : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                  }
                `}
              >
                <item.icon size={20} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-sidebar-border space-y-1">
          <button
            onClick={() => setShowShiftEnd(true)}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-sidebar-foreground/70 hover:bg-accent/20 hover:text-accent-foreground transition-all w-full"
          >
            <Clock size={20} />
            إنهاء الشيفت
          </button>
          <button
            onClick={() => setShowLogoutConfirm(true)}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-sidebar-foreground/70 hover:bg-destructive/20 hover:text-destructive transition-all w-full"
          >
            <LogOut size={20} />
            تسجيل الخروج
          </button>
        </div>
      </aside>

      {/* Mobile Top Bar */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-40 bg-sidebar text-sidebar-foreground flex items-center justify-between px-4 h-14" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="flex items-center gap-1">
          <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium ${isOnline ? 'bg-green-500/15 text-green-400' : 'bg-destructive/15 text-destructive'}`}>
            {isOnline ? <Wifi size={10} /> : <WifiOff size={10} />}
          </div>
          <button onClick={() => setShowShiftEnd(true)} className="p-2 rounded-lg text-sidebar-foreground/70">
            <Clock size={20} />
          </button>
          <button onClick={() => setShowLogoutConfirm(true)} className="p-2 rounded-lg text-sidebar-foreground/70">
            <LogOut size={20} />
          </button>
          {user.role === 'admin' && (
            <button onClick={() => setShowNotifications(!showNotifications)} className="p-2 rounded-lg text-sidebar-foreground/70 relative">
              <Bell size={20} />
              {lowStockItems.length > 0 && (
                <span className="absolute top-1 left-1 w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
                  {lowStockItems.length}
                </span>
              )}
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="font-bold text-sidebar-foreground">بن العميد</span>
          <img src={logo} alt="بن العميد" className="w-8 h-8 rounded-full object-cover" />
        </div>
      </header>

      {/* Notifications Dropdown */}
      <AnimatePresence>
        {showNotifications && user.role === 'admin' && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="fixed top-14 left-2 right-2 md:left-auto md:right-auto md:top-4 md:mr-72 z-50 bg-card border border-border rounded-2xl shadow-2xl max-h-80 overflow-auto"
            style={{ marginTop: 'env(safe-area-inset-top)' }}
          >
            <div className="flex items-center justify-between p-3 border-b border-border">
              <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                <Bell size={16} />
                الإشعارات
              </h3>
              <button onClick={() => setShowNotifications(false)} className="p-1 rounded-lg hover:bg-muted">
                <X size={16} className="text-muted-foreground" />
              </button>
            </div>
            {lowStockItems.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">لا توجد تنبيهات</div>
            ) : (
              <div className="p-2 space-y-1">
                {lowStockItems.map(item => (
                  <Link
                    key={item.id}
                    to="/inventory"
                    onClick={() => setShowNotifications(false)}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted transition-colors"
                  >
                    <div className="w-8 h-8 rounded-lg bg-destructive/15 flex items-center justify-center shrink-0">
                      <AlertTriangle size={16} className="text-destructive" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">⚠️ {item.name}</p>
                      <p className="text-xs text-muted-foreground">المتبقي: {item.quantity} {item.unit} فقط</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main content */}
      <main className="flex-1 md:mr-64 pt-14 md:pt-0 pb-20 md:pb-0">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="p-4 md:p-8 pb-24"
        >
          {children}
          {/* Footer */}
          <div className="mt-8 pt-4 border-t border-border text-center space-y-0.5">
            <p className="text-xs font-semibold text-muted-foreground">بن العميد</p>
            <p className="text-[10px] text-muted-foreground/70">تنفيذ شركة InstaTech للبرمجيات</p>
            <p className="text-[10px] text-muted-foreground/70" dir="ltr">📱 01227080430</p>
          </div>
        </motion.div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-sidebar border-t border-sidebar-border" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="flex items-center justify-around h-16">
          {filteredNav.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center justify-center gap-1 flex-1 py-2 transition-all ${
                  isActive
                    ? 'text-sidebar-primary'
                    : 'text-sidebar-foreground/50'
                }`}
              >
                <item.icon size={22} />
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* AI Chatbot */}
      <ChatBot />

      {/* Logout Confirmation Dialog */}
      <Dialog open={showLogoutConfirm} onOpenChange={setShowLogoutConfirm}>
        <DialogContent className="max-w-sm text-center" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-lg">تسجيل الخروج</DialogTitle>
            <DialogDescription>هل أنت متأكد من تسجيل الخروج؟</DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 justify-center sm:justify-center">
            <Button variant="destructive" onClick={handleLogout}>نعم، تسجيل الخروج</Button>
            <Button variant="outline" onClick={() => setShowLogoutConfirm(false)}>لا، إلغاء</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Shift End Dialog */}
      <ShiftEndDialog open={showShiftEnd} onOpenChange={setShowShiftEnd} />
    </div>
  );
};

export default AppLayout;
