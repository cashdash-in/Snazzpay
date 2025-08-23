
'use client';

import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PackageSearch, PackageCheck, Ban, Info, Package, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

// Mock Data - Replace with real data from your logistics API
const mockPendingPickups = [
    { orderId: '#LS-2001', customer: 'Amit Singh', address: '12, MG Road, Bangalore', amount: '750.00', status: 'Pickup Scheduled', assignedTo: 'Delhivery' },
    { orderId: '#LS-2002', customer: 'Sunita Patil', address: '45, Jubilee Hills, Hyderabad', amount: '1500.00', status: 'Pending Assignment', assignedTo: 'Not Assigned' },
];

const mockCollections = [
    { orderId: '#LS-1998', customer: 'Vijay Raj', address: '8, Anna Salai, Chennai', amount: '999.00', collectedBy: 'Delhivery', collectionDate: '2024-05-21', status: 'Ready for Dispatch' },
    { orderId: '#LS-1995', customer: 'Meera Desai', address: '110, Sector 17, Chandigarh', amount: '2100.00', collectedBy: 'BlueDart', collectionDate: '2024-05-20', status: 'Dispatched' },
];

const mockCancellations = [
    { orderId: '#LS-1992', customer: 'Rohan Mehta', address: '5, Park Street, Kolkata', amount: '350.00', cancellationDate: '2024-05-22', reason: 'Customer changed mind before pickup' },
];


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
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>Pending Cash Pickups</CardTitle>
                                <CardDescription>Orders waiting for a logistics partner to collect the cash payment.</CardDescription>
                            </div>
                            <Button variant="outline"><RefreshCw className="mr-2 h-4 w-4" /> Refresh</Button>
                        </CardHeader>
                        <CardContent>
                           <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Order ID</TableHead>
                                        <TableHead>Customer</TableHead>
                                        <TableHead>Address</TableHead>
                                        <TableHead>Amount</TableHead>
                                        <TableHead>Assigned To</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {mockPendingPickups.map(order => (
                                        <TableRow key={order.orderId}>
                                            <TableCell className="font-medium">{order.orderId}</TableCell>
                                            <TableCell>{order.customer}</TableCell>
                                            <TableCell>{order.address}</TableCell>
                                            <TableCell>₹{order.amount}</TableCell>
                                            <TableCell>{order.assignedTo}</TableCell>
                                            <TableCell><Badge variant="secondary">{order.status}</Badge></TableCell>
                                            <TableCell className="text-right">
                                                <Button size="sm">Assign Partner</Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                           </Table>
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
                           <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Order ID</TableHead>
                                        <TableHead>Customer</TableHead>
                                        <TableHead>Amount</TableHead>
                                        <TableHead>Collected By</TableHead>
                                        <TableHead>Collection Date</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {mockCollections.map(order => (
                                        <TableRow key={order.orderId}>
                                            <TableCell className="font-medium">{order.orderId}</TableCell>
                                            <TableCell>{order.customer}</TableCell>
                                            <TableCell>₹{order.amount}</TableCell>
                                            <TableCell>{order.collectedBy}</TableCell>
                                            <TableCell>{order.collectionDate}</TableCell>
                                            <TableCell>
                                                <Badge variant={order.status === 'Dispatched' ? 'default' : 'secondary'} className={order.status === 'Dispatched' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}>
                                                    {order.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button size="sm" variant={order.status === 'Dispatched' ? 'outline' : 'default'}>
                                                    {order.status === 'Dispatched' ? 'View Shipment' : 'Dispatch Order'}
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                           </Table>
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
                             <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Order ID</TableHead>
                                        <TableHead>Customer</TableHead>
                                        <TableHead>Amount</TableHead>
                                        <TableHead>Cancellation Date</TableHead>
                                        <TableHead>Reason</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {mockCancellations.map(order => (
                                        <TableRow key={order.orderId}>
                                            <TableCell className="font-medium">{order.orderId}</TableCell>
                                            <TableCell>{order.customer}</TableCell>
                                            <TableCell>₹{order.amount}</TableCell>
                                            <TableCell>{order.cancellationDate}</TableCell>
                                            <TableCell>{order.reason}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                           </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </AppShell>
    )
}
