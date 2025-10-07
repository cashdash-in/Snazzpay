
'use client';

import { useState, useRef, ChangeEvent } from 'react';
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
import { useToast } from '@/hooks/use-toast';
import {
  Loader2,
  Sparkles,
  Rocket,
  Wand2,
  FileText,
  Percent,
} from 'lucide-react';
import { type ProductListingOutput } from '@/ai/schemas/product-listing';
import { parseWhatsAppChat } from '@/ai/flows/whatsapp-product-parser';
import { saveDocument } from '@/services/firestore';
import { v4 as uuidv4 } from 'uuid';
import type { ProductDrop } from '@/app/vendor/product-drops/page';

type ParsedProduct = ProductListingOutput & {
    id: string; // Add a temporary client-side ID
};

export default function WhatsAppUploaderPage() {
  const { toast } = useToast();
  const [isParsing, setIsParsing] = useState(false);
  const [isPushing, setIsPushing] = useState(false);
  const [chatContent, setChatContent] = useState<string>('');
  const [parsedProducts, setParsedProducts] = useState<ParsedProduct[]>([]);
  const [bulkMargin, setBulkMargin] = useState<string>('100');
  const [costPrice, setCostPrice] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        setChatContent(content);
        toast({ title: 'Chat File Loaded', description: 'Click the "Parse Chat" button to process the content.' });
      };
      reader.readAsText(file);
    }
  };

  const handleParseChat = async () => {
    if (!chatContent) {
      toast({ variant: 'destructive', title: 'No Chat File', description: 'Please upload a WhatsApp chat .txt file first.' });
      return;
    }
    if (!costPrice) {
        toast({ variant: 'destructive', title: 'Missing Cost Price', description: 'Please enter a base cost price for the products.' });
        return;
    }
    setIsParsing(true);
    setParsedProducts([]);
    try {
      const result = await parseWhatsAppChat({ chatText: chatContent, cost: parseFloat(costPrice), margin: parseFloat(bulkMargin) });
      const productsWithIds = result.products.map(p => ({...p, id: `temp-${Math.random()}`}));
      setParsedProducts(productsWithIds);
      toast({ title: 'Chat Parsed Successfully!', description: `${productsWithIds.length} products were identified. Review them below.` });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Parsing Failed', description: error.message });
    } finally {
      setIsParsing(false);
    }
  };

  const handlePriceChange = (id: string, newPrice: string) => {
    setParsedProducts(prev => 
      prev.map(p => p.id === id ? { ...p, price: parseFloat(newPrice) || 0 } : p)
    );
  };
  
  const applyBulkMargin = () => {
    if (parsedProducts.length === 0 || !costPrice) {
        toast({ variant: 'destructive', title: 'No Products or Cost Price', description: 'Please parse products and set a base cost price first.' });
        return;
    }
    const cost = parseFloat(costPrice);
    const margin = parseFloat(bulkMargin);
    if (isNaN(cost) || isNaN(margin)) {
        toast({ variant: 'destructive', title: 'Invalid Number', description: 'Cost price and margin must be valid numbers.' });
        return;
    }

    const updatedProducts = parsedProducts.map(p => {
        const newPrice = cost * (1 + (margin / 100));
        return { ...p, price: Math.round(newPrice) };
    });
    setParsedProducts(updatedProducts);
    toast({ title: 'Prices Updated', description: `All product prices have been recalculated with a ${margin}% margin.` });
  };


  const handlePushToShopify = async () => {
    if (parsedProducts.length === 0) return;
    setIsPushing(true);

    let successCount = 0;
    let errorCount = 0;

    for (const product of parsedProducts) {
        try {
             // Save to Firestore "My Products" (product_drops)
            const newProductDrop: ProductDrop = {
                id: uuidv4(),
                vendorId: 'admin_snazzify',
                vendorName: 'SnazzifyOfficial',
                title: product.title,
                description: product.description,
                costPrice: product.price,
                imageDataUris: [], // No images in this flow
                createdAt: new Date().toISOString(),
                category: product.category,
                sizes: product.sizes,
                colors: product.colors,
            };
            await saveDocument('product_drops', newProductDrop, newProductDrop.id);

            // Push to Shopify
             const productData = {
                title: product.title,
                body_html: product.description,
                product_type: product.category,
                vendor: 'Snazzify AI',
                variants: [{ price: product.price }],
            };

            const response = await fetch('/api/shopify/products/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(productData),
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error);
            successCount++;

        } catch (error: any) {
            errorCount++;
            console.error(`Failed to push product "${product.title}":`, error);
        }
    }

    toast({
        title: 'Shopify Push Complete!',
        description: `${successCount} products pushed successfully and saved to "My Products". ${errorCount} failed. Check console for details.`,
    });
    setParsedProducts([]);
    setIsPushing(false);
  };

  return (
    <AppShell title="WhatsApp Bulk Uploader">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>1. Upload & Parse</CardTitle>
                    <CardDescription>Upload your exported WhatsApp chat (.txt) file.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="chat-file">WhatsApp Chat File (.txt)</Label>
                        <Input
                            id="chat-file"
                            type="file"
                            accept=".txt"
                            onChange={handleFileChange}
                            ref={fileInputRef}
                        />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="cost-price">Base Cost Price (INR)</Label>
                        <Input id="cost-price" type="number" placeholder="Enter base cost for all products" value={costPrice} onChange={e => setCostPrice(e.target.value)} />
                    </div>
                </CardContent>
                <CardFooter>
                    <Button onClick={handleParseChat} disabled={isParsing || !chatContent}>
                        {isParsing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                        Parse Chat with AI
                    </Button>
                </CardFooter>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>2. Bulk Pricing Control</CardTitle>
                    <CardDescription>Apply a margin to all products at once.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="bulk-margin">Set Margin for All Products</Label>
                        <div className="flex items-center gap-2">
                            <Input
                                id="bulk-margin"
                                type="number"
                                placeholder="e.g., 100"
                                value={bulkMargin}
                                onChange={(e) => setBulkMargin(e.target.value)}
                            />
                            <Percent className="h-5 w-5 text-muted-foreground" />
                        </div>
                    </div>
                </CardContent>
                <CardFooter>
                    <Button onClick={applyBulkMargin} variant="secondary" disabled={parsedProducts.length === 0}>
                        Apply Margin
                    </Button>
                </CardFooter>
            </Card>
        </div>

        <div className="lg:col-span-2 mt-8 lg:mt-0">
            <Card>
                <CardHeader>
                    <CardTitle>3. Review, Edit & Push</CardTitle>
                    <CardDescription>Review the products parsed by the AI. You can edit the price for each item before pushing them all to Shopify.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {isParsing ? (
                        <div className="flex flex-col items-center justify-center p-8 gap-4 text-center">
                            <Sparkles className="h-12 w-12 text-primary animate-pulse" />
                            <h3 className="text-xl font-semibold">AI is analyzing the chat...</h3>
                            <p className="text-muted-foreground">Identifying products and extracting details. This may take a moment.</p>
                        </div>
                    ) : parsedProducts.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {parsedProducts.map((p) => (
                                <Card key={p.id}>
                                    <CardHeader><CardTitle className="text-lg">{p.title}</CardTitle></CardHeader>
                                    <CardContent className="space-y-2 text-sm">
                                        <p className="text-muted-foreground line-clamp-3">{p.description}</p>
                                        <p><strong>Category:</strong> {p.category}</p>
                                        <p><strong>Sizes:</strong> {p.sizes.join(', ')}</p>
                                        <p><strong>Colors:</strong> {p.colors.join(', ')}</p>
                                        <div className="space-y-1 pt-2">
                                            <Label htmlFor={`price-${p.id}`}>Selling Price</Label>
                                            <Input
                                                id={`price-${p.id}`}
                                                type="number"
                                                value={p.price}
                                                onChange={(e) => handlePriceChange(p.id, e.target.value)}
                                            />
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center text-muted-foreground p-8">
                            <FileText className="h-12 w-12 mx-auto mb-4" />
                            <h3 className="text-xl font-semibold">Generated Products Will Appear Here</h3>
                            <p>Upload a chat file and click "Parse Chat with AI" to begin.</p>
                        </div>
                    )}
                </CardContent>
                {parsedProducts.length > 0 && (
                    <CardFooter>
                        <Button onClick={handlePushToShopify} disabled={isPushing} size="lg">
                            {isPushing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Rocket className="mr-2 h-4 w-4" />}
                            Push All {parsedProducts.length} Products to Shopify
                        </Button>
                    </CardFooter>
                )}
            </Card>
        </div>
      </div>
    </AppShell>
  );
}
