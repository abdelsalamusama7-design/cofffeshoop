import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ShoppingCart, BarChart3, Package, TrendingUp, DollarSign, Coffee, ChevronLeft } from 'lucide-react';
import { getProducts, getSales, getInventory } from '@/lib/store';
import { getCurrentUser } from '@/lib/store';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const Dashboard = () => {
  const products = getProducts();
  const sales = getSales();
  const user = getCurrentUser();
  const inventory = getInventory();
  const [showSalesDetail, setShowSalesDetail] = useState(false);

  const today = new Date().toISOString().split('T')[0];
  const todaySales = sales.filter(s => s.date === today);
  const workerTodaySales = user ? todaySales.filter(s => s.workerId === user.id) : [];
  const displaySales = user?.role === 'admin' ? todaySales : workerTodaySales;

  const todayTotal = displaySales.reduce((sum, s) => sum + s.total, 0);
  const todayCount = displaySales.reduce((sum, s) => sum + s.items.reduce((c, i) => c + i.quantity, 0), 0);

  const totalCost = displaySales.reduce((sum, s) => {
    return sum + s.items.reduce((c, item) => {
      const product = products.find(p => p.id === item.productId || `product_${p.id}` === item.productId);
      const invItem = inventory.find(i => `inv_${i.id}` === item.productId);
      const cost = product ? product.costPrice : invItem ? invItem.costPerUnit : 0;
      return c + cost * item.quantity;
    }, 0);
  }, 0);

  // Product breakdown for detail dialog
  const productBreakdown = useMemo(() => {
    const map: Record<string, { name: string; quantity: number; total: number }> = {};
    displaySales.forEach(sale => {
      sale.items.forEach(item => {
        if (!map[item.productId]) map[item.productId] = { name: item.productName, quantity: 0, total: 0 };
        map[item.productId].quantity += item.quantity;
        map[item.productId].total += item.total;
      });
    });
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [displaySales]);

  const stats = [
    { label: 'مبيعات اليوم', value: `${todayTotal} ج.م`, icon: DollarSign, gradient: 'from-green-500 to-emerald-600', clickable: true },
    { label: 'عدد الطلبات', value: displaySales.length.toString(), icon: ShoppingCart, gradient: 'from-blue-500 to-blue-600', clickable: true },
    { label: 'الأصناف المباعة', value: todayCount.toString(), icon: TrendingUp, gradient: 'from-purple-500 to-purple-600', clickable: true },
    ...(user?.role === 'admin' ? [{ label: 'صافي الربح', value: `${todayTotal - totalCost} ج.م`, icon: BarChart3, gradient: 'from-amber-500 to-orange-600', clickable: false }] : []),
  ];

  // Low stock items
  const lowStockItems = inventory.filter(i => i.quantity <= 5);

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
            className={`glass-card rounded-2xl p-4 ${stat.clickable ? 'cursor-pointer hover:shadow-xl active:scale-[0.98] transition-all' : ''}`}
            onClick={() => { if (stat.clickable) setShowSalesDetail(true); }}
          >
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center mb-3`}>
              <stat.icon size={20} className="text-primary-foreground" />
            </div>
            <p className="text-2xl font-bold text-foreground">{stat.value}</p>
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">{stat.label}</p>
              {stat.clickable && <ChevronLeft size={14} className="text-muted-foreground" />}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Low Stock Alert */}
      {user?.role === 'admin' && lowStockItems.length > 0 && (
        <div>
          <h2 className="text-lg font-bold text-foreground mb-4">⚠️ أصناف قاربت على النفاد</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {lowStockItems.map((item, i) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
              >
                <Link
                  to="/inventory"
                  className="glass-card rounded-2xl p-4 flex flex-col items-center gap-2 hover:shadow-xl transition-all border border-destructive/30"
                >
                  <Package size={24} className="text-destructive" />
                  <span className="text-sm font-semibold text-foreground text-center">{item.name}</span>
                  <span className="text-xs text-destructive font-bold">{item.quantity} {item.unit}</span>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Quick actions */}
      <div>
        <h2 className="text-lg font-bold text-foreground mb-4">إجراءات سريعة</h2>
        <div className="grid grid-cols-2 gap-3">
          <Link to="/sales" className="glass-card rounded-2xl p-4 flex items-center gap-3 hover:shadow-xl transition-all">
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

      {/* Sales Detail Dialog */}
      <Dialog open={showSalesDetail} onOpenChange={setShowSalesDetail}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-center">تفاصيل مبيعات اليوم</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Summary cards */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-primary/10 rounded-xl p-3 text-center">
                <p className="text-xl font-bold text-primary">{todayTotal}</p>
                <p className="text-[10px] text-muted-foreground">ج.م إجمالي</p>
              </div>
              <div className="bg-accent/10 rounded-xl p-3 text-center">
                <p className="text-xl font-bold text-accent-foreground">{displaySales.length}</p>
                <p className="text-[10px] text-muted-foreground">طلب</p>
              </div>
              <div className="bg-info/10 rounded-xl p-3 text-center">
                <p className="text-xl font-bold text-info">{todayCount}</p>
                <p className="text-[10px] text-muted-foreground">صنف مباع</p>
              </div>
            </div>

            {/* Product breakdown */}
            {productBreakdown.length > 0 && (
              <div>
                <h3 className="font-bold text-foreground text-sm mb-2">الأصناف المباعة</h3>
                <div className="space-y-1.5">
                  {productBreakdown.map((p, i) => (
                    <div key={i} className="flex items-center justify-between bg-secondary rounded-lg p-2.5">
                      <span className="text-sm font-medium text-foreground">{p.name}</span>
                      <div className="flex items-center gap-3 text-sm">
                        <span className="text-muted-foreground">{p.quantity}x</span>
                        <span className="font-bold text-foreground">{p.total} ج.م</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Order by order */}
            {displaySales.length > 0 ? (
              <div>
                <h3 className="font-bold text-foreground text-sm mb-2">تفاصيل الطلبات</h3>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {displaySales.slice().reverse().map((sale) => (
                    <div key={sale.id} className="bg-muted/30 rounded-lg p-3 text-sm">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-muted-foreground">{sale.time}</span>
                        <span className="font-bold text-primary">{sale.total} ج.م</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {sale.items.map(it => `${it.productName} x${it.quantity}`).join(' • ')}
                      </p>
                      {sale.discount && sale.discount.percent > 0 && (
                        <p className="text-xs text-destructive mt-1">خصم {sale.discount.percent}%: -{sale.discount.amount} ج.م</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">لم تسجل مبيعات اليوم بعد</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Dashboard;