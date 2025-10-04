
'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, Loader2, ShoppingCart } from 'lucide-react';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import type { SellerProduct } from '../seller/ai-product-uploader/page';
import { getCollection, getDocument } from '@/services/firestore';
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
            const fetchedProducts: DisplayProduct[] = [];

            // We need to check both seller_products and product_drops collections
            const [sellerProducts, productDrops] = await Promise.all([
                getCollection<SellerProduct>('seller_products'),
                getCollection<ProductDrop>('product_drops')
            ]);
            
            for (const id of productIds) {
                const sellerProduct = sellerProducts.find(p => p.id === id);
                if (sellerProduct) {
                    fetchedProducts.push(sellerProduct);
                    continue;
                }
                const productDrop = productDrops.find(p => p.id === id);
                if (productDrop) {
                    fetchedProducts.push(productDrop);
                }
            }
            setProducts(fetchedProducts);
            setIsLoading(false);
        }
        fetchProducts();
    }, [searchParams]);
    
    const handleOrderClick = (product: DisplayProduct) => {
        const params = new URLSearchParams();
        
        params.set('name', product.title);
        params.set('amount', (product.price || (product as any).costPrice).toString());
        params.set('source', 'SmartMagazine');
        
        // Forward other relevant details if they exist
        if ((product as SellerProduct).sellerId) params.set('sellerId', (product as SellerProduct).sellerId);
        if ((product as ProductDrop).vendorName) params.set('sellerName', (product as ProductDrop).vendorName);
        
        router.push(`/secure-cod?${params.toString()}`);
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

    return (
        <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
            <div className="max-w-4xl mx-auto">
                 <Card className="mb-8 text-center shadow-lg">
                    <CardHeader>
                        <CardTitle className="text-3xl font-bold">Our Latest Collection</CardTitle>
                        <CardDescription>Curated just for you by {(products[0] as any).sellerName || (products[0] as any).vendorName || 'Snazzify'}</CardDescription>
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
                                    ₹{(product.price || (product as any).costPrice).toFixed(2)}
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
