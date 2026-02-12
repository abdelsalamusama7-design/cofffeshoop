import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart3, Calendar, Share2, Download, TrendingUp, DollarSign,
  ShoppingCart, Users, ClipboardCheck, Wallet, Clock, ArrowUpDown, RotateCcw, ArrowLeftRight,
  Trash2, Edit3, X, Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getSales, getProducts, getCurrentUser, getWorkers, getAttendance, getTransactions, getInventory, getReturns, deleteSale, updateSale } from '@/lib/store';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ScrollableList from '@/components/ScrollableList';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Sale, SaleItem } from '@/lib/types';
import PasswordConfirmDialog from '@/components/PasswordConfirmDialog';

const Reports = () => {
  const [, forceUpdate] = useState(0);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [editItems, setEditItems] = useState<SaleItem[]>([]);
  const [editDiscount, setEditDiscount] = useState<number>(0);
  const [passwordAction, setPasswordAction] = useState<{ type: 'edit' | 'delete'; sale: Sale } | null>(null);

  const user = getCurrentUser();
  const sales = getSales();
  const products = getProducts();
  const workers = getWorkers();
  const attendance = getAttendance();
  const transactions = getTransactions();
  const inventory = getInventory();
  const returns = getReturns();

  const today = new Date().toISOString().split('T')[0];
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
  const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
  const currentMonth = new Date().toISOString().slice(0, 7);

  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');

  const startDate = period === 'daily' ? today : period === 'weekly' ? weekAgo : monthAgo;
  const periodLabel = period === 'daily' ? 'يومي' : period === 'weekly' ? 'أسبوعي' : 'شهري';

  const filteredSales = useMemo(() => sales.filter(s => s.date >= startDate), [sales, startDate]);

  // Build return entries as negative sales for display
  const returnEntries = useMemo(() => {
    return returns
      .filter(r => r.date >= startDate)
      .map(r => ({
        id: `return_${r.id}`,
        items: r.items,
        total: -r.refundAmount,
        discount: undefined,
        workerId: r.workerId,
        workerName: r.workerName,
        date: r.date,
        time: r.time,
        isReturn: true,
        returnType: r.type,
        reason: r.reason,
        saleId: r.saleId,
      }));
  }, [returns, startDate]);

  // Combined sales + returns for display
  const allEntries = useMemo(() => {
    const combined = [
      ...filteredSales.map(s => ({ ...s, isReturn: false as const })),
      ...returnEntries,
    ];
    return combined.sort((a, b) => new Date(b.date + ' ' + b.time).getTime() - new Date(a.date + ' ' + a.time).getTime());
  }, [filteredSales, returnEntries]);

  // ===== Share helper =====
  const share = (title: string, text: string, method: 'whatsapp' | 'email') => {
    if (method === 'whatsapp') {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    } else {
      window.open(`mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(text)}`, '_blank');
    }
  };

  const downloadPDF = (title: string, text: string) => {
    const lines = text.split('\n');
    const htmlContent = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <title>${title}</title>
        <style>
          @media print {
            @page { margin: 20mm; size: A4; }
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
          body {
            font-family: 'Segoe UI', Tahoma, Arial, sans-serif;
            direction: rtl;
            padding: 40px;
            color: #1a1a1a;
            line-height: 1.8;
            max-width: 800px;
            margin: 0 auto;
          }
          .header {
            text-align: center;
            border-bottom: 3px solid #8B4513;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          .header h1 {
            font-size: 24px;
            color: #8B4513;
            margin: 0 0 8px 0;
          }
          .header .date {
            color: #666;
            font-size: 14px;
          }
          .line {
            padding: 6px 0;
            font-size: 15px;
            border-bottom: 1px solid #f0f0f0;
          }
          .line.section {
            font-weight: bold;
            font-size: 16px;
            color: #8B4513;
            margin-top: 16px;
            border-bottom: 2px solid #e8d5c4;
          }
          .line.bullet {
            padding-right: 16px;
          }
          .footer {
            margin-top: 40px;
            text-align: center;
            color: #999;
            font-size: 12px;
            border-top: 1px solid #eee;
            padding-top: 16px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${title}</h1>
          <div class="date">${new Date().toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
        </div>
        ${lines.map(line => {
          if (line.includes('────')) return '';
          if (line.startsWith('•')) return `<div class="line bullet">${line}</div>`;
          if (line.includes(':') && !line.startsWith(' ') && !line.startsWith('•')) return `<div class="line section">${line}</div>`;
          if (line.trim() === '') return '<br/>';
          return `<div class="line">${line}</div>`;
        }).join('')}
        <div class="footer">تم إنشاء هذا التقرير تلقائياً • ${new Date().toLocaleTimeString('ar-EG')}</div>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      setTimeout(() => {
        printWindow.print();
      }, 300);
    }
  };

  const ShareButtons = ({ title, text }: { title: string; text: string }) => (
    <div className="flex gap-2 mt-4">
      <Button variant="outline" onClick={() => downloadPDF(title, text)} className="flex-1">
        <Download size={16} className="ml-2" />
        PDF
      </Button>
      <Button variant="outline" onClick={() => share(title, text, 'whatsapp')} className="flex-1">
        <Share2 size={16} className="ml-2" />
        واتساب
      </Button>
      <Button variant="outline" onClick={() => share(title, text, 'email')} className="flex-1">
        <Share2 size={16} className="ml-2" />
        إيميل
      </Button>
    </div>
  );

  // ===== 1. Sales Report =====
  const SalesReport = () => {
    const totalSales = filteredSales.reduce((sum, s) => sum + s.total, 0);
    const totalItems = filteredSales.reduce((sum, s) => sum + s.items.reduce((c, i) => c + i.quantity, 0), 0);

    const productBreakdown: Record<string, { name: string; quantity: number; total: number }> = {};
    filteredSales.forEach(sale => {
      sale.items.forEach(item => {
        if (!productBreakdown[item.productId]) {
          productBreakdown[item.productId] = { name: item.productName, quantity: 0, total: 0 };
        }
        productBreakdown[item.productId].quantity += item.quantity;
        productBreakdown[item.productId].total += item.total;
      });
    });

    let text = `📊 تقرير المبيعات ${periodLabel}\n`;
    text += `التاريخ: ${today}\n────────────\n`;
    text += `عدد الطلبات: ${filteredSales.length}\n`;
    text += `إجمالي المبيعات: ${totalSales} ج.م\n`;
    text += `عدد المنتجات المباعة: ${totalItems}\n\n`;
    text += `تفاصيل المنتجات:\n`;
    Object.values(productBreakdown).sort((a, b) => b.total - a.total).forEach(p => {
      text += `• ${p.name}: ${p.quantity} وحدة - ${p.total} ج.م\n`;
    });

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="glass-card rounded-xl p-4 text-center">
            <ShoppingCart size={22} className="mx-auto text-accent mb-2" />
            <p className="text-xl font-bold text-foreground">{filteredSales.length}</p>
            <p className="text-xs text-muted-foreground">طلب</p>
          </div>
          <div className="glass-card rounded-xl p-4 text-center">
            <DollarSign size={22} className="mx-auto text-success mb-2" />
            <p className="text-xl font-bold text-foreground">{totalSales} ج.م</p>
            <p className="text-xs text-muted-foreground">مبيعات</p>
          </div>
          <div className="glass-card rounded-xl p-4 text-center">
            <ArrowUpDown size={22} className="mx-auto text-info mb-2" />
            <p className="text-xl font-bold text-foreground">{totalItems}</p>
            <p className="text-xs text-muted-foreground">منتج مباع</p>
          </div>
        </div>

        <div className="glass-card rounded-xl p-4">
          <h3 className="font-bold text-foreground mb-3">تفاصيل المنتجات</h3>
          {Object.values(productBreakdown).length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-4">لا توجد مبيعات</p>
          ) : (
            <div className="space-y-2">
              {Object.values(productBreakdown).sort((a, b) => b.total - a.total).map((p, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-secondary">
                  <span className="text-sm font-medium text-foreground">{p.name}</span>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="text-muted-foreground">{p.quantity} وحدة</span>
                    <span className="font-bold text-foreground">{p.total} ج.م</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sale by sale detail + returns */}
        {allEntries.length > 0 && (
          <div className="glass-card rounded-xl p-4">
            <h3 className="font-bold text-foreground mb-3">تفاصيل الطلبات والمرتجعات</h3>
            <ScrollableList className="space-y-2">
              {allEntries.map((entry) => (
                <div key={entry.id} className={`p-3 rounded-lg text-sm ${entry.isReturn ? 'bg-destructive/10 border border-destructive/30' : 'bg-secondary'}`}>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      {entry.isReturn && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-destructive/15 text-destructive">
                          مرتجع
                        </span>
                      )}
                      <span className="font-medium text-foreground">{entry.workerName} - {entry.time}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`font-bold ${entry.isReturn ? 'text-destructive' : 'text-foreground'}`}>
                        {entry.isReturn ? `${entry.total}` : entry.total} ج.م
                      </span>
                      {!entry.isReturn && (
                        <>
                          <button
                            onClick={() => setPasswordAction({ type: 'edit', sale: entry as Sale })}
                            className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                            title="تعديل"
                          >
                            <Edit3 size={14} />
                          </button>
                          <button
                            onClick={() => setPasswordAction({ type: 'delete', sale: entry as Sale })}
                            className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center text-muted-foreground hover:bg-destructive hover:text-destructive-foreground transition-colors"
                            title="حذف"
                          >
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {entry.items.map(it => `${it.productName} x${it.quantity}`).join(' • ')}
                  </p>
                  {entry.isReturn && entry.reason && (
                    <p className="text-xs text-destructive/70 mt-1">السبب: {entry.reason}</p>
                  )}
                  {!entry.isReturn && (entry as Sale).discount && (entry as Sale).discount!.percent > 0 && (
                    <p className="text-xs text-destructive mt-1">خصم {(entry as Sale).discount!.percent}%: -{(entry as Sale).discount!.amount} ج.م</p>
                  )}
                </div>
              ))}
            </ScrollableList>
          </div>
        )}

        <ShareButtons title={`تقرير المبيعات ${periodLabel}`} text={text} />
      </div>
    );
  };

  // ===== 2. Profits Report =====
  const ProfitsReport = () => {
    const totalSales = filteredSales.reduce((sum, s) => sum + s.total, 0);
    const totalCost = filteredSales.reduce((sum, s) =>
      sum + s.items.reduce((c, item) => {
        const p = products.find(pr => pr.id === item.productId);
        return c + (p ? p.costPrice * item.quantity : 0);
      }, 0), 0);
    const profit = totalSales - totalCost;
    const margin = totalSales > 0 ? Math.round((profit / totalSales) * 100) : 0;

    const productProfits: { name: string; revenue: number; cost: number; profit: number }[] = [];
    const map: Record<string, { name: string; revenue: number; cost: number }> = {};
    filteredSales.forEach(sale => {
      sale.items.forEach(item => {
        if (!map[item.productId]) map[item.productId] = { name: item.productName, revenue: 0, cost: 0 };
        map[item.productId].revenue += item.total;
        const p = products.find(pr => pr.id === item.productId);
        if (p) map[item.productId].cost += p.costPrice * item.quantity;
      });
    });
    Object.values(map).forEach(m => productProfits.push({ ...m, profit: m.revenue - m.cost }));
    productProfits.sort((a, b) => b.profit - a.profit);

    let text = `💰 تقرير الأرباح ${periodLabel}\n`;
    text += `التاريخ: ${today}\n────────────\n`;
    text += `إجمالي المبيعات: ${totalSales} ج.م\n`;
    text += `إجمالي التكلفة: ${totalCost} ج.م\n`;
    text += `صافي الربح: ${profit} ج.م\n`;
    text += `هامش الربح: ${margin}%\n\n`;
    text += `أرباح المنتجات:\n`;
    productProfits.forEach(p => {
      text += `• ${p.name}: إيراد ${p.revenue} - تكلفة ${p.cost} = ربح ${p.profit} ج.م\n`;
    });

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="glass-card rounded-xl p-4 text-center">
            <DollarSign size={22} className="mx-auto text-success mb-2" />
            <p className="text-xl font-bold text-foreground">{totalSales} ج.م</p>
            <p className="text-xs text-muted-foreground">إيرادات</p>
          </div>
          <div className="glass-card rounded-xl p-4 text-center">
            <Wallet size={22} className="mx-auto text-destructive mb-2" />
            <p className="text-xl font-bold text-foreground">{totalCost} ج.م</p>
            <p className="text-xs text-muted-foreground">تكلفة</p>
          </div>
          <div className="glass-card rounded-xl p-4 text-center">
            <TrendingUp size={22} className="mx-auto text-accent mb-2" />
            <p className="text-xl font-bold text-foreground">{profit} ج.م</p>
            <p className="text-xs text-muted-foreground">صافي الربح</p>
          </div>
          <div className="glass-card rounded-xl p-4 text-center">
            <BarChart3 size={22} className="mx-auto text-info mb-2" />
            <p className="text-xl font-bold text-foreground">{margin}%</p>
            <p className="text-xs text-muted-foreground">هامش الربح</p>
          </div>
        </div>

        <div className="glass-card rounded-xl p-4">
          <h3 className="font-bold text-foreground mb-3">أرباح المنتجات</h3>
          {productProfits.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-4">لا توجد بيانات</p>
          ) : (
            <div className="space-y-2">
              {productProfits.map((p, i) => (
                <div key={i} className="p-3 rounded-lg bg-secondary space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">{p.name}</span>
                    <span className="font-bold text-success text-sm">{p.profit} ج.م ربح</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>إيراد: {p.revenue} ج.م</span>
                    <span>تكلفة: {p.cost} ج.م</span>
                  </div>
                  <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-success rounded-full" style={{ width: `${Math.min((p.profit / Math.max(productProfits[0]?.profit, 1)) * 100, 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <ShareButtons title={`تقرير الأرباح ${periodLabel}`} text={text} />
      </div>
    );
  };

  // ===== 3. Worker Performance Report =====
  const WorkerPerformanceReport = () => {
    const workerData = workers.map(w => {
      const workerSales = filteredSales.filter(s => s.workerId === w.id);
      const totalSales = workerSales.reduce((sum, s) => sum + s.total, 0);
      const itemsSold = workerSales.reduce((sum, s) => sum + s.items.reduce((c, i) => c + i.quantity, 0), 0);
      const totalCost = workerSales.reduce((sum, s) =>
        sum + s.items.reduce((c, item) => {
          const p = products.find(pr => pr.id === item.productId);
          return c + (p ? p.costPrice * item.quantity : 0);
        }, 0), 0);
      return { name: w.name, salesCount: workerSales.length, totalSales, itemsSold, profit: totalSales - totalCost };
    }).sort((a, b) => b.totalSales - a.totalSales);

    const overallTotal = workerData.reduce((s, w) => s + w.totalSales, 0);

    let text = `👷 تقرير أداء العمال ${periodLabel}\n`;
    text += `التاريخ: ${today}\n────────────\n`;
    workerData.forEach(w => {
      text += `\n👤 ${w.name}\n`;
      text += `  الطلبات: ${w.salesCount} | المنتجات: ${w.itemsSold}\n`;
      text += `  المبيعات: ${w.totalSales} ج.م | الربح: ${w.profit} ج.م\n`;
    });

    return (
      <div className="space-y-4">
        {workerData.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">لا توجد بيانات</p>
        ) : (
          <div className="space-y-3">
            {workerData.map((w, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className="glass-card rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {i === 0 && <span className="text-lg">🥇</span>}
                    {i === 1 && <span className="text-lg">🥈</span>}
                    {i === 2 && <span className="text-lg">🥉</span>}
                    <span className="font-bold text-foreground">{w.name}</span>
                  </div>
                  <span className="text-sm font-bold bg-accent/20 text-accent px-2 py-1 rounded-full">{w.totalSales} ج.م</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="bg-secondary rounded-lg p-2">
                    <p className="font-bold text-foreground">{w.salesCount}</p>
                    <p className="text-muted-foreground">طلب</p>
                  </div>
                  <div className="bg-secondary rounded-lg p-2">
                    <p className="font-bold text-foreground">{w.itemsSold}</p>
                    <p className="text-muted-foreground">منتج</p>
                  </div>
                  <div className="bg-secondary rounded-lg p-2">
                    <p className="font-bold text-success">{w.profit} ج.م</p>
                    <p className="text-muted-foreground">ربح</p>
                  </div>
                </div>
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-accent rounded-full" style={{ width: `${Math.min((w.totalSales / Math.max(overallTotal, 1)) * 100, 100)}%` }} />
                </div>
              </motion.div>
            ))}
          </div>
        )}
        <ShareButtons title={`تقرير أداء العمال ${periodLabel}`} text={text} />
      </div>
    );
  };


  // ===== 5. Returns Report =====
  const ReturnsReport = () => {
    const filteredReturns = returns.filter(r => r.date >= startDate);
    const totalReturns = filteredReturns.filter(r => r.type === 'return').length;
    const totalExchanges = filteredReturns.filter(r => r.type === 'exchange').length;
    const totalRefunded = filteredReturns.reduce((sum, r) => sum + r.refundAmount, 0);
    const totalReturnedItems = filteredReturns.reduce((sum, r) => sum + r.items.reduce((c, i) => c + i.quantity, 0), 0);

    // Most returned products
    const returnedProducts: Record<string, { name: string; quantity: number; total: number }> = {};
    filteredReturns.forEach(r => {
      r.items.forEach(item => {
        if (!returnedProducts[item.productId]) {
          returnedProducts[item.productId] = { name: item.productName, quantity: 0, total: 0 };
        }
        returnedProducts[item.productId].quantity += item.quantity;
        returnedProducts[item.productId].total += item.total;
      });
    });

    // Return reasons
    const reasons: Record<string, number> = {};
    filteredReturns.forEach(r => {
      reasons[r.reason] = (reasons[r.reason] || 0) + 1;
    });

    let text = `🔄 تقرير المرتجعات والبدل ${periodLabel}\n`;
    text += `التاريخ: ${today}\n────────────\n`;
    text += `عدد المرتجعات: ${totalReturns}\n`;
    text += `عدد عمليات البدل: ${totalExchanges}\n`;
    text += `إجمالي المبالغ المستردة: ${totalRefunded} ج.م\n`;
    text += `عدد الأصناف المرتجعة: ${totalReturnedItems}\n\n`;
    text += `الأصناف الأكثر إرجاعاً:\n`;
    Object.values(returnedProducts).sort((a, b) => b.quantity - a.quantity).forEach(p => {
      text += `• ${p.name}: ${p.quantity} وحدة - ${p.total} ج.م\n`;
    });
    if (Object.keys(reasons).length > 0) {
      text += `\nأسباب الإرجاع:\n`;
      Object.entries(reasons).sort((a, b) => b[1] - a[1]).forEach(([reason, count]) => {
        text += `• ${reason}: ${count} مرة\n`;
      });
    }

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="glass-card rounded-xl p-4 text-center">
            <RotateCcw size={22} className="mx-auto text-destructive mb-2" />
            <p className="text-xl font-bold text-foreground">{totalReturns}</p>
            <p className="text-xs text-muted-foreground">مرتجع</p>
          </div>
          <div className="glass-card rounded-xl p-4 text-center">
            <ArrowLeftRight size={22} className="mx-auto text-accent mb-2" />
            <p className="text-xl font-bold text-foreground">{totalExchanges}</p>
            <p className="text-xs text-muted-foreground">بدل</p>
          </div>
          <div className="glass-card rounded-xl p-4 text-center">
            <DollarSign size={22} className="mx-auto text-destructive mb-2" />
            <p className="text-xl font-bold text-foreground">{totalRefunded} ج.م</p>
            <p className="text-xs text-muted-foreground">مبالغ مستردة</p>
          </div>
          <div className="glass-card rounded-xl p-4 text-center">
            <ArrowUpDown size={22} className="mx-auto text-info mb-2" />
            <p className="text-xl font-bold text-foreground">{totalReturnedItems}</p>
            <p className="text-xs text-muted-foreground">صنف مرتجع</p>
          </div>
        </div>

        {/* Most returned products */}
        <div className="glass-card rounded-xl p-4">
          <h3 className="font-bold text-foreground mb-3">الأصناف الأكثر إرجاعاً</h3>
          {Object.values(returnedProducts).length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-4">لا توجد مرتجعات</p>
          ) : (
            <div className="space-y-2">
              {Object.values(returnedProducts).sort((a, b) => b.quantity - a.quantity).map((p, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-secondary">
                  <span className="text-sm font-medium text-foreground">{p.name}</span>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="text-muted-foreground">{p.quantity} وحدة</span>
                    <span className="font-bold text-foreground">{p.total} ج.م</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Return reasons */}
        {Object.keys(reasons).length > 0 && (
          <div className="glass-card rounded-xl p-4">
            <h3 className="font-bold text-foreground mb-3">أسباب الإرجاع</h3>
            <div className="space-y-2">
              {Object.entries(reasons).sort((a, b) => b[1] - a[1]).map(([reason, count], i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-secondary">
                  <span className="text-sm text-foreground">{reason}</span>
                  <span className="text-sm font-bold text-muted-foreground">{count} مرة</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent returns */}
        {filteredReturns.length > 0 && (
          <div className="glass-card rounded-xl p-4">
            <h3 className="font-bold text-foreground mb-3">آخر العمليات</h3>
            <ScrollableList className="space-y-2">
              {filteredReturns.slice().reverse().map((r) => (
                <div key={r.id} className="p-3 rounded-lg bg-secondary text-sm">
                  <div className="flex justify-between items-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                      r.type === 'return' ? 'bg-destructive/15 text-destructive' : 'bg-accent/15 text-accent'
                    }`}>
                      {r.type === 'return' ? 'مرتجع' : 'بدل'}
                    </span>
                    <span className="font-bold text-foreground">{r.refundAmount > 0 ? `${r.refundAmount} ج.م مسترد` : '-'}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {r.date} - {r.workerName} - {r.items.map(i => `${i.productName} x${i.quantity}`).join(' • ')}
                  </p>
                  <p className="text-xs text-muted-foreground">السبب: {r.reason}</p>
                </div>
              ))}
            </ScrollableList>
          </div>
        )}

        <ShareButtons title={`تقرير المرتجعات ${periodLabel}`} text={text} />
      </div>
    );
  };

  const AttendanceReport = () => {
    const filteredAttendance = attendance.filter(r => r.date >= startDate);
    const workerAttendance = workers.filter(w => w.role === 'worker').map(w => {
      const records = filteredAttendance.filter(r => r.workerId === w.id);
      const present = records.filter(r => r.type === 'present').length;
      const absent = records.filter(r => r.type === 'absent').length;
      const leave = records.filter(r => r.type === 'leave').length;
      const totalHours = Math.round(records.reduce((s, r) => s + (r.hoursWorked || 0), 0) * 10) / 10;
      const dailyRate = w.salary / 30;
      const deductions = absent * dailyRate;
      const netSalary = Math.round(w.salary - deductions);
      return { name: w.name, present, absent, leave, totalHours, salary: w.salary, netSalary };
    });

    let text = `📋 تقرير الحضور والانصراف ${periodLabel}\n`;
    text += `التاريخ: ${today}\n────────────\n`;
    workerAttendance.forEach(w => {
      text += `\n👤 ${w.name}\n`;
      text += `  حضور: ${w.present} | غياب: ${w.absent} | إجازة: ${w.leave}\n`;
      text += `  ساعات العمل: ${w.totalHours} ساعة\n`;
      text += `  المرتب الصافي: ${w.netSalary} ج.م\n`;
    });

    return (
      <div className="space-y-4">
        {workerAttendance.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">لا يوجد عمال</p>
        ) : (
          <div className="space-y-3">
            {workerAttendance.map((w, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className="glass-card rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-foreground">{w.name}</span>
                  <span className="text-sm font-medium text-accent">صافي: {w.netSalary} ج.م</span>
                </div>
                <div className="grid grid-cols-4 gap-2 text-center text-xs">
                  <div className="bg-success/10 rounded-lg p-2">
                    <p className="font-bold text-success text-lg">{w.present}</p>
                    <p className="text-muted-foreground">حضور</p>
                  </div>
                  <div className="bg-destructive/10 rounded-lg p-2">
                    <p className="font-bold text-destructive text-lg">{w.absent}</p>
                    <p className="text-muted-foreground">غياب</p>
                  </div>
                  <div className="bg-warning/10 rounded-lg p-2">
                    <p className="font-bold text-warning text-lg">{w.leave}</p>
                    <p className="text-muted-foreground">إجازة</p>
                  </div>
                  <div className="bg-info/10 rounded-lg p-2">
                    <p className="font-bold text-info text-lg">{w.totalHours}</p>
                    <p className="text-muted-foreground">ساعة</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
        <ShareButtons title={`تقرير الحضور ${periodLabel}`} text={text} />
      </div>
    );
  };

  if (user?.role !== 'admin') {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-foreground">التقارير</h1>
        <SalesReport />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">التقارير</h1>

      {/* Period selector */}
      <div className="grid grid-cols-3 gap-2">
        {(['daily', 'weekly', 'monthly'] as const).map(p => (
          <Button key={p} variant={period === p ? 'default' : 'outline'} onClick={() => setPeriod(p)}
            className={period === p ? 'cafe-gradient text-primary-foreground' : ''}>
            {p === 'daily' ? 'يومي' : p === 'weekly' ? 'أسبوعي' : 'شهري'}
          </Button>
        ))}
      </div>

      {/* Report tabs */}
      <Tabs defaultValue="sales" dir="rtl">
        <TabsList className="w-full grid grid-cols-5 h-auto">
          <TabsTrigger value="sales" className="text-xs py-2 px-1">
            <ShoppingCart size={14} className="ml-1 hidden sm:inline" />
            المبيعات
          </TabsTrigger>
          <TabsTrigger value="profits" className="text-xs py-2 px-1">
            <TrendingUp size={14} className="ml-1 hidden sm:inline" />
            الأرباح
          </TabsTrigger>
          <TabsTrigger value="returns" className="text-xs py-2 px-1">
            <RotateCcw size={14} className="ml-1 hidden sm:inline" />
            المرتجعات
          </TabsTrigger>
          <TabsTrigger value="workers" className="text-xs py-2 px-1">
            <Users size={14} className="ml-1 hidden sm:inline" />
            أداء العمال
          </TabsTrigger>
          <TabsTrigger value="attendance" className="text-xs py-2 px-1">
            <ClipboardCheck size={14} className="ml-1 hidden sm:inline" />
            الحضور
          </TabsTrigger>
        </TabsList>
        <TabsContent value="sales"><SalesReport /></TabsContent>
        <TabsContent value="profits"><ProfitsReport /></TabsContent>
        <TabsContent value="returns"><ReturnsReport /></TabsContent>
        <TabsContent value="workers"><WorkerPerformanceReport /></TabsContent>
        <TabsContent value="attendance"><AttendanceReport /></TabsContent>
      </Tabs>

      {/* Edit Sale Dialog */}
      <Dialog open={!!editingSale} onOpenChange={(open) => { if (!open) setEditingSale(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center">تعديل الفاتورة</DialogTitle>
          </DialogHeader>
          {editingSale && (
            <div className="space-y-4">
              <div className="text-center text-sm text-muted-foreground">
                {editingSale.date} - {editingSale.time} • {editingSale.workerName}
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
                            if (updated[idx].quantity <= 1) {
                              return updated.filter((_, i) => i !== idx);
                            }
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

              {/* Discount */}
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-foreground whitespace-nowrap">خصم %</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={editDiscount || ''}
                  onChange={(e) => setEditDiscount(Math.min(100, Math.max(0, Number(e.target.value))))}
                  placeholder="0"
                  dir="ltr"
                  lang="en"
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
                          <span>المجموع قبل الخصم</span>
                          <span>{subtotal} ج.م</span>
                        </div>
                        <div className="flex justify-between text-sm text-destructive">
                          <span>خصم {editDiscount}%</span>
                          <span>- {discAmt} ج.م</span>
                        </div>
                      </>
                    )}
                    <div className="flex justify-between font-bold text-foreground">
                      <span>الإجمالي</span>
                      <span className="text-accent">{final_} ج.م</span>
                    </div>
                  </div>
                );
              })()}

              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    if (editItems.length === 0) {
                      toast.error('لا يمكن حفظ فاتورة فارغة');
                      return;
                    }
                    const subtotal = editItems.reduce((s, i) => s + i.total, 0);
                    const discAmt = Math.round(subtotal * editDiscount / 100 * 100) / 100;
                    const finalTotal = subtotal - discAmt;
                    const updated: Sale = {
                      ...editingSale,
                      items: editItems,
                      total: finalTotal,
                      discount: editDiscount > 0 ? { percent: editDiscount, amount: discAmt } : undefined,
                    };
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

export default Reports;
