
import { NextResponse } from 'next/server';
import { ai } from '@/ai/genkit';
import { googleAI } from '@genkit-ai/google-genai';

export const maxDuration = 180; // Allow 3 minutes for AI image generation

export async function POST(request: Request) {
  try {
    const input = await request.json();
    
    if (!input.personImageDataUri || !input.productImageDataUri) {
      return NextResponse.json({ error: 'Missing image data' }, { status: 400 });
    }

    const title = (input.productTitle || 'item').toLowerCase();
    const isWatch = title.includes('watch');
    const isShoes = title.includes('shoe') || title.includes('sandal') || title.includes('sneaker') || title.includes('footwear');
    const isEyewear = title.includes('glass') || title.includes('shade') || title.includes('spectacle');
    
    // Pattern & Fabric preservation instructions
    const patternInstruction = `CRITICAL: The fabric pattern, color motifs, and texture of the item in the SECOND photo must be preserved 100% EXACTLY and mapped onto the new garment in the final image. Do NOT use generic or plain colors if the product has a pattern.`;

    let styleInstructions = '';
    if (isWatch) {
        styleInstructions = `MODE: ACCESSORY FITTING (WATCH). Fit the watch from the second photo onto the user's wrist shown in the first photo. Match angle and shadows.`;
    } else if (isShoes) {
        styleInstructions = `MODE: FOOTWEAR FITTING. COMPLETELY REPLACE the user's current footwear in the first photo with the shoes from the second photo.`;
    } else if (input.drapeStyle === 'East Indian Lugra') {
        styleInstructions = `MODE: AUTHENTIC EAST INDIAN LUGRA. Drape the fabric from the second photo over the person's left shoulder. Add traditional East Indian jewelry. ${patternInstruction}`;
    } else if (input.drapeStyle === 'Standard Saree') {
        styleInstructions = `MODE: STANDARD NIVI SAREE. Floor-length drape with matching blouse from the provided fabric. ${patternInstruction}`;
    } else if (input.drapeStyle === 'Western Wear' || title.includes('skirt') || title.includes('mini')) {
        styleInstructions = `MODE: WESTERN FIT (MINI/SKIRT/TIGHT FIT). COMPLETELY REMOVE the person's current lower-body clothing and replace it with a high-end fashion mini-skirt silhouette using the fabric from the SECOND photo. ${patternInstruction}`;
    } else {
        styleInstructions = `STYLING MODE: ${input.drapeStyle || 'Western'}. Silhouette: ${input.garmentType || 'Clothing'}. Sleeves: ${input.sleeveLength || 'Standard'}. ${patternInstruction}`;
    }

    const finalPrompt = `ACT AS AN ELITE FASHION RETOUCHER AND VIRTUAL STYLIST. 
    
    YOUR MISSION: PERFORM A SURGICAL CLOTHING REPLACEMENT.
    
    FIRST PHOTO: Contains the TARGET PERSON.
    SECOND PHOTO: Contains the TARGET CLOTHING ITEM ("${input.productTitle}").
    
    MANDATORY EXECUTION STEPS:
    1. EXTRACT the exact fabric, pattern, color, and texture from the item in the SECOND PHOTO.
    2. COMPLETELY REMOVE (DELETE/ERASE) every piece of clothing currently on the person in the FIRST PHOTO. 
       - IF THEY ARE WEARING A YELLOW SHIRT, DELETE IT COMPLETELY.
       - IF THEY ARE WEARING A BEIGE SKIRT, DELETE IT COMPLETELY.
       - NO TRACE of the original clothes (no collars, no hemlines, no shadows of old clothes) should remain.
    3. RE-CLOTHE the person using ONLY the fabric and design from the SECOND PHOTO.
    4. ${styleInstructions}
    5. Ensure the new clothes fit the person's body shape and pose naturally, conforming to their silhouette.
    6. CRITICAL: DO NOT ALTER the person's face, hair, eyes, or identity. THEY MUST REMAIN 100% THE SAME PERSON. ONLY change their clothes.
    
    OUTPUT: RETURN ONLY THE FINAL GENERATED IMAGE.`;

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
          return NextResponse.json({ error: 'AI processed the request but did not return an image. Try a different photo.' }, { status: 200 });
        }

        return NextResponse.json({ generatedImageDataUri: media.url });
    } catch (innerError: any) {
        console.error("ai.generate crash in try-on:", innerError);
        return NextResponse.json({ error: "The AI model is busy. Please try again with a smaller photo." }, { status: 200 });
    }
  } catch (error: any) {
    console.error('API Virtual Try-On Route Crash:', error);
    return NextResponse.json({ error: 'The AI engine is temporarily busy. Please try again in 30 seconds.' }, { status: 200 });
  }
}
