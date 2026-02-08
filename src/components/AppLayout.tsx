import { ReactNode, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  BarChart3,
  Users,
  ClipboardCheck,
  LogOut,
  Coffee,
  Menu,
  X,
} from 'lucide-react';
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
    <div className="flex min-h-screen">
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="fixed top-4 left-4 z-50 md:hidden rounded-lg bg-primary p-2 text-primary-foreground shadow-lg"
      >
        {mobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 right-0 z-40 w-64 bg-sidebar text-sidebar-foreground
        transform transition-transform duration-300 md:translate-x-0
        ${mobileOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}
        flex flex-col
      `}>
        <div className="flex items-center gap-3 p-6 border-b border-sidebar-border">
          <div className="w-10 h-10 rounded-xl gold-gradient flex items-center justify-center">
            <Coffee size={22} className="text-accent-foreground" />
          </div>
          <div>
            <h1 className="font-bold text-lg text-sidebar-foreground">كافيه مانجر</h1>
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
                onClick={() => setMobileOpen(false)}
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

      {/* Main content */}
      <main className="flex-1 md:mr-64">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="p-4 md:p-8"
        >
          {children}
        </motion.div>
      </main>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-foreground/30 z-30 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}
    </div>
  );
};

export default AppLayout;
