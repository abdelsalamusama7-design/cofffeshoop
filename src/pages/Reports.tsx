import { useState, useMemo, useEffect, useCallback } from 'react';
import { compareDateTime } from '@/lib/utils';
import { motion } from 'framer-motion';
import {
  BarChart3, Calendar, Share2, Download, TrendingUp, DollarSign,
  ShoppingCart, Users, ClipboardCheck, Wallet, Clock, ArrowUpDown, RotateCcw, ArrowLeftRight,
  Trash2, Edit3, X, Check, History, AlertTriangle, Package, Mail
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getSales, getProducts, getCurrentUser, getWorkers, getAttendance, getTransactions, getInventory, getReturns, deleteSale, updateSale, getShiftResets, getWorkerExpenses } from '@/lib/store';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import ScrollableList from '@/components/ScrollableList';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Sale, SaleItem, ShiftResetRecord, ReturnRecord, AttendanceRecord, WorkerTransaction, Expense, WorkerExpense } from '@/lib/types';
import PasswordConfirmDialog from '@/components/PasswordConfirmDialog';

const Reports = () => {
  const [, forceUpdate] = useState(0);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [editItems, setEditItems] = useState<SaleItem[]>([]);
  const [editDiscount, setEditDiscount] = useState<number>(0);
  const [passwordAction, setPasswordAction] = useState<{ type: 'edit' | 'delete'; sale: Sale } | null>(null);
  const [shiftResets, setShiftResets] = useState<ShiftResetRecord[]>([]);
  const [cloudReturns, setCloudReturns] = useState<ReturnRecord[]>([]);
  const [cloudSales, setCloudSales] = useState<Sale[]>([]);
  const [cloudAttendance, setCloudAttendance] = useState<AttendanceRecord[]>([]);
  const [cloudTransactions, setCloudTransactions] = useState<WorkerTransaction[]>([]);
  const [cloudExpenses, setCloudExpenses] = useState<Expense[]>([]);
  const [cloudWorkerExpenses, setCloudWorkerExpenses] = useState<WorkerExpense[]>([]);
  const [cloudLoaded, setCloudLoaded] = useState(false);

  useEffect(() => {
    getShiftResets().then(setShiftResets);

    const fetchAllCloud = async () => {
      try {
        const [returnsRes, salesRes, attendanceRes, transactionsRes, expensesRes, workerExpensesRes] = await Promise.all([
          supabase.from('returns').select('*'),
          supabase.from('sales').select('*'),
          supabase.from('attendance').select('*'),
          supabase.from('transactions').select('*'),
          supabase.from('expenses').select('*'),
          supabase.from('worker_expenses').select('*'),
        ]);

        if (returnsRes.data) {
          setCloudReturns(returnsRes.data.map((r: any) => ({
            id: r.id, saleId: r.sale_id, type: r.type as 'return' | 'exchange',
            items: r.items as SaleItem[], exchangeItems: r.exchange_items as SaleItem[] | undefined,
            refundAmount: r.refund_amount, reason: r.reason || '',
            workerId: r.worker_id, workerName: r.worker_name, date: r.date, time: r.time,
          })));
        }
        if (salesRes.data) {
          setCloudSales(salesRes.data.map((s: any) => ({
            id: s.id, items: s.items as SaleItem[], total: s.total,
            discount: s.discount as Sale['discount'], workerId: s.worker_id,
            workerName: s.worker_name, date: s.date, time: s.time,
          })));
        }
        if (attendanceRes.data) {
          setCloudAttendance(attendanceRes.data.map((a: any) => ({
            id: a.id, workerId: a.worker_id, workerName: a.worker_name,
            date: a.date, checkIn: a.check_in, checkOut: a.check_out,
            type: a.type as 'present' | 'absent' | 'leave',
            shift: a.shift as 'morning' | 'evening' | undefined,
            hoursWorked: a.hours_worked,
          })));
        }
        if (transactionsRes.data) {
          setCloudTransactions(transactionsRes.data.map((t: any) => ({
            id: t.id, workerId: t.worker_id, workerName: t.worker_name,
            type: t.type as 'advance' | 'bonus', amount: t.amount,
            note: t.note || '', date: t.date,
          })));
        }
        if (expensesRes.data) {
          setCloudExpenses(expensesRes.data.map((e: any) => ({
            id: e.id, name: e.name, amount: e.amount,
            category: e.category, note: e.note || '', date: e.date,
          })));
        }
        if (workerExpensesRes.data) {
          setCloudWorkerExpenses(workerExpensesRes.data.map((w: any) => ({
            id: w.id, workerId: w.worker_id, workerName: w.worker_name,
            amount: w.amount, reason: w.reason, date: w.date, time: w.time,
          })));
        }
        setCloudLoaded(true);
      } catch (e) {
        // Fallback to local on error
        setCloudLoaded(false);
      }
    };
    fetchAllCloud();
  }, []);

  const user = getCurrentUser();
  const sales = cloudLoaded ? cloudSales : getSales();
  const products = getProducts();
  const workers = getWorkers();
  const attendance = cloudLoaded ? cloudAttendance : getAttendance();
  const transactions = cloudLoaded ? cloudTransactions : getTransactions();
  const inventory = getInventory();
  const returns = cloudLoaded ? cloudReturns : getReturns();
  const workerExpensesData = cloudLoaded ? cloudWorkerExpenses : getWorkerExpenses();

  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
  const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];

  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly' | 'custom'>('daily');
  const [selectedDate, setSelectedDate] = useState(today);

  const startDate = period === 'custom' ? selectedDate : period === 'daily' ? today : period === 'weekly' ? weekAgo : monthAgo;
  const endDate = period === 'custom' ? selectedDate : undefined;
  const periodLabel = period === 'custom' ? selectedDate : period === 'daily' ? 'يومي' : period === 'weekly' ? 'أسبوعي' : 'شهري';

  const filteredSales = useMemo(() => sales.filter(s => endDate ? s.date === endDate : s.date >= startDate), [sales, startDate, endDate]);

  // Build return entries as negative sales for display
  const returnEntries = useMemo(() => {
    return returns
      .filter(r => endDate ? r.date === endDate : r.date >= startDate)
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
    return combined.sort((a, b) => compareDateTime(a.date, a.time, b.date, b.time));
  }, [filteredSales, returnEntries]);

  // ===== Share helper =====
  const share = (title: string, text: string, method: 'whatsapp' | 'email') => {
    if (method === 'whatsapp') {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    } else {
      window.open(`mailto:alameedbon1@gmail.com?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(text)}`, '_blank');
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
          <div class="date">${new Date().toLocaleDateString('ar-EG-u-nu-latn', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
        </div>
        ${lines.map(line => {
          if (line.includes('────')) return '';
          if (line.startsWith('•')) return `<div class="line bullet">${line}</div>`;
          if (line.includes(':') && !line.startsWith(' ') && !line.startsWith('•')) return `<div class="line section">${line}</div>`;
          if (line.trim() === '') return '<br/>';
          return `<div class="line">${line}</div>`;
        }).join('')}
        <div class="footer">تم إنشاء هذا التقرير تلقائياً • ${new Date().toLocaleTimeString('ar-EG-u-nu-latn')}</div>
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
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <div className="glass-card rounded-xl p-3 sm:p-4 text-center">
            <ShoppingCart size={20} className="mx-auto text-accent mb-1.5" />
            <p className="text-lg sm:text-xl font-bold text-foreground">{filteredSales.length}</p>
            <p className="text-[11px] text-muted-foreground">طلب</p>
          </div>
          <div className="glass-card rounded-xl p-3 sm:p-4 text-center">
            <DollarSign size={20} className="mx-auto text-success mb-1.5" />
            <p className="text-sm sm:text-xl font-bold text-foreground truncate">{totalSales} ج.م</p>
            <p className="text-[11px] text-muted-foreground">مبيعات</p>
          </div>
          <div className="glass-card rounded-xl p-3 sm:p-4 text-center">
            <ArrowUpDown size={20} className="mx-auto text-info mb-1.5" />
            <p className="text-lg sm:text-xl font-bold text-foreground">{totalItems}</p>
            <p className="text-xs text-muted-foreground">منتج مباع</p>
          </div>
        </div>

        <div className="glass-card rounded-xl p-4">
          <h3 className="font-bold text-foreground mb-3">تفاصيل المنتجات</h3>
          {Object.values(productBreakdown).length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-4">لا توجد مبيعات</p>
          ) : (
            <ScrollableList maxHeight="max-h-96" className="space-y-2">
              {Object.values(productBreakdown).sort((a, b) => b.total - a.total).map((p, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-secondary">
                  <span className="text-sm font-medium text-foreground">{p.name}</span>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="text-muted-foreground">{p.quantity} وحدة</span>
                    <span className="font-bold text-foreground">{p.total} ج.م</span>
                  </div>
                </div>
              ))}
            </ScrollableList>
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
    const filteredReturns = returns.filter(r => endDate ? r.date === endDate : r.date >= startDate);
    const totalReturnsAmount = filteredReturns.reduce((sum, r) => sum + r.refundAmount, 0);
    const grossSales = filteredSales.reduce((sum, s) => sum + s.total, 0);
    const totalSales = grossSales - totalReturnsAmount;
    const grossCost = filteredSales.reduce((sum, s) =>
      sum + s.items.reduce((c, item) => {
        const p = products.find(pr => pr.id === item.productId || `product_${pr.id}` === item.productId);
        const invItem = inventory.find(i => `inv_${i.id}` === item.productId);
        const cost = p ? p.costPrice : invItem ? invItem.costPerUnit : 0;
        return c + (cost * item.quantity);
      }, 0), 0);
    const returnsCost = filteredReturns.reduce((sum, r) =>
      sum + r.items.reduce((c, item) => {
        const p = products.find(pr => pr.id === item.productId || `product_${pr.id}` === item.productId);
        const invItem = inventory.find(i => `inv_${i.id}` === item.productId);
        const cost = p ? p.costPrice : invItem ? invItem.costPerUnit : 0;
        return c + (cost * item.quantity);
      }, 0), 0);
    const totalCost = grossCost - returnsCost;
    const profit = totalSales - totalCost;
    const margin = totalSales > 0 ? Math.round((profit / totalSales) * 100) : 0;

    const productProfits: { name: string; revenue: number; cost: number; profit: number }[] = [];
    const map: Record<string, { name: string; revenue: number; cost: number }> = {};
    filteredSales.forEach(sale => {
      sale.items.forEach(item => {
        if (!map[item.productId]) map[item.productId] = { name: item.productName, revenue: 0, cost: 0 };
        map[item.productId].revenue += item.total;
        const p = products.find(pr => pr.id === item.productId || `product_${pr.id}` === item.productId);
        const invItem = inventory.find(i => `inv_${i.id}` === item.productId);
        const cost = p ? p.costPrice : invItem ? invItem.costPerUnit : 0;
        map[item.productId].cost += cost * item.quantity;
      });
    });
    // Subtract returns from per-product breakdown
    filteredReturns.forEach(ret => {
      ret.items.forEach(item => {
        if (map[item.productId]) {
          map[item.productId].revenue -= item.total;
          const p = products.find(pr => pr.id === item.productId || `product_${pr.id}` === item.productId);
          const invItem = inventory.find(i => `inv_${i.id}` === item.productId);
          const cost = p ? p.costPrice : invItem ? invItem.costPerUnit : 0;
          map[item.productId].cost -= cost * item.quantity;
        }
      });
    });
    Object.values(map).filter(m => m.revenue > 0).forEach(m => productProfits.push({ ...m, profit: m.revenue - m.cost }));
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
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          <div className="glass-card rounded-xl p-3 sm:p-4 text-center">
            <DollarSign size={20} className="mx-auto text-success mb-1.5" />
            <p className="text-sm sm:text-xl font-bold text-foreground truncate">{Math.round(totalSales * 100) / 100} ج.م</p>
            <p className="text-[11px] text-muted-foreground">إيرادات</p>
          </div>
          <div className="glass-card rounded-xl p-3 sm:p-4 text-center">
            <Wallet size={20} className="mx-auto text-destructive mb-1.5" />
            <p className="text-sm sm:text-xl font-bold text-foreground truncate">{Math.round(totalCost * 100) / 100} ج.م</p>
            <p className="text-[11px] text-muted-foreground">تكلفة</p>
          </div>
          <div className="glass-card rounded-xl p-3 sm:p-4 text-center">
            <TrendingUp size={20} className="mx-auto text-accent mb-1.5" />
            <p className="text-sm sm:text-xl font-bold text-foreground truncate">{Math.round(profit * 100) / 100} ج.م</p>
            <p className="text-[11px] text-muted-foreground">صافي الربح</p>
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
    const filteredReturns = returns.filter(r => endDate ? r.date === endDate : r.date >= startDate);
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
    const filteredAttendance = attendance.filter(r => endDate ? r.date === endDate : r.date >= startDate);
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

  // ===== Low Stock Report =====
  const LowStockReport = () => {
    const LOW_STOCK_THRESHOLD = 5;
    const [sending, setSending] = useState(false);

    const lowStockItems = inventory.filter(item => item.quantity <= LOW_STOCK_THRESHOLD);

    const affectedProducts: { name: string; missingIngredient: string; remaining: number; unit: string }[] = [];
    products.forEach(product => {
      if (product.ingredients && Array.isArray(product.ingredients)) {
        (product.ingredients as any[]).forEach(ing => {
          const invItem = inventory.find(i => i.id === ing.inventoryItemId);
          if (invItem && invItem.quantity <= LOW_STOCK_THRESHOLD) {
            affectedProducts.push({
              name: product.name,
              missingIngredient: invItem.name,
              remaining: invItem.quantity,
              unit: invItem.unit,
            });
          }
        });
      }
    });

    let text = `⚠️ تقرير نقص المخزون\n`;
    text += `التاريخ: ${today}\n────────────\n`;
    text += `عدد الأصناف المنخفضة: ${lowStockItems.length}\n\n`;
    if (lowStockItems.length > 0) {
      text += `📦 أصناف منخفضة:\n`;
      lowStockItems.forEach(item => {
        text += `• ${item.name}: ${item.quantity} ${item.unit} ${item.quantity <= 0 ? '🔴 نفذ' : '🟡 منخفض'}\n`;
      });
    }
    if (affectedProducts.length > 0) {
      text += `\n☕ منتجات متأثرة:\n`;
      affectedProducts.forEach(p => {
        text += `• ${p.name} — ${p.missingIngredient} (متبقي: ${p.remaining} ${p.unit})\n`;
      });
    }

    const sendEmailNow = async () => {
      setSending(true);
      try {
        const { data, error } = await supabase.functions.invoke('send-low-stock-report');
        if (error) throw error;
        toast.success('تم إرسال تقرير نقص المخزون بالإيميل 📧');
      } catch (err) {
        console.error(err);
        toast.error('فشل إرسال الإيميل');
      } finally {
        setSending(false);
      }
    };

    return (
      <div className="space-y-4 mt-4">
        <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
          <AlertTriangle size={20} className="text-destructive" />
          أصناف قاربت على الانتهاء
        </h3>

        {lowStockItems.length === 0 && affectedProducts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Package size={32} className="mx-auto mb-2 opacity-50" />
            <p className="text-sm">جميع الأصناف في مستوى آمن ✅</p>
          </div>
        ) : (
          <>
            {lowStockItems.length > 0 && (
              <div className="glass-card rounded-xl p-4">
                <h4 className="font-bold text-foreground mb-3">📦 أصناف المخزون المنخفضة ({lowStockItems.length})</h4>
                <div className="space-y-2">
                  {lowStockItems.sort((a, b) => a.quantity - b.quantity).map(item => (
                    <div key={item.id} className={`flex items-center justify-between p-3 rounded-lg ${item.quantity <= 0 ? 'bg-destructive/10 border border-destructive/30' : 'bg-warning/10 border border-warning/30'}`}>
                      <span className="text-sm font-medium text-foreground">{item.name}</span>
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-bold ${item.quantity <= 0 ? 'text-destructive' : 'text-warning'}`}>
                          {item.quantity} {item.unit}
                        </span>
                        <span className="text-xs">{item.quantity <= 0 ? '🔴' : '🟡'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {affectedProducts.length > 0 && (
              <div className="glass-card rounded-xl p-4">
                <h4 className="font-bold text-foreground mb-3">☕ منتجات متأثرة بنقص المواد الخام</h4>
                <div className="space-y-2">
                  {affectedProducts.map((p, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-warning/10 border border-warning/30">
                      <div>
                        <span className="text-sm font-medium text-foreground">{p.name}</span>
                        <p className="text-xs text-muted-foreground">المادة الناقصة: {p.missingIngredient}</p>
                      </div>
                      <span className="text-sm font-bold text-warning">{p.remaining} {p.unit}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        <Button
          onClick={sendEmailNow}
          disabled={sending || (lowStockItems.length === 0 && affectedProducts.length === 0)}
          variant="outline"
          className="w-full border-destructive/30 text-destructive hover:bg-destructive/10"
        >
          <Mail size={16} className="ml-2" />
          {sending ? 'جاري الإرسال...' : 'إرسال تنبيه للإيميل الآن'}
        </Button>

        <p className="text-xs text-muted-foreground text-center">
          📧 يتم إرسال هذا التقرير تلقائياً كل يوم الصبح لـ alameedbon1@gmail.com
        </p>

        <ShareButtons title="تقرير نقص المخزون" text={text} />
      </div>
    );
  };

  // ===== Worker Expenses Report =====
  const WorkerExpensesReport = () => {
    const filtered = workerExpensesData.filter(e => endDate ? e.date === endDate : e.date >= startDate);
    const total = filtered.reduce((s, e) => s + e.amount, 0);

    const byWorker: Record<string, { name: string; total: number; items: typeof filtered }> = {};
    filtered.forEach(e => {
      if (!byWorker[e.workerId]) byWorker[e.workerId] = { name: e.workerName, total: 0, items: [] };
      byWorker[e.workerId].total += e.amount;
      byWorker[e.workerId].items.push(e);
    });

    let text = `💰 تقرير مصروفات العمال ${periodLabel}\n`;
    text += `التاريخ: ${today}\n────────────\n`;
    text += `إجمالي المصروفات: ${total} ج.م\n\n`;
    Object.values(byWorker).forEach(w => {
      text += `👤 ${w.name}: ${w.total} ج.م\n`;
      w.items.forEach(e => { text += `  • ${e.reason} — ${e.amount} ج.م (${e.time})\n`; });
      text += `\n`;
    });

    return (
      <div className="space-y-4 mt-4">
        <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
          <Wallet size={20} />
          مصروفات العمال (سحب نقدية)
        </h3>

        <div className="grid grid-cols-2 gap-3">
          <div className="glass-card rounded-xl p-4 text-center">
            <Wallet size={22} className="mx-auto text-destructive mb-2" />
            <p className="text-xl font-bold text-foreground">{Math.round(total * 100) / 100} ج.م</p>
            <p className="text-xs text-muted-foreground">إجمالي المصروفات</p>
          </div>
          <div className="glass-card rounded-xl p-4 text-center">
            <Users size={22} className="mx-auto text-accent mb-2" />
            <p className="text-xl font-bold text-foreground">{Object.keys(byWorker).length}</p>
            <p className="text-xs text-muted-foreground">عدد العمال</p>
          </div>
        </div>

        {Object.values(byWorker).length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Wallet size={32} className="mx-auto mb-2 opacity-50" />
            <p className="text-sm">لا توجد مصروفات عمال في هذه الفترة</p>
          </div>
        ) : (
          <div className="space-y-3">
            {Object.values(byWorker).sort((a, b) => b.total - a.total).map((w, i) => (
              <div key={i} className="glass-card rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-foreground">👤 {w.name}</span>
                  <span className="text-sm font-bold text-destructive">{w.total} ج.م</span>
                </div>
                <div className="space-y-1">
                  {w.items.sort((a, b) => compareDateTime(a.date || '', a.time, b.date || '', b.time)).map(e => (
                    <div key={e.id} className="flex items-center justify-between p-2 rounded-lg bg-secondary text-sm">
                      <div>
                        <span className="text-foreground">{e.reason}</span>
                        <span className="text-xs text-muted-foreground mr-2">{e.date} • {e.time}</span>
                      </div>
                      <span className="font-bold text-destructive">{e.amount} ج.م</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <ShareButtons title={`تقرير مصروفات العمال ${periodLabel}`} text={text} />
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
      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-2">
          {(['daily', 'weekly', 'monthly'] as const).map(p => (
            <Button key={p} variant={period === p ? 'default' : 'outline'} onClick={() => setPeriod(p)}
              className={period === p ? 'cafe-gradient text-primary-foreground' : ''}>
              {p === 'daily' ? 'يومي' : p === 'weekly' ? 'أسبوعي' : 'شهري'}
            </Button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={period === 'custom' && selectedDate === yesterday ? 'default' : 'outline'}
            size="sm"
            onClick={() => { setPeriod('custom'); setSelectedDate(yesterday); }}
            className={period === 'custom' && selectedDate === yesterday ? 'cafe-gradient text-primary-foreground' : ''}
          >
            أمس
          </Button>
          <div className="flex-1 relative">
            <input
              type="date"
              value={period === 'custom' ? selectedDate : ''}
              onChange={(e) => { setSelectedDate(e.target.value); setPeriod('custom'); }}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              dir="ltr"
              max={today}
            />
          </div>
          <Calendar size={18} className="text-muted-foreground" />
        </div>
      </div>

      {/* Report tabs */}
      <Tabs defaultValue="sales" dir="rtl">
        <TabsList className="w-full flex overflow-x-auto h-auto gap-1 justify-start p-1">
          <TabsTrigger value="sales" className="text-xs py-2 px-3 whitespace-nowrap flex-shrink-0">
            <ShoppingCart size={14} className="ml-1" />
            المبيعات
          </TabsTrigger>
          <TabsTrigger value="profits" className="text-xs py-2 px-3 whitespace-nowrap flex-shrink-0">
            <TrendingUp size={14} className="ml-1" />
            الأرباح
          </TabsTrigger>
          <TabsTrigger value="returns" className="text-xs py-2 px-3 whitespace-nowrap flex-shrink-0">
            <RotateCcw size={14} className="ml-1" />
            المرتجعات
          </TabsTrigger>
          <TabsTrigger value="workers" className="text-xs py-2 px-3 whitespace-nowrap flex-shrink-0">
            <Users size={14} className="ml-1" />
            أداء العمال
          </TabsTrigger>
          <TabsTrigger value="attendance" className="text-xs py-2 px-3 whitespace-nowrap flex-shrink-0">
            <ClipboardCheck size={14} className="ml-1" />
            الحضور
          </TabsTrigger>
          <TabsTrigger value="workerexpenses" className="text-xs py-2 px-3 whitespace-nowrap flex-shrink-0">
            <Wallet size={14} className="ml-1" />
            مصروفات العمال
          </TabsTrigger>
          <TabsTrigger value="lowstock" className="text-xs py-2 px-3 whitespace-nowrap flex-shrink-0">
            <AlertTriangle size={14} className="ml-1" />
            نقص المخزون
          </TabsTrigger>
          <TabsTrigger value="resets" className="text-xs py-2 px-3 whitespace-nowrap flex-shrink-0">
            <History size={14} className="ml-1" />
            التصفيرات
          </TabsTrigger>
        </TabsList>
        <TabsContent value="sales"><SalesReport /></TabsContent>
        <TabsContent value="profits"><ProfitsReport /></TabsContent>
        <TabsContent value="returns"><ReturnsReport /></TabsContent>
        <TabsContent value="workers"><WorkerPerformanceReport /></TabsContent>
        <TabsContent value="attendance"><AttendanceReport /></TabsContent>
        <TabsContent value="workerexpenses"><WorkerExpensesReport /></TabsContent>
        <TabsContent value="lowstock"><LowStockReport /></TabsContent>
        <TabsContent value="resets">
          <div className="space-y-3 mt-4">
            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
              <History size={20} />
              سجل تصفيرات الشيفت
            </h3>
            {shiftResets.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <History size={32} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">لا توجد عمليات تصفير مسجلة</p>
              </div>
            ) : (
              <ScrollableList maxHeight="max-h-[60vh]" className="space-y-2">
                {shiftResets.map(reset => (
                  <div key={reset.id} className="bg-muted/50 rounded-xl p-4 space-y-1 border border-border">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">🕐 {reset.resetTime}</span>
                      <span className="text-xs text-muted-foreground">📅 {reset.resetDate}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-foreground">👤 {reset.workerName}</span>
                    </div>
                    {reset.reportSummary && (
                      <details className="mt-2">
                        <summary className="text-xs text-primary cursor-pointer hover:underline">عرض تقرير الشيفت</summary>
                        <ScrollableList maxHeight="max-h-60">
                          <pre className="text-xs text-muted-foreground whitespace-pre-wrap mt-2 bg-background rounded-lg p-3 border border-border">
                            {reset.reportSummary}
                          </pre>
                        </ScrollableList>
                      </details>
                    )}
                  </div>
                ))}
              </ScrollableList>
            )}
          </div>
        </TabsContent>
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
