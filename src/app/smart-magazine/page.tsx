'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ShoppingCart } from 'lucide-react';
import Image from 'next/image';
import type { SellerProduct } from '../seller/ai-product-uploader/page';
import { getCollection, getDocument } from '@/services/firestore';
import type { ProductDrop } from '../vendor/product-drops/page';

type DisplayProduct = SellerProduct | ProductDrop;

type Magazine = {
    id: string;
    title: string;
    vendorTitle?: string;
    productIds: string[];
    creatorName: string;
    createdAt: string;
};


function SmartMagazineContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [products, setProducts] = useState<DisplayProduct[]>([]);
    const [magazine, setMagazine] = useState<Magazine | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function fetchProducts() {
            const magazineId = searchParams.get('id');

            if (!magazineId) {
                setIsLoading(false);
                return;
            }

            try {
                // Track visit
                fetch('/api/track', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ event: 'magazineVisit' }),
                });

                const fetchedMagazine = await getDocument<Magazine>('smart_magazines', magazineId);
                if (!fetchedMagazine) {
                    setIsLoading(false);
                    return;
                }
                setMagazine(fetchedMagazine);
                
                const productIds = fetchedMagazine.productIds;
                if (productIds.length === 0) {
                    setIsLoading(false);
                    return;
                }
                
                const fetchedProducts: DisplayProduct[] = [];
                const [sellerProducts, productDrops] = await Promise.all([
                    getCollection<SellerProduct>('seller_products'),
                    getCollection<ProductDrop>('product_drops')
                ]);
                
                const productMap = new Map<string, DisplayProduct>();
                sellerProducts.forEach(p => productMap.set(p.id, p));
                productDrops.forEach(p => productMap.set(p.id, p));

                for (const id of productIds) {
                    const product = productMap.get(id);
                    if (product) {
                        fetchedProducts.push(product);
                    }
                }
                setProducts(fetchedProducts);
            } catch (error) {
                console.error("Failed to fetch products for magazine:", error);
            } finally {
                setIsLoading(false);
            }
        }
        fetchProducts();
    }, [searchParams]);
    
    const handleOrderClick = (product: DisplayProduct) => {
        const params = new URLSearchParams(searchParams); // Preserve existing params like discount
        params.set('id', product.id);

        if ((product as SellerProduct).sizes && (product as SellerProduct).sizes.length > 0) {
            params.set('sizes', (product as SellerProduct).sizes.join(','));
        }
        if ((product as SellerProduct).colors && (product as SellerProduct).colors.length > 0) {
            params.set('colors', (product as SellerProduct).colors.join(','));
        }

        router.push(`/catalogue?${params.toString()}`);
    };

    if (isLoading) {
        return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
    }

    if (!magazine || products.length === 0) {
        return (
             <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
                <Card className="w-full max-w-2xl shadow-lg text-center">
                    <CardHeader>
                        <CardTitle>Magazine Not Found</CardTitle>
                        <CardDescription>The requested magazine is empty or the link is invalid.</CardDescription>
                    </CardHeader>
                </Card>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
            <div className="max-w-6xl mx-auto">
                 <header className="text-center mb-12">
                    <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-gray-900">{magazine.title}</h1>
                    <p className="mt-4 text-lg text-muted-foreground">
                        {magazine.vendorTitle || `A curated collection by ${magazine.creatorName}`}
                    </p>
                </header>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {products.map(product => (
                        <Card key={product.id} className="shadow-md hover:shadow-xl transition-shadow overflow-hidden flex flex-col group rounded-lg">
                             <div className="overflow-hidden">
                                <Image
                                    src={product.imageDataUris[0]}
                                    alt={product.title}
                                    width={400}
                                    height={400}
                                    className="object-cover w-full h-48 sm:h-64 group-hover:scale-105 transition-transform duration-300"
                                />
                            </div>
                             <CardContent className="p-4 flex-grow flex flex-col">
                                <h3 className="text-base font-semibold mb-1 line-clamp-2 flex-grow">{product.title}</h3>
                                <p className="text-lg font-bold text-primary mt-2">
                                    ₹{((product as SellerProduct).price || (product as ProductDrop).costPrice).toFixed(2)}
                                </p>
                            </CardContent>
                            <CardFooter className="p-2 bg-slate-50">
                                <Button className="w-full" size="sm" onClick={() => handleOrderClick(product)}>
                                    Click to Order
                                    <ShoppingCart className="ml-2 h-4 w-4" />
                                </Button>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default function SmartMagazinePage() {
    return (
        <Suspense fallback={<div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
            <SmartMagazineContent />
        </Suspense>
    );
}
