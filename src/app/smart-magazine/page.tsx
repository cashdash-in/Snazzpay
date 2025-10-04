
'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ShoppingCart } from 'lucide-react';
import Image from 'next/image';
import type { SellerProduct } from '../seller/ai-product-uploader/page';
import { getCollection } from '@/services/firestore';
import type { ProductDrop } from '../vendor/product-drops/page';

type DisplayProduct = SellerProduct | ProductDrop;

function SmartMagazineContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [products, setProducts] = useState<DisplayProduct[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function fetchProducts() {
            const productIdsStr = searchParams.get('products');
            if (!productIdsStr) {
                setIsLoading(false);
                return;
            }

            const productIds = productIdsStr.split(',');
            if (productIds.length === 0) {
                setIsLoading(false);
                return;
            }

            try {
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
        const params = new URLSearchParams();
        // CORRECT: Only pass the ID. The catalogue page will fetch the rest.
        params.set('id', product.id);
        router.push(`/catalogue?${params.toString()}`);
    };

    if (isLoading) {
        return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
    }

    if (products.length === 0) {
        return (
             <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
                <Card className="w-full max-w-2xl shadow-lg text-center">
                    <CardHeader>
                        <CardTitle>Magazine Not Found</CardTitle>
                        <CardDescription>The requested magazine is empty or the products could not be loaded.</CardDescription>
                    </CardHeader>
                </Card>
            </div>
        )
    }

    const firstProductSeller = (products[0] as SellerProduct)?.sellerName || (products[0] as ProductDrop)?.vendorName || 'Snazzify';

    return (
        <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
            <div className="max-w-6xl mx-auto">
                 <Card className="mb-8 text-center shadow-lg">
                    <CardHeader>
                        <CardTitle className="text-3xl font-bold">Our Latest Collection</CardTitle>
                        <CardDescription>Curated just for you by {firstProductSeller}</CardDescription>
                    </CardHeader>
                </Card>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {products.map(product => (
                        <Card key={product.id} className="shadow-md hover:shadow-xl transition-shadow overflow-hidden flex flex-col group">
                            <CardHeader className="p-0">
                                <Image
                                    src={product.imageDataUris[0]}
                                    alt={product.title}
                                    width={100}
                                    height={200}
                                    className="object-cover w-full h-48"
                                />
                            </CardHeader>
                             <CardContent className="p-4 flex-grow">
                                <CardTitle className="text-base font-semibold mb-1 line-clamp-2">{product.title}</CardTitle>
                                <div className="text-lg font-bold">
                                    ₹{((product as SellerProduct).price || (product as ProductDrop).costPrice).toFixed(2)}
                                </div>
                            </CardContent>
                            <CardFooter className="p-2">
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
