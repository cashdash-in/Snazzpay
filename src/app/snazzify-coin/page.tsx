
'use client';

import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Coins, Package, Handshake, Info } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const ComingSoonPlaceholder = ({ title }: { title: string }) => (
    <div className="flex flex-col items-center justify-center h-96 rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/20 text-center">
        <div className="flex items-center justify-center h-16 w-16 rounded-full bg-muted mb-4">
            <Package className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-xl font-semibold text-muted-foreground">Coming Soon: {title}</h3>
        <p className="text-sm text-muted-foreground/80 mt-2">This feature is under construction. Check back later!</p>
    </div>
);


export default function SnazzifyCoinPage() {

    return (
        <AppShell title="Snazzify Coin System">
            <Tabs defaultValue="overview">
                <TabsList className="grid w-full grid-cols-4 max-w-2xl mx-auto">
                    <TabsTrigger value="overview">
                        <Info className="mr-2 h-4 w-4" /> Overview
                    </TabsTrigger>
                    <TabsTrigger value="orders">
                        <Package className="mr-2 h-4 w-4" /> Orders
                    </TabsTrigger>
                    <TabsTrigger value="partners">
                        <Handshake className="mr-2 h-4 w-4" /> Partners
                    </TabsTrigger>
                    <TabsTrigger value="inventory">
                        <Coins className="mr-2 h-4 w-4" /> Coin Inventory
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="overview">
                     <Card>
                        <CardHeader>
                            <CardTitle>Snazzify Coin: Physical-to-Digital Payments</CardTitle>
                            <CardDescription>Manage your network of local shopkeepers who act as cash collection points using a physical scratch-card system.</CardDescription>
                        </CardHeader>
                        <CardContent>
                             <Alert>
                                <Info className="h-4 w-4" />
                                <AlertTitle>How It Works</AlertTitle>
                                <AlertDescription>
                                    <ol className="list-decimal list-inside space-y-2 mt-2">
                                        <li><b>You distribute physical "Snazzify Coin" scratch cards to your trusted local shopkeepers (Partners).</b></li>
                                        <li><b>A customer pays the partner cash for their order.</b></li>
                                        <li><b>The partner gives the customer a scratch card of equivalent value.</b></li>
                                        <li><b>The customer uses the code on the card to confirm their payment, often via a simple phone call (IVR).</b></li>
                                        <li><b>The order is marked as 'Paid' in your system, and you can dispatch it. You settle the cash with your partner later.</b></li>
                                    </ol>
                                </AlertDescription>
                            </Alert>
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="orders">
                    <Card>
                        <CardHeader>
                            <CardTitle>Snazzify Coin Orders</CardTitle>
                            <CardDescription>View all orders placed and secured using the Snazzify Coin system.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ComingSoonPlaceholder title="Order Management" />
                        </CardContent>
                    </Card>
                </TabsContent>
                 <TabsContent value="partners">
                    <Card>
                        <CardHeader>
                            <CardTitle>Partner Network</CardTitle>
                            <CardDescription>Manage your network of trusted shopkeepers.</CardDescription>
                        </CardHeader>
                        <CardContent>
                           <ComingSoonPlaceholder title="Partner Management" />
                        </CardContent>
                    </Card>
                </TabsContent>
                 <TabsContent value="inventory">
                    <Card>
                        <CardHeader>
                            <CardTitle>Coin Inventory & Generation</CardTitle>
                            <CardDescription>Generate, track, and manage the inventory of physical scratch cards.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ComingSoonPlaceholder title="Coin Inventory Management" />
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </AppShell>
    )
}
