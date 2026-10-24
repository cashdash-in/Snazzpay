
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
    
    let styleInstructions = '';
    if (isWatch) {
        styleInstructions = 'MODE: ACCESSORY FITTING (WATCH). Fit the watch from the second photo onto the user\'s wrist shown in the first photo. Match angle and shadows.';
    } else if (isShoes) {
        styleInstructions = 'MODE: FOOTWEAR FITTING. Re-dress the user\'s feet in the first photo with the shoes from the second photo.';
    } else if (input.drapeStyle === 'East Indian Lugra') {
        styleInstructions = 'MODE: AUTHENTIC EAST INDIAN LUGRA. Drape the fabric from the second photo over the left shoulder. Add traditional East Indian jewelry.';
    } else if (input.drapeStyle === 'Standard Saree') {
        styleInstructions = 'MODE: STANDARD NIVI SAREE. Floor-length drape with matching blouse from the provided fabric.';
    } else {
        styleInstructions = `STYLING MODE: ${input.drapeStyle || 'Western'}. Silhouette: ${input.garmentType || 'Clothing'}. Sleeves: ${input.sleeveLength || 'Standard'}.`;
    }

    try {
        const { media } = await ai.generate({
          model: googleAI.model('gemini-2.5-flash-image'),
          prompt: [
            { media: { url: input.personImageDataUri, contentType: 'image/jpeg' } },
            { media: { url: input.productImageDataUri, contentType: 'image/jpeg' } },
            { 
              text: `ACT AS AN ELITE VIRTUAL STYLIST. TASK: RE-DRESS or ACCESSORIZE the person in the first photo using the item shown in the second photo ("${input.productTitle}"). ${styleInstructions} CRITICAL: Keep person's face and distinct features exactly as they are. Return ONLY the final generated image.` 
            },
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
