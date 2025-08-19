
'use client';

import { AppShell } from "@/components/layout/app-shell";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getOrders, type Order as ShopifyOrder } from "@/services/shopify";
import { format } from "date-fns";
import { useState, useEffect } from "react";
import { Loader2, PlusCircle, Trash2, Save } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { v4 as uuidv4 } from 'uuid';

export type EditableOrder = {
  id: string; // Internal unique ID for React key
  orderId: string;
  customerName: string;
  customerEmail?: string;
  customerAddress: string;
  pincode: string;
  contactNo: string;
  productOrdered: string;
  quantity: number;
  price: string;
  paymentStatus: string;
  date: string;
  // Fields from other tabs
  trackingNumber?: string;
  courierCompanyName?: string;
  deliveryStatus?: 'pending' | 'dispatched' | 'out-for-delivery' | 'delivered' | 'failed';
  estDelivery?: string;
  readyForDispatchDate?: string;
  cancellationId?: string;
  cancellationReason?: string;
  cancellationStatus?: 'Pending' | 'Processed' | 'Failed';
  refundAmount?: string;
  refundReason?: string;
  refundStatus?: 'Pending' | 'Processed' | 'Failed';
};

function formatAddress(address: ShopifyOrder['shipping_address']): string {
    if (!address) return 'N/A';
    const parts = [address.address1, address.city, address.province, address.country];
    return parts.filter(Boolean).join(', ');
}

function mapShopifyOrderToEditableOrder(shopifyOrder: ShopifyOrder): EditableOrder {
    const customer = shopifyOrder.customer;
    const customerName = customer ? `${customer.first_name || ''} ${customer.last_name || ''}`.trim() : 'N/A';
    
    let paymentStatus: string = 'Pending';
    switch (shopifyOrder.financial_status) {
        case 'paid': paymentStatus = 'Paid'; break;
        case 'pending': paymentStatus = 'Pending'; break;
        case 'refunded': case 'partially_refunded': paymentStatus = 'Refunded'; break;
        case 'authorized': paymentStatus = 'Authorized'; break;
        case 'partially_paid': paymentStatus = 'Partially Paid'; break;
        case 'voided': paymentStatus = 'Voided'; break;
        default: paymentStatus = shopifyOrder.financial_status || 'Pending';
    }
    
    const products = shopifyOrder.line_items.map(item => item.title).join(', ');

    return {
        id: shopifyOrder.id.toString(),
        orderId: shopifyOrder.name,
        customerName,
        customerEmail: shopifyOrder.customer?.email || undefined,
        customerAddress: formatAddress(shopifyOrder.shipping_address),
        pincode: shopifyOrder.shipping_address?.zip || 'N/A',
        contactNo: shopifyOrder.customer?.phone || 'N/A',
        productOrdered: products,
        quantity: shopifyOrder.line_items.reduce((sum, item) => sum + item.quantity, 0),
        price: shopifyOrder.total_price,
        paymentStatus,
        date: format(new Date(shopifyOrder.created_at), "yyyy-MM-dd"),
    };
}

const TEST_ORDER_ID = '#TEST-1001';

export default function OrdersPage() {
  const [orders, setOrders] = useState<EditableOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    async function fetchAndSetOrders() {
        setLoading(true);
        let shopifyEditableOrders: EditableOrder[] = [];
        try {
            const shopifyOrders = await getOrders();
            shopifyEditableOrders = shopifyOrders.map(mapShopifyOrderToEditableOrder);
        } catch (error) {
            console.error("Failed to fetch Shopify orders:", error);
            toast({
                variant: 'destructive',
                title: "Failed to load Shopify Orders",
                description: "Displaying manually added orders only. Check Shopify API keys in Settings.",
            });
        }

        let manualOrders: EditableOrder[] = [];
        try {
            const manualOrdersJSON = localStorage.getItem('manualOrders');
            manualOrders = manualOrdersJSON ? JSON.parse(manualOrdersJSON) : [];
            
            const testOrderExists = manualOrders.some(order => order.orderId === TEST_ORDER_ID);
            if (!testOrderExists) {
                 manualOrders.unshift({
                    id: uuidv4(),
                    orderId: TEST_ORDER_ID,
                    customerName: 'Test Customer',
                    customerEmail: 'test@example.com',
                    customerAddress: '123 Test Street, Testville',
                    pincode: '12345',
                    contactNo: '9876543210',
                    productOrdered: 'Sample Product for Testing',
                    quantity: 1,
                    price: '499.00',
                    paymentStatus: 'Pending',
                    date: format(new Date(), 'yyyy-MM-dd'),
                });
                localStorage.setItem('manualOrders', JSON.stringify(manualOrders));
            }
        } catch (error) {
            console.error("Failed to load manual orders:", error);
            toast({
                variant: 'destructive',
                title: "Error loading manual orders",
                description: "Could not load orders from local storage.",
            });
        }

        const combinedOrders = [...manualOrders, ...shopifyEditableOrders];
        
        // De-duplication logic with status priority
        const orderGroups = new Map<string, EditableOrder[]>();
        combinedOrders.forEach(order => {
            const group = orderGroups.get(order.orderId) || [];
            group.push(order);
            orderGroups.set(order.orderId, group);
        });

        const deDupedOrders: EditableOrder[] = [];
        const statusPriority = ['Voided', 'Refunded', 'Cancelled'];

        orderGroups.forEach(group => {
            let representativeOrder = group[0]; 

            for (const status of statusPriority) {
                const priorityOrder = group.find(o => o.paymentStatus === status || o.cancellationStatus === 'Processed' || o.refundStatus === 'Processed');
                if (priorityOrder) {
                    representativeOrder = priorityOrder;
                    break;
                }
            }
            
            if (representativeOrder.cancellationStatus === 'Processed') {
                representativeOrder.paymentStatus = 'Voided';
            }
            if (representativeOrder.refundStatus === 'Processed') {
                 representativeOrder.paymentStatus = 'Refunded';
            }

            deDupedOrders.push(representativeOrder);
        });


        const finalOrders = deDupedOrders.map(order => {
            const storedOverrides = JSON.parse(localStorage.getItem(`order-override-${order.id}`) || '{}');
            return { ...order, ...storedOverrides };
        });
        
        const filteredOrders = finalOrders.filter(o => o.paymentStatus !== 'Intent Verified');

        setOrders(filteredOrders);
        setLoading(false);
    }
    fetchAndSetOrders();
  }, [toast]);

  const handleFieldChange = (orderId: string, field: keyof EditableOrder, value: string | number) => {
    setOrders(prevOrders => prevOrders.map(order =>
        order.id === orderId ? { ...order, [field]: value } : order
    ));
  };
  
  const handleSaveOrder = (orderId: string) => {
    const orderToSave = orders.find(o => o.id === orderId);
    if (!orderToSave) return;

    if (orderToSave.id.startsWith('gid://') || orderToSave.id.match(/^\d+$/)) {
      const storedOverrides = JSON.parse(localStorage.getItem(`order-override-${orderId}`) || '{}');
      const newOverrides = { ...storedOverrides, ...orderToSave };
      localStorage.setItem(`order-override-${orderId}`, JSON.stringify(newOverrides));
    } else {
      const manualOrdersJSON = localStorage.getItem('manualOrders');
      let manualOrders: EditableOrder[] = manualOrdersJSON ? JSON.parse(manualOrdersJSON) : [];
      const orderIndex = manualOrders.findIndex(o => o.id === orderId);
      if (orderIndex > -1) {
        manualOrders[orderIndex] = orderToSave;
        localStorage.setItem('manualOrders', JSON.stringify(manualOrders));
      }
    }

    toast({
        title: "Changes Saved",
        description: `Order ${orderToSave?.orderId} has been updated.`,
    });
  };

  const handleRemoveOrder = (orderId: string) => {
    setOrders(prev => prev.filter(order => order.id !== orderId));
    
    const manualOrdersJSON = localStorage.getItem('manualOrders');
    if(manualOrdersJSON) {
        let manualOrders: EditableOrder[] = JSON.parse(manualOrdersJSON);
        manualOrders = manualOrders.filter(o => o.id !== orderId);
        localStorage.setItem('manualOrders', JSON.stringify(manualOrders));
    }
    
    localStorage.removeItem(`order-override-${orderId}`);

    toast({
        variant: 'destructive',
        title: "Order Removed",
        description: "The order has been removed.",
    });
  };


  return (
    <AppShell title="All Orders">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
                <CardTitle>All Orders</CardTitle>
                <CardDescription>View and manage all orders. Click an Order ID to see full details.</CardDescription>
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
                  <TableHead>Product(s)</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Payment Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell>
                        <Link href={`/orders/${order.id}`} passHref>
                            <span className="font-medium text-primary hover:underline cursor-pointer">{order.orderId}</span>
                        </Link>
                    </TableCell>
                    <TableCell><Input value={order.customerName} onChange={(e) => handleFieldChange(order.id, 'customerName', e.target.value)} className="w-40" /></TableCell>
                    <TableCell><Input value={order.customerAddress} onChange={(e) => handleFieldChange(order.id, 'customerAddress', e.target.value)} className="w-48 text-xs" /></TableCell>
                    <TableCell><Input value={order.pincode} onChange={(e) => handleFieldChange(order.id, 'pincode', e.target.value)} className="w-24" /></TableCell>
                    <TableCell><Input value={order.contactNo} onChange={(e) => handleFieldChange(order.id, 'contactNo', e.target.value)} className="w-32" /></TableCell>
                    <TableCell><Input value={order.productOrdered} onChange={(e) => handleFieldChange(order.id, 'productOrdered', e.target.value)} className="w-48" /></TableCell>
                    <TableCell><Input type="number" value={order.quantity} onChange={(e) => handleFieldChange(order.id, 'quantity', parseInt(e.target.value, 10) || 0)} className="w-20" /></TableCell>
                    <TableCell><Input value={order.price} onChange={(e) => handleFieldChange(order.id, 'price', e.target.value)} className="w-24" /></TableCell>
                    <TableCell><Input value={order.paymentStatus} onChange={(e) => handleFieldChange(order.id, 'paymentStatus', e.target.value)} className="w-32" /></TableCell>
                    <TableCell><Input type="date" value={order.date} onChange={(e) => handleFieldChange(order.id, 'date', e.target.value)} className="w-32" /></TableCell>
                    <TableCell className="text-center space-x-2">
                        <Button variant="outline" size="icon" onClick={() => handleSaveOrder(order.id)}>
                            <Save className="h-4 w-4" />
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
