import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, Calendar, Share2, Download, TrendingUp, DollarSign, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getSales, getProducts, getCurrentUser } from '@/lib/store';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const Reports = () => {
  const user = getCurrentUser();
  const sales = getSales();
  const products = getProducts();

  const today = new Date().toISOString().split('T')[0];
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
  const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];

  const getReportData = (startDate: string) => {
    const filtered = sales.filter(s => s.date >= startDate);
    const totalSales = filtered.reduce((sum, s) => sum + s.total, 0);
    const totalCost = filtered.reduce((sum, s) =>
      sum + s.items.reduce((c, item) => {
        const p = products.find(pr => pr.id === item.productId);
        return c + (p ? p.costPrice * item.quantity : 0);
      }, 0), 0);
    const totalItems = filtered.reduce((sum, s) => sum + s.items.reduce((c, i) => c + i.quantity, 0), 0);

    // Products breakdown
    const productBreakdown: Record<string, { name: string; quantity: number; total: number; cost: number }> = {};
    filtered.forEach(sale => {
      sale.items.forEach(item => {
        if (!productBreakdown[item.productId]) {
          const p = products.find(pr => pr.id === item.productId);
          productBreakdown[item.productId] = { name: item.productName, quantity: 0, total: 0, cost: 0 };
        }
        productBreakdown[item.productId].quantity += item.quantity;
        productBreakdown[item.productId].total += item.total;
        const p = products.find(pr => pr.id === item.productId);
        if (p) productBreakdown[item.productId].cost += p.costPrice * item.quantity;
      });
    });

    return { filtered, totalSales, totalCost, totalItems, profit: totalSales - totalCost, productBreakdown };
  };

  const generateReportText = (period: string, data: ReturnType<typeof getReportData>) => {
    let text = `تقرير ${period} - كافيه مانجر\n`;
    text += `عدد الطلبات: ${data.filtered.length}\n`;
    text += `إجمالي المبيعات: ${data.totalSales} ج.م\n`;
    if (user?.role === 'admin') {
      text += `إجمالي التكلفة: ${data.totalCost} ج.م\n`;
      text += `صافي الربح: ${data.profit} ج.م\n`;
    }
    text += `\nتفاصيل المنتجات:\n`;
    Object.values(data.productBreakdown).forEach(p => {
      text += `${p.name}: ${p.quantity} وحدة - ${p.total} ج.م\n`;
    });
    return text;
  };

  const share = (period: string, data: ReturnType<typeof getReportData>, method: 'whatsapp' | 'email') => {
    const text = generateReportText(period, data);
    if (method === 'whatsapp') {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    } else {
      window.open(`mailto:?subject=${encodeURIComponent(`تقرير ${period}`)}&body=${encodeURIComponent(text)}`, '_blank');
    }
  };

  const downloadPDF = (period: string, data: ReturnType<typeof getReportData>) => {
    const text = generateReportText(period, data);
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `تقرير_${period}_${today}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const ReportView = ({ title, startDate }: { title: string; startDate: string }) => {
    const data = getReportData(startDate);
    return (
      <div className="space-y-4">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="glass-card rounded-xl p-4 text-center">
            <ShoppingCart size={24} className="mx-auto text-accent mb-2" />
            <p className="text-2xl font-bold text-foreground">{data.filtered.length}</p>
            <p className="text-xs text-muted-foreground">طلب</p>
          </div>
          <div className="glass-card rounded-xl p-4 text-center">
            <DollarSign size={24} className="mx-auto text-success mb-2" />
            <p className="text-2xl font-bold text-foreground">{data.totalSales} ج.م</p>
            <p className="text-xs text-muted-foreground">مبيعات</p>
          </div>
          <div className="glass-card rounded-xl p-4 text-center">
            <TrendingUp size={24} className="mx-auto text-info mb-2" />
            <p className="text-2xl font-bold text-foreground">{data.totalItems}</p>
            <p className="text-xs text-muted-foreground">منتج مباع</p>
          </div>
          {user?.role === 'admin' && (
            <div className="glass-card rounded-xl p-4 text-center">
              <BarChart3 size={24} className="mx-auto text-warning mb-2" />
              <p className="text-2xl font-bold text-foreground">{data.profit} ج.م</p>
              <p className="text-xs text-muted-foreground">صافي الربح</p>
            </div>
          )}
        </div>

        {/* Products breakdown */}
        <div className="glass-card rounded-xl p-4">
          <h3 className="font-bold text-foreground mb-3">تفاصيل المنتجات</h3>
          {Object.values(data.productBreakdown).length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-4">لا توجد مبيعات في هذه الفترة</p>
          ) : (
            <div className="space-y-2">
              {Object.values(data.productBreakdown).sort((a, b) => b.total - a.total).map((p, i) => (
                <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-secondary">
                  <span className="text-sm font-medium text-foreground">{p.name}</span>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-muted-foreground">{p.quantity} وحدة</span>
                    <span className="font-bold text-foreground">{p.total} ج.م</span>
                    {user?.role === 'admin' && (
                      <span className="text-success font-medium">ربح: {p.total - p.cost} ج.م</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Share/Export */}
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => share(title, data, 'whatsapp')} className="flex-1">
            <Share2 size={16} className="ml-2" />
            واتساب
          </Button>
          <Button variant="outline" onClick={() => share(title, data, 'email')} className="flex-1">
            <Share2 size={16} className="ml-2" />
            إيميل
          </Button>
          <Button variant="outline" onClick={() => downloadPDF(title, data)}>
            <Download size={16} className="ml-2" />
            تحميل
          </Button>
        </div>
      </div>
    );
  };

  if (user?.role !== 'admin') {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-foreground">التقارير</h1>
        <ReportView title="يومي" startDate={today} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">التقارير</h1>
      <Tabs defaultValue="daily" dir="rtl">
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="daily">يومي</TabsTrigger>
          <TabsTrigger value="weekly">أسبوعي</TabsTrigger>
          <TabsTrigger value="monthly">شهري</TabsTrigger>
        </TabsList>
        <TabsContent value="daily"><ReportView title="يومي" startDate={today} /></TabsContent>
        <TabsContent value="weekly"><ReportView title="أسبوعي" startDate={weekAgo} /></TabsContent>
        <TabsContent value="monthly"><ReportView title="شهري" startDate={monthAgo} /></TabsContent>
      </Tabs>
    </div>
  );
};

export default Reports;
