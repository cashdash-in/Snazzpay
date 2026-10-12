'use client';

import { useState, DragEvent, ChangeEvent, useEffect } from 'react';
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
import { useToast } from '@/hooks/use-toast';
import {
  Loader2,
  Sparkles,
  Rocket,
  Wand2,
  ImagePlus,
  Factory,
  Book,
  ShieldCheck,
} from 'lucide-react';
import Image from 'next/image';
import { createProductDescription } from '@/ai/flows/create-product-description';
import { type ProductListingOutput } from '@/ai/schemas/product-listing';
import { v4 as uuidv4 } from 'uuid';
import { saveDocument } from '@/services/firestore';
import type { ProductDrop } from '@/app/vendor/product-drops/page';
import { Checkbox } from '@/components/ui/checkbox';


type GeneratedProduct = ProductListingOutput & {
  id: string;
  imageDataUri: string;
  vendorName?: string;
  costPrice?: number;
  allowedPaymentMethods?: ('Secure COD' | 'Cash on Delivery' | 'Prepaid')[];
  isEastIndianLugra?: boolean;
};

const MAX_IMAGE_SIZE_PX = 800; // Max width/height for resizing

export default function ImageBulkUploaderPage() {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPushing, setIsPushing] = useState(false);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [generatedProducts, setGeneratedProducts] = useState<GeneratedProduct[]>([]);
  const [defaultVendor, setDefaultVendor] = useState('');
  const [defaultCategory, setDefaultCategory] = useState('');

  const handleFiles = (files: FileList | File[]) => {
    const fileArray = Array.from(files).filter(f => f.type.startsWith('image/'));
    setImageFiles(prev => [...prev, ...fileArray]);
    fileArray.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreviews(prev => [...prev, e.target?.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    handleFiles(event.dataTransfer.files);
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) handleFiles(event.target.files);
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

  const handleGenerateListings = async () => {
    if (imageFiles.length === 0) return;
    setIsProcessing(true);
    const resizedUris = await Promise.all(imageFiles.map(file => resizeImage(file)));
    const generated: GeneratedProduct[] = [];
    for (const [index, uri] of resizedUris.entries()) {
        try {
            const result = await createProductDescription({ imageDataUri: uri });
            generated.push({
                id: uuidv4(), ...result, imageDataUri: uri, price: 0, sizes: [], colors: [],
                vendorName: defaultVendor || 'Snazzify AI',
                category: defaultCategory || result.category,
                allowedPaymentMethods: ['Secure COD', 'Cash on Delivery', 'Prepaid'],
                isEastIndianLugra: false,
            });
        } catch (error: any) {
            toast({ variant: 'destructive', title: `Error for image ${index + 1}` });
        }
    }
    setGeneratedProducts(generated);
    setIsProcessing(false);
    toast({ title: 'Listings Generated!' });
  };

  const handleProductChange = (id: string, field: keyof GeneratedProduct, value: any) => {
    setGeneratedProducts(prev => prev.map(p => (p.id === id ? { ...p, [field]: value } : p)));
  };
  
  const handlePushToShopify = async () => {
    if (generatedProducts.length === 0) return;
    setIsPushing(true);
    for (const product of generatedProducts) {
        try {
            const newProductDrop: ProductDrop = {
                id: uuidv4(), vendorId: 'admin_snazzify', vendorName: product.vendorName || 'SnazzifyOfficial', title: product.title, description: product.description, costPrice: product.costPrice || 0, imageDataUris: [product.imageDataUri], createdAt: new Date().toISOString(), category: product.category, sizes: product.sizes, colors: product.colors, allowedPaymentMethods: product.allowedPaymentMethods, isEastIndianLugra: product.isEastIndianLugra,
            };
            await saveDocument('product_drops', newProductDrop, newProductDrop.id);
             const productData = {
                title: product.title, body_html: product.description, product_type: product.category, vendor: product.vendorName,
                variants: [{ price: product.price }],
                images: [{ attachment: product.imageDataUri.split(',')[1] }],
            };
            await fetch('/api/shopify/products/create', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(productData) });
        } catch (error: any) {
            console.error(error);
        }
    }
    toast({ title: 'Push Complete!' });
    setGeneratedProducts([]);
    setIsPushing(false);
  };
  
  return (
    <AppShell title="Image Bulk Uploader">
      <Card>
        <CardHeader><CardTitle>1. Upload Images</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="relative flex flex-col items-center justify-center w-full min-h-[12rem] border-2 border-dashed rounded-lg cursor-pointer bg-muted hover:bg-muted/50 p-4" onDrop={handleDrop} onDragOver={(e) => e.preventDefault()} onClick={() => document.getElementById('product-image-input')?.click()}>
            {imagePreviews.length === 0 ? <ImagePlus className="h-12 w-12 text-muted-foreground" /> : <div className="grid grid-cols-4 sm:grid-cols-8 gap-4">{imagePreviews.map((src, i) => <Image key={i} src={src} alt="p" width={100} height={100} className="object-cover rounded-md aspect-square" />)}</div>}
          </div>
          <Input id="product-image-input" type="file" accept="image/*" onChange={handleFileChange} className="hidden" multiple />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Default Vendor</Label><Input value={defaultVendor} onChange={e => setDefaultVendor(e.target.value)} /></div>
              <div className="space-y-2"><Label>Default Category</Label><Input value={defaultCategory} onChange={e => setDefaultCategory(e.target.value)} /></div>
          </div>
        </CardContent>
        <CardFooter><Button onClick={handleGenerateListings} disabled={isProcessing || imageFiles.length === 0}>Generate Listings</Button></CardFooter>
      </Card>
      {generatedProducts.length > 0 && (
         <Card className="mt-8">
            <CardContent className="space-y-6 pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {generatedProducts.map(p => (
                        <Card key={p.id}>
                            <CardHeader className="p-0"><Image src={p.imageDataUri} alt="p" width={300} height={300} className="rounded-t-lg object-cover aspect-square w-full" /></CardHeader>
                            <CardContent className="p-4 space-y-2">
                                <div className="space-y-1"><Label>Title</Label><Input value={p.title} onChange={e => handleProductChange(p.id, 'title', e.target.value)} /></div>
                                <div className="grid grid-cols-2 gap-4">
                                     <div className="space-y-1"><Label>Price</Label><Input type="number" value={p.price} onChange={e => handleProductChange(p.id, 'price', Number(e.target.value))} /></div>
                                     <div className="flex items-center space-x-2 pt-6">
                                        <Checkbox id={`lugra-${p.id}`} checked={p.isEastIndianLugra} onCheckedChange={checked => handleProductChange(p.id, 'isEastIndianLugra', !!checked)} />
                                        <Label htmlFor={`lugra-${p.id}`} className="text-[10px] font-bold text-primary">Lugra?</Label>
                                     </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </CardContent>
             <CardFooter><Button onClick={handlePushToShopify} disabled={isPushing} size="lg">Push All to Shopify</Button></CardFooter>
         </Card>
      )}
    </AppShell>
  );
}
