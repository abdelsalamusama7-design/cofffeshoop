import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Coffee, GlassWater, Wine, Droplets, CupSoda, Plus, ShoppingCart, BarChart3, Package, TrendingUp, DollarSign } from 'lucide-react';
import { getCategories, getProducts, getSales } from '@/lib/store';
import { getCurrentUser } from '@/lib/store';

const iconMap: Record<string, any> = {
  Coffee, GlassWater, Wine, Droplets, CupSoda,
};

const colorMap: Record<string, string> = {
  'cafe-warm': 'from-orange-500 to-red-500',
  'info': 'from-blue-400 to-blue-600',
  'success': 'from-green-400 to-green-600',
  'warning': 'from-amber-400 to-orange-500',
};

const Dashboard = () => {
  const categories = getCategories();
  const products = getProducts();
  const sales = getSales();
  const user = getCurrentUser();

  const todaySales = sales.filter(s => s.date === new Date().toISOString().split('T')[0]);
  const todayTotal = todaySales.reduce((sum, s) => sum + s.total, 0);
  const todayCount = todaySales.reduce((sum, s) => sum + s.items.reduce((c, i) => c + i.quantity, 0), 0);

  const totalCost = todaySales.reduce((sum, s) => {
    return sum + s.items.reduce((c, item) => {
      const product = products.find(p => p.id === item.productId);
      return c + (product ? product.costPrice * item.quantity : 0);
    }, 0);
  }, 0);

  const stats = [
    { label: 'مبيعات اليوم', value: `${todayTotal} ج.م`, icon: DollarSign, gradient: 'from-green-500 to-emerald-600' },
    { label: 'عدد الطلبات', value: todaySales.length.toString(), icon: ShoppingCart, gradient: 'from-blue-500 to-blue-600' },
    { label: 'الأصناف المباعة', value: todayCount.toString(), icon: TrendingUp, gradient: 'from-purple-500 to-purple-600' },
    ...(user?.role === 'admin' ? [{ label: 'صافي الربح', value: `${todayTotal - totalCost} ج.م`, icon: BarChart3, gradient: 'from-amber-500 to-orange-600' }] : []),
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">مرحباً، {user?.name} 👋</h1>
        <p className="text-muted-foreground mt-1">لوحة التحكم الرئيسية</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="glass-card rounded-2xl p-4"
          >
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center mb-3`}>
              <stat.icon size={20} className="text-primary-foreground" />
            </div>
            <p className="text-2xl font-bold text-foreground">{stat.value}</p>
            <p className="text-xs text-muted-foreground">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Categories */}
      <div>
        <h2 className="text-lg font-bold text-foreground mb-4">الأقسام</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
          {categories.map((cat, i) => {
            const Icon = iconMap[cat.icon] || Coffee;
            const gradient = colorMap[cat.color] || 'from-amber-500 to-orange-600';
            const catProducts = products.filter(p => p.categoryId === cat.id);
            return (
              <motion.div
                key={cat.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
              >
                <Link
                  to={`/sales?category=${cat.id}`}
                  className="glass-card rounded-2xl p-5 flex flex-col items-center gap-3 hover:shadow-xl transition-all group cursor-pointer"
                >
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                    <Icon size={28} className="text-primary-foreground" />
                  </div>
                  <span className="text-sm font-semibold text-foreground text-center">{cat.name}</span>
                  <span className="text-xs text-muted-foreground">{catProducts.length} منتج</span>
                </Link>
              </motion.div>
            );
          })}

          {/* Add new category (admin only) */}
          {user?.role === 'admin' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: categories.length * 0.05 }}
            >
              <Link
                to="/inventory"
                className="glass-card rounded-2xl p-5 flex flex-col items-center gap-3 hover:shadow-xl transition-all border-2 border-dashed border-border cursor-pointer group"
              >
                <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Plus size={28} className="text-muted-foreground" />
                </div>
                <span className="text-sm font-semibold text-muted-foreground">إضافة قسم</span>
              </Link>
            </motion.div>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="text-lg font-bold text-foreground mb-4">إجراءات سريعة</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link to="/sales" className="glass-card rounded-2xl p-5 flex items-center gap-3 hover:shadow-xl transition-all">
            <div className="w-12 h-12 rounded-xl cafe-gradient flex items-center justify-center">
              <ShoppingCart size={22} className="text-primary-foreground" />
            </div>
            <div>
              <p className="font-semibold text-foreground">بيع جديد</p>
              <p className="text-xs text-muted-foreground">إضافة طلب</p>
            </div>
          </Link>

          {user?.role === 'admin' && (
            <>
              <Link to="/inventory" className="glass-card rounded-2xl p-5 flex items-center gap-3 hover:shadow-xl transition-all">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                  <Package size={22} className="text-primary-foreground" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">المخزون</p>
                  <p className="text-xs text-muted-foreground">إدارة المخزن</p>
                </div>
              </Link>
              <Link to="/reports" className="glass-card rounded-2xl p-5 flex items-center gap-3 hover:shadow-xl transition-all">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                  <BarChart3 size={22} className="text-primary-foreground" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">التقارير</p>
                  <p className="text-xs text-muted-foreground">تقرير اليوم</p>
                </div>
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
