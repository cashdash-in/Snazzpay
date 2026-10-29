
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

    // Advanced "Pixel-Erase & Re-Clothe" Instructions
    const finalPrompt = `ACT AS AN ELITE FASHION STUDIO RETOUCHER & GENERATIVE FILL MASTER. 
    
    MISSION: PERFORM A FULL-BODY CLOTHING REPLACEMENT WITH 100% FABRIC FIDELITY.
    
    1. IDENTIFY TARGET AREA (First Photo): 
       - Find the exact area occupied by the current clothing (shirt, top, dress, skirt, or pants).
       - MASK AND ERASE this entire area. OBLITERATE the original outfit pixels completely. 
       - Do NOT let any part of the original outfit (like a yellow shirt or beige skirt) show through or blend.
       
    2. PRODUCT EXTRACTION (Second Photo): 
       - Study the product: "${input.productTitle}".
       - EXTRACT the exact pattern, color motifs, and fabric texture.
    
    3. SURGICAL RE-DRESS: 
       - Generate the new garment in the ERASED area using ONLY the patterns and textures from the product photo.
       - MAP the texture pixel-perfectly onto the body's contours.
       - The new garment must be the ONLY clothing visible in that area.
       - MATCH shadows and highlights to the lighting of the first photo.
       
    4. PRESERVE IDENTITY: 
       - DO NOT modify the face, hands, skin tone, hair, or physical features of the person.
    
    OUTPUT: RETURN ONLY THE FINAL GENERATED IMAGE. THIS IS A MANDATORY REPLACEMENT, NOT A BLEND.`;

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
          return NextResponse.json({ error: 'AI processed the request but did not return an image. Try a clearer photo.' }, { status: 200 });
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
