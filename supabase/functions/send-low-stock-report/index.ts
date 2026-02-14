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
    if (!RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY is not configured');
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Supabase config missing');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch inventory items
    const { data: inventory, error: invError } = await supabase
      .from('inventory')
      .select('*');

    if (invError) throw new Error(`Failed to fetch inventory: ${invError.message}`);

    // Fetch products with ingredients
    const { data: products, error: prodError } = await supabase
      .from('products')
      .select('*');

    if (prodError) throw new Error(`Failed to fetch products: ${prodError.message}`);

    const LOW_STOCK_THRESHOLD = 5;

    // Low stock inventory items
    const lowStockItems = (inventory || []).filter(item => item.quantity <= LOW_STOCK_THRESHOLD);

    // Products affected by low stock ingredients
    const affectedProducts: { name: string; missingIngredient: string; remaining: number; unit: string }[] = [];
    (products || []).forEach(product => {
      if (product.ingredients && Array.isArray(product.ingredients)) {
        (product.ingredients as any[]).forEach(ing => {
          const invItem = (inventory || []).find(i => i.id === ing.inventoryItemId);
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

    if (lowStockItems.length === 0 && affectedProducts.length === 0) {
      return new Response(JSON.stringify({ success: true, message: 'No low stock items' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const today = new Date().toLocaleDateString('ar-EG', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    // Build HTML email
    const htmlBody = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Arial, sans-serif;
            padding: 30px;
            line-height: 1.8;
            background: #f9f5f0;
            color: #1a1a1a;
            font-size: 14px;
            direction: rtl;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            background: #ffffff;
            border-radius: 16px;
            padding: 30px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.08);
          }
          .header {
            text-align: center;
            padding-bottom: 20px;
            border-bottom: 2px solid #dc2626;
            margin-bottom: 20px;
          }
          .header h1 {
            color: #dc2626;
            margin: 0;
            font-size: 22px;
          }
          .header p {
            color: #666;
            margin: 5px 0 0;
          }
          .section-title {
            font-weight: bold;
            color: #8B6914;
            font-size: 16px;
            margin: 20px 0 10px;
            border-bottom: 1px solid #e5e5e5;
            padding-bottom: 8px;
          }
          .item {
            display: flex;
            justify-content: space-between;
            padding: 8px 12px;
            margin: 4px 0;
            background: #fef2f2;
            border-radius: 8px;
            border-right: 3px solid #dc2626;
          }
          .item-ok {
            background: #fff7ed;
            border-right: 3px solid #f59e0b;
          }
          .item-name { font-weight: bold; }
          .item-qty { color: #dc2626; font-weight: bold; }
          .affected {
            padding: 8px 12px;
            margin: 4px 0;
            background: #fffbeb;
            border-radius: 8px;
            border-right: 3px solid #f59e0b;
            font-size: 13px;
          }
          .footer {
            text-align: center;
            padding-top: 20px;
            border-top: 2px solid #8B6914;
            margin-top: 20px;
            color: #8B6914;
            font-weight: bold;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⚠️ تنبيه نقص المخزون</h1>
            <p>${today}</p>
          </div>
          
          ${lowStockItems.length > 0 ? `
            <div class="section-title">📦 أصناف المخزون المنخفضة (${lowStockItems.length} صنف)</div>
            ${lowStockItems.map(item => `
              <div class="item ${item.quantity <= 0 ? '' : 'item-ok'}">
                <span class="item-name">${item.name}</span>
                <span class="item-qty">${item.quantity} ${item.unit} ${item.quantity <= 0 ? '🔴 نفذ' : '🟡 منخفض'}</span>
              </div>
            `).join('')}
          ` : ''}
          
          ${affectedProducts.length > 0 ? `
            <div class="section-title">☕ منتجات متأثرة بنقص المواد الخام</div>
            ${affectedProducts.map(p => `
              <div class="affected">
                <strong>${p.name}</strong> — المادة الناقصة: ${p.missingIngredient} (متبقي: ${p.remaining} ${p.unit})
              </div>
            `).join('')}
          ` : ''}
          
          <div class="footer">بن العميد ☕</div>
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
        subject: `⚠️ تنبيه نقص المخزون - ${lowStockItems.length} صنف - ${today}`,
        html: htmlBody,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(`Resend API error [${res.status}]: ${JSON.stringify(data)}`);
    }

    return new Response(JSON.stringify({ 
      success: true, 
      data, 
      lowStockCount: lowStockItems.length,
      affectedProductsCount: affectedProducts.length 
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('Error sending low stock report:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
