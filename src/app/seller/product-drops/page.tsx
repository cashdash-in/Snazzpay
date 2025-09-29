
'use client';

import { useState, useEffect } from 'react';
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import Image from 'next/image';
import { Loader2, Package, Sparkles, ShoppingCart, Info, MessageSquare } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useRouter } from 'next/navigation';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";


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
    
    const shareWithApi = async (drop: ProductDrop, shareText: string) => {
        try {
            const files = await Promise.all(
                drop.imageDataUris.map((uri, index) => dataUriToFile(uri, `product_${drop.id}_${index}.png`))
            );

            if (navigator.share && navigator.canShare({ files })) {
                 await navigator.share({
                    title: drop.title,
                    text: shareText,
                    files: files,
                });
                toast({ title: "Shared successfully!" });
            } else {
                 throw new Error("Web Share API not supported on this device.");
            }
        } catch (error) {
            console.error("Web Share API failed:", error);
            // This catch block will now handle the fallback for desktop
            openWhatsAppWeb(shareText);
        }
    };

    const openWhatsAppWeb = (shareText: string) => {
        const whatsappUrl = `https://web.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
        window.open(whatsappUrl, '_blank');
        toast({
            title: "Opening WhatsApp Web...",
            description: "Please add the product images to your message manually.",
            duration: 8000,
        });
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
                        {drops.map(drop => {
                            const shareText = `Check out this new product drop from ${drop.vendorName}!\n\n*${drop.title}*\n*Cost Price:* ₹${drop.costPrice.toFixed(2)}\n\n${drop.description}\n\nContact me to place your order!`;
                            return (
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
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button className="w-full" variant="secondary">
                                                <MessageSquare className="mr-2 h-4 w-4" />
                                                Share on WhatsApp
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                             <AlertDialogHeader>
                                                <AlertDialogTitle>Share Product</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    Choose how to share. The mobile option works best for including images.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter className="flex-col gap-2 pt-2">
                                                 <AlertDialogAction className="w-full" onClick={() => shareWithApi(drop, shareText)}>Share with Images (Mobile/App)</AlertDialogAction>
                                                 <AlertDialogAction className="w-full" onClick={() => openWhatsAppWeb(shareText)}>Open WhatsApp Web (Text Only)</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </CardFooter>
                            </Card>
                        )})}
                    </div>
                )}
            </div>
        </AppShell>
    );
}
