// DeepSeek API configuration
const DEEPSEEK_API_KEY = 'sk-5bf05a3087234e848c1588f1ce75b49e';
const DEEPSEEK_BASE_URL = 'https://api.deepseek.com/v1';
const DEEPSEEK_MODEL = 'deepseek-reasoner'; // Using thinking mode for better analysis

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ChatMessage {
  content: string;
  senderId: string;
  receiverId: string;
  timestamp: string;
  senderRole: string;
  receiverRole: string;
}

interface AnalysisRequest {
  messages: ChatMessage[];
  userQuestion?: string;
  threadId: string;
  user1Role: string;
  user2Role: string;
  analysisType: 'conversation_analysis' | 'user_question';
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { messages, userQuestion, threadId, user1Role, user2Role, analysisType }: AnalysisRequest = await req.json()

    let response: string;
    
    if (analysisType === 'user_question' && userQuestion) {
      response = await handleUserQuestion(userQuestion, messages, user1Role, user2Role);
    } else if (analysisType === 'conversation_analysis') {
      response = await analyzeConversation(messages, user1Role, user2Role);
    } else {
      throw new Error('Invalid analysis type or missing required parameters');
    }

    return new Response(
      JSON.stringify({ 
        response,
        success: true,
        threadId 
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )
  } catch (error) {
    console.error('AI Analysis Error:', error)
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Analysis failed',
        success: false
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )
  }
})

async function handleUserQuestion(
  question: string, 
  messages: ChatMessage[], 
  user1Role: string, 
  user2Role: string
): Promise<string> {
  try {
    // Build dynamic prompt with real conversation history
    const conversationHistory = messages.slice(-15).map(msg => 
      `${msg.senderRole} (${msg.senderId.substring(0, 8)}): ${msg.content}`
    ).join('\n');

    const prompt = `Контекст: Диалог между ${user1Role} и ${user2Role} на платформе Influo.

История последних сообщений:
${conversationHistory}

Вопрос пользователя: ${question}

ВАЖНО: Отвечай КРАТКО и КОНКРЕТНО. Максимум 3-4 предложения. Сразу к сути.

Анализируй ТОЛЬКО этот диалог и дай прямой ответ на вопрос. Учитывай роли (${user1Role} и ${user2Role}) и реальную историю переписки.`;

    const response = await fetch(`${DEEPSEEK_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: DEEPSEEK_MODEL,
        messages: [
          {
            role: 'system',
            content: 'Ты - краткий AI-помощник для платформы сотрудничества. Отвечай МАКСИМАЛЬНО КРАТКО и КОНКРЕТНО. Никаких лишних слов. Сразу к сути. Максимум 3-4 предложения.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 800,
        temperature: 0.5,
        top_p: 0.9
      })
    });

    if (!response.ok) {
      throw new Error(`DeepSeek API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || 'Не удалось получить ответ от AI';
  } catch (error) {
    console.error('DeepSeek user question failed:', error);
    throw error;
  }
}

async function analyzeConversation(
  messages: ChatMessage[], 
  user1Role: string, 
  user2Role: string
): Promise<string> {
  try {
    // Only analyze if we have enough messages
    if (messages.length < 2) {
      return '📊 Недостаточно сообщений для анализа. Минимум 2 сообщения.';
    }

    // Build conversation history for analysis
    const conversationHistory = messages.slice(-15).map(msg => 
      `${msg.senderRole} (${msg.senderId.substring(0, 8)}): ${msg.content}`
    ).join('\n');

    const prompt = `Контекст: Диалог между ${user1Role} и ${user2Role} на платформе Influo (${messages.length} сообщений).

История диалога:
${conversationHistory}

ВАЖНО: Отвечай КРАТКО и СТРУКТУРИРОВАННО. Максимум 4-5 предложений. Используй эмодзи.

Дай краткий анализ:
🎯 Статус: (конструктивно/нейтрально/проблемно)
💡 Наблюдение: (1 предложение о ходе переговоров)
🚀 Рекомендация: (1 предложение с конкретным советом)
⚠️ Внимание: (если есть риски или важные моменты)`;

    const response = await fetch(`${DEEPSEEK_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: DEEPSEEK_MODEL,
        messages: [
          {
            role: 'system',
            content: 'Ты - эксперт по анализу деловых переговоров. Отвечай КРАТКО и СТРУКТУРИРОВАННО. Используй эмодзи для разделения блоков. Максимум 4-5 предложений. Фокусируйся на практических советах.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 800,
        temperature: 0.4,
        top_p: 0.9
      })
    });

    if (!response.ok) {
      throw new Error(`DeepSeek API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || '❌ Анализ недоступен. Попробуйте позже.';
  } catch (error) {
    console.error('DeepSeek conversation analysis failed:', error);
    throw error;
  }
}