import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GenerateRequest {
  functionName: string;
  functionDescription?: string;
  category?: string;
  count: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { functionName, functionDescription, category, count } = await req.json() as GenerateRequest;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }
    if (!functionName || typeof functionName !== 'string') {
      return new Response(JSON.stringify({ error: 'functionName é obrigatório' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const n = Math.max(1, Math.min(10, Number(count) || 3));

    const systemPrompt = `Você é um especialista em design de produto e metodologia de Matriz Morfológica.
Sua tarefa é propor princípios de solução criativos e tecnicamente viáveis para uma função de produto.
Responda SEMPRE em JSON válido, sem texto fora do JSON.`;

    const userPrompt = `Função: "${functionName}"${category ? ` (categoria: ${category})` : ''}
${functionDescription ? `Descrição: ${functionDescription}` : ''}

Gere exatamente ${n} princípio(s) de solução distintos e variados para essa função.
Para cada princípio, retorne:
- title: nome curto (ex: "Motor Stirling")
- description: descrição detalhada (2-4 frases) explicando funcionamento, materiais e aplicação
- tags: 2-5 palavras-chave
- complexity: inteiro de 1 (simples) a 5 (muito complexo)
- cost: "Baixo", "Médio" ou "Alto"

Responda no formato:
{
  "principles": [
    { "title": "...", "description": "...", "tags": ["..."], "complexity": 3, "cost": "Médio" }
  ]
}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns minutos." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes. Adicione créditos na sua conta." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "Erro ao conectar com a IA" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content;
    if (!content) throw new Error("Resposta vazia da IA");

    let jsonContent = content;
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) jsonContent = jsonMatch[1].trim();
    const parsed = JSON.parse(jsonContent);

    const principles = (parsed.principles || []).map((p: any) => ({
      title: String(p.title || '').slice(0, 200),
      description: String(p.description || ''),
      tags: Array.isArray(p.tags) ? p.tags.map((t: any) => String(t)).slice(0, 8) : [],
      complexity: Math.max(1, Math.min(5, Number(p.complexity) || 3)),
      cost: ['Baixo', 'Médio', 'Alto'].includes(p.cost) ? p.cost : 'Médio',
    })).filter((p: any) => p.title && p.description);

    return new Response(JSON.stringify({ principles }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error generating principles:", error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : "Erro desconhecido",
    }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
