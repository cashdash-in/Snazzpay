
'use client';

import { useState, useEffect } from 'react';
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import Image from 'next/image';
import { Loader2, Package, Sparkles, ShoppingCart, Info, MessageSquare } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useRouter } from 'next/navigation';
import { sanitizePhoneNumber } from '@/lib/utils';

// This interface must match the one in the vendor's page
export interface ProductDrop {
    id: string;
    vendorId: string;
    vendorName: string;
    title: string;
    description: string;
    costPrice: number;
    imageDataUris: string[];
    createdAt: string;
}

// Helper function to convert data URI to File object
async function dataUriToFile(dataUri: string, fileName: string): Promise<File> {
    const res = await fetch(dataUri);
    const blob = await res.blob();
    return new File([blob], fileName, { type: blob.type });
}

export default function SellerProductDropsPage() {
    const { toast } = useToast();
    const router = useRouter();
    const [drops, setDrops] = useState<ProductDrop[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        try {
            const storedDrops = JSON.parse(localStorage.getItem('product_drops') || '[]');
            setDrops(storedDrops);
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Error loading drops',
                description: 'Could not load product drops from local storage.',
            });
        } finally {
            setIsLoading(false);
        }
    }, [toast]);

    const handleUseThisProduct = (drop: ProductDrop) => {
        const prefillData = {
            description: drop.description,
            cost: drop.costPrice,
            imageDataUris: drop.imageDataUris,
            imagePreviews: drop.imageDataUris, // Pass previews as well
        };
        localStorage.setItem('ai_uploader_prefill', JSON.stringify(prefillData));
        toast({
            title: "Redirecting to AI Uploader",
            description: `Pre-filling details for "${drop.title}".`,
        });
        router.push('/seller/ai-product-uploader');
    };
    
    const handleShareOnWhatsApp = async (drop: ProductDrop) => {
        const shareText = `Check out this new product drop!\n\n*${drop.title}*\n\n${drop.description}\n\n*Cost Price:* ₹${drop.costPrice.toFixed(2)}\n\nContact me to place your order!`;

        try {
            // First, try to use the Web Share API, which is great for mobile
            const files = await Promise.all(
                drop.imageDataUris.map((uri, index) => dataUriToFile(uri, `product_${drop.id}_${index}.png`))
            );

            if (!navigator.share) {
                throw new Error("Web Share API not supported.");
            }

            await navigator.share({
                title: drop.title,
                text: shareText,
                files: files,
            });
            toast({ title: "Shared successfully!" });

        } catch (error) {
            // If the share API fails or is not supported (like on most desktop browsers),
            // fall back to opening WhatsApp Web.
            console.warn("Web Share API failed, falling back to WhatsApp Web:", error);
            const whatsappUrl = `https://web.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
            window.open(whatsappUrl, '_blank');
            toast({
                title: "Opening WhatsApp Web...",
                description: "Please drag and drop the product images into your WhatsApp message.",
                duration: 8000,
            });
        }
    };

    return (
        <AppShell title="Product Drops">
            <div className="space-y-8">
                 <Card>
                    <CardHeader>
                        <CardTitle>Incoming Product Drops</CardTitle>
                        <CardDescription>
                            This is your feed of new products shared by approved vendors. Review the details and decide which products to sell.
                        </CardDescription>
                    </CardHeader>
                </Card>

                {isLoading ? (
                    <div className="flex justify-center items-center h-64">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : drops.length === 0 ? (
                    <Card className="text-center py-16">
                        <CardContent>
                             <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4"/>
                            <h3 className="text-xl font-semibold">No Product Drops Yet</h3>
                            <p className="text-muted-foreground mt-2">When vendors share new products, they will appear here.</p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {drops.map(drop => (
                            <Card key={drop.id} className="flex flex-col">
                                <CardHeader>
                                    <div className="flex justify-center mb-4 h-40">
                                         <Image src={drop.imageDataUris[0]} alt={drop.title} width={200} height={200} className="object-contain rounded-md"/>
                                    </div>
                                    <CardTitle>{drop.title}</CardTitle>
                                    <CardDescription>From: {drop.vendorName} &bull; {formatDistanceToNow(new Date(drop.createdAt), { addSuffix: true })}</CardDescription>
                                </CardHeader>
                                <CardContent className="flex-grow">
                                    <p className="text-sm text-muted-foreground line-clamp-3">{drop.description}</p>
                                    <div className="mt-4">
                                        <p className="text-lg font-bold">Cost: ₹{drop.costPrice.toFixed(2)}</p>
                                    </div>
                                </CardContent>
                                <CardFooter className="flex-col items-stretch space-y-2">
                                     <Button className="w-full" onClick={() => handleUseThisProduct(drop)}>
                                        <Sparkles className="mr-2 h-4 w-4"/>
                                        Use this Product
                                    </Button>
                                    <Button className="w-full" variant="secondary" onClick={() => handleShareOnWhatsApp(drop)}>
                                        <MessageSquare className="mr-2 h-4 w-4" />
                                        Share on WhatsApp
                                    </Button>
                                </CardFooter>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </AppShell>
    );
}
