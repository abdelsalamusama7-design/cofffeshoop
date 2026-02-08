import { ReactNode, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  BarChart3,
  Users,
  ClipboardCheck,
  LogOut,
} from 'lucide-react';
import logo from '@/assets/logo.jpg';
import { getCurrentUser, setCurrentUser } from '@/lib/store';

interface LayoutProps {
  children: ReactNode;
}

const navItems = [
  { path: '/', label: 'الرئيسية', icon: LayoutDashboard },
  { path: '/sales', label: 'المبيعات', icon: ShoppingCart },
  { path: '/inventory', label: 'المخزون', icon: Package },
  { path: '/reports', label: 'التقارير', icon: BarChart3 },
  { path: '/workers', label: 'العمال', icon: Users },
  { path: '/attendance', label: 'الحضور', icon: ClipboardCheck },
];

const AppLayout = ({ children }: LayoutProps) => {
  const location = useLocation();
  const user = getCurrentUser();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (!user) return <>{children}</>;

  const filteredNav = user.role === 'worker'
    ? navItems.filter(n => ['/', '/sales'].includes(n.path))
    : navItems;

  const handleLogout = () => {
    setCurrentUser(null);
    window.location.href = '/login';
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen min-h-[100dvh]">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex fixed inset-y-0 right-0 z-40 w-64 bg-sidebar text-sidebar-foreground flex-col">
        <div className="flex items-center gap-3 p-6 border-b border-sidebar-border">
          <img src={logo} alt="بن العميد" className="w-10 h-10 rounded-full object-cover" />
          <div>
            <h1 className="font-bold text-lg text-sidebar-foreground">بن العميد</h1>
            <p className="text-xs text-sidebar-foreground/60">{user.name} - {user.role === 'admin' ? 'مدير' : 'عامل'}</p>
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

        <div className="p-4 border-t border-sidebar-border">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-sidebar-foreground/70 hover:bg-destructive/20 hover:text-destructive transition-all w-full"
          >
            <LogOut size={20} />
            تسجيل الخروج
          </button>
        </div>
      </aside>

      {/* Mobile Top Bar */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-40 bg-sidebar text-sidebar-foreground flex items-center justify-between px-4 h-14" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <button onClick={handleLogout} className="p-2 rounded-lg text-sidebar-foreground/70">
          <LogOut size={20} />
        </button>
        <div className="flex items-center gap-2">
          <span className="font-bold text-sidebar-foreground">بن العميد</span>
          <img src={logo} alt="بن العميد" className="w-8 h-8 rounded-full object-cover" />
        </div>
      </header>

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
    </div>
  );
};

export default AppLayout;
