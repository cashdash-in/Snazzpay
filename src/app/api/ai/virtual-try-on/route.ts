
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

    // NUCLEAR SURGICAL RE-DRESS PROMPT - HIGHEST INTENSITY
    const finalPrompt = `ACT AS AN ELITE FASHION STUDIO RETOUCHER & AI GENERATIVE FILL MASTER. 

    TASK: PERFORM A 100% SURGICAL CLOTHING SUBSTITUTION ON THE PERSON IN THE FIRST PHOTO.
    
    MISSION PARAMETERS:
    1. SURGICAL OBLITERATION: 
       - Identify the exact area occupied by the person's current outfit (torso, sleeves, legs).
       - COMPLETELY ERASE and OBLITERATE every single pixel of the original clothes.
       - IGNORE original colors (like yellow, beige, or white). They must be 100% REMOVED.
       - Do not "blend" or "overlay"; this is a clean-slate full replacement.
       
    2. PRODUCT INJECTION: 
       - Use the product shown in the second photo: "${input.productTitle}".
       - Extract the exact pattern, fabric texture, weave, and color motif.
       - Re-dress the person using ONLY the new product texture.
       - Drape the garment flawlessly according to the body silhouette, matching folds and natural physics.
    
    3. IDENTITY PRESERVATION: 
       - CRITICAL: Do NOT modify the person's face, hair, skin tone, or background.
       - The person must remain exactly the same; only the outfit is surgically swapped.
       - Ensure shadows and environment lighting on the new fabric are 100% realistic.

    MODE: ${input.garmentType || 'Apparel'} Fitting.
    DRAPE STYLE: ${input.drapeStyle || 'Western'}.

    OUTPUT: RETURN ONLY THE FINAL GENERATED IMAGE. NO OVERLAYS. NO GHOSTING.`;

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
          return NextResponse.json({ error: 'AI processed the request but did not return an image. This might be due to high traffic.' }, { status: 200 });
        }

        return NextResponse.json({ generatedImageDataUri: media.url });
    } catch (innerError: any) {
        console.error("ai.generate crash in try-on:", innerError);
        return NextResponse.json({ error: "The AI model is temporarily busy. Please try again in 30 seconds." }, { status: 200 });
    }
  } catch (error: any) {
    console.error('API Virtual Try-On Route Crash:', error);
    return NextResponse.json({ error: 'AI Service Error. Please refresh and try again.' }, { status: 200 });
  }
}
