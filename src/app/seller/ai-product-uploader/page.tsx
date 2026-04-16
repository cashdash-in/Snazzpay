
'use client';
import { useState } from 'react';
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
} from 'lucide-react';
import Image from 'next/image';
import { createProductDescription } from '@/ai/flows/create-product-description';
import { useAuth } from '@/hooks/use-auth';
import { saveDocument } from '@/services/firestore';
import { v4 as uuidv4 } from 'uuid';
import { Checkbox } from '@/components/ui/checkbox';


const MAX_IMAGE_SIZE_PX = 800; // Max width/height for resizing

export type SellerProduct = {
    id: string;
    sellerId: string;
    sellerName: string;
    title: string;
    description: string;
    category: string;
    price: number;
    sizes: string[];
    colors: string[];
    imageDataUris: string[];
    createdAt: string;
    allowedPaymentMethods?: ('Secure COD' | 'Cash on Delivery' | 'Prepaid')[];
};

export default function AiProductUploaderPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isPushing, setIsPushing] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageDataUri, setImageDataUri] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [price, setPrice] = useState('');
  const [sizes, setSizes] = useState('');
  const [colors, setColors] = useState('');
  const [allowedPaymentMethods, setAllowedPaymentMethods] = useState<('Secure COD' | 'Cash on Delivery' | 'Prepaid')[]>(['Secure COD', 'Cash on Delivery', 'Prepaid']);

  const handlePaymentMethodChange = (method: 'Secure COD' | 'Cash on Delivery' | 'Prepaid', checked: boolean) => {
    setAllowedPaymentMethods(prev => {
        if (checked) {
            return [...prev, method];
        } else {
            return prev.filter(m => m !== method);
        }
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

                if (width > height) {
                    if (width > MAX_IMAGE_SIZE_PX) {
                        height *= MAX_IMAGE_SIZE_PX / width;
                        width = MAX_IMAGE_SIZE_PX;
                    }
                } else {
                    if (height > MAX_IMAGE_SIZE_PX) {
                        width *= MAX_IMAGE_SIZE_PX / height;
                        height = MAX_IMAGE_SIZE_PX;
                    }
                }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', 0.7));
            };
            img.src = e.target?.result as string;
        };
        reader.readAsDataURL(file);
    });
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      toast({ title: 'Processing image...', description: 'Resizing and compressing image.' });
      const resizedDataUri = await resizeImage(file);
      setImagePreview(resizedDataUri);
      setImageDataUri(resizedDataUri);
      toast({ title: 'Image Added!'});
    }
  };

  const handleGenerateDetails = async () => {
    if (!imageDataUri) {
      toast({
        variant: 'destructive',
        title: 'No Image Selected',
        description: 'Please select an image to generate details from.',
      });
      return;
    }
    setIsLoading(true);

    try {
      const result = await createProductDescription({ imageDataUri });

      setTitle(result.title);
      setDescription(result.description);
      setCategory(result.category);

      toast({
        title: 'Details Generated!',
        description: 'AI has crafted a title, description, and category.',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Generation Failed',
        description:
          error.message || 'An unexpected error occurred.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePushToProducts = async () => {
    if (!title || !description || !category || !imageDataUri || !price) {
        toast({
            variant: 'destructive',
            title: 'Missing Information',
            description: 'Please generate and review all product details, including price, before pushing.',
        });
        return;
    }
    if (!user) {
        toast({
            variant: 'destructive',
            title: 'Not Authenticated',
            description: 'You must be logged in to add products.',
        });
        return;
    }

    setIsPushing(true);

    try {
        const newProduct: SellerProduct = {
            id: uuidv4(),
            sellerId: user.uid,
            sellerName: user.displayName || 'Unknown Seller',
            title,
            description,
            category,
            price: parseFloat(price),
            sizes: sizes.split(',').map(s => s.trim()).filter(s => s),
            colors: colors.split(',').map(c => c.trim()).filter(c => c),
            imageDataUris: [imageDataUri], // Storing as an array to match type
            createdAt: new Date().toISOString(),
            allowedPaymentMethods,
        };

        await saveDocument('seller_products', newProduct, newProduct.id);

        toast({
            title: 'Product Pushed!',
            description: `"${title}" has been added to your "My Products" list.`
        });
        
        // Reset form
        setTitle('');
        setDescription('');
        setCategory('');
        setImageDataUri(null);
        setImagePreview(null);
        setPrice('');
        setSizes('');
        setColors('');
        setAllowedPaymentMethods(['Secure COD', 'Cash on Delivery', 'Prepaid']);

    } catch (error: any) {
        toast({
            variant: 'destructive',
            title: 'Failed to Push Product',
            description: error.message || "There was an error saving your product."
        });
    } finally {
        setIsPushing(false);
    }
  };


  return (
    <AppShell title="AI Product Uploader (Seller)">
      <Card>
        <CardHeader>
          <CardTitle>AI Product Uploader</CardTitle>
          <CardDescription>
            Upload an image, and let AI generate the product details for you.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Product Image</Label>
            <div className="flex items-center space-x-4">
                <div className="w-32 h-32 border-2 border-dashed rounded-lg flex items-center justify-center bg-muted">
                    {imagePreview ? (
                    <Image
                        src={imagePreview}
                        alt="Product preview"
                        width={128}
                        height={128}
                        className="object-contain rounded-md"
                    />
                    ) : (
                    <ImagePlus className="h-8 w-8 text-muted-foreground" />
                    )}
                </div>
                <Input
                    id="product-image-input"
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="max-w-sm"
                />
            </div>
          </div>

          <Button onClick={handleGenerateDetails} disabled={isLoading || !imageDataUri}>
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Wand2 className="mr-2 h-4 w-4" />
            )}
            Generate Details with AI
          </Button>

          <div className="space-y-4 pt-4 border-t">
            <h3 className="text-lg font-medium">Generated Details</h3>
            <div className="space-y-2">
              <Label htmlFor="generated-title">Product Title</Label>
              <Input
                id="generated-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="AI-generated title will appear here"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="generated-description">Product Description</Label>
              <Textarea
                id="generated-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={6}
                placeholder="AI-generated description will appear here"
              />
            </div>
             <div className="space-y-2">
                <Label htmlFor="generated-category">Category</Label>
                <Input
                    id="generated-category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="AI-generated category will appear here"
                />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="price">Selling Price (INR)</Label>
                    <Input
                        id="price"
                        type="number"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        placeholder="e.g., 499"
                        required
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="sizes">Sizes (comma-separated)</Label>
                    <Input
                        id="sizes"
                        value={sizes}
                        onChange={(e) => setSizes(e.target.value)}
                        placeholder="e.g., M, L, XL"
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="colors">Colors (comma-separated)</Label>
                    <Input
                        id="colors"
                        value={colors}
                        onChange={(e) => setColors(e.target.value)}
                        placeholder="e.g., Red, Blue, Black"
                    />
                </div>
            </div>
             <div className="space-y-2">
                <Label>Allowed Payment Methods</Label>
                <div className="flex flex-wrap gap-4 pt-2">
                    <div className="flex items-center space-x-2">
                        <Checkbox id="secure-cod" onCheckedChange={(checked) => handlePaymentMethodChange('Secure COD', checked as boolean)} checked={allowedPaymentMethods.includes('Secure COD')} />
                        <Label htmlFor="secure-cod">Secure COD</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <Checkbox id="cod" onCheckedChange={(checked) => handlePaymentMethodChange('Cash on Delivery', checked as boolean)} checked={allowedPaymentMethods.includes('Cash on Delivery')} />
                        <Label htmlFor="cod">Cash on Delivery</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <Checkbox id="prepaid" onCheckedChange={(checked) => handlePaymentMethodChange('Prepaid', checked as boolean)} checked={allowedPaymentMethods.includes('Prepaid')} />
                        <Label htmlFor="prepaid">Prepaid</Label>
                    </div>
                </div>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handlePushToProducts} disabled={isPushing || !title}>
            {isPushing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Rocket className="mr-2 h-4 w-4" />
            )}
            Push to My Products
          </Button>
        </CardFooter>
      </Card>
    </AppShell>
  );
}
