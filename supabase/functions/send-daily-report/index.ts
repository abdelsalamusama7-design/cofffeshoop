import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (!RESEND_API_KEY) throw new Error('RESEND_API_KEY is not configured');

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error('Supabase config missing');

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Yesterday's date (report for the previous day)
    const yesterday = new Date(Date.now() - 86400000);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    const todayAr = new Date().toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const yesterdayAr = yesterday.toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    // Fetch all needed data in parallel
    const [
      { data: sales },
      { data: returns },
      { data: attendance },
      { data: expenses },
      { data: inventory },
      { data: products },
      { data: workers },
      { data: workerExpenses },
    ] = await Promise.all([
      supabase.from('sales').select('*').eq('date', yesterdayStr),
      supabase.from('returns').select('*').eq('date', yesterdayStr),
      supabase.from('attendance').select('*').eq('date', yesterdayStr),
      supabase.from('expenses').select('*').eq('date', yesterdayStr),
      supabase.from('inventory').select('*'),
      supabase.from('products').select('*'),
      supabase.from('workers').select('*'),
      supabase.from('worker_expenses').select('*').eq('date', yesterdayStr),
    ]);

    const safeArr = (arr: any) => arr || [];

    // ===== Sales Summary =====
    const totalSales = safeArr(sales).reduce((s: number, sale: any) => s + (sale.total || 0), 0);
    const salesCount = safeArr(sales).length;
    const totalItems = safeArr(sales).reduce((s: number, sale: any) => 
      s + (sale.items || []).reduce((c: number, i: any) => c + (i.quantity || 0), 0), 0);

    // Product breakdown
    const productMap: Record<string, { name: string; qty: number; total: number }> = {};
    safeArr(sales).forEach((sale: any) => {
      (sale.items || []).forEach((item: any) => {
        if (!productMap[item.productId]) productMap[item.productId] = { name: item.productName, qty: 0, total: 0 };
        productMap[item.productId].qty += item.quantity;
        productMap[item.productId].total += item.total;
      });
    });
    const productBreakdown = Object.values(productMap).sort((a, b) => b.total - a.total);

    // Sales by worker
    const workerSalesMap: Record<string, { name: string; count: number; total: number }> = {};
    safeArr(sales).forEach((sale: any) => {
      if (!workerSalesMap[sale.worker_id]) workerSalesMap[sale.worker_id] = { name: sale.worker_name, count: 0, total: 0 };
      workerSalesMap[sale.worker_id].count++;
      workerSalesMap[sale.worker_id].total += sale.total;
    });

    // ===== Returns Summary =====
    const totalReturns = safeArr(returns).reduce((s: number, r: any) => s + (r.refund_amount || 0), 0);
    const returnsCount = safeArr(returns).length;

    // ===== Profits =====
    const totalCost = safeArr(sales).reduce((s: number, sale: any) => {
      return s + (sale.items || []).reduce((c: number, item: any) => {
        const p = safeArr(products).find((pr: any) => pr.id === item.productId);
        return c + (p ? (p.cost_price || 0) * (item.quantity || 0) : 0);
      }, 0);
    }, 0);
    const netProfit = totalSales - totalCost - totalReturns;

    // ===== Attendance =====
    const presentCount = safeArr(attendance).filter((a: any) => a.type === 'present').length;
    const absentCount = safeArr(attendance).filter((a: any) => a.type === 'absent').length;
    const leaveCount = safeArr(attendance).filter((a: any) => a.type === 'leave').length;

    const attendanceDetails = safeArr(attendance).map((a: any) => ({
      name: a.worker_name,
      type: a.type,
      checkIn: a.check_in || '-',
      checkOut: a.check_out || '-',
      shift: a.shift || '-',
    }));

    // ===== Expenses =====
    const totalExpenses = safeArr(expenses).reduce((s: number, e: any) => s + (e.amount || 0), 0);

    // ===== Worker Expenses =====
    const totalWorkerExpenses = safeArr(workerExpenses).reduce((s: number, e: any) => s + (e.amount || 0), 0);
    const workerExpensesByWorker: Record<string, { name: string; total: number; items: { reason: string; amount: number; time: string }[] }> = {};
    safeArr(workerExpenses).forEach((e: any) => {
      if (!workerExpensesByWorker[e.worker_id]) {
        workerExpensesByWorker[e.worker_id] = { name: e.worker_name, total: 0, items: [] };
      }
      workerExpensesByWorker[e.worker_id].total += e.amount;
      workerExpensesByWorker[e.worker_id].items.push({ reason: e.reason, amount: e.amount, time: e.time });
    });

    const LOW_STOCK_THRESHOLD = 5;
    const lowStockItems = safeArr(inventory).filter((item: any) => item.quantity <= LOW_STOCK_THRESHOLD);

    // ===== New Products/Inventory added yesterday =====
    const yesterdayStart = yesterdayStr + 'T00:00:00';
    const yesterdayEnd = yesterdayStr + 'T23:59:59';
    const newProducts = safeArr(products).filter((p: any) => 
      p.created_at && p.created_at >= yesterdayStart && p.created_at <= yesterdayEnd + '.999Z'
    );
    const newInventory = safeArr(inventory).filter((i: any) => 
      i.created_at && i.created_at >= yesterdayStart && i.created_at <= yesterdayEnd + '.999Z'
    );

    // ===== Build HTML =====
    const htmlBody = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; padding: 20px; line-height: 1.8; background: #f9f5f0; color: #1a1a1a; font-size: 14px; direction: rtl; }
          .container { max-width: 650px; margin: 0 auto; background: #fff; border-radius: 16px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.08); }
          .header { text-align: center; padding-bottom: 15px; border-bottom: 3px solid #8B6914; margin-bottom: 20px; }
          .header h1 { color: #8B6914; margin: 0; font-size: 22px; }
          .header p { color: #666; margin: 5px 0 0; font-size: 13px; }
          .section { margin: 20px 0; }
          .section-title { font-weight: bold; color: #8B6914; font-size: 16px; border-bottom: 2px solid #f0e6d3; padding-bottom: 8px; margin-bottom: 12px; }
          .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 15px; }
          .stat-card { text-align: center; padding: 12px 8px; border-radius: 12px; background: #f9f5f0; }
          .stat-card .value { font-size: 20px; font-weight: bold; color: #8B6914; }
          .stat-card .label { font-size: 11px; color: #888; margin-top: 2px; }
          .stat-card.green .value { color: #16a34a; }
          .stat-card.red .value { color: #dc2626; }
          .stat-card.blue .value { color: #2563eb; }
          .item-row { display: flex; justify-content: space-between; padding: 8px 12px; margin: 3px 0; background: #fafafa; border-radius: 8px; border-right: 3px solid #8B6914; font-size: 13px; }
          .item-row.warning { border-right-color: #f59e0b; background: #fffbeb; }
          .item-row.danger { border-right-color: #dc2626; background: #fef2f2; }
          .item-row.new { border-right-color: #16a34a; background: #f0fdf4; }
          .attendance-row { display: flex; justify-content: space-between; padding: 8px 12px; margin: 3px 0; border-radius: 8px; font-size: 13px; }
          .attendance-row.present { background: #f0fdf4; border-right: 3px solid #16a34a; }
          .attendance-row.absent { background: #fef2f2; border-right: 3px solid #dc2626; }
          .attendance-row.leave { background: #fffbeb; border-right: 3px solid #f59e0b; }
          .footer { text-align: center; padding-top: 15px; border-top: 2px solid #8B6914; margin-top: 20px; color: #8B6914; font-weight: bold; font-size: 13px; }
          .empty { text-align: center; color: #999; padding: 10px; font-size: 13px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>☕ التقرير اليومي — بن العميد</h1>
            <p>تقرير يوم ${yesterdayAr}</p>
            <p style="font-size:11px;color:#999;">تم الإرسال: ${todayAr}</p>
          </div>

          <!-- Sales Summary -->
          <div class="section">
            <div class="section-title">📊 ملخص المبيعات</div>
            <div class="stats-grid">
              <div class="stat-card green">
                <div class="value">${totalSales.toFixed(0)} ج.م</div>
                <div class="label">إجمالي المبيعات</div>
              </div>
              <div class="stat-card blue">
                <div class="value">${salesCount}</div>
                <div class="label">عدد الفواتير</div>
              </div>
              <div class="stat-card">
                <div class="value">${totalItems}</div>
                <div class="label">أصناف مباعة</div>
              </div>
            </div>
            ${returnsCount > 0 ? `
              <div class="stats-grid" style="grid-template-columns: repeat(2, 1fr);">
                <div class="stat-card red">
                  <div class="value">-${totalReturns.toFixed(0)} ج.م</div>
                  <div class="label">مرتجعات (${returnsCount})</div>
                </div>
                <div class="stat-card green">
                  <div class="value">${(totalSales - totalReturns).toFixed(0)} ج.م</div>
                  <div class="label">صافي المبيعات</div>
                </div>
              </div>
            ` : ''}
          </div>

          <!-- Profits -->
          <div class="section">
            <div class="section-title">💰 الأرباح</div>
            <div class="stats-grid">
              <div class="stat-card green">
                <div class="value">${netProfit.toFixed(0)} ج.م</div>
                <div class="label">صافي الربح</div>
              </div>
              <div class="stat-card red">
                <div class="value">${totalCost.toFixed(0)} ج.م</div>
                <div class="label">التكلفة</div>
              </div>
              <div class="stat-card">
                <div class="value">${totalSales > 0 ? Math.round((netProfit / totalSales) * 100) : 0}%</div>
                <div class="label">هامش الربح</div>
              </div>
            </div>
          </div>

          <!-- Product Breakdown -->
          <div class="section">
            <div class="section-title">🛒 تفصيل المبيعات بالأصناف</div>
            ${productBreakdown.length === 0 ? '<div class="empty">لا توجد مبيعات</div>' :
              productBreakdown.map(p => `
                <div class="item-row">
                  <span><strong>${p.name}</strong> × ${p.qty}</span>
                  <span style="font-weight:bold;">${p.total.toFixed(0)} ج.م</span>
                </div>
              `).join('')}
          </div>

          <!-- Worker Performance -->
          <div class="section">
            <div class="section-title">👷 أداء العمال</div>
            ${Object.values(workerSalesMap).length === 0 ? '<div class="empty">لا توجد بيانات</div>' :
              Object.values(workerSalesMap).sort((a: any, b: any) => b.total - a.total).map((w: any) => `
                <div class="item-row">
                  <span><strong>${w.name}</strong> — ${w.count} فاتورة</span>
                  <span style="font-weight:bold;">${w.total.toFixed(0)} ج.م</span>
                </div>
              `).join('')}
          </div>

          <!-- Attendance -->
          <div class="section">
            <div class="section-title">📋 الحضور والانصراف</div>
            <div class="stats-grid">
              <div class="stat-card green">
                <div class="value">${presentCount}</div>
                <div class="label">حاضر</div>
              </div>
              <div class="stat-card red">
                <div class="value">${absentCount}</div>
                <div class="label">غائب</div>
              </div>
              <div class="stat-card" style="background:#fffbeb;">
                <div class="value" style="color:#f59e0b;">${leaveCount}</div>
                <div class="label">إجازة</div>
              </div>
            </div>
            ${attendanceDetails.length === 0 ? '<div class="empty">لا توجد بيانات حضور</div>' :
              attendanceDetails.map((a: any) => `
                <div class="attendance-row ${a.type}">
                  <span><strong>${a.name}</strong></span>
                  <span>${a.type === 'present' ? '✅ حاضر' : a.type === 'absent' ? '❌ غائب' : '🟡 إجازة'} ${a.type === 'present' ? `| ${a.checkIn} - ${a.checkOut} | ${a.shift}` : ''}</span>
                </div>
              `).join('')}
          </div>

          <!-- Expenses -->
          ${safeArr(expenses).length > 0 ? `
            <div class="section">
              <div class="section-title">💸 المصروفات</div>
              ${safeArr(expenses).map((e: any) => `
                <div class="item-row" style="border-right-color:#dc2626;">
                  <span><strong>${e.name}</strong> ${e.category ? `(${e.category})` : ''}</span>
                  <span style="font-weight:bold;color:#dc2626;">${e.amount} ج.م</span>
                </div>
              `).join('')}
              <div class="item-row" style="background:#fef2f2;border-right-color:#dc2626;margin-top:8px;">
                <span><strong>إجمالي المصروفات</strong></span>
                <span style="font-weight:bold;color:#dc2626;">${totalExpenses} ج.م</span>
              </div>
            </div>
          ` : ''}

          <!-- Worker Expenses -->
          ${safeArr(workerExpenses).length > 0 ? `
            <div class="section">
              <div class="section-title">💰 مصروفات العمال (سحب نقدية)</div>
              ${Object.values(workerExpensesByWorker).map((w: any) => `
                <div style="margin-bottom:12px;">
                  <div class="item-row" style="border-right-color:#f59e0b;background:#fffbeb;">
                    <span><strong>👤 ${w.name}</strong></span>
                    <span style="font-weight:bold;color:#f59e0b;">إجمالي: ${w.total} ج.م</span>
                  </div>
                  ${w.items.map((item: any) => `
                    <div class="item-row" style="border-right-color:#e5e7eb;margin-right:12px;">
                      <span>${item.reason} <span style="color:#999;font-size:12px;">(${item.time})</span></span>
                      <span style="font-weight:bold;color:#dc2626;">${item.amount} ج.م</span>
                    </div>
                  `).join('')}
                </div>
              `).join('')}
              <div class="item-row" style="background:#fffbeb;border-right-color:#f59e0b;margin-top:8px;">
                <span><strong>إجمالي مصروفات العمال</strong></span>
                <span style="font-weight:bold;color:#f59e0b;">${totalWorkerExpenses} ج.م</span>
              </div>
            </div>
          ` : ''}

          <!-- Low Stock -->
          ${lowStockItems.length > 0 ? `
            <div class="section">
              <div class="section-title">⚠️ أصناف منخفضة المخزون (${lowStockItems.length})</div>
              ${lowStockItems.map((item: any) => `
                <div class="item-row ${item.quantity <= 0 ? 'danger' : 'warning'}">
                  <span><strong>${item.name}</strong></span>
                  <span style="font-weight:bold;color:${item.quantity <= 0 ? '#dc2626' : '#f59e0b'};">${item.quantity} ${item.unit} ${item.quantity <= 0 ? '🔴' : '🟡'}</span>
                </div>
              `).join('')}
            </div>
          ` : ''}

          <!-- New Products & Inventory -->
          ${newProducts.length > 0 || newInventory.length > 0 ? `
            <div class="section">
              <div class="section-title">🆕 إضافات جديدة</div>
              ${newProducts.length > 0 ? `
                <p style="font-weight:bold;font-size:13px;margin:8px 0 4px;">☕ منتجات جديدة:</p>
                ${newProducts.map((p: any) => `
                  <div class="item-row new">
                    <span><strong>${p.name}</strong>${p.category ? ` (${p.category})` : ''}</span>
                    <span>سعر بيع: ${p.sell_price} ج.م</span>
                  </div>
                `).join('')}
              ` : ''}
              ${newInventory.length > 0 ? `
                <p style="font-weight:bold;font-size:13px;margin:8px 0 4px;">📦 أصناف مخزون جديدة:</p>
                ${newInventory.map((i: any) => `
                  <div class="item-row new">
                    <span><strong>${i.name}</strong> (${i.unit})</span>
                    <span>الكمية: ${i.quantity} | التكلفة: ${i.cost_per_unit} ج.م</span>
                  </div>
                `).join('')}
              ` : ''}
            </div>
          ` : ''}

          <div class="footer">
            ☕ بن العميد — التقرير اليومي التلقائي
          </div>
        </div>
      </body>
      </html>
    `;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'بن العميد <onboarding@resend.dev>',
        to: ['alameedbon1@gmail.com'],
        subject: `📊 التقرير اليومي — ${yesterdayAr} — مبيعات ${totalSales.toFixed(0)} ج.م`,
        html: htmlBody,
      }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(`Resend error [${res.status}]: ${JSON.stringify(data)}`);

    return new Response(JSON.stringify({ success: true, data }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('Error sending daily report:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
