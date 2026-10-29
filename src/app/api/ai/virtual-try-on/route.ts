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

    // High-Intensity "Nuclear Pixel-Erase" Instructions for absolute clothing replacement
    const finalPrompt = `ACT AS AN ELITE FASHION STUDIO RETOUCHER & GENERATIVE FILL MASTER. 
    
    MISSION: PERFORM A FULL-BODY CLOTHING REPLACEMENT. THE GOAL IS TO REMOVE ALL TRACES OF THE ORIGINAL GARMENT.
    
    1. OBLITERATE ORIGINAL CLOTHING (First Photo): 
       - Identify the exact area occupied by the person's current outfit (e.g. shirt, top, skirt, dress).
       - SURGICALLY ERASE every pixel of this outfit. DO NOT BLEND. 
       - Completely ignore the original garment's colors (such as a yellow shirt or beige skirt). They must be 100% GONE.
       
    2. PRODUCT SUBSTITUTION (Second Photo): 
       - Use the product: "${input.productTitle}".
       - EXTRACT the exact fabric texture, pattern, and color motif.
    
    3. PIXEL-PERFECT RE-DRESS: 
       - Re-clothe the person using ONLY the new product. 
       - Map the texture flawlessly onto the body silhouette. 
       - Ensure the new garment is the ONLY thing visible in that body region.
       - Match shadows and ambient lighting to the background of the first photo.
       
    4. IDENTITY PRESERVATION: 
       - Do NOT change the person's face, features, skin tone, or hair. Keep the human identity exactly as it appears in the first photo.
    
    OUTPUT: RETURN ONLY THE FINAL GENERATED IMAGE. THIS IS A REPLACEMENT, NOT AN OVERLAY.`;

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
          return NextResponse.json({ error: 'AI processed the request but did not return an image. The product may have triggered a safety filter.' }, { status: 200 });
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
