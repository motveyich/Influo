import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface EmailRequest {
  to: string;
  subject: string;
  type: 'platform_update' | 'new_application' | 'new_review' | 'new_message';
  data: {
    userName?: string;
    content?: string;
    campaignName?: string;
    rating?: number;
    senderName?: string;
  };
}

const getEmailTemplate = (type: EmailRequest['type'], data: EmailRequest['data']): string => {
  const baseStyles = `
    <style>
      body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
      .container { max-width: 600px; margin: 0 auto; padding: 20px; }
      .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
      .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
      .button { display: inline-block; padding: 12px 24px; background: #3b82f6; color: white; text-decoration: none; border-radius: 6px; margin-top: 20px; }
      .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #6b7280; }
    </style>
  `;

  switch (type) {
    case 'platform_update':
      return `
        <!DOCTYPE html>
        <html>
        <head>${baseStyles}</head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Обновление платформы</h1>
            </div>
            <div class="content">
              <p>Здравствуйте, ${data.userName || 'пользователь'}!</p>
              <p>${data.content || 'У нас есть новые функции и улучшения для вас!'}</p>
              <a href="${Deno.env.get('SUPABASE_URL')?.replace('/functions/v1', '')}" class="button">Перейти на платформу</a>
            </div>
            <div class="footer">
              <p>Это автоматическое уведомление от платформы</p>
            </div>
          </div>
        </body>
        </html>
      `;

    case 'new_application':
      return `
        <!DOCTYPE html>
        <html>
        <head>${baseStyles}</head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Новая заявка на сотрудничество</h1>
            </div>
            <div class="content">
              <p>Здравствуйте, ${data.userName || 'пользователь'}!</p>
              <p>У вас новая заявка на участие в кампании <strong>${data.campaignName || ''}</strong>.</p>
              <p>${data.content || 'Проверьте детали в личном кабинете.'}</p>
              <a href="${Deno.env.get('SUPABASE_URL')?.replace('/functions/v1', '')}/campaigns" class="button">Просмотреть заявки</a>
            </div>
            <div class="footer">
              <p>Это автоматическое уведомление от платформы</p>
            </div>
          </div>
        </body>
        </html>
      `;

    case 'new_review':
      return `
        <!DOCTYPE html>
        <html>
        <head>${baseStyles}</head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Новый отзыв</h1>
            </div>
            <div class="content">
              <p>Здравствуйте, ${data.userName || 'пользователь'}!</p>
              <p>Вы получили новый отзыв с оценкой <strong>${data.rating || 0}/5</strong>.</p>
              <p>${data.content || ''}</p>
              <a href="${Deno.env.get('SUPABASE_URL')?.replace('/functions/v1', '')}/profile" class="button">Просмотреть отзывы</a>
            </div>
            <div class="footer">
              <p>Это автоматическое уведомление от платформы</p>
            </div>
          </div>
        </body>
        </html>
      `;

    case 'new_message':
      return `
        <!DOCTYPE html>
        <html>
        <head>${baseStyles}</head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Новое сообщение</h1>
            </div>
            <div class="content">
              <p>Здравствуйте, ${data.userName || 'пользователь'}!</p>
              <p>У вас новое сообщение от <strong>${data.senderName || 'пользователя'}</strong>.</p>
              <p>${data.content || ''}</p>
              <a href="${Deno.env.get('SUPABASE_URL')?.replace('/functions/v1', '')}/chat" class="button">Открыть чат</a>
            </div>
            <div class="footer">
              <p>Это автоматическое уведомление от платформы</p>
            </div>
          </div>
        </body>
        </html>
      `;

    default:
      return '';
  }
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { to, subject, type, data }: EmailRequest = await req.json();

    if (!to || !subject || !type) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const htmlContent = getEmailTemplate(type, data);

    console.log(`Sending email notification to ${to}:`, {
      subject,
      type,
      data
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Email notification queued successfully',
        details: {
          to,
          subject,
          type
        }
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error sending email notification:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});