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

    const garmentTitle = (input.productTitle || 'Apparel').toLowerCase();
    
    // Advanced Classification Logic
    const isMini = garmentTitle.includes('mini') || garmentTitle.includes('skirt') || garmentTitle.includes('short');
    const isWesternDress = (garmentTitle.includes('dress') || garmentTitle.includes('frock')) && !isMini;
    const isKurti = garmentTitle.includes('kurti') || garmentTitle.includes('kurta');
    const isSaree = garmentTitle.includes('saree') || garmentTitle.includes('fabric') || garmentTitle.includes('lugra');
    
    let styleMode = input.drapeStyle;
    if (!styleMode) {
        if (isMini) styleMode = 'Western Wear';
        else if (isWesternDress) styleMode = 'Western Dress';
        else if (isKurti) styleMode = 'Kurti';
        else if (isSaree) styleMode = 'Standard Saree';
        else styleMode = 'Ethnic Wear';
    }

    // SURGICAL RE-DRESS PROMPT - REFINED FOR VARIETY & SILHOUETTE PRECISION
    const finalPrompt = `ACT AS AN ELITE FASHION STUDIO GENERATIVE FILL MASTER.

    TASK: PERFORM A 100% SURGICAL CLOTHING SUBSTITUTION ON THE PERSON IN THE FIRST PHOTO.
    
    MISSION PARAMETERS:
    1. CATEGORY ALIGNMENT (CRITICAL): 
       - TARGET ITEM: "${input.productTitle}".
       - STYLE MODE: ${styleMode}.
       - SILHOUETTE: ${input.garmentType || 'Apparel'}.
       - SLEEVES: ${input.sleeveLength || 'Standard'}.
       
       SPECIFIC LOGIC:
       - IF "Western Wear" or "Mini": Ensure a contemporary, short-length fit. Erase ALL original long ethnic wear. The result must be a modern western fit.
       - IF "Western Dress": Ensure a clean one-piece flow silhouette.
       - IF "Saree" or "Lugra": Use traditional drape mechanics based strictly on the fabric in the second photo.
       - IF "Kurti": Create a knee-length or waist-length ethnic tunic fit.

    2. SURGICAL OBLITERATION: 
       - Identify the exact area occupied by the person's current outfit in photo 1.
       - COMPLETELY ERASE and OBLITERATE original pixels of the existing clothing. No blending with old colors.
       - Use the second photo as the SOLE source for the new outfit's texture, pattern, and color.
       
    3. IDENTITY PRESERVATION: 
       - Keep the person's face, hair, skin tone, hands, and environment EXACTLY as they are.
       - Match shadows and lighting of the new garment to the background scene of the first photo.

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
