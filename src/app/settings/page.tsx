
'use client';

import { useState, useEffect } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export default function SettingsPage() {
  const { toast } = useToast();
  const [razorpaySettings, setRazorpaySettings] = useState({ keyId: '', keySecret: '' });
  const [shopifySettings, setShopifySettings] = useState({ storeUrl: '', apiKey: '', apiSecret: '' });

  useEffect(() => {
    // Load saved settings from localStorage
    const savedRazorpayKeyId = localStorage.getItem('razorpay_key_id');
    const savedRazorpayKeySecret = localStorage.getItem('razorpay_key_secret');
    if (savedRazorpayKeyId) {
      setRazorpaySettings(prev => ({ ...prev, keyId: savedRazorpayKeyId }));
    }
    if (savedRazorpayKeySecret) {
      setRazorpaySettings(prev => ({ ...prev, keySecret: savedRazorpayKeySecret }));
    }

    const savedShopifyStoreUrl = localStorage.getItem('shopify_store_url');
    const savedShopifyApiKey = localStorage.getItem('shopify_api_key');
    const savedShopifyApiSecret = localStorage.getItem('shopify_api_secret');
    if (savedShopifyStoreUrl) {
      setShopifySettings(prev => ({ ...prev, storeUrl: savedShopifyStoreUrl }));
    }
    if (savedShopifyApiKey) {
      setShopifySettings(prev => ({ ...prev, apiKey: savedShopifyApiKey }));
    }
    if (savedShopifyApiSecret) {
        setShopifySettings(prev => ({ ...prev, apiSecret: savedShopifyApiSecret }));
    }
  }, []);

  const handleRazorpayChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRazorpaySettings({ ...razorpaySettings, [e.target.name]: e.target.value });
  };

  const handleShopifyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setShopifySettings({ ...shopifySettings, [e.target.name]: e.target.value });
  };

  const handleSaveRazorpay = () => {
    localStorage.setItem('razorpay_key_id', razorpaySettings.keyId);
    localStorage.setItem('razorpay_key_secret', razorpaySettings.keySecret);
    toast({
      title: "Settings Saved",
      description: "Your Razorpay settings have been updated.",
    });
  };

  const handleSaveShopify = () => {
    localStorage.setItem('shopify_store_url', shopifySettings.storeUrl);
    localStorage.setItem('shopify_api_key', shopifySettings.apiKey);
    localStorage.setItem('shopify_api_secret', shopifySettings.apiSecret);
    toast({
      title: "Settings Saved",
      description: "Your Shopify settings have been updated.",
    });
  };

  return (
    <AppShell title="Settings">
      <Tabs defaultValue="razorpay" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto">
          <TabsTrigger value="razorpay">Razorpay</TabsTrigger>
          <TabsTrigger value="shopify">Shopify</TabsTrigger>
        </TabsList>
        <TabsContent value="razorpay">
          <Card>
            <CardHeader>
              <CardTitle>Razorpay Integration</CardTitle>
              <CardDescription>
                Connect your Razorpay account to enable secure eMandates for COD orders.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="razorpay-key-id">Key ID</Label>
                <Input 
                  id="razorpay-key-id" 
                  name="keyId"
                  placeholder="rzp_live_..." 
                  value={razorpaySettings.keyId}
                  onChange={handleRazorpayChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="razorpay-key-secret">Key Secret</Label>
                <Input 
                  id="razorpay-key-secret" 
                  name="keySecret"
                  type="password" 
                  placeholder="Your key secret" 
                  value={razorpaySettings.keySecret}
                  onChange={handleRazorpayChange}
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleSaveRazorpay}>Save Razorpay Settings</Button>
            </CardFooter>
          </Card>
        </TabsContent>
        <TabsContent value="shopify">
          <Card>
            <CardHeader>
              <CardTitle>Shopify Integration</CardTitle>
              <CardDescription>
                Connect your Shopify store to sync orders and customer information.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="shopify-store-url">Store URL</Label>
                <Input 
                  id="shopify-store-url"
                  name="storeUrl" 
                  placeholder="your-store.myshopify.com" 
                  value={shopifySettings.storeUrl}
                  onChange={handleShopifyChange} 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="shopify-api-key">Admin API access token</Label>
                <Input 
                  id="shopify-api-key"
                  name="apiKey"
                  type="password"
                  placeholder="Your Shopify Admin API access token (shpat_...)" 
                  value={shopifySettings.apiKey}
                  onChange={handleShopifyChange} 
                />
              </div>
               <div className="space-y-2">
                <Label htmlFor="shopify-api-secret">API Secret Key</Label>
                <Input 
                  id="shopify-api-secret"
                  name="apiSecret" 
                  type="password" 
                  placeholder="Your Shopify API secret key" 
                  value={shopifySettings.apiSecret}
                  onChange={handleShopifyChange} 
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleSaveShopify}>Save Shopify Settings</Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}
