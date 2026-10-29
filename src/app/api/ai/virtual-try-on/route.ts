
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

    // NUCLEAR SURGICAL RE-DRESS PROMPT - MAXIMUM INTENSITY
    const finalPrompt = `ACT AS AN ELITE FASHION STUDIO GENERATIVE FILL MASTER.

    TASK: PERFORM A 100% SURGICAL CLOTHING SUBSTITUTION ON THE PERSON IN THE FIRST PHOTO.
    
    MISSION PARAMETERS:
    1. SURGICAL OBLITERATION (CRITICAL): 
       - Identify the exact area occupied by the person's current outfit (torso, sleeves, legs).
       - COMPLETELY ERASE and OBLITERATE every single pixel of the original clothes.
       - DO NOT BLEND. Original colors (like yellow, beige, white) must be 100% REMOVED and replaced.
       - Use the second photo as the ONLY source for the new outfit's pixels.
       
    2. PRODUCT INJECTION: 
       - Inject the product from the second photo ("${input.productTitle}") into the erased area.
       - Extract and preserve the exact pattern, fabric texture, weave, and color motif.
       - Drape the garment flawlessly according to the body silhouette, matching folds and natural physics.
    
    3. IDENTITY PRESERVATION: 
       - Keep the person's face, hair, skin tone, and background EXACTLY as they are in the first photo.
       - Only the outfit is surgically swapped.
       - Ensure shadows and environmental lighting on the new fabric are 100% realistic.

    MODE: ${input.garmentType || 'Apparel'} Fitting.
    DRAPE STYLE: ${input.drapeStyle || 'Western'}.

    OUTPUT: RETURN ONLY THE FINAL GENERATED IMAGE. NO OVERLAYS. NO GHOSTING. ZERO ORIGINAL CLOTHING PIXELS.`;

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
