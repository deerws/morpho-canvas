import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FunctionData {
  id: string;
  name: string;
  category: string;
}

interface PrincipleData {
  id: string;
  title: string;
  description: string;
  functionId: string;
  functionName: string;
}

interface GenerateRequest {
  functions: FunctionData[];
  principles: PrincipleData[];
  selections: Record<string, string>;
  options: {
    numConcepts: number;
    temperature: number;
    focus: 'innovation' | 'feasibility' | 'cost';
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { functions, principles, selections, options } = await req.json() as GenerateRequest;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build context about selected principles
    const selectedPrinciples = Object.entries(selections).map(([funcId, princId]) => {
      const func = functions.find(f => f.id === funcId);
      const principle = principles.find(p => p.id === princId);
      return {
        function: func?.name || 'Unknown',
        principle: principle?.title || 'Unknown',
        description: principle?.description || ''
      };
    });

    const focusPrompts = {
      innovation: 'Priorize ideias criativas, disruptivas e inovadoras que possam revolucionar o mercado.',
      feasibility: 'Priorize conceitos práticos e viáveis tecnicamente que possam ser implementados rapidamente.',
      cost: 'Priorize soluções econômicas e de baixo custo de implementação.'
    };

    const systemPrompt = `Você é um especialista em design de produto e engenharia que usa a metodologia de Matriz Morfológica para gerar conceitos inovadores de produto.

Sua tarefa é analisar as combinações de princípios de solução fornecidas e gerar conceitos de produto criativos e viáveis.

Para cada conceito gerado, forneça:
1. Um nome criativo e descritivo
2. Uma descrição detalhada de como os princípios se integram
3. O raciocínio por trás da combinação
4. Pontuações de 0-100 para inovação e viabilidade
5. Estimativa de custo (baixo, médio, alto)
6. Vantagens principais
7. Desafios potenciais

Responda SEMPRE em formato JSON válido.`;

    const userPrompt = `Analise a seguinte configuração da Matriz Morfológica e gere ${options.numConcepts} conceito(s) de produto:

FUNÇÕES DO PRODUTO:
${functions.map(f => `- ${f.name} (${f.category})`).join('\n')}

PRINCÍPIOS SELECIONADOS:
${selectedPrinciples.map(s => `- ${s.function}: ${s.principle}
  Descrição: ${s.description}`).join('\n\n')}

FOCO DA GERAÇÃO: ${focusPrompts[options.focus]}

Gere ${options.numConcepts} conceito(s) inovador(es) que integre(m) esses princípios de forma sinérgica.

Responda no seguinte formato JSON:
{
  "concepts": [
    {
      "name": "Nome do Conceito",
      "description": "Descrição detalhada do conceito...",
      "reasoning": "Explicação de como os princípios se complementam...",
      "innovationScore": 85,
      "feasibilityScore": 70,
      "costEstimate": "medium",
      "advantages": ["Vantagem 1", "Vantagem 2"],
      "challenges": ["Desafio 1", "Desafio 2"]
    }
  ]
}`;

    console.log('Generating concepts with temperature:', options.temperature);
    console.log('Number of concepts requested:', options.numConcepts);
    console.log('Focus:', options.focus);

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
          { role: "user", content: userPrompt }
        ],
        temperature: options.temperature,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ 
          error: "Limite de requisições excedido. Tente novamente em alguns minutos." 
        }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ 
          error: "Créditos insuficientes. Adicione créditos na sua conta Lovable." 
        }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "Erro ao conectar com a IA" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content in AI response");
    }

    // Extract JSON from response (handle markdown code blocks)
    let jsonContent = content;
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonContent = jsonMatch[1].trim();
    }

    const parsedConcepts = JSON.parse(jsonContent);
    
    // Add unique IDs to concepts
    const conceptsWithIds = parsedConcepts.concepts.map((concept: any, index: number) => ({
      ...concept,
      id: crypto.randomUUID(),
      generatedAt: new Date().toISOString()
    }));

    console.log(`Successfully generated ${conceptsWithIds.length} concepts`);

    return new Response(JSON.stringify({ concepts: conceptsWithIds }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error generating concepts:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Erro desconhecido" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
