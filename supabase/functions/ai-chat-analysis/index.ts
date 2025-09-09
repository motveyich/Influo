import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

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

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { messages, analysisType }: AnalysisRequest = await req.json()

    // Validate input
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      throw new Error('Invalid messages array')
    }

    // Analyze conversation
    const analysis = await analyzeConversation(messages, analysisType)

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

async function analyzeConversation(messages: any[], analysisType: string): Promise<AnalysisResponse> {
  // Enhanced AI analysis with better logic
  const conversationText = messages.map(m => m.content).join('\n')
  
  // Enhanced keyword analysis
  const positiveKeywords = ['спасибо', 'отлично', 'согласен', 'хорошо', 'интересно', 'подходит', 'да', 'понравилось', 'впечатляет', 'качественно']
  const negativeKeywords = ['нет', 'не подходит', 'проблема', 'сложно', 'невозможно', 'отказ', 'не согласен', 'дорого', 'долго']
  const businessKeywords = ['бюджет', 'сроки', 'условия', 'договор', 'оплата', 'встреча', 'проект', 'работа', 'сотрудничество', 'предложение']
  const urgencyKeywords = ['срочно', 'быстро', 'скоро', 'завтра', 'сегодня', 'немедленно']
  const questionKeywords = ['как', 'что', 'когда', 'где', 'почему', 'можно ли', 'возможно ли', '?']
  
  const text = conversationText.toLowerCase()
  
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
    if (messages.length < 5) {
      suggestions.push('Диалог в начальной стадии')
      nextSteps.push('Расскажите больше о своих услугах')
      nextSteps.push('Узнайте больше о потребностях партнера')
    } else {
      suggestions.push('Стандартное развитие диалога')
      nextSteps.push('Задайте уточняющие вопросы')
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
  const messageCountFactor = Math.min(0.3, messages.length * 0.05)
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