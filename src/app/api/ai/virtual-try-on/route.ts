
import { NextResponse } from 'next/server';
import { ai } from '@/ai/genkit';
import { googleAI } from '@genkit-ai/google-genai';

export const maxDuration = 180; // Allow 3 minutes for high-quality image generation

export async function POST(request: Request) {
  try {
    const input = await request.json();
    
    if (!input.personImageDataUri || !input.productImageDataUri) {
      return NextResponse.json({ error: 'Missing image data' }, { status: 400 });
    }

    const garment = (input.productTitle || 'Apparel').toLowerCase();
    const isWestern = garment.includes('skirt') || garment.includes('mini') || garment.includes('dress') || garment.includes('frock');
    const styleMode = input.drapeStyle || (isWestern ? 'Western Wear' : 'Ethnic Wear');

    // SURGICAL RE-DRESS PROMPT - REFINED FOR VARIETY
    const finalPrompt = `ACT AS AN ELITE FASHION STUDIO GENERATIVE FILL MASTER.

    TASK: PERFORM A 100% SURGICAL CLOTHING SUBSTITUTION ON THE PERSON IN THE FIRST PHOTO.
    
    MISSION PARAMETERS:
    1. CATEGORY ALIGNMENT (CRITICAL): 
       - The target garment is a "${input.productTitle}".
       - DRAPE STYLE: ${styleMode}.
       - SILHOUETTE: ${input.garmentType || 'Apparel'}.
       - SLEEVES: ${input.sleeveLength || 'Standard'}.
       - IF "Western Wear" or "Mini": Ensure a contemporary, short-length fit. Erase ALL original long ethnic wear.
       - IF "Dress": Ensure a one-piece flow silhouette.
       - IF "Saree" or "Lugra": Use traditional drape mechanics.

    2. SURGICAL OBLITERATION: 
       - Identify the exact area occupied by the person's current outfit.
       - COMPLETELY ERASE and OBLITERATE original pixels. No blending with old colors.
       - Use the second photo as the SOLE source for the new outfit's texture, pattern, and color.
       
    3. IDENTITY PRESERVATION: 
       - Keep the person's face, hair, skin tone, and environment EXACTLY as they are.
       - Match shadows and lighting of the new fabric to the background scene.

    OUTPUT: RETURN ONLY THE FINAL GENERATED IMAGE. ZERO ORIGINAL CLOTHING PIXELS.`;

    try {
        const { media } = await ai.generate({
          model: googleAI.model('gemini-2.5-flash-image'),
          prompt: [
            { media: { url: input.personImageDataUri, contentType: 'image/jpeg' } },
            { media: { url: input.productImageDataUri, contentType: 'image/jpeg' } },
            { text: finalPrompt },
          ],
          config: {
            responseModalities: ['TEXT', 'IMAGE'],
            safetySettings: [
              { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
              { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
              { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
              { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
            ]
          },
        });

        if (!media?.url) {
          return NextResponse.json({ error: 'AI processed the request but did not return an image. This might be due to safety filters or traffic.' }, { status: 200 });
        }

        return NextResponse.json({ generatedImageDataUri: media.url });
    } catch (innerError: any) {
        console.error("ai.generate crash in try-on:", innerError);
        return NextResponse.json({ error: "The AI model is temporarily busy. Please try again in a few moments." }, { status: 200 });
    }
  } catch (error: any) {
    console.error('API Virtual Try-On Route Crash:', error);
    return NextResponse.json({ error: 'AI Service Error. Please refresh and try again.' }, { status: 200 });
  }
}
