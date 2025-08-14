import { AppShell } from "@/components/layout/app-shell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function SettingsPage() {
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
                <Input id="razorpay-key-id" placeholder="rzp_live_..." defaultValue="rzp_live_xxxxxxxxxxxxxx" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="razorpay-key-secret">Key Secret</Label>
                <Input id="razorpay-key-secret" type="password" placeholder="Your key secret" defaultValue="supersecretpassword" />
              </div>
            </CardContent>
            <CardFooter>
              <Button>Save Razorpay Settings</Button>
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
                <Input id="shopify-store-url" placeholder="your-store.myshopify.com" defaultValue="snazzify.co.in" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="shopify-api-key">API Key</Label>
                <Input id="shopify-api-key" placeholder="Your Shopify API key" defaultValue="shpat_xxxxxxxxxxxxxxxx" />
              </div>
               <div className="space-y-2">
                <Label htmlFor="shopify-api-secret">API Secret Key</Label>
                <Input id="shopify-api-secret" type="password" placeholder="Your Shopify API secret key" defaultValue="shpss_xxxxxxxxxxxxxxxxx" />
              </div>
            </CardContent>
            <CardFooter>
              <Button>Save Shopify Settings</Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}
