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

const MAX_IMAGE_SIZE_MB = 1;
const MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_MB * 1024 * 1024;

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
};

export default function AiProductUploaderPage() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isPushing, setIsPushing] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageDataUri, setImageDataUri] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > MAX_IMAGE_SIZE_BYTES) {
        toast({
          variant: 'destructive',
          title: 'Image too large',
          description: `Please select an image smaller than ${MAX_IMAGE_SIZE_MB}MB.`,
        });
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setImagePreview(result);
        setImageDataUri(result);
      };
      reader.readAsDataURL(file);
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
    if (!title || !description || !category || !imageDataUri) {
        toast({
            variant: 'destructive',
            title: 'Missing Information',
            description: 'Please generate and review all product details before pushing.',
        });
        return;
    }
    setIsPushing(true);
    // In a real app, you'd have an API route to add this to a DB.
    // We'll simulate it with a timeout.
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsPushing(false);
    toast({
        title: 'Product Pushed!',
        description: `"${title}" has been added to your products.`
    })

    // Reset form
    setTitle('');
    setDescription('');
    setCategory('');
    setImageDataUri(null);
    setImagePreview(null);
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
