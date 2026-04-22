import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GenerateImageRequest {
  conceptName: string;
  conceptDescription: string;
  style?: 'realistic' | 'sketch' | 'render3d' | 'blueprint';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { conceptName, conceptDescription, style = 'render3d' } = await req.json() as GenerateImageRequest;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    if (!conceptName || !conceptDescription) {
      return new Response(JSON.stringify({ error: "conceptName and conceptDescription are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const styleHints: Record<string, string> = {
      realistic: 'photorealistic product photography, studio lighting, white background, high detail',
      sketch: 'clean technical pencil sketch, hand-drawn industrial design concept, white paper background',
      render3d: 'modern 3D product render, soft shadows, neutral background, professional industrial design visualization',
      blueprint: 'technical blueprint diagram with annotations, blue background, white lines, engineering drawing style',
    };

    const styleHint = styleHints[style] || styleHints.render3d;

    const prompt = `Generate an image. Industrial design product visualization of: ${conceptName}.

Description: ${conceptDescription}

Style: ${styleHint}. The image must clearly show the product concept as a single hero subject, centered, with no text or labels visible. Focus on form, materials, and key functional features described. Return ONLY the image, no text explanation.`;

    console.log('Generating image for concept:', conceptName);

    const callImageModel = async (model: string) => {
      return await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: prompt }],
          modalities: ["image", "text"],
        }),
      });
    };

    let response = await callImageModel("google/gemini-2.5-flash-image");

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
          error: "Créditos insuficientes para gerar imagem. Adicione créditos na sua conta."
        }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "Erro ao gerar imagem" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let aiData = await response.json();
    let imageUrl = aiData.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    // Retry once with a stronger model if no image was returned
    if (!imageUrl) {
      console.log("First attempt returned no image, retrying with pro model...");
      const retry = await callImageModel("google/gemini-3-pro-image-preview");
      if (retry.ok) {
        aiData = await retry.json();
        imageUrl = aiData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
      }
    }

    if (!imageUrl) {
      console.error("No image in AI response:", JSON.stringify(aiData).slice(0, 500));
      return new Response(JSON.stringify({
        error: "A IA não conseguiu gerar uma imagem desta vez. Tente novamente em alguns segundos ou use outro estilo."
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log('Image generated successfully');

    return new Response(JSON.stringify({ imageUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error generating concept image:", error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : "Erro desconhecido"
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
