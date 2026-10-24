
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

    const title = (input.productTitle || 'item').toLowerCase();
    
    // Nuclear "Re-Dress" Instructions
    const finalPrompt = `ACT AS AN ELITE FASHION RETOUCHER. 
    
    MISSION: PERFORM A FULL SURGICAL CLOTHING REPLACEMENT.
    
    1. TARGET PERSON (First Photo): IDENTIFY AND OBLITERATE (ERASE) THE CURRENT OUTFIT. 
       - IF THEY ARE WEARING A YELLOW SHIRT, DELETE IT COMPLETELY.
       - IF THEY ARE WEARING A BEIGE SKIRT, DELETE IT COMPLETELY.
       - NO TRACE of the original clothing textures or colors should remain.
       
    2. PRODUCT (Second Photo): EXTRACT THE FABRIC, PATTERN, AND TEXTURE OF THIS ITEM ("${input.productTitle}").
    
    3. RE-CLOTHE: RE-DRESS THE PERSON USING ONLY THE ITEM FROM THE SECOND PHOTO.
       - MAP THE PATTERN AND TEXTURE PIXEL-PERFECTLY ONTO THE PERSON'S BODY.
       - ENSURE THE FIT IS FASHIONABLE AND NATURAL FOR THEIR POSE.
       
    4. PRESERVE HUMAN IDENTITY: DO NOT CHANGE THE PERSON'S FACE, HAIR, OR SKIN TONE.
    
    OUTPUT: RETURN ONLY THE FINAL IMAGE.`;

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
          return NextResponse.json({ error: 'AI generation timed out or blocked. Please try a different photo.' }, { status: 200 });
        }

        return NextResponse.json({ generatedImageDataUri: media.url });
    } catch (innerError: any) {
        console.error("ai.generate crash in try-on:", innerError);
        return NextResponse.json({ error: "The AI model is temporarily busy. Please try with a smaller photo." }, { status: 200 });
    }
  } catch (error: any) {
    console.error('API Virtual Try-On Route Crash:', error);
    return NextResponse.json({ error: 'AI Service Error. Please try again in 30 seconds.' }, { status: 200 });
  }
}
