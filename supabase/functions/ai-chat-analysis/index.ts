// DeepSeek API configuration
const DEEPSEEK_API_KEY = 'sk-5bf05a3087234e848c1588f1ce75b49e';
const DEEPSEEK_BASE_URL = 'https://api.deepseek.com/v1';
const DEEPSEEK_MODEL = 'deepseek-reasoner'; // Using thinking mode for better analysis

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface AnalysisRequest {
  messages: Array<{
    content: string;
    senderId: string;
    timestamp: string;
  }>;
  analysisType: 'conversation_flow' | 'sentiment' | 'recommendation';
}

interface AnalysisResponse {
  conversationStatus: 'constructive' | 'neutral' | 'concerning';
  sentiment: 'positive' | 'neutral' | 'negative';
  suggestions: string[];
  nextSteps: string[];
  confidence: number;
  riskFactors?: string[];
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { messages, analysisType, question, context }: AnalysisRequest & { question?: string; context?: string } = await req.json()

    let analysis: AnalysisResponse;
    
    if (question) {
      // Handle direct user question
      analysis = await handleUserQuestion(question, context || '');
    } else {
      // Handle conversation analysis
      if (!messages || !Array.isArray(messages) || messages.length === 0) {
        throw new Error('Invalid messages array')
      }
      analysis = await analyzeConversation(messages, analysisType);
    }

    return new Response(
      JSON.stringify(analysis),
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
        conversationStatus: 'neutral',
        sentiment: 'neutral',
        suggestions: [],
        nextSteps: [],
        confidence: 0
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

async function handleUserQuestion(question: string, context: string): Promise<AnalysisResponse> {
  try {
    // Call DeepSeek API for user questions
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
            content: `Ты - AI-помощник для платформы сотрудничества инфлюенсеров и рекламодателей. Твоя задача - помогать пользователям эффективно общаться и развивать деловые отношения. 
            
Контекст диалога: ${context}

Отвечай кратко, по делу, на русском языке. Давай практические советы для улучшения коммуникации и развития сотрудничества.

Анализируй контекст и предоставляй:
- Конкретные рекомендации по развитию диалога
- Оценку текущего статуса переговоров  
- Предупреждения о потенциальных проблемах
- Предложения следующих шагов`
          },
          {
            role: 'user',
            content: question
          }
        ],
        max_tokens: 400,
        temperature: 0.6,
        top_p: 0.9,
        frequency_penalty: 0.1,
        presence_penalty: 0.1
      })
    });

    if (!response.ok) {
      throw new Error(`DeepSeek API error: ${response.status}`);
    }

    const data = await response.json();
    const aiContent = data.choices[0]?.message?.content || 'Не удалось получить ответ от DeepSeek';

    return {
      conversationStatus: 'neutral',
      sentiment: 'neutral',
      suggestions: [aiContent],
      nextSteps: [],
      confidence: 0.9
    };
  } catch (error) {
    console.error('DeepSeek API failed:', error);
    return getIntelligentFallbackResponse(question);
  }
}

async function analyzeConversation(messages: any[], analysisType: string): Promise<AnalysisResponse> {
  try {
    // Prepare messages for OpenAI
    const conversationText = messages.map(m => `${m.senderId}: ${m.content}`).join('\n');
    
    // Call DeepSeek API for conversation analysis
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
            content: `Ты - экспертный AI-аналитик диалогов на платформе сотрудничества инфлюенсеров и рекламодателей. 
            
Проанализируй диалог профессионально и верни ТОЛЬКО JSON в следующем формате:
{
  "conversationStatus": "constructive|neutral|concerning",
  "sentiment": "positive|neutral|negative", 
  "suggestions": ["конкретные наблюдения о диалоге", "анализ качества коммуникации"],
  "nextSteps": ["практические следующие шаги", "рекомендации по улучшению"],
  "confidence": 0.85,
  "riskFactors": ["потенциальные проблемы"]
}

ВАЖНО: Проводи глубокий анализ на основе:
- Тональность общения
- Готовность к сотрудничеству
- Потенциальные проблемы
- Этап переговоров
- Профессионализм коммуникации
- Ясность требований и ожиданий
- Уровень заинтересованности сторон

Отвечай СТРОГО только валидным JSON, без дополнительного текста или комментариев.`
          },
          {
            role: 'user',
            content: `Диалог для анализа:\n${conversationText}`
          }
        ],
        max_tokens: 600,
        temperature: 0.2,
        top_p: 0.95,
        frequency_penalty: 0.0,
        presence_penalty: 0.0
      })
    });

    if (!response.ok) {
      throw new Error(`DeepSeek API error: ${response.status}`);
    }

    const data = await response.json();
    const aiContent = data.choices[0]?.message?.content || '';
    
    try {
      // Parse JSON response from AI
      const analysis = JSON.parse(aiContent);
      return {
        conversationStatus: analysis.conversationStatus || 'neutral',
        sentiment: analysis.sentiment || 'neutral',
        suggestions: analysis.suggestions || [],
        nextSteps: analysis.nextSteps || [],
        confidence: analysis.confidence || 0.8,
        riskFactors: analysis.riskFactors
      };
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      throw new Error('Invalid AI response format');
    }
  } catch (error) {
    console.error('DeepSeek analysis failed:', error);
    return getEnhancedFallbackAnalysis(messages);
  }
}

function getIntelligentFallbackResponse(question: string): AnalysisResponse {
  const questionLower = question.toLowerCase();
  
  if (questionLower.includes('бюджет') || questionLower.includes('цена') || questionLower.includes('стоимость')) {
    return {
      conversationStatus: 'neutral',
      sentiment: 'neutral',
      suggestions: ['Обсуждение бюджета - важный этап переговоров'],
      nextSteps: ['Уточните диапазон бюджета', 'Обсудите условия оплаты', 'Предложите варианты пакетов'],
      confidence: 0.8
    };
  } else if (questionLower.includes('сроки') || questionLower.includes('время') || questionLower.includes('дедлайн')) {
    return {
      conversationStatus: 'neutral',
      sentiment: 'neutral',
      suggestions: ['Планирование сроков критично для успеха проекта'],
      nextSteps: ['Установите реалистичные дедлайны', 'Обсудите этапы работы', 'Согласуйте график'],
      confidence: 0.8
    };
  } else if (questionLower.includes('портфолио') || questionLower.includes('примеры') || questionLower.includes('работы')) {
    return {
      conversationStatus: 'neutral',
      sentiment: 'neutral',
      suggestions: ['Демонстрация портфолио повышает доверие'],
      nextSteps: ['Покажите релевантные работы', 'Расскажите о подходе к проектам', 'Поделитесь результатами'],
      confidence: 0.8
    };
  } else {
    return {
      conversationStatus: 'neutral',
      sentiment: 'neutral',
      suggestions: ['Для эффективного сотрудничества важно открытое общение'],
      nextSteps: ['Задайте уточняющие вопросы', 'Поделитесь ожиданиями', 'Обсудите детали проекта'],
      confidence: 0.7
    };
  }
}

function getEnhancedFallbackAnalysis(
  formattedMessages: string[], 
  userRoles?: { user1: string; user2: string }
): AnalysisResponse {
  // Enhanced fallback analysis with better logic
  const conversationText = formattedMessages.join('\n').toLowerCase();
  const roleContext = userRoles ? 
    `Анализ диалога между ${userRoles.user1} и ${userRoles.user2}` : 
    'Анализ диалога между участниками';
  
  // Enhanced keyword analysis
  const positiveKeywords = ['спасибо', 'отлично', 'согласен', 'хорошо', 'интересно', 'подходит', 'да', 'понравилось', 'впечатляет', 'качественно']
  const negativeKeywords = ['нет', 'не подходит', 'проблема', 'сложно', 'невозможно', 'отказ', 'не согласен', 'дорого', 'долго']
  const businessKeywords = ['бюджет', 'сроки', 'условия', 'договор', 'оплата', 'встреча', 'проект', 'работа', 'сотрудничество', 'предложение']
  const urgencyKeywords = ['срочно', 'быстро', 'скоро', 'завтра', 'сегодня', 'немедленно']
  const questionKeywords = ['как', 'что', 'когда', 'где', 'почему', 'можно ли', 'возможно ли', '?']
  
  const text = conversationText;
  
  // Count keyword matches
  const positiveCount = positiveKeywords.filter(word => text.includes(word)).length
  const negativeCount = negativeKeywords.filter(word => text.includes(word)).length
  const businessCount = businessKeywords.filter(word => text.includes(word)).length
  const urgencyCount = urgencyKeywords.filter(word => text.includes(word)).length
  const questionCount = questionKeywords.filter(word => text.includes(word)).length
  
  let sentiment: 'positive' | 'neutral' | 'negative' = 'neutral'
  let conversationStatus: 'constructive' | 'neutral' | 'concerning' = 'neutral'
  
  // Determine sentiment and status
  if (positiveCount > negativeCount && positiveCount > 0) {
    sentiment = 'positive'
    if (businessCount > 0) {
      conversationStatus = 'constructive'
    }
  } else if (negativeCount > positiveCount && negativeCount > 0) {
    sentiment = 'negative'
    if (negativeCount > 2) {
      conversationStatus = 'concerning'
    }
  }
  
  // Generate contextual suggestions and next steps
  const suggestions: string[] = []
  const nextSteps: string[] = []
  const riskFactors: string[] = []
  
  // Always include role context
  suggestions.push(roleContext);
  
  // Business discussion detected
  if (businessCount >= 2) {
    suggestions.push('Активно обсуждаются деловые вопросы')
    nextSteps.push('Переходите к конкретным деталям')
    if (businessCount >= 3) {
      nextSteps.push('Рассмотрите возможность видеозвонка')
    }
  }
  
  // High question activity
  if (questionCount >= 3) {
    suggestions.push('Много вопросов - активное изучение возможностей')
    nextSteps.push('Предоставьте подробные ответы')
    nextSteps.push('Поделитесь примерами работ')
  }
  
  // Urgency detected
  if (urgencyCount > 0) {
    suggestions.push('Обнаружены срочные требования')
    nextSteps.push('Уточните реальные сроки')
    if (urgencyCount > 1) {
      riskFactors.push('Возможно нереалистичные ожидания по срокам')
    }
  }
  
  // Status-specific recommendations
  if (conversationStatus === 'constructive') {
    if (!suggestions.includes('Диалог развивается позитивно')) {
      suggestions.push('Диалог развивается позитивно')
    }
    nextSteps.push('Предложите конкретные следующие шаги')
    if (businessCount >= 2) {
      nextSteps.push('Подготовьте техническое задание')
    }
  } else if (conversationStatus === 'concerning') {
    suggestions.push('Обнаружены потенциальные проблемы')
    nextSteps.push('Прояснить спорные моменты')
    nextSteps.push('Найти компромиссное решение')
    riskFactors.push('Разные ожидания или требования')
  } else {
    // Neutral status recommendations
    if (formattedMessages.length < 5) {
      suggestions.push('Диалог в начальной стадии')
      nextSteps.push('Расскажите больше о своих услугах')
      nextSteps.push('Узнайте больше о потребностях партнера')
      nextSteps.push('Обменяйтесь контактной информацией')
    } else {
      suggestions.push('Стандартное развитие диалога')
      nextSteps.push('Задайте уточняющие вопросы')
      nextSteps.push('Перейдите к обсуждению конкретных условий')
    }
  }
  
  // Ensure we always have suggestions and next steps
  if (suggestions.length === 0) {
    suggestions.push('Диалог развивается стандартно')
  }
  
  if (nextSteps.length === 0) {
    nextSteps.push('Продолжайте активное общение')
  }
  
  // Calculate confidence based on various factors
  const messageCountFactor = Math.min(0.3, formattedMessages.length * 0.05)
  const keywordFactor = Math.min(0.4, (positiveCount + negativeCount + businessCount) * 0.08)
  const baseFactor = 0.3
  
  const confidence = Math.min(0.95, baseFactor + messageCountFactor + keywordFactor)
  
  return {
    conversationStatus,
    sentiment,
    suggestions,
    nextSteps,
    confidence: Math.round(confidence * 100) / 100,
    riskFactors: riskFactors.length > 0 ? riskFactors : undefined
  }
}