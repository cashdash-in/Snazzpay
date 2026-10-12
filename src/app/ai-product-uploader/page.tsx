'use client';

import { useState, useEffect, DragEvent, ClipboardEvent } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { createProductListing } from '@/ai/flows/create-product-listing';
import { type ProductListingOutput } from '@/ai/schemas/product-listing';
import { useToast } from '@/hooks/use-toast';
import {
  Loader2,
  Sparkles,
  Rocket,
  Wand2,
  ImagePlus,
  Factory,
  ShieldCheck,
} from 'lucide-react';
import Image from 'next/image';
import { createProductFromText } from '@/ai/flows/create-product-from-text';
import { saveDocument } from '@/services/firestore';
import { v4 as uuidv4 } from 'uuid';
import type { ProductDrop } from '@/app/vendor/product-drops/page';
import { Checkbox } from '@/components/ui/checkbox';

const MAX_IMAGE_SIZE_PX = 800; // Max width/height for resizing

type GeneratedListingWithPayments = ProductListingOutput & { 
    allowedPaymentMethods?: ('Secure COD' | 'Cash on Delivery' | 'Prepaid')[],
    isEastIndianLugra?: boolean
};

export default function AiProductUploaderPage() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isPasting, setIsPasting] = useState(false);
  const [isPushing, setIsPushing] = useState(false);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [resizedImageDataUris, setResizedImageDataUris] = useState<string[]>([]);
  const [vendorDescription, setVendorDescription] = useState('');
  const [cost, setCost] = useState('');
  const [margin, setMargin] = useState('100'); // Default 100% margin
  const [generatedListing, setGeneratedListing] = useState<GeneratedListingWithPayments | null>(null);
  const [vendorName, setVendorName] = useState('Snazzify AI');
  const [isEastIndianLugra, setIsEastIndianLugra] = useState(false);

  const handlePaymentMethodChange = (method: 'Secure COD' | 'Cash on Delivery' | 'Prepaid', checked: boolean) => {
    setGeneratedListing(prev => {
        if (!prev) return null;
        const currentMethods = prev.allowedPaymentMethods || [];
        if (checked) return { ...prev, allowedPaymentMethods: [...currentMethods, method] };
        else return { ...prev, allowedPaymentMethods: currentMethods.filter(m => m !== method) };
    });
  };

  const resizeImage = (file: File): Promise<string> => {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = document.createElement('img');
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let { width, height } = img;
                if (width > height) { if (width > MAX_IMAGE_SIZE_PX) { height *= MAX_IMAGE_SIZE_PX / width; width = MAX_IMAGE_SIZE_PX; } }
                else { if (height > MAX_IMAGE_SIZE_PX) { width *= MAX_IMAGE_SIZE_PX / height; height = MAX_IMAGE_SIZE_PX; } }
                canvas.width = width; canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', 0.7));
            };
            img.src = e.target?.result as string;
        };
        reader.readAsDataURL(file);
    });
  };

  const handleFiles = async (files: FileList | File[]) => {
      const fileArray = Array.from(files).filter(f => f.type.startsWith('image/'));
      if (fileArray.length === 0) return;
      toast({ title: 'Processing images...' });
      const newPreviews: string[] = [];
      const newDataUris: string[] = [];
      for (const file of fileArray) {
          const resizedDataUri = await resizeImage(file);
          newPreviews.push(resizedDataUri);
          newDataUris.push(resizedDataUri);
      }
      setImagePreviews(prev => [...prev, ...newPreviews]);
      setResizedImageDataUris(prev => [...prev, ...newDataUris]);
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) handleFiles(e.target.files);
  };
  
  const handlePaste = (event: ClipboardEvent<HTMLTextAreaElement | HTMLInputElement>) => {
      if (event.clipboardData.files.length > 0) {
        event.preventDefault();
        handleFiles(event.clipboardData.files);
        return;
      }
  };
  
  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (event.dataTransfer.files) handleFiles(event.dataTransfer.files);
  };

  const handleGenerateListing = async () => {
    if (resizedImageDataUris.length === 0 || !vendorDescription || !cost || !margin) {
      toast({ variant: 'destructive', title: 'Missing Information' });
      return;
    }
    setIsLoading(true);
    setGeneratedListing(null);

    try {
      const result = await createProductListing({
        imageDataUris: resizedImageDataUris,
        description: vendorDescription,
        cost: parseFloat(cost),
        margin: parseFloat(margin),
      });
      setGeneratedListing({ ...result, allowedPaymentMethods: ['Secure COD', 'Cash on Delivery', 'Prepaid'], isEastIndianLugra });
      toast({ title: 'Listing Generated!' });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Generation Failed' });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePushToShopify = async () => {
    if (!generatedListing) return;
    setIsPushing(true);
    try {
        const newProductDrop: ProductDrop = {
            id: uuidv4(),
            vendorId: 'admin_snazzify',
            vendorName: vendorName || 'Snazzify Official',
            title: generatedListing.title,
            description: generatedListing.description,
            costPrice: generatedListing.price,
            imageDataUris: resizedImageDataUris,
            createdAt: new Date().toISOString(),
            category: generatedListing.category,
            sizes: generatedListing.sizes,
            colors: generatedListing.colors,
            allowedPaymentMethods: generatedListing.allowedPaymentMethods,
            isEastIndianLugra: generatedListing.isEastIndianLugra,
        };
        await saveDocument('product_drops', newProductDrop, newProductDrop.id);
        const productData = {
            title: generatedListing.title, body_html: generatedListing.description, product_type: generatedListing.category, vendor: vendorName,
            variants: [{ price: generatedListing.price }],
            images: resizedImageDataUris.map(uri => ({ attachment: uri.split(',')[1] })),
        };
        const response = await fetch('/api/shopify/products/create', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(productData),
        });
        if (!response.ok) throw new Error("Shopify integration error");
        toast({ title: 'Product Pushed!' });
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Push Failed' });
    } finally {
        setIsPushing(false);
    }
  };

  const handleMagicPaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const pastedText = e.clipboardData.getData('text');
    if (pastedText.trim().length < 10 || e.clipboardData.files.length > 0) return;
    e.preventDefault();
    setIsPasting(true);
    try {
      const result = await createProductFromText({ text: pastedText });
      setVendorDescription((prev) => prev + (prev ? '\n\n' : '') + result.description);
      toast({ title: 'AI Parsing Complete!' });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'AI Parsing Failed' });
    } finally {
      setIsPasting(false);
    }
  };

  return (
    <AppShell title="AI Product Uploader">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card>
          <CardHeader><CardTitle>1. Provide Product Details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
             <div className="relative space-y-2">
                <Label htmlFor="magic-paste">Magic Paste Box (AI-Powered)</Label>
                {isPasting && <Loader2 className="absolute top-8 right-2 h-4 w-4 animate-spin text-primary" />}
                <Textarea id="magic-paste" placeholder="Paste chat here..." onPaste={handleMagicPaste} className="bg-purple-50/50" />
            </div>
            <div className="space-y-2">
              <Label>Product Images</Label>
              <div className="relative flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-muted hover:bg-muted/50" onDrop={handleDrop} onDragOver={(e) => e.preventDefault()} onClick={() => document.getElementById('product-image-input')?.click()}>
                  <ImagePlus className="h-8 w-8 text-muted-foreground" />
              </div>
              <Input id="product-image-input" type="file" accept="image/*" onChange={handleImageChange} className="hidden" multiple />
              {imagePreviews.length > 0 && (
                <div className="mt-4 grid grid-cols-3 gap-4 border p-4 rounded-lg">
                  {imagePreviews.map((src, index) => <Image key={index} src={src} alt="p" width={150} height={150} className="object-contain aspect-square" />)}
                </div>
              )}
            </div>
            <div className="space-y-2"><Label htmlFor="vendor-description">Description</Label><Textarea id="vendor-description" value={vendorDescription} onChange={(e) => setVendorDescription(e.target.value)} rows={6} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label htmlFor="cost">Your Cost</Label><Input id="cost" type="number" value={cost} onChange={(e) => setCost(e.target.value)} /></div>
              <div className="space-y-2"><Label htmlFor="margin">Margin (%)</Label><Input id="margin" type="number" value={margin} onChange={(e) => setMargin(e.target.value)} /></div>
            </div>
             <div className="flex items-center space-x-2 pt-2">
                <Checkbox id="lugra-check" checked={isEastIndianLugra} onCheckedChange={(val) => setIsEastIndianLugra(val as boolean)} />
                <Label htmlFor="lugra-check" className="flex items-center gap-1 font-bold text-primary">
                    <ShieldCheck className="h-4 w-4" /> Is East Indian Lugra?
                </Label>
            </div>
          </CardContent>
          <CardFooter><Button onClick={handleGenerateListing} disabled={isLoading} className="w-full">Generate Listing</Button></CardFooter>
        </Card>
        <Card className={!generatedListing && !isLoading ? 'flex items-center justify-center' : ''}>
          {isLoading && <div className="p-8 text-center"><Loader2 className="h-12 w-12 animate-spin mx-auto mb-4" /><p>AI is at work...</p></div>}
          {generatedListing && (
            <>
              <CardHeader><CardTitle>2. Review & Push</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2"><Label>Title</Label><Input value={generatedListing.title} onChange={(e) => setGeneratedListing(p => p ? { ...p, title: e.target.value } : null)} /></div>
                <div className="space-y-2"><Label>Description</Label><Textarea value={generatedListing.description} onChange={(e) => setGeneratedListing(p => p ? { ...p, description: e.target.value } : null)} rows={8} /></div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Category</Label><Input value={generatedListing.category} onChange={(e) => setGeneratedListing(p => p ? { ...p, category: e.target.value } : null)} /></div>
                    <div className="space-y-2"><Label>Price</Label><Input type="number" value={generatedListing.price} onChange={(e) => setGeneratedListing(p => p ? { ...p, price: parseFloat(e.target.value) || 0 } : null)} /></div>
                </div>
                 <div className="flex items-center space-x-2 pt-2">
                    <Checkbox id="gen-lugra-check" checked={generatedListing.isEastIndianLugra} onCheckedChange={(val) => setGeneratedListing(p => p ? { ...p, isEastIndianLugra: val as boolean } : null)} />
                    <Label htmlFor="gen-lugra-check" className="font-bold text-primary">Confirmed East Indian Lugra</Label>
                </div>
              </CardContent>
              <CardFooter><Button onClick={handlePushToShopify} className="w-full" disabled={isPushing}>Push to Products</Button></CardFooter>
            </>
          )}
        </Card>
      </div>
    </AppShell>
  );
}
