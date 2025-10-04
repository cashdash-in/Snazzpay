
'use client';

import { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, Loader2, ShoppingCart } from 'lucide-react';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import type { SellerProduct } from '../seller/ai-product-uploader/page';

function SmartMagazineContent() {
    const searchParams = useSearchParams();
    const router = useRouter();

    const productsStr = searchParams.get('products');
    const products: SellerProduct[] = productsStr ? JSON.parse(productsStr) : [];
    
    const handleOrderClick = (product: SellerProduct) => {
        const params = new URLSearchParams();
        
        params.set('name', product.title);
        params.set('amount', product.price.toString());
        params.set('source', 'SmartMagazine');
        
        // Forward other relevant details
        if (product.sellerId) params.set('sellerId', product.sellerId);
        // You might want to pre-fill other details if available
        // params.set('size', product.size);
        
        router.push(`/secure-cod?${params.toString()}`);
    };

    if (products.length === 0) {
        return (
             <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
                <Card className="w-full max-w-2xl shadow-lg text-center">
                    <CardHeader>
                        <CardTitle>Magazine Not Found</CardTitle>
                        <CardDescription>The requested magazine is empty or could not be loaded.</CardDescription>
                    </CardHeader>
                </Card>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
            <div className="max-w-4xl mx-auto">
                 <Card className="mb-8 text-center shadow-lg">
                    <CardHeader>
                        <CardTitle className="text-3xl font-bold">Our Latest Collection</CardTitle>
                        <CardDescription>Curated just for you by {products[0].sellerName || 'Snazzify'}</CardDescription>
                    </CardHeader>
                </Card>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {products.map(product => (
                        <Card key={product.id} className="shadow-lg overflow-hidden flex flex-col">
                            <CardHeader className="p-0">
                                <Image
                                    src={product.imageDataUris[0]}
                                    alt={product.title}
                                    width={600}
                                    height={600}
                                    className="object-cover w-full h-80"
                                />
                            </CardHeader>
                             <CardContent className="p-6 flex-grow">
                                <CardTitle className="text-xl font-bold mb-2">{product.title}</CardTitle>
                                <CardDescription className="line-clamp-3 mb-4">{product.description}</CardDescription>
                                <div className="text-2xl font-bold">
                                    ₹{product.price.toFixed(2)}
                                </div>
                            </CardContent>
                            <CardFooter>
                                <Button className="w-full" size="lg" onClick={() => handleOrderClick(product)}>
                                    Click to Order
                                    <ShoppingCart className="ml-2 h-5 w-5" />
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
