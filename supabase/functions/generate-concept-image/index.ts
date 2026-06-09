import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GenerateImageRequest {
  conceptName: string;
  conceptDescription: string;
  style?: 'realistic' | 'sketch' | 'render3d' | 'blueprint';
  aspectRatio?: string;
}

function dataUrlToBytes(dataUrl: string): { bytes: Uint8Array; contentType: string } {
  const match = dataUrl.match(/^data:(.+);base64,(.+)$/);
  if (!match) throw new Error("Invalid data URL");
  const contentType = match[1];
  const b64 = match[2];
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return { bytes, contentType };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { conceptName, conceptDescription, style = 'render3d' } = await req.json() as GenerateImageRequest;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");
    if (!conceptName || !conceptDescription) {
      return new Response(JSON.stringify({ error: "conceptName and conceptDescription are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
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

    const callImageModel = async (model: string) => fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model, messages: [{ role: "user", content: prompt }], modalities: ["image", "text"] }),
    });

    let response = await callImageModel("google/gemini-2.5-flash-image");
    if (!response.ok) {
      if (response.status === 429) return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns minutos." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (response.status === 402) return new Response(JSON.stringify({ error: "Créditos insuficientes para gerar imagem." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "Erro ao gerar imagem" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let aiData = await response.json();
    let dataUrl: string | undefined = aiData.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!dataUrl) {
      const retry = await callImageModel("google/gemini-3-pro-image-preview");
      if (retry.ok) {
        aiData = await retry.json();
        dataUrl = aiData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
      }
    }

    if (!dataUrl) {
      return new Response(JSON.stringify({ error: "A IA não conseguiu gerar uma imagem desta vez. Tente novamente." }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Persist to storage so URL is permanent
    try {
      const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);
      const { bytes, contentType } = dataUrlToBytes(dataUrl);
      const ext = contentType.includes("png") ? "png" : contentType.includes("webp") ? "webp" : "jpg";
      const path = `concepts/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("principle-images").upload(path, bytes, { contentType, upsert: false });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("principle-images").getPublicUrl(path);
      return new Response(JSON.stringify({ imageUrl: pub.publicUrl }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (e) {
      console.error("Storage upload failed, returning data URL:", e);
      // Fallback to data URL so UI still works
      return new Response(JSON.stringify({ imageUrl: dataUrl }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (error) {
    console.error("Error generating concept image:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
