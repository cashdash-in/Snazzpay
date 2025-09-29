
'use client';

import { useState, useEffect } from 'react';
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
  Upload,
  Rocket,
  Wand2,
  CheckCircle,
} from 'lucide-react';
import Image from 'next/image';

export default function AiProductUploaderPage() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isPushing, setIsPushing] = useState(false);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [imageDataUris, setImageDataUris] = useState<string[]>([]);
  const [vendorDescription, setVendorDescription] = useState('');
  const [cost, setCost] = useState('');
  const [margin, setMargin] = useState('100'); // Default 100% margin
  const [generatedListing, setGeneratedListing] =
    useState<ProductListingOutput | null>(null);

    useEffect(() => {
        const prefillDataJSON = localStorage.getItem('ai_uploader_prefill');
        if (prefillDataJSON) {
            try {
                const data = JSON.parse(prefillDataJSON);
                setVendorDescription(data.description || '');
                setCost(data.cost?.toString() || '');
                if (data.imageDataUris) {
                    setImageDataUris(data.imageDataUris);
                }
                 if (data.imagePreviews) {
                    setImagePreviews(data.imagePreviews);
                }
                toast({
                    title: "Product Data Pre-filled",
                    description: "Details from the product drop have been loaded into the form.",
                });
                // Clean up local storage after using the data
                localStorage.removeItem('ai_uploader_prefill');
            } catch (error) {
                console.error("Failed to parse prefill data:", error);
                toast({
                    variant: 'destructive',
                    title: 'Error pre-filling data',
                });
            }
        }
    }, [toast]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const newPreviews: string[] = [];
      const newDataUris: string[] = [];
      const fileReaders: FileReader[] = [];

      Array.from(files).forEach((file) => {
        const reader = new FileReader();
        fileReaders.push(reader);
        reader.onloadend = () => {
          const result = reader.result as string;
          newPreviews.push(result);
          newDataUris.push(result);

          if (newPreviews.length === files.length) {
            setImagePreviews(newPreviews);
            setImageDataUris(newDataUris);
          }
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const handleGenerateListing = async () => {
    if (imageDataUris.length === 0 || !vendorDescription || !cost || !margin) {
      toast({
        variant: 'destructive',
        title: 'Missing Information',
        description: 'Please provide at least one image, a description, cost, and margin.',
      });
      return;
    }
    setIsLoading(true);
    setGeneratedListing(null);

    try {
      const result = await createProductListing({
        imageDataUris,
        description: vendorDescription,
        cost: parseFloat(cost),
        margin: parseFloat(margin),
      });
      setGeneratedListing(result);
      toast({
        title: 'Listing Generated!',
        description: 'Review the AI-generated details below.',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Generation Failed',
        description:
          error.message ||
          'An unexpected error occurred while generating the listing.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePushToShopify = async () => {
    if (!generatedListing) return;
    setIsPushing(true);

    try {
        const productData = {
            title: generatedListing.title,
            body_html: generatedListing.description,
            product_type: generatedListing.category,
            vendor: 'Snazzify AI',
            variants: [{ price: generatedListing.price }],
             images: imageDataUris.map(uri => ({
                attachment: uri.split(',')[1] // Send base64 data only
            })),
        };
        
        const response = await fetch('/api/shopify/products/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(productData),
        });

        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.error || "Failed to create product in Shopify.");
        }
        
        toast({
            title: 'Product Pushed to Shopify!',
            description: `Successfully created product "${result.product.title}".`,
        });

    } catch (error: any) {
        toast({
            variant: 'destructive',
            title: 'Shopify Push Failed',
            description: error.message,
        });
    } finally {
        setIsPushing(false);
    }
  };

  return (
    <AppShell title="AI Product Uploader">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>1. Provide Product Details</CardTitle>
            <CardDescription>
              Upload images and paste the raw description from your vendor.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="product-image">Product Images</Label>
              <Input
                id="product-image"
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="cursor-pointer"
                multiple
              />
              {imagePreviews.length > 0 && (
                <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-4 rounded-lg border-dashed border-2 p-4">
                  {imagePreviews.map((src, index) => (
                     <Image
                        key={index}
                        src={src}
                        alt={`Product preview ${index + 1}`}
                        width={150}
                        height={150}
                        className="object-contain rounded-md aspect-square"
                      />
                  ))}
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="vendor-description">Vendor Description</Label>
              <Textarea
                id="vendor-description"
                placeholder="Paste raw text from WhatsApp, etc. e.g., 'Pure cotton shirt new stock full sleeves all sizes (M, L, XL) available colors red blue price 499 only'"
                value={vendorDescription}
                onChange={(e) => setVendorDescription(e.target.value)}
                rows={6}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cost">Your Cost (INR)</Label>
                <Input
                  id="cost"
                  type="number"
                  placeholder="e.g., 250"
                  value={cost}
                  onChange={(e) => setCost(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="margin">Profit Margin (%)</Label>
                <Input
                  id="margin"
                  type="number"
                  placeholder="e.g., 100"
                  value={margin}
                  onChange={(e) => setMargin(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button
              onClick={handleGenerateListing}
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Wand2 className="mr-2 h-4 w-4" />
              )}
              Generate Listing with AI
            </Button>
          </CardFooter>
        </Card>
        <Card
          className={
            !generatedListing && !isLoading ? 'flex items-center justify-center' : ''
          }
        >
          {isLoading && (
            <div className="flex h-full flex-col items-center justify-center gap-4 text-center p-8">
              <Sparkles className="h-12 w-12 text-primary animate-pulse" />
              <h3 className="text-xl font-semibold">AI is at work...</h3>
              <p className="text-muted-foreground">
                Analyzing your images and text to craft the perfect product
                listing. This might take a moment.
              </p>
            </div>
          )}
          {!isLoading && !generatedListing && (
             <div className="flex h-full flex-col items-center justify-center gap-4 text-center p-8">
                <Sparkles className="h-12 w-12 text-muted-foreground/50" />
                <h3 className="text-xl font-semibold text-muted-foreground">Generated Listing Will Appear Here</h3>
                <p className="text-muted-foreground">Fill out the details on the left and let AI do the rest.</p>
            </div>
          )}
          {generatedListing && (
            <>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="text-green-500" />
                  2. Review & Push to Shopify
                </CardTitle>
                <CardDescription>
                  Your AI-generated listing is ready. Make any changes needed.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="generated-title">Product Title</Label>
                  <Input
                    id="generated-title"
                    value={generatedListing.title}
                    onChange={(e) =>
                      setGeneratedListing((p) =>
                        p ? { ...p, title: e.target.value } : null
                      )
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="generated-description">
                    Product Description (Markdown enabled)
                  </Label>
                  <Textarea
                    id="generated-description"
                    value={generatedListing.description}
                    onChange={(e) =>
                      setGeneratedListing((p) =>
                        p ? { ...p, description: e.target.value } : null
                      )
                    }
                    rows={8}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="generated-sizes">Sizes</Label>
                    <Input
                      id="generated-sizes"
                      value={generatedListing.sizes.join(', ')}
                      readOnly
                      className="bg-muted"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="generated-colors">Colors</Label>
                    <Input
                      id="generated-colors"
                      value={generatedListing.colors.join(', ')}
                      readOnly
                      className="bg-muted"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                    <Label htmlFor="generated-category">Category</Label>
                    <Input
                        id="generated-category"
                        value={generatedListing.category}
                        onChange={(e) =>
                        setGeneratedListing((p) =>
                            p ? { ...p, category: e.target.value } : null
                        )
                        }
                    />
                    </div>
                    <div className="space-y-2">
                    <Label htmlFor="generated-price">Selling Price (INR)</Label>
                    <Input
                        id="generated-price"
                        type="number"
                        value={generatedListing.price}
                        onChange={(e) =>
                        setGeneratedListing((p) =>
                            p
                            ? { ...p, price: parseFloat(e.target.value) || 0 }
                            : null
                        )
                        }
                    />
                    </div>
                </div>
              </CardContent>
              <CardFooter>
                 <Button onClick={handlePushToShopify} className="w-full" disabled={isPushing}>
                  {isPushing ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Rocket className="mr-2 h-4 w-4" />
                  )}
                  Push to Shopify
                </Button>
              </CardFooter>
            </>
          )}
        </Card>
      </div>
    </AppShell>
  );
}
