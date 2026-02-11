import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ShoppingCart, BarChart3, Package, TrendingUp, DollarSign, Coffee, ChevronLeft, Trash2, Edit3, X, Check } from 'lucide-react';
import { getProducts, getSales, getInventory, deleteSale, updateSale } from '@/lib/store';
import { getCurrentUser } from '@/lib/store';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Sale, SaleItem } from '@/lib/types';
import { toast } from 'sonner';
import PasswordConfirmDialog from '@/components/PasswordConfirmDialog';

const Dashboard = () => {
  const products = getProducts();
  const sales = getSales();
  const user = getCurrentUser();
  const inventory = getInventory();
  const [showSalesDetail, setShowSalesDetail] = useState(false);
  const [, forceUpdate] = useState(0);
  const [passwordAction, setPasswordAction] = useState<{ type: 'edit' | 'delete'; sale: Sale } | null>(null);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [editItems, setEditItems] = useState<SaleItem[]>([]);
  const [editDiscount, setEditDiscount] = useState<number>(0);

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
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-primary">{sale.total} ج.م</span>
                          <button
                            onClick={() => setPasswordAction({ type: 'edit', sale })}
                            className="w-6 h-6 rounded-md bg-muted flex items-center justify-center text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                          >
                            <Edit3 size={12} />
                          </button>
                          <button
                            onClick={() => setPasswordAction({ type: 'delete', sale })}
                            className="w-6 h-6 rounded-md bg-muted flex items-center justify-center text-muted-foreground hover:bg-destructive hover:text-destructive-foreground transition-colors"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
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
    </div>
  );
};

export default Dashboard;