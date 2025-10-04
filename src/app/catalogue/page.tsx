
'use client';

import { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, Loader2, ShoppingCart } from 'lucide-react';
import Image from 'next/image';

function CataloguePageContent() {
    const searchParams = useSearchParams();
    const router = useRouter();

    const product = {
        title: searchParams.get('title') || 'Product',
        description: searchParams.get('description') || 'No description available.',
        price: parseFloat(searchParams.get('price') || '0'),
        image: searchParams.get('image') || 'https://placehold.co/600x400',
        sellerName: searchParams.get('sellerName') || 'Snazzify',
        sellerId: searchParams.get('sellerId'),
        orderId: searchParams.get('orderId'),
        source: searchParams.get('source'),
        quantity: searchParams.get('quantity'),
        size: searchParams.get('size'),
        color: searchParams.get('color'),
    };
    
    const handleOrderClick = () => {
        const params = new URLSearchParams();
        
        // Forward all existing parameters from the catalogue URL to the secure-cod URL
        searchParams.forEach((value, key) => {
            params.append(key, value);
        });

        // Ensure the product name is explicitly set for the order form
        params.set('name', product.title);
        
        router.push(`/secure-cod?${params.toString()}`);
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
            <Card className="w-full max-w-2xl shadow-lg">
                <CardHeader className="text-center">
                    <CardTitle className="text-3xl font-bold">{product.title}</CardTitle>
                    <CardDescription>Shared by {product.sellerName}</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                    <div className="w-full">
                        <Image
                            src={product.image}
                            alt={product.title}
                            width={400}
                            height={400}
                            className="rounded-lg object-cover w-full aspect-square shadow-md"
                        />
                    </div>
                    <div className="space-y-4">
                        <p className="text-muted-foreground whitespace-pre-wrap">{product.description}</p>
                        <div className="text-3xl font-bold">
                            ₹{product.price.toFixed(2)}
                        </div>
                    </div>
                </CardContent>
                <CardFooter>
                    <Button className="w-full" size="lg" onClick={handleOrderClick}>
                        Click to Order
                        <ShoppingCart className="ml-2 h-5 w-5" />
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}

export default function CataloguePage() {
    return (
        <Suspense fallback={<div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
            <CataloguePageContent />
        </Suspense>
    );
}
