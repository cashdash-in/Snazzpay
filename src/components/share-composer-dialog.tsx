
'use client';

import { useState, useEffect } from 'react';
import { DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import Image from 'next/image';
import { useAuth } from '@/hooks/use-auth';
import { Loader2, Wand2 } from 'lucide-react';
import { createProductDescription } from '@/ai/flows/create-product-description';

// Can be a ProductDrop or a SellerProduct
type ShareableProduct = {
    id: string;
    title: string;
    description: string;
    imageDataUris: string[];
    costPrice?: number;
    price?: number;
    category?: string;
    vendorName?: string;
};


interface ShareComposerDialogProps {
    product: ShareableProduct;
}

// Helper function to convert data URI to File object for mobile sharing
async function dataUriToFile(dataUri: string, fileName: string): Promise<File> {
    const res = await fetch(dataUri);
    const blob = await res.blob();
    return new File([blob], fileName, { type: blob.type });
}

export function ShareComposerDialog({ product }: ShareComposerDialogProps) {
    const { toast } = useToast();
    const { user } = useAuth();
    const [isGenerating, setIsGenerating] = useState(false);
    const [selectedImages, setSelectedImages] = useState<string[]>(product.imageDataUris);
    const [appUrl, setAppUrl] = useState('');
    const [shareText, setShareText] = useState('');

    useEffect(() => {
        // This ensures the URL is read on the client-side
        const currentUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
        setAppUrl(currentUrl);
        
        const orderLink = `${currentUrl}/secure-cod?name=${encodeURIComponent(product.title)}&amount=${product.price || product.costPrice || 0}&seller_id=${user?.uid || ''}&seller_name=${user?.displayName || ''}`;
        
        setShareText(
            `Check out this new product!\n\n*${product.title}*\n${product.description}\n\n*Price:* ₹${(product.price || product.costPrice)?.toFixed(2)}\n\nClick here to order with **Secure COD**, **Prepaid**, or **Cash on Delivery**: ${orderLink}`
        );
    }, [product, user]);
    
    const orderLink = `${appUrl}/secure-cod?name=${encodeURIComponent(product.title)}&amount=${product.price || product.costPrice || 0}&seller_id=${user?.uid || ''}&seller_name=${user?.displayName || ''}`;
        
    const handleImageSelection = (imageUri: string) => {
        setSelectedImages(prev => 
            prev.includes(imageUri) ? prev.filter(uri => uri !== imageUri) : [...prev, imageUri]
        );
    };

    const handleGenerateDescription = async () => {
        setIsGenerating(true);
        try {
            const { description: newDescription } = await createProductDescription({
                title: product.title,
                imagesDataUri: product.imageDataUris,
            });
            // Update the share text with the new AI-generated description
            setShareText(
                `Check out this new product!\n\n*${product.title}*\n${newDescription}\n\n*Price:* ₹${(product.price || product.costPrice)?.toFixed(2)}\n\nClick here to order with **Secure COD**, **Prepaid**, or **Cash on Delivery**: ${orderLink}`
            );
            toast({
                title: "Description Generated!",
                description: "The AI has crafted a new description for your post.",
            });
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: "Generation Failed",
                description: error.message || "Could not generate a new description.",
            });
        } finally {
            setIsGenerating(false);
        }
    };

    const handleShareMobile = async () => {
        try {
            const files = await Promise.all(
                selectedImages.map((uri, index) => dataUriToFile(uri, `product_${product.id}_${index}.png`))
            );

            if (navigator.share && navigator.canShare({ files })) {
                 await navigator.share({
                    title: product.title,
                    text: shareText,
                    files: files,
                });
            } else {
                 throw new Error("Web Share API for files not supported on this browser.");
            }
        } catch (error) {
            console.error(error);
            toast({
                variant: 'destructive',
                title: "Sharing Failed",
                description: "This feature works best on mobile browsers. You can try sharing via WhatsApp Web instead.",
            });
        }
    };
    
    const handleShareWeb = () => {
        const whatsappUrl = `https://web.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
        window.open(whatsappUrl, '_blank');
        toast({
            title: "Opening WhatsApp Web...",
            description: `Your text has been copied. You will need to manually add your ${selectedImages.length} selected images to the chat.`,
            duration: 8000,
        });
        navigator.clipboard.writeText(shareText);
    };


    return (
         <DialogContent className="max-w-3xl">
            <DialogHeader>
                <DialogTitle>Create Your Share Post</DialogTitle>
                <DialogDescription>Select images and edit the text to share with your customers.</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
                <div className="space-y-4">
                    <Label>1. Select Images to Share</Label>
                    <div className="grid grid-cols-3 gap-2">
                        {product.imageDataUris.map((uri, index) => (
                            <div key={index} className="relative cursor-pointer" onClick={() => handleImageSelection(uri)}>
                                <Image src={uri} alt={`product ${index+1}`} width={100} height={100} className="rounded-md object-cover aspect-square"/>
                                <div className={`absolute inset-0 rounded-md bg-black/50 transition-opacity flex items-center justify-center ${selectedImages.includes(uri) ? 'opacity-70' : 'opacity-0'}`}>
                                    <Checkbox checked={selectedImages.includes(uri)} className="border-white h-6 w-6" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                 <div className="space-y-2">
                    <div className="flex justify-between items-center">
                        <Label htmlFor="share-text">2. Edit Your Message</Label>
                        <Button variant="outline" size="sm" onClick={handleGenerateDescription} disabled={isGenerating}>
                             {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Wand2 className="mr-2 h-4 w-4" />}
                            AI Generate
                        </Button>
                    </div>
                    <Textarea 
                        id="share-text"
                        value={shareText}
                        onChange={(e) => setShareText(e.target.value)}
                        rows={12}
                        className="h-full"
                    />
                </div>
            </div>
            <DialogFooter className="sm:justify-between gap-2">
                <DialogClose asChild>
                    <Button variant="outline">Cancel</Button>
                </DialogClose>
                <div className='flex gap-2'>
                    <Button onClick={handleShareMobile} className="hidden sm:inline-flex">Share on Mobile</Button>
                    <Button onClick={handleShareWeb}>Share on WhatsApp Web</Button>
                </div>
            </DialogFooter>
        </DialogContent>
    );
}
