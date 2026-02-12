import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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

    const { reportText, workerName, date } = await req.json();

    if (!reportText) {
      throw new Error('reportText is required');
    }

    // Convert plain text report to HTML with RTL support
    const htmlBody = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Arial, sans-serif;
            padding: 30px;
            line-height: 2;
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
            border-bottom: 2px solid #8B6914;
            margin-bottom: 20px;
          }
          .header h1 {
            color: #8B6914;
            margin: 0;
            font-size: 24px;
          }
          .header p {
            color: #666;
            margin: 5px 0 0;
          }
          pre {
            white-space: pre-wrap;
            font-family: 'Segoe UI', Tahoma, Arial, sans-serif;
            font-size: 14px;
            line-height: 2;
            margin: 0;
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
            <h1>☕ بن العميد</h1>
            <p>تقرير إنهاء الشيفت</p>
          </div>
          <pre>${reportText}</pre>
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
        to: ['m.samiiir21114@gmail.com'],
        subject: `تقرير شيفت ${workerName || ''} - ${date || new Date().toLocaleDateString('ar-EG')}`,
        html: htmlBody,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(`Resend API error [${res.status}]: ${JSON.stringify(data)}`);
    }

    return new Response(JSON.stringify({ success: true, data }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('Error sending shift report email:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
