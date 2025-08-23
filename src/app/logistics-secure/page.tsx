
'use client';

import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PackageSearch, PackageCheck, Ban, Info, Package } from 'lucide-react';
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


export default function LogisticsSecurePage() {

    return (
        <AppShell title="Logistics Secure Payments">
            <Tabs defaultValue="overview">
                <TabsList className="grid w-full grid-cols-4 max-w-2xl mx-auto">
                    <TabsTrigger value="overview">
                        <Info className="mr-2 h-4 w-4" /> Overview
                    </TabsTrigger>
                    <TabsTrigger value="pending-pickups">
                        <PackageSearch className="mr-2 h-4 w-4" /> Pending Pickups
                    </TabsTrigger>
                    <TabsTrigger value="collections">
                        <PackageCheck className="mr-2 h-4 w-4" /> Collections
                    </TabsTrigger>
                    <TabsTrigger value="cancellations">
                        <Ban className="mr-2 h-4 w-4" /> Cancellations
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="overview">
                     <Card>
                        <CardHeader>
                            <CardTitle>Logistics-Secured Trust Model</CardTitle>
                            <CardDescription>Manage orders where payment is collected by your trusted logistics partner before dispatch.</CardDescription>
                        </CardHeader>
                        <CardContent>
                             <Alert>
                                <Info className="h-4 w-4" />
                                <AlertTitle>How It Works</AlertTitle>
                                <AlertDescription>
                                     <ol className="list-decimal list-inside space-y-2 mt-2">
                                        <li><b>A customer places an order and selects "Secure with Cash". No payment is made.</b></li>
                                        <li><b>Your system alerts a logistics partner (e.g., Delhivery) to collect the cash from the customer.</b></li>
                                        <li><b>The logistics agent collects the cash and updates the status via their app.</b></li>
                                        <li><b>Your system receives a notification, marks the order as 'Paid', and you can dispatch the product.</b></li>
                                        <li><b>This process allows customers to cancel risk-free anytime before cash pickup.</b></li>
                                    </ol>
                                </AlertDescription>
                            </Alert>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="pending-pickups">
                    <Card>
                        <CardHeader>
                            <CardTitle>Pending Cash Pickups</CardTitle>
                            <CardDescription>Orders waiting for a logistics partner to collect the cash payment.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ComingSoonPlaceholder title="Pending Pickup Management" />
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="collections">
                    <Card>
                        <CardHeader>
                            <CardTitle>Secured Collections</CardTitle>
                            <CardDescription>Orders where cash has been successfully collected and are ready for dispatch.</CardDescription>
                        </CardHeader>
                        <CardContent>
                           <ComingSoonPlaceholder title="Secured Collections" />
                        </CardContent>
                    </Card>
                </TabsContent>
                 <TabsContent value="cancellations">
                    <Card>
                        <CardHeader>
                            <CardTitle>Cancellations</CardTitle>
                            <CardDescription>Orders that were cancelled by the customer before the cash was collected.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ComingSoonPlaceholder title="Cancellation Log" />
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </AppShell>
    )
}
