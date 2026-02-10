import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Wallet, ShoppingCart, DollarSign, TrendingUp, Plus, Trash2, Share2, Download,
  Users, BarChart3, ArrowUpCircle, ArrowDownCircle, Calculator
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getSales, getProducts, getTransactions, getInventory, getExpenses, addExpense, deleteExpense, getWorkers, getAttendance } from '@/lib/store';
import { Expense } from '@/lib/types';

const Expenses = () => {
  const sales = getSales();
  const products = getProducts();
  const transactions = getTransactions();
  const inventory = getInventory();
  const workers = getWorkers();
  const attendance = getAttendance();

  const today = new Date().toISOString().split('T')[0];
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
  const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
  const monthStr = today.substring(0, 7);

  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [expenses, setExpensesState] = useState<Expense[]>(getExpenses());
  const [newName, setNewName] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newCategory, setNewCategory] = useState('عامة');
  const [newNote, setNewNote] = useState('');

  const startDate = period === 'daily' ? today : period === 'weekly' ? weekAgo : monthAgo;
  const periodLabel = period === 'daily' ? 'يومي' : period === 'weekly' ? 'أسبوعي' : 'شهري';

  const filteredSales = useMemo(() => sales.filter(s => s.date >= startDate), [sales, startDate]);

  const expenseCategories = ['إيجار', 'كهرباء', 'مياه', 'غاز', 'صيانة', 'نقل', 'تسويق', 'عامة'];

  const handleAddExpense = () => {
    if (!newName || !newAmount || Number(newAmount) <= 0) return;
    const expense: Expense = {
      id: Date.now().toString(),
      name: newName,
      amount: Number(newAmount),
      category: newCategory,
      note: newNote,
      date: new Date().toISOString().split('T')[0],
    };
    addExpense(expense);
    setExpensesState(getExpenses());
    setNewName('');
    setNewAmount('');
    setNewNote('');
  };

  const handleDelete = (id: string) => {
    deleteExpense(id);
    setExpensesState(getExpenses());
  };

  const filteredTxns = transactions.filter(t => t.date >= startDate);
  const filteredExpenses = expenses.filter(e => e.date >= startDate);
  const advances = filteredTxns.filter(t => t.type === 'advance');
  const bonuses = filteredTxns.filter(t => t.type === 'bonus');
  const totalAdvances = advances.reduce((s, t) => s + t.amount, 0);
  const totalBonuses = bonuses.reduce((s, t) => s + t.amount, 0);
  const totalCustomExpenses = filteredExpenses.reduce((s, e) => s + e.amount, 0);

  const inventoryCost = inventory.reduce((s, inv) => s + inv.quantity * inv.costPerUnit, 0);

  const cogs = filteredSales.reduce((sum, s) =>
    sum + s.items.reduce((c, item) => {
      const p = products.find(pr => pr.id === item.productId);
      return c + (p ? p.costPrice * item.quantity : 0);
    }, 0), 0);

  const totalExpenses = totalAdvances + totalBonuses + cogs + totalCustomExpenses;

  const expensesByCategory: Record<string, number> = {};
  filteredExpenses.forEach(e => {
    expensesByCategory[e.category] = (expensesByCategory[e.category] || 0) + e.amount;
  });

  /* ====== Monthly Auto-Calculated Financial Summary ====== */
  const monthlySummary = useMemo(() => {
    const monthSales = sales.filter(s => s.date.startsWith(monthStr));
    const monthTxns = transactions.filter(t => t.date.startsWith(monthStr));
    const monthExpenses = expenses.filter(e => e.date.startsWith(monthStr));
    const monthAttendance = attendance.filter(a => a.date.startsWith(monthStr));

    // Total revenue
    const totalRevenue = monthSales.reduce((s, sale) => s + sale.total, 0);

    // COGS
    const monthCogs = monthSales.reduce((sum, s) =>
      sum + s.items.reduce((c, item) => {
        const p = products.find(pr => pr.id === item.productId);
        return c + (p ? p.costPrice * item.quantity : 0);
      }, 0), 0);

    // Salaries based on attendance
    const workerSalaries = workers
      .filter(w => w.role !== 'admin')
      .reduce((sum, w) => {
        const presentDays = monthAttendance.filter(a => a.workerId === w.id && a.type === 'present').length;
        return sum + Math.round((w.salary / 30) * presentDays);
      }, 0);

    const monthAdvances = monthTxns.filter(t => t.type === 'advance').reduce((s, t) => s + t.amount, 0);
    const monthBonuses = monthTxns.filter(t => t.type === 'bonus').reduce((s, t) => s + t.amount, 0);
    const monthCustomExpenses = monthExpenses.reduce((s, e) => s + e.amount, 0);

    const totalMonthExpenses = monthCogs + workerSalaries + monthBonuses + monthCustomExpenses;
    // Net = Revenue - All Expenses + Advances (advances are deducted from worker, so they come back)
    const netProfit = totalRevenue - totalMonthExpenses + monthAdvances;

    return {
      totalRevenue,
      monthCogs,
      workerSalaries,
      monthAdvances,
      monthBonuses,
      monthCustomExpenses,
      totalMonthExpenses,
      netProfit,
    };
  }, [sales, transactions, expenses, attendance, workers, products, monthStr]);

  // Share & PDF helpers
  const getReportText = () => {
    let text = `💸 تقرير المصروفات ${periodLabel}\n`;
    text += `التاريخ: ${today}\n────────────\n`;
    text += `تكلفة البضاعة المباعة: ${cogs} ج.م\n`;
    text += `سلف العمال: ${totalAdvances} ج.م\n`;
    text += `مكافآت العمال: ${totalBonuses} ج.م\n`;
    text += `مصروفات أخرى: ${totalCustomExpenses} ج.م\n`;
    text += `إجمالي المصروفات: ${totalExpenses} ج.م\n`;
    text += `\nقيمة المخزون الحالي: ${inventoryCost} ج.م\n`;
    text += `\n━━━ ملخص الشهر التلقائي ━━━\n`;
    text += `إجمالي المبيعات: ${monthlySummary.totalRevenue} ج.م\n`;
    text += `تكلفة البضاعة: ${monthlySummary.monthCogs} ج.م\n`;
    text += `المرتبات: ${monthlySummary.workerSalaries} ج.م\n`;
    text += `المكافآت: ${monthlySummary.monthBonuses} ج.م\n`;
    text += `السلف (مستردة): ${monthlySummary.monthAdvances} ج.م\n`;
    text += `مصروفات تشغيلية: ${monthlySummary.monthCustomExpenses} ج.م\n`;
    text += `إجمالي مصروفات الشهر: ${monthlySummary.totalMonthExpenses} ج.م\n`;
    text += `💰 صافي الربح: ${monthlySummary.netProfit} ج.م\n`;
    if (Object.keys(expensesByCategory).length > 0) {
      text += `\nتفاصيل المصروفات:\n`;
      Object.entries(expensesByCategory).forEach(([cat, amount]) => {
        text += `• ${cat}: ${amount} ج.م\n`;
      });
    }
    if (filteredExpenses.length > 0) {
      text += `\nبنود المصروفات:\n`;
      filteredExpenses.forEach(e => {
        text += `• ${e.name} (${e.category}): ${e.amount} ج.م${e.note ? ' - ' + e.note : ''}\n`;
      });
    }
    if (filteredTxns.length > 0) {
      text += `\nمعاملات العمال:\n`;
      filteredTxns.forEach(t => {
        text += `• ${t.workerName}: ${t.type === 'advance' ? 'سلفة' : 'مكافأة'} ${t.amount} ج.م - ${t.note}\n`;
      });
    }
    return text;
  };

  const share = (method: 'whatsapp' | 'email') => {
    const text = getReportText();
    const title = `تقرير المصروفات ${periodLabel}`;
    if (method === 'whatsapp') {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    } else {
      window.open(`mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(text)}`, '_blank');
    }
  };

  const downloadPDF = () => {
    const text = getReportText();
    const title = `تقرير المصروفات ${periodLabel}`;
    const lines = text.split('\n');
    const htmlContent = `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8"><title>${title}</title><style>@media print{@page{margin:20mm;size:A4;}body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}}body{font-family:'Segoe UI',Tahoma,Arial,sans-serif;direction:rtl;padding:40px;color:#1a1a1a;line-height:1.8;max-width:800px;margin:0 auto;}.header{text-align:center;border-bottom:3px solid #8B4513;padding-bottom:20px;margin-bottom:30px;}.header h1{font-size:24px;color:#8B4513;margin:0 0 8px 0;}.header .date{color:#666;font-size:14px;}.line{padding:6px 0;font-size:15px;border-bottom:1px solid #f0f0f0;}.line.section{font-weight:bold;font-size:16px;color:#8B4513;margin-top:16px;border-bottom:2px solid #e8d5c4;}.line.bullet{padding-right:16px;}.footer{margin-top:40px;text-align:center;color:#999;font-size:12px;border-top:1px solid #eee;padding-top:16px;}</style></head><body><div class="header"><h1>${title}</h1><div class="date">${new Date().toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div></div>${lines.map(line => { if (line.includes('────') || line.includes('━━━')) return ''; if (line.startsWith('•')) return `<div class="line bullet">${line}</div>`; if (line.includes(':') && !line.startsWith(' ') && !line.startsWith('•')) return `<div class="line section">${line}</div>`; if (line.trim() === '') return '<br/>'; return `<div class="line">${line}</div>`; }).join('')}<div class="footer">تم إنشاء هذا التقرير تلقائياً • ${new Date().toLocaleTimeString('ar-EG')}</div></body></html>`;
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      setTimeout(() => printWindow.print(), 300);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">المصروفات</h1>

      {/* Period selector */}
      <div className="grid grid-cols-3 gap-2">
        {(['daily', 'weekly', 'monthly'] as const).map(p => (
          <Button key={p} variant={period === p ? 'default' : 'outline'} onClick={() => setPeriod(p)}
            className={period === p ? 'cafe-gradient text-primary-foreground' : ''}>
            {p === 'daily' ? 'يومي' : p === 'weekly' ? 'أسبوعي' : 'شهري'}
          </Button>
        ))}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="glass-card rounded-xl p-4 text-center">
          <Wallet size={22} className="mx-auto text-destructive mb-2" />
          <p className="text-xl font-bold text-foreground">{totalExpenses} ج.م</p>
          <p className="text-xs text-muted-foreground">إجمالي المصروفات</p>
        </div>
        <div className="glass-card rounded-xl p-4 text-center">
          <ShoppingCart size={22} className="mx-auto text-warning mb-2" />
          <p className="text-xl font-bold text-foreground">{cogs} ج.م</p>
          <p className="text-xs text-muted-foreground">تكلفة البضاعة</p>
        </div>
        <div className="glass-card rounded-xl p-4 text-center">
          <DollarSign size={22} className="mx-auto text-info mb-2" />
          <p className="text-xl font-bold text-foreground">{totalAdvances} ج.م</p>
          <p className="text-xs text-muted-foreground">سلف</p>
        </div>
        <div className="glass-card rounded-xl p-4 text-center">
          <TrendingUp size={22} className="mx-auto text-success mb-2" />
          <p className="text-xl font-bold text-foreground">{totalBonuses} ج.م</p>
          <p className="text-xs text-muted-foreground">مكافآت</p>
        </div>
        <div className="glass-card rounded-xl p-4 text-center col-span-2 md:col-span-1">
          <Wallet size={22} className="mx-auto text-accent mb-2" />
          <p className="text-xl font-bold text-foreground">{totalCustomExpenses} ج.م</p>
          <p className="text-xs text-muted-foreground">مصروفات أخرى</p>
        </div>
      </div>

      {/* ====== Monthly Financial Summary ====== */}
      <div className="glass-card rounded-xl p-5 space-y-4 border-2 border-primary/20">
        <div className="flex items-center gap-2 mb-1">
          <Calculator size={22} className="text-primary" />
          <h2 className="text-lg font-bold text-foreground">ملخص الشهر المالي التلقائي</h2>
          <span className="text-xs bg-primary/15 text-primary px-2 py-0.5 rounded-full mr-auto">{monthStr}</span>
        </div>

        {/* Revenue */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-primary/10">
          <div className="flex items-center gap-2">
            <ArrowUpCircle size={18} className="text-primary" />
            <span className="font-medium text-foreground">إجمالي المبيعات (الإيرادات)</span>
          </div>
          <span className="font-bold text-primary text-lg">{monthlySummary.totalRevenue} ج.م</span>
        </div>

        {/* Expense Breakdown */}
        <div className="space-y-2">
          <p className="text-sm font-semibold text-muted-foreground flex items-center gap-1">
            <ArrowDownCircle size={14} /> المصروفات التفصيلية
          </p>
          {[
            { label: 'تكلفة البضاعة المباعة', value: monthlySummary.monthCogs, icon: ShoppingCart },
            { label: 'مرتبات العمال (حسب الحضور)', value: monthlySummary.workerSalaries, icon: Users },
            { label: 'مكافآت العمال', value: monthlySummary.monthBonuses, icon: TrendingUp },
            { label: 'مصروفات تشغيلية', value: monthlySummary.monthCustomExpenses, icon: Wallet },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="flex items-center justify-between p-2.5 rounded-lg bg-secondary">
              <div className="flex items-center gap-2">
                <Icon size={15} className="text-muted-foreground" />
                <span className="text-sm text-foreground">{label}</span>
              </div>
              <span className="font-bold text-destructive text-sm">-{value} ج.م</span>
            </div>
          ))}
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-secondary">
            <div className="flex items-center gap-2">
              <DollarSign size={15} className="text-muted-foreground" />
              <span className="text-sm text-foreground">سلف عمال (مستردة من المرتب)</span>
            </div>
            <span className="font-bold text-primary text-sm">+{monthlySummary.monthAdvances} ج.م</span>
          </div>
        </div>

        {/* Total Expenses */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-destructive/10 border border-destructive/20">
          <span className="font-bold text-foreground">إجمالي مصروفات الشهر</span>
          <span className="font-bold text-destructive text-lg">{monthlySummary.totalMonthExpenses} ج.م</span>
        </div>

        {/* Net Profit */}
        <div className={`flex items-center justify-between p-4 rounded-xl border-2 ${monthlySummary.netProfit >= 0 ? 'bg-primary/10 border-primary/30' : 'bg-destructive/10 border-destructive/30'}`}>
          <div className="flex items-center gap-2">
            <BarChart3 size={20} className={monthlySummary.netProfit >= 0 ? 'text-primary' : 'text-destructive'} />
            <span className="font-bold text-foreground text-lg">صافي الربح</span>
          </div>
          <span className={`font-bold text-2xl ${monthlySummary.netProfit >= 0 ? 'text-primary' : 'text-destructive'}`}>
            {monthlySummary.netProfit} ج.م
          </span>
        </div>
      </div>

      {/* Add Expense Form */}
      <div className="glass-card rounded-xl p-4 space-y-3">
        <h3 className="font-bold text-foreground flex items-center gap-2">
          <Plus size={18} /> إضافة مصروف
        </h3>
        <div className="grid grid-cols-2 gap-2">
          <Input placeholder="اسم المصروف" value={newName} onChange={e => setNewName(e.target.value)} className="col-span-2" />
          <Input inputMode="numeric" pattern="[0-9]*" placeholder="المبلغ" value={newAmount} onChange={e => setNewAmount(e.target.value.replace(/[^0-9.]/g, ''))} />
          <select value={newCategory} onChange={e => setNewCategory(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background">
            {expenseCategories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <Input placeholder="ملاحظة (اختياري)" value={newNote} onChange={e => setNewNote(e.target.value)} className="col-span-2" />
        </div>
        <Button onClick={handleAddExpense} className="w-full cafe-gradient text-primary-foreground" disabled={!newName || !newAmount}>
          <Plus size={16} className="ml-2" /> إضافة
        </Button>
      </div>

      {/* Expenses by category */}
      {Object.keys(expensesByCategory).length > 0 && (
        <div className="glass-card rounded-xl p-4">
          <h3 className="font-bold text-foreground mb-3">المصروفات حسب التصنيف</h3>
          <div className="space-y-2">
            {Object.entries(expensesByCategory).sort((a, b) => b[1] - a[1]).map(([cat, amount]) => (
              <div key={cat} className="flex items-center justify-between p-3 rounded-lg bg-secondary">
                <span className="text-sm font-medium text-foreground">{cat}</span>
                <span className="font-bold text-foreground">{amount} ج.م</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Individual expenses list */}
      {filteredExpenses.length > 0 && (
        <div className="glass-card rounded-xl p-4">
          <h3 className="font-bold text-foreground mb-3">بنود المصروفات</h3>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {filteredExpenses.slice().reverse().map(e => (
              <motion.div key={e.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-between p-3 rounded-lg bg-secondary">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">{e.name}</span>
                    <span className="text-xs bg-accent/20 text-accent px-2 py-0.5 rounded-full">{e.category}</span>
                  </div>
                  {e.note && <p className="text-xs text-muted-foreground mt-1">{e.note}</p>}
                  <p className="text-xs text-muted-foreground">{e.date}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-destructive text-sm">{e.amount} ج.م</span>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(e.id)}>
                    <Trash2 size={14} />
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      <div className="glass-card rounded-xl p-4">
        <h3 className="font-bold text-foreground mb-2">قيمة المخزون الحالي</h3>
        <p className="text-2xl font-bold text-accent">{inventoryCost} ج.م</p>
      </div>

      {filteredTxns.length > 0 && (
        <div className="glass-card rounded-xl p-4">
          <h3 className="font-bold text-foreground mb-3">معاملات العمال</h3>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {filteredTxns.slice().reverse().map((t, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-secondary">
                <div>
                  <span className="text-sm font-medium text-foreground">{t.workerName}</span>
                  <p className="text-xs text-muted-foreground">{t.note} • {t.date}</p>
                </div>
                <span className={`text-sm font-bold ${t.type === 'advance' ? 'text-destructive' : 'text-success'}`}>
                  {t.type === 'advance' ? 'سلفة' : 'مكافأة'} {t.amount} ج.م
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Share buttons */}
      <div className="flex gap-2">
        <Button variant="outline" onClick={downloadPDF} className="flex-1">
          <Download size={16} className="ml-2" /> PDF
        </Button>
        <Button variant="outline" onClick={() => share('whatsapp')} className="flex-1">
          <Share2 size={16} className="ml-2" /> واتساب
        </Button>
        <Button variant="outline" onClick={() => share('email')} className="flex-1">
          <Share2 size={16} className="ml-2" /> إيميل
        </Button>
      </div>
    </div>
  );
};

export default Expenses;
