import { useState } from 'react';
import { motion } from 'framer-motion';
import { Settings, Download, Share2, Mail, MessageCircle, Calendar, Clock, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { getSales, getProducts, getCategories, getInventory, getWorkers, getAttendance, getExpenses, getTransactions } from '@/lib/store';

type BackupFrequency = 'daily' | 'weekly' | 'monthly';
type ShareMethod = 'pdf' | 'email' | 'whatsapp';

const SettingsPage = () => {
  const [frequency, setFrequency] = useState<BackupFrequency>('daily');
  const [isGenerating, setIsGenerating] = useState(false);

  const getDateRange = () => {
    const now = new Date();
    const start = new Date();
    if (frequency === 'daily') start.setDate(now.getDate() - 1);
    else if (frequency === 'weekly') start.setDate(now.getDate() - 7);
    else start.setMonth(now.getMonth() - 1);
    return { start, end: now };
  };

  const generateReportContent = () => {
    const { start, end } = getDateRange();
    const sales = getSales().filter(s => {
      const d = new Date(s.date);
      return d >= start && d <= end;
    });
    const products = getProducts();
    const categories = getCategories();
    const inventory = getInventory();
    const workers = getWorkers();
    const attendance = getAttendance().filter(a => {
      const d = new Date(a.date);
      return d >= start && d <= end;
    });
    const expenses = getExpenses().filter(e => {
      const d = new Date(e.date);
      return d >= start && d <= end;
    });
    const transactions = getTransactions().filter(t => {
      const d = new Date(t.date);
      return d >= start && d <= end;
    });

    const totalSales = sales.reduce((s, sale) => s + sale.total, 0);
    const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
    const totalAdvances = transactions.filter(t => t.type === 'advance').reduce((s, t) => s + t.amount, 0);
    const inventoryValue = inventory.reduce((s, i) => s + i.quantity * i.costPerUnit, 0);
    const periodLabel = frequency === 'daily' ? 'يومي' : frequency === 'weekly' ? 'أسبوعي' : 'شهري';

    return {
      title: `تقرير ${periodLabel} - بن العميد`,
      date: `من ${start.toLocaleDateString('ar-EG')} إلى ${end.toLocaleDateString('ar-EG')}`,
      sections: [
        { label: '💰 إجمالي المبيعات', value: `${totalSales.toFixed(0)} ج.م`, detail: `${sales.length} عملية بيع` },
        { label: '📊 إجمالي المصروفات', value: `${totalExpenses.toFixed(0)} ج.م`, detail: `${expenses.length} مصروف` },
        { label: '💵 السلف المدفوعة', value: `${totalAdvances.toFixed(0)} ج.م`, detail: '' },
        { label: '📦 قيمة المخزون', value: `${inventoryValue.toFixed(0)} ج.م`, detail: `${inventory.length} صنف` },
        { label: '👥 عدد العمال', value: `${workers.length}`, detail: '' },
        { label: '✅ أيام الحضور', value: `${attendance.filter(a => a.type === 'present').length}`, detail: `غياب: ${attendance.filter(a => a.type === 'absent').length}` },
        { label: '📈 صافي الربح', value: `${(totalSales - totalExpenses - totalAdvances).toFixed(0)} ج.م`, detail: '' },
      ],
      salesDetails: sales.slice(0, 20).map(s => `${s.date} - ${s.workerName} - ${s.total} ج.م`),
      expenseDetails: expenses.map(e => `${e.date} - ${e.name} - ${e.amount} ج.م`),
    };
  };

  const handlePDF = () => {
    setIsGenerating(true);
    const report = generateReportContent();

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast({ title: 'خطأ', description: 'فعّل النوافذ المنبثقة في المتصفح', variant: 'destructive' });
      setIsGenerating(false);
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <title>${report.title}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap');
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Cairo', sans-serif; padding: 40px; background: #fff; color: #333; direction: rtl; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #8B5E3C; padding-bottom: 20px; }
          .header h1 { font-size: 24px; color: #8B5E3C; }
          .header p { color: #666; margin-top: 5px; }
          .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin: 20px 0; }
          .card { background: #f9f5f0; border: 1px solid #e0d5c8; border-radius: 12px; padding: 16px; text-align: center; }
          .card .label { font-size: 13px; color: #666; }
          .card .value { font-size: 22px; font-weight: 700; color: #8B5E3C; margin: 5px 0; }
          .card .detail { font-size: 11px; color: #999; }
          .section { margin-top: 25px; }
          .section h3 { font-size: 16px; color: #8B5E3C; margin-bottom: 10px; border-bottom: 1px solid #e0d5c8; padding-bottom: 5px; }
          .section p { font-size: 13px; line-height: 1.8; color: #555; }
          .footer { text-align: center; margin-top: 40px; color: #999; font-size: 11px; border-top: 1px solid #e0d5c8; padding-top: 15px; }
          @media print { body { padding: 20px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>☕ ${report.title}</h1>
          <p>${report.date}</p>
        </div>
        <div class="grid">
          ${report.sections.map(s => `
            <div class="card">
              <div class="label">${s.label}</div>
              <div class="value">${s.value}</div>
              ${s.detail ? `<div class="detail">${s.detail}</div>` : ''}
            </div>
          `).join('')}
        </div>
        ${report.salesDetails.length > 0 ? `
          <div class="section">
            <h3>📋 تفاصيل المبيعات</h3>
            ${report.salesDetails.map(d => `<p>${d}</p>`).join('')}
          </div>
        ` : ''}
        ${report.expenseDetails.length > 0 ? `
          <div class="section">
            <h3>📋 تفاصيل المصروفات</h3>
            ${report.expenseDetails.map(d => `<p>${d}</p>`).join('')}
          </div>
        ` : ''}
        <div class="footer">
          <p>بن العميد - تنفيذ InstaTech للبرمجيات - 01227080430</p>
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
      setIsGenerating(false);
    }, 500);

    toast({ title: '✅ تم', description: 'تم إنشاء التقرير' });
  };

  const handleShare = (method: ShareMethod) => {
    const report = generateReportContent();
    const text = `${report.title}\n${report.date}\n\n${report.sections.map(s => `${s.label}: ${s.value}`).join('\n')}\n\nبن العميد ☕`;

    if (method === 'pdf') {
      handlePDF();
    } else if (method === 'whatsapp') {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
      toast({ title: '✅', description: 'تم فتح الواتساب' });
    } else if (method === 'email') {
      window.open(`mailto:?subject=${encodeURIComponent(report.title)}&body=${encodeURIComponent(text)}`, '_blank');
      toast({ title: '✅', description: 'تم فتح البريد' });
    }
  };

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Settings className="text-accent" size={28} />
          الإعدادات
        </h1>
      </motion.div>

      {/* Backup & Share Section */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card rounded-2xl p-5 space-y-5">
        <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
          <Download size={20} className="text-accent" />
          النسخ الاحتياطي والمشاركة
        </h2>

        {/* Frequency Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground flex items-center gap-2">
            <Calendar size={16} className="text-muted-foreground" />
            فترة التقرير
          </label>
          <Select value={frequency} onValueChange={(v) => setFrequency(v as BackupFrequency)}>
            <SelectTrigger className="w-full bg-secondary">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">
                <span className="flex items-center gap-2"><Clock size={14} /> يومي</span>
              </SelectItem>
              <SelectItem value="weekly">
                <span className="flex items-center gap-2"><Calendar size={14} /> أسبوعي</span>
              </SelectItem>
              <SelectItem value="monthly">
                <span className="flex items-center gap-2"><Calendar size={14} /> شهري</span>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 gap-3">
          <Button
            onClick={() => handleShare('pdf')}
            disabled={isGenerating}
            className="cafe-gradient text-primary-foreground h-12 text-sm font-bold gap-2"
          >
            <Download size={18} />
            {isGenerating ? 'جاري الإنشاء...' : 'تحميل PDF'}
          </Button>

          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={() => handleShare('whatsapp')}
              variant="outline"
              className="h-12 text-sm font-medium gap-2 border-success/30 text-success hover:bg-success/10"
            >
              <MessageCircle size={18} />
              واتساب
            </Button>
            <Button
              onClick={() => handleShare('email')}
              variant="outline"
              className="h-12 text-sm font-medium gap-2 border-info/30 text-info hover:bg-info/10"
            >
              <Mail size={18} />
              بريد إلكتروني
            </Button>
          </div>
        </div>

        {/* Info */}
        <div className="bg-secondary/50 rounded-xl p-3 flex items-start gap-2">
          <CheckCircle2 size={16} className="text-accent mt-0.5 shrink-0" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            التقرير يشمل: المبيعات، المصروفات، الأرباح، المخزون، الحضور، والسلف. يمكنك اختيار الفترة (يومي/أسبوعي/شهري) ومشاركته بالطريقة المناسبة.
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default SettingsPage;
