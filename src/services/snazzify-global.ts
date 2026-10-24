
'use server';

/**
 * @fileOverview Service to fetch live product data from the public Snazzify.co.in catalog.
 */

export type GlobalProduct = {
  id: string;
  title: string;
  price: number;
  imageUrl: string;
  url: string;
  category: string;
};

/**
 * Fetches the latest products from the live Snazzify Shopify store.
 * Optimized limit to ensure high-performance AI processing.
 */
export async function fetchLiveSnazzifyProducts(): Promise<GlobalProduct[]> {
  try {
    // Increased limit to 250 for full catalog visibility
    const response = await fetch('https://www.snazzify.co.in/products.json?limit=250', {
      next: { revalidate: 3600 } // Cache for 1 hour
    });

    if (!response.ok) {
      throw new Error('Failed to fetch global catalog');
    }

    const data = await response.json();
    const products = data.products || [];

    return products.map((p: any) => {
      const firstVariant = p.variants?.[0];
      const firstImage = p.images?.[0]?.src;
      
      return {
        id: p.id.toString(),
        title: p.title,
        price: parseFloat(firstVariant?.price || '0'),
        imageUrl: firstImage || `https://picsum.photos/seed/${p.id}/400/400`,
        url: `https://www.snazzify.co.in/products/${p.handle}`,
        category: p.product_type || 'General'
      };
    });
  } catch (error) {
    console.error('Error in fetchLiveSnazzifyProducts:', error);
    // Return an empty array instead of throwing to keep the UI stable
    return [];
  }
}
