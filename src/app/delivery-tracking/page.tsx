
'use client';

import { AppShell } from "@/components/layout/app-shell";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect } from "react";
import { Send, Trash2, PlusCircle } from "lucide-react";
import { getOrders, type Order as ShopifyOrder } from "@/services/shopify";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { v4 as uuidv4 } from 'uuid';
import type { EditableOrder } from '../orders/page';


type OrderStatus = 'pending' | 'dispatched' | 'out-for-delivery' | 'delivered' | 'failed';

type DeliveryOrder = {
  id: string;
  orderId: string;
  customerName: string;
  customerAddress: string;
  pincode: string;
  contactNo: string;
  trackingNumber: string;
  courierCompanyName: string;
  status: OrderStatus;
  estDelivery: string;
};

function formatAddress(address: ShopifyOrder['shipping_address']): string {
    if (!address) return 'N/A';
    const parts = [address.address1, address.city, address.province, address.country, address.zip];
    return parts.filter(Boolean).join(', ');
}

function mapToDeliveryOrder(order: EditableOrder): DeliveryOrder {
    return {
        id: order.id.toString(),
        orderId: order.orderId,
        customerName: order.customerName,
        customerAddress: order.customerAddress,
        pincode: order.pincode,
        contactNo: order.contactNo,
        trackingNumber: '', // Default value
        courierCompanyName: '', // Default value
        status: 'pending', // Default value
        estDelivery: '', // Default value
    };
}


export default function DeliveryTrackingPage() {
    const [orders, setOrders] = useState<DeliveryOrder[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchAndSetOrders() {
            setLoading(true);
            try {
                // Fetch from Shopify
                const shopifyOrders = await getOrders();
                const shopifyEditableOrders = shopifyOrders.map(order => ({
                    id: order.id.toString(),
                    orderId: order.name,
                    customerName: `${order.customer?.first_name || ''} ${order.customer?.last_name || ''}`.trim(),
                    customerAddress: formatAddress(order.shipping_address),
                    pincode: order.shipping_address?.zip || 'N/A',
                    contactNo: order.customer?.phone || 'N/A',
                    productOrdered: '', quantity: 0, price: '', paymentStatus: '', date: '' // Fields not needed here
                }));

                // Fetch from LocalStorage
                const manualOrdersJSON = localStorage.getItem('manualOrders');
                const manualOrders: EditableOrder[] = manualOrdersJSON ? JSON.parse(manualOrdersJSON) : [];
                
                const combinedOrders = [...shopifyEditableOrders, ...manualOrders];
                const deliveryOrders = combinedOrders.map(mapToDeliveryOrder);
                setOrders(deliveryOrders);

            } catch (error) {
                console.error("Failed to fetch orders:", error);
                 const manualOrdersJSON = localStorage.getItem('manualOrders');
                const manualOrders: EditableOrder[] = manualOrdersJSON ? JSON.parse(manualOrdersJSON) : [];
                setOrders(manualOrders.map(mapToDeliveryOrder));
            } finally {
                setLoading(false);
            }
        }
        fetchAndSetOrders();
    }, []);

    const handleFieldChange = (orderId: string, field: keyof DeliveryOrder, value: string) => {
        setOrders(prevOrders =>
            prevOrders.map(order =>
                order.id === orderId ? { ...order, [field]: value } : order
            )
        );
    };
    
    const handleRemoveOrder = (orderId: string) => {
        const updatedOrders = orders.filter(order => order.id !== orderId);
        setOrders(updatedOrders);
        
        // This is complex because we need to update the source of truth in localStorage
        // For simplicity, we assume we only remove manual orders this way.
        const manualOrdersJSON = localStorage.getItem('manualOrders');
        if(manualOrdersJSON) {
            const manualOrders: EditableOrder[] = JSON.parse(manualOrdersJSON);
            const updatedManualOrders = manualOrders.filter(o => o.id !== orderId);
            localStorage.setItem('manualOrders', JSON.stringify(updatedManualOrders));
        }
    };

  return (
    <AppShell title="Delivery Tracking">
      <Card>
        <CardHeader>
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                    <CardTitle>Delivery Management</CardTitle>
                    <CardDescription>Manage dispatch details and delivery status. All fields are manually editable.</CardDescription>
                </div>
                <Link href="/orders/new" passHref>
                    <Button>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Add Order
                    </Button>
                </Link>
          </div>
        </CardHeader>
        <CardContent>
            {loading ? (
                 <div className="flex justify-center items-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>Pincode</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Courier Company</TableHead>
                    <TableHead>Tracking No.</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Est. Delivery</TableHead>
                    <TableHead className="text-center w-[200px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell>
                        <Input
                            value={order.orderId}
                            onChange={(e) => handleFieldChange(order.id, 'orderId', e.target.value)}
                            className="w-28"
                            placeholder="e.g. #1001"
                        />
                      </TableCell>
                      <TableCell>
                         <Input
                            value={order.customerName}
                            onChange={(e) => handleFieldChange(order.id, 'customerName', e.target.value)}
                            className="w-40"
                            placeholder="Customer Name"
                        />
                      </TableCell>
                      <TableCell>
                         <Input
                            value={order.customerAddress}
                            onChange={(e) => handleFieldChange(order.id, 'customerAddress', e.target.value)}
                            className="w-48 text-xs"
                             placeholder="Shipping Address"
                        />
                      </TableCell>
                      <TableCell>
                         <Input
                            value={order.pincode}
                            onChange={(e) => handleFieldChange(order.id, 'pincode', e.target.value)}
                            className="w-24"
                            placeholder="Pincode"
                        />
                      </TableCell>
                      <TableCell>
                         <Input
                            value={order.contactNo}
                            onChange={(e) => handleFieldChange(order.id, 'contactNo', e.target.value)}
                            className="w-32"
                            placeholder="Contact No."
                        />
                      </TableCell>
                      <TableCell>
                        <Input 
                            placeholder="Courier Name" 
                            className="w-40" 
                            value={order.courierCompanyName}
                            onChange={(e) => handleFieldChange(order.id, 'courierCompanyName', e.target.value)}
                        />
                      </TableCell>
                      <TableCell>
                        <Input 
                            placeholder="Enter Tracking No." 
                            className="w-40" 
                            value={order.trackingNumber}
                            onChange={(e) => handleFieldChange(order.id, 'trackingNumber', e.target.value)}
                        />
                      </TableCell>
                      <TableCell>
                        <Select
                            value={order.status}
                            onValueChange={(value: OrderStatus) => handleFieldChange(order.id, 'status', value)}
                        >
                          <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Select Status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="dispatched">Dispatched</SelectItem>
                            <SelectItem value="out-for-delivery">Out for Delivery</SelectItem>
                            <SelectItem value="delivered">Delivered</SelectItem>
                            <SelectItem value="failed">Delivery Failed</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                         <Input 
                            type="date" 
                            className="w-40" 
                            value={order.estDelivery}
                            onChange={(e) => handleFieldChange(order.id, 'estDelivery', e.target.value)}
                         />
                      </TableCell>
                      <TableCell className="text-center space-x-2">
                        <Button variant="outline" size="sm">
                          <Send className="mr-2 h-4 w-4" />
                          Notify
                        </Button>
                        <Button variant="destructive" size="icon" onClick={() => handleRemoveOrder(order.id)}>
                            <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </AppShell>
  );
}
