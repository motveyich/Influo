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
  // Mock AI analysis - in production, integrate with OpenAI API
  const conversationText = messages.map(m => m.content).join('\n')
  
  // Simple keyword-based analysis for demo
  const positiveKeywords = ['спасибо', 'отлично', 'согласен', 'хорошо', 'интересно', 'подходит']
  const negativeKeywords = ['нет', 'не подходит', 'проблема', 'сложно', 'невозможно']
  const businessKeywords = ['бюджет', 'сроки', 'условия', 'договор', 'оплата', 'встреча']
  
  const text = conversationText.toLowerCase()
  
  // Analyze sentiment
  const positiveCount = positiveKeywords.filter(word => text.includes(word)).length
  const negativeCount = negativeKeywords.filter(word => text.includes(word)).length
  const businessCount = businessKeywords.filter(word => text.includes(word)).length
  
  let sentiment: 'positive' | 'neutral' | 'negative' = 'neutral'
  let conversationStatus: 'constructive' | 'neutral' | 'concerning' = 'neutral'
  
  if (positiveCount > negativeCount) {
    sentiment = 'positive'
    conversationStatus = 'constructive'
  } else if (negativeCount > positiveCount) {
    sentiment = 'negative'
    conversationStatus = 'concerning'
  }
  
  // Generate suggestions based on analysis
  const suggestions: string[] = []
  const nextSteps: string[] = []
  const riskFactors: string[] = []
  
  if (businessCount > 0) {
    suggestions.push('Обсуждаются деловые вопросы')
    nextSteps.push('Зафиксируйте договоренности письменно')
  }
  
  if (conversationStatus === 'constructive') {
    suggestions.push('Диалог развивается позитивно')
    nextSteps.push('Предложите следующий шаг сотрудничества')
  } else if (conversationStatus === 'concerning') {
    suggestions.push('Возможны разногласия')
    nextSteps.push('Уточните спорные моменты')
    riskFactors.push('Потенциальное недопонимание')
  }
  
  if (messages.length < 3) {
    suggestions.push('Диалог только начинается')
    nextSteps.push('Расскажите больше о себе и своих услугах')
  }
  
  // Calculate confidence based on message count and keyword matches
  const confidence = Math.min(0.9, 0.3 + (messages.length * 0.1) + ((positiveCount + negativeCount + businessCount) * 0.05))
  
  return {
    conversationStatus,
    sentiment,
    suggestions: suggestions.length > 0 ? suggestions : ['Диалог развивается стандартно'],
    nextSteps: nextSteps.length > 0 ? nextSteps : ['Продолжайте общение'],
    confidence: Math.round(confidence * 100) / 100,
    riskFactors: riskFactors.length > 0 ? riskFactors : undefined
  }
}