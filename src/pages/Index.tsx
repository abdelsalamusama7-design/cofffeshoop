import { useState, useMemo } from 'react';
import { compareDateTime } from '@/lib/utils';
import { Input } from '@/components/ui/input';

import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ShoppingCart, BarChart3, Package, TrendingUp, DollarSign, Coffee, ChevronLeft, Trash2, Edit3, X, Check, RotateCcw, ArrowLeftRight, Calendar } from 'lucide-react';
import { getProducts, getSales, getInventory, deleteSale, updateSale, getReturns, deleteReturn } from '@/lib/store';
import ScrollableList from '@/components/ScrollableList';
import { getCurrentUser } from '@/lib/store';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Sale, SaleItem, ReturnRecord } from '@/lib/types';
import { toast } from 'sonner';
import PasswordConfirmDialog from '@/components/PasswordConfirmDialog';

const Dashboard = () => {
  const products = getProducts();
  const sales = getSales();
  const user = getCurrentUser();
  const inventory = getInventory();
  const returns = getReturns();
  const [activeStatDialog, setActiveStatDialog] = useState<'sales' | 'orders' | 'items' | 'profit' | 'returns' | null>(null);
  const [, forceUpdate] = useState(0);
  const [passwordAction, setPasswordAction] = useState<{ type: 'edit' | 'delete'; sale: Sale } | null>(null);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [editItems, setEditItems] = useState<SaleItem[]>([]);
  const [editDiscount, setEditDiscount] = useState<number>(0);
  const [pendingDeleteReturn, setPendingDeleteReturn] = useState<string | null>(null);

  const today = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(today);

  const todaySales = sales.filter(s => s.date === selectedDate);
  const workerTodaySales = user ? todaySales.filter(s => s.workerId === user.id) : [];
  const displaySales = user?.role === 'admin' ? todaySales : workerTodaySales;

  const todayReturns = returns.filter(r => r.date === selectedDate);
  const workerTodayReturns = user ? todayReturns.filter(r => r.workerId === user.id) : [];
  const displayReturns = user?.role === 'admin' ? todayReturns : workerTodayReturns;

  const todayReturnsTotal = displayReturns.reduce((sum, r) => sum + r.refundAmount, 0);
  const todayTotal = displaySales.reduce((sum, s) => sum + s.total, 0) - todayReturnsTotal;
  const todayReturnedCount = displayReturns.reduce((sum, r) => sum + r.items.reduce((c, i) => c + i.quantity, 0), 0);
  const todayCount = displaySales.reduce((sum, s) => sum + s.items.reduce((c, i) => c + i.quantity, 0), 0) - todayReturnedCount;

  const totalSalesCost = displaySales.reduce((sum, s) => {
    return sum + s.items.reduce((c, item) => {
      const product = products.find(p => p.id === item.productId || `product_${p.id}` === item.productId);
      const invItem = inventory.find(i => `inv_${i.id}` === item.productId);
      const cost = product ? product.costPrice : invItem ? invItem.costPerUnit : 0;
      return c + cost * item.quantity;
    }, 0);
  }, 0);

  // Deduct cost of returned items from total cost
  const totalReturnsCost = displayReturns.reduce((sum, r) => {
    return sum + r.items.reduce((c, item) => {
      const product = products.find(p => p.id === item.productId || `product_${p.id}` === item.productId);
      const invItem = inventory.find(i => `inv_${i.id}` === item.productId);
      const cost = product ? product.costPrice : invItem ? invItem.costPerUnit : 0;
      return c + cost * item.quantity;
    }, 0);
  }, 0);

  const totalCost = totalSalesCost - totalReturnsCost;

  // Product breakdown for detail dialog (subtract returns)
  const productBreakdown = useMemo(() => {
    const map: Record<string, { name: string; quantity: number; total: number }> = {};
    displaySales.forEach(sale => {
      sale.items.forEach(item => {
        if (!map[item.productId]) map[item.productId] = { name: item.productName, quantity: 0, total: 0 };
        map[item.productId].quantity += item.quantity;
        map[item.productId].total += item.total;
      });
    });
    // Subtract returned items
    displayReturns.forEach(ret => {
      ret.items.forEach(item => {
        if (map[item.productId]) {
          map[item.productId].quantity -= item.quantity;
          map[item.productId].total -= item.total;
        }
      });
    });
    return Object.values(map).filter(p => p.quantity > 0).sort((a, b) => b.total - a.total);
  }, [displaySales, displayReturns]);

  const netProfit = todayTotal - totalCost;

  const stats = [
    { label: 'مبيعات اليوم', value: `${Math.round(todayTotal * 100) / 100} ج.م`, icon: DollarSign, gradient: 'from-green-500 to-emerald-600', dialogKey: 'sales' as const },
    { label: 'عدد الطلبات', value: displaySales.length.toString(), icon: ShoppingCart, gradient: 'from-blue-500 to-blue-600', dialogKey: 'orders' as const },
    { label: 'الأصناف المباعة', value: todayCount.toString(), icon: TrendingUp, gradient: 'from-purple-500 to-purple-600', dialogKey: 'items' as const },
    { label: 'المرتجعات', value: displayReturns.length.toString(), icon: RotateCcw, gradient: 'from-red-500 to-rose-600', dialogKey: 'returns' as const },
    ...(user?.role === 'admin' ? [{ label: 'صافي الربح', value: `${Math.round(netProfit * 100) / 100} ج.م`, icon: BarChart3, gradient: 'from-amber-500 to-orange-600', dialogKey: 'profit' as const }] : []),
  ];

  // Low stock items
  const lowStockItems = inventory.filter(i => i.quantity <= 5);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">مرحباً، {user?.name} 👋</h1>
          <p className="text-muted-foreground mt-1">لوحة التحكم الرئيسية</p>
        </div>
      </div>

      {/* Date Filter */}
      <div className="flex items-center gap-2">
        <Calendar size={16} className="text-muted-foreground shrink-0" />
        <span className="text-sm text-muted-foreground whitespace-nowrap">عرض بيانات يوم:</span>
        <Input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value || today)} className="w-auto h-9 text-sm" />
        {selectedDate !== today && (
          <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setSelectedDate(today)}>اليوم</Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="glass-card rounded-2xl p-3 sm:p-4 cursor-pointer hover:shadow-xl active:scale-[0.98] transition-all touch-manipulation"
            onClick={() => setActiveStatDialog(stat.dialogKey)}
          >
            <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center mb-2`}>
              <stat.icon size={18} className="text-primary-foreground" />
            </div>
            <p className="text-lg sm:text-xl font-bold text-foreground truncate">{stat.value}</p>
            <div className="flex items-center justify-between gap-1">
              <p className="text-[11px] text-muted-foreground leading-tight">{stat.label}</p>
              <ChevronLeft size={12} className="text-muted-foreground shrink-0" />
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

      {/* Today's Returns */}
      {displayReturns.length > 0 && (
        <div>
          <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
            <RotateCcw size={18} className="text-destructive" />
            مرتجعات اليوم ({displayReturns.length})
          </h2>
          <div className="space-y-2">
            {[...displayReturns].sort((a, b) => compareDateTime(a.date, a.time, b.date, b.time)).map((ret) => (
              <motion.div
                key={ret.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="glass-card rounded-xl p-3"
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-destructive/15 text-destructive">
                      {ret.type === 'return' ? 'مرتجع' : 'استبدال'}
                    </span>
                    <span className="text-xs text-muted-foreground">#{ret.saleId}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-destructive">-{ret.refundAmount} ج.م</span>
                    {user?.role === 'admin' && (
                      <button
                        onClick={() => setPendingDeleteReturn(ret.id)}
                        className="w-6 h-6 rounded-md bg-muted flex items-center justify-center text-muted-foreground hover:bg-destructive hover:text-destructive-foreground transition-colors"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {ret.items.map(i => `${i.productName} x${i.quantity}`).join(' • ')}
                </p>
                {ret.reason && <p className="text-xs text-muted-foreground/70 mt-0.5">السبب: {ret.reason}</p>}
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

      {/* Stat Detail Dialog */}
      <Dialog open={!!activeStatDialog} onOpenChange={(open) => { if (!open) setActiveStatDialog(null); }}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-center">
              {activeStatDialog === 'sales' && 'تفاصيل مبيعات اليوم'}
              {activeStatDialog === 'orders' && 'تفاصيل الطلبات'}
              {activeStatDialog === 'items' && 'الأصناف المباعة'}
              {activeStatDialog === 'profit' && 'تفاصيل صافي الربح'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">

            {/* === Sales Dialog === */}
            {activeStatDialog === 'sales' && (
              <>
                <div className="bg-gradient-to-br from-green-500/10 to-emerald-600/10 rounded-xl p-4 text-center">
                  <p className="text-3xl font-bold text-foreground">{Math.round(todayTotal * 100) / 100} ج.م</p>
                  <p className="text-xs text-muted-foreground mt-1">إجمالي المبيعات بعد خصم المرتجعات</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-secondary rounded-xl p-3 text-center">
                    <p className="text-lg font-bold text-foreground">{displaySales.reduce((s, sale) => s + sale.total, 0)} ج.م</p>
                    <p className="text-[10px] text-muted-foreground">إجمالي قبل المرتجعات</p>
                  </div>
                  <div className="bg-destructive/10 rounded-xl p-3 text-center">
                    <p className="text-lg font-bold text-destructive">-{todayReturnsTotal} ج.م</p>
                    <p className="text-[10px] text-muted-foreground">مرتجعات</p>
                  </div>
                </div>
                {displaySales.length > 0 && (
                  <div>
                    <h3 className="font-bold text-foreground text-sm mb-2">الطلبات</h3>
                    <ScrollableList className="space-y-2">
                      {[...displaySales].sort((a, b) => compareDateTime(a.date, a.time, b.date, b.time)).map((sale) => (
                        <div key={sale.id} className="bg-muted/30 rounded-lg p-3 text-sm">
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-muted-foreground">{sale.time}</span>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-primary">{sale.total} ج.م</span>
                              <button onClick={() => setPasswordAction({ type: 'edit', sale })} className="w-6 h-6 rounded-md bg-muted flex items-center justify-center text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"><Edit3 size={12} /></button>
                              <button onClick={() => setPasswordAction({ type: 'delete', sale })} className="w-6 h-6 rounded-md bg-muted flex items-center justify-center text-muted-foreground hover:bg-destructive hover:text-destructive-foreground transition-colors"><Trash2 size={12} /></button>
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">{sale.items.map(it => `${it.productName} x${it.quantity}`).join(' • ')}</p>
                          {sale.discount && sale.discount.percent > 0 && <p className="text-xs text-destructive mt-1">خصم {sale.discount.percent}%: -{sale.discount.amount} ج.م</p>}
                        </div>
                      ))}
                    </ScrollableList>
                  </div>
                )}
              </>
            )}

            {/* === Orders Dialog === */}
            {activeStatDialog === 'orders' && (
              <>
                <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 rounded-xl p-4 text-center">
                  <p className="text-3xl font-bold text-foreground">{displaySales.length}</p>
                  <p className="text-xs text-muted-foreground mt-1">إجمالي عدد الطلبات اليوم</p>
                </div>
                {displaySales.length > 0 ? (
                  <ScrollableList className="space-y-2">
                    {[...displaySales].sort((a, b) => compareDateTime(a.date, a.time, b.date, b.time)).map((sale, i) => (
                      <div key={sale.id} className="bg-muted/30 rounded-lg p-3 text-sm">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">{displaySales.length - i}</span>
                            <span className="text-xs text-muted-foreground">{sale.time}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-primary">{sale.total} ج.م</span>
                            <button onClick={() => setPasswordAction({ type: 'edit', sale })} className="w-6 h-6 rounded-md bg-muted flex items-center justify-center text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"><Edit3 size={12} /></button>
                            <button onClick={() => setPasswordAction({ type: 'delete', sale })} className="w-6 h-6 rounded-md bg-muted flex items-center justify-center text-muted-foreground hover:bg-destructive hover:text-destructive-foreground transition-colors"><Trash2 size={12} /></button>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{sale.items.map(it => `${it.productName} x${it.quantity}`).join(' • ')}</p>
                        <p className="text-[10px] text-muted-foreground/60 mt-0.5">العامل: {sale.workerName}</p>
                      </div>
                    ))}
                  </ScrollableList>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">لم تسجل طلبات اليوم بعد</p>
                )}
              </>
            )}

            {/* === Items Sold Dialog === */}
            {activeStatDialog === 'items' && (
              <>
                <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 rounded-xl p-4 text-center">
                  <p className="text-3xl font-bold text-foreground">{todayCount}</p>
                  <p className="text-xs text-muted-foreground mt-1">إجمالي الأصناف المباعة اليوم</p>
                </div>
                {productBreakdown.length > 0 ? (
                  <ScrollableList className="space-y-1.5">
                    {productBreakdown.map((p, i) => (
                      <div key={i} className="flex items-center justify-between bg-secondary rounded-lg p-3">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-purple-500/10 flex items-center justify-center text-[10px] font-bold text-purple-600">{i + 1}</span>
                          <span className="text-sm font-medium text-foreground">{p.name}</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                          <span className="text-muted-foreground">{p.quantity}x</span>
                          <span className="font-bold text-foreground">{p.total} ج.م</span>
                        </div>
                      </div>
                    ))}
                  </ScrollableList>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">لم تُباع أصناف اليوم بعد</p>
                )}
              </>
            )}

            {/* === Returns Dialog === */}
            {activeStatDialog === 'returns' && (
              <>
                <div className="bg-gradient-to-br from-red-500/10 to-rose-600/10 rounded-xl p-4 text-center">
                  <p className="text-3xl font-bold text-foreground">{displayReturns.length}</p>
                  <p className="text-xs text-muted-foreground mt-1">مرتجعات واستبدالات اليوم</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-destructive/10 rounded-xl p-3 text-center">
                    <p className="text-lg font-bold text-destructive">{displayReturns.filter(r => r.type === 'return').length}</p>
                    <p className="text-[10px] text-muted-foreground">مرتجع</p>
                  </div>
                  <div className="bg-amber-500/10 rounded-xl p-3 text-center">
                    <p className="text-lg font-bold text-amber-600">{displayReturns.filter(r => r.type === 'exchange').length}</p>
                    <p className="text-[10px] text-muted-foreground">استبدال</p>
                  </div>
                </div>
                {todayReturnsTotal > 0 && (
                  <div className="bg-destructive/10 rounded-xl p-3 text-center">
                    <p className="text-lg font-bold text-destructive">-{todayReturnsTotal} ج.م</p>
                    <p className="text-[10px] text-muted-foreground">إجمالي قيمة المرتجعات</p>
                  </div>
                )}
                {displayReturns.length > 0 ? (
                  <ScrollableList className="space-y-2">
                    {[...displayReturns].sort((a, b) => compareDateTime(a.date, a.time, b.date, b.time)).map((ret) => (
                      <div key={ret.id} className="bg-muted/30 rounded-lg p-3 text-sm">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${ret.type === 'return' ? 'bg-destructive/15 text-destructive' : 'bg-amber-500/15 text-amber-600'}`}>
                              {ret.type === 'return' ? 'مرتجع' : 'استبدال'}
                            </span>
                            <span className="text-xs text-muted-foreground">{ret.time}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-destructive">-{ret.refundAmount} ج.م</span>
                            {user?.role === 'admin' && (
                              <button
                                onClick={() => setPendingDeleteReturn(ret.id)}
                                className="w-6 h-6 rounded-md bg-muted flex items-center justify-center text-muted-foreground hover:bg-destructive hover:text-destructive-foreground transition-colors"
                              >
                                <Trash2 size={12} />
                              </button>
                            )}
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {ret.items.map(i => `${i.productName} x${i.quantity}`).join(' • ')}
                        </p>
                        {ret.reason && <p className="text-xs text-muted-foreground/70 mt-0.5">السبب: {ret.reason}</p>}
                        <p className="text-[10px] text-muted-foreground/60 mt-0.5">العامل: {ret.workerName} • فاتورة #{ret.saleId}</p>
                      </div>
                    ))}
                  </ScrollableList>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">لا توجد مرتجعات اليوم</p>
                )}
              </>
            )}

            {/* === Profit Dialog (Admin only) === */}
            {activeStatDialog === 'profit' && user?.role === 'admin' && (
              <>
                <div className="bg-gradient-to-br from-amber-500/10 to-orange-600/10 rounded-xl p-4 text-center">
                  <p className="text-3xl font-bold text-foreground">{Math.round(netProfit * 100) / 100} ج.م</p>
                  <p className="text-xs text-muted-foreground mt-1">صافي الربح اليوم</p>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-secondary rounded-xl p-3 text-center">
                    <p className="text-lg font-bold text-foreground">{Math.round(todayTotal * 100) / 100}</p>
                    <p className="text-[10px] text-muted-foreground">ج.م مبيعات</p>
                  </div>
                  <div className="bg-destructive/10 rounded-xl p-3 text-center">
                    <p className="text-lg font-bold text-destructive">{Math.round(totalCost * 100) / 100}</p>
                    <p className="text-[10px] text-muted-foreground">ج.م تكلفة</p>
                  </div>
                  <div className="bg-primary/10 rounded-xl p-3 text-center">
                    <p className="text-lg font-bold text-primary">{totalCost > 0 ? Math.round((netProfit / todayTotal) * 100) || 0 : 0}%</p>
                    <p className="text-[10px] text-muted-foreground">هامش ربح</p>
                  </div>
                </div>
                {productBreakdown.length > 0 && (
                  <div>
                    <h3 className="font-bold text-foreground text-sm mb-2">ربح كل صنف</h3>
                    <ScrollableList className="space-y-1.5">
                      {productBreakdown.map((p, i) => {
                        const product = products.find(pr => pr.name === p.name);
                        const invItem = inventory.find(inv => inv.name === p.name);
                        const unitCost = product ? product.costPrice : invItem ? invItem.costPerUnit : 0;
                        const itemProfit = p.total - (unitCost * p.quantity);
                        return (
                          <div key={i} className="flex items-center justify-between bg-secondary rounded-lg p-3">
                            <span className="text-sm font-medium text-foreground">{p.name}</span>
                            <div className="flex items-center gap-3 text-sm">
                              <span className="text-muted-foreground">{p.quantity}x</span>
                              <span className={`font-bold ${itemProfit >= 0 ? 'text-green-600' : 'text-destructive'}`}>{Math.round(itemProfit)} ج.م</span>
                            </div>
                          </div>
                        );
                      })}
                    </ScrollableList>
                  </div>
                )}
              </>
            )}

          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Sale Dialog */}
      <Dialog open={!!editingSale} onOpenChange={(open) => { if (!open) setEditingSale(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center">تعديل الفاتورة</DialogTitle>
          </DialogHeader>
          {editingSale && (
            <div className="space-y-4">
              <div className="text-center text-sm text-muted-foreground">
                {editingSale.date} - {editingSale.time}
              </div>
              <div className="space-y-2">
                {editItems.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-secondary rounded-xl p-3">
                    <div className="flex-1">
                      <p className="font-medium text-sm text-foreground">{item.productName}</p>
                      <p className="text-xs text-muted-foreground">{item.unitPrice} ج.م</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setEditItems(prev => {
                            const updated = [...prev];
                            if (updated[idx].quantity <= 1) return updated.filter((_, i) => i !== idx);
                            updated[idx] = { ...updated[idx], quantity: updated[idx].quantity - 1, total: (updated[idx].quantity - 1) * updated[idx].unitPrice };
                            return updated;
                          });
                        }}
                        className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center text-foreground hover:bg-destructive hover:text-destructive-foreground transition-colors"
                      >
                        <span className="text-sm font-bold">-</span>
                      </button>
                      <span className="w-6 text-center font-bold text-sm text-foreground">{item.quantity}</span>
                      <button
                        onClick={() => {
                          setEditItems(prev => {
                            const updated = [...prev];
                            updated[idx] = { ...updated[idx], quantity: updated[idx].quantity + 1, total: (updated[idx].quantity + 1) * updated[idx].unitPrice };
                            return updated;
                          });
                        }}
                        className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center text-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                      >
                        <span className="text-sm font-bold">+</span>
                      </button>
                    </div>
                    <p className="font-bold text-sm mr-3 text-foreground">{item.total} ج.م</p>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-foreground whitespace-nowrap">خصم %</label>
                <input
                  type="number" min="0" max="100"
                  value={editDiscount || ''}
                  onChange={(e) => setEditDiscount(Math.min(100, Math.max(0, Number(e.target.value))))}
                  placeholder="0" dir="ltr" lang="en"
                  className="flex h-9 w-20 rounded-lg border border-input bg-background px-2 py-1 text-sm text-center ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>

              {(() => {
                const subtotal = editItems.reduce((s, i) => s + i.total, 0);
                const discAmt = Math.round(subtotal * editDiscount / 100 * 100) / 100;
                const final_ = subtotal - discAmt;
                return (
                  <div className="border-t border-border pt-3 space-y-1">
                    {editDiscount > 0 && (
                      <>
                        <div className="flex justify-between text-sm text-muted-foreground">
                          <span>المجموع قبل الخصم</span><span>{subtotal} ج.م</span>
                        </div>
                        <div className="flex justify-between text-sm text-destructive">
                          <span>خصم {editDiscount}%</span><span>- {discAmt} ج.م</span>
                        </div>
                      </>
                    )}
                    <div className="flex justify-between font-bold text-foreground">
                      <span>الإجمالي</span><span className="text-accent">{final_} ج.م</span>
                    </div>
                  </div>
                );
              })()}

              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    if (editItems.length === 0) { toast.error('لا يمكن حفظ فاتورة فارغة'); return; }
                    const subtotal = editItems.reduce((s, i) => s + i.total, 0);
                    const discAmt = Math.round(subtotal * editDiscount / 100 * 100) / 100;
                    const finalTotal = subtotal - discAmt;
                    const updated: Sale = { ...editingSale, items: editItems, total: finalTotal, discount: editDiscount > 0 ? { percent: editDiscount, amount: discAmt } : undefined };
                    updateSale(updated);
                    setEditingSale(null);
                    forceUpdate(n => n + 1);
                    toast.success('تم تعديل الفاتورة');
                  }}
                  className="flex-1 cafe-gradient text-primary-foreground hover:opacity-90"
                >
                  <Check size={16} className="ml-1" />
                  حفظ التعديل
                </Button>
                <Button variant="outline" onClick={() => setEditingSale(null)} className="flex-1">
                  <X size={16} className="ml-1" />
                  إلغاء
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Password Confirmation */}
      <PasswordConfirmDialog
        open={!!passwordAction}
        onOpenChange={(open) => { if (!open) setPasswordAction(null); }}
        title={passwordAction?.type === 'delete' ? 'تأكيد الحذف' : 'تأكيد التعديل'}
        description="أدخل كلمة المرور للمتابعة"
        onConfirm={() => {
          if (!passwordAction) return;
          if (passwordAction.type === 'delete') {
            deleteSale(passwordAction.sale.id);
            forceUpdate(n => n + 1);
            toast.success('تم حذف الفاتورة');
          } else {
            setEditingSale(passwordAction.sale);
            setEditItems(passwordAction.sale.items.map(i => ({ ...i })));
            setEditDiscount(passwordAction.sale.discount?.percent || 0);
          }
          setPasswordAction(null);
        }}
      />
      <PasswordConfirmDialog
        open={!!pendingDeleteReturn}
        onOpenChange={(open) => { if (!open) setPendingDeleteReturn(null); }}
        title="تأكيد حذف المرتجع"
        description="أدخل كلمة المرور لحذف هذا المرتجع"
        onConfirm={() => {
          if (pendingDeleteReturn) {
            deleteReturn(pendingDeleteReturn);
            setPendingDeleteReturn(null);
            forceUpdate(n => n + 1);
            toast.success('تم حذف المرتجع');
          }
        }}
      />
    </div>
  );
};

export default Dashboard;