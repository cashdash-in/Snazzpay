
'use client';

import { AppShell } from "@/components/layout/app-shell";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getOrders, type Order as ShopifyOrder } from "@/services/shopify";
import { format } from "date-fns";
import { useState, useEffect } from "react";
import { Loader2, PlusCircle, Trash2 } from "lucide-react";
import Link from "next/link";

type EditableOrder = {
  id: string; // Internal unique ID for React key
  orderId: string;
  customerName: string;
  customerAddress: string;
  pincode: string;
  contactNo: string;
  productOrdered: string;
  quantity: number;
  price: string;
  paymentStatus: string;
  date: string;
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

export default function OrdersPage() {
  const [orders, setOrders] = useState<EditableOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchOrders() {
        setLoading(true);
        try {
            const shopifyOrders = await getOrders();
            const editableOrders = shopifyOrders.map(mapShopifyOrderToEditableOrder);
            setOrders(editableOrders);
        } catch (error) {
            console.error("Failed to fetch orders:", error);
        } finally {
            setLoading(false);
        }
    }
    fetchOrders();
  }, []);

  const handleFieldChange = (orderId: string, field: keyof EditableOrder, value: string | number) => {
    setOrders(prevOrders =>
        prevOrders.map(order =>
            order.id === orderId ? { ...order, [field]: value } : order
        )
    );
  };

  const handleRemoveOrder = (orderId: string) => {
    setOrders(prevOrders => prevOrders.filter(order => order.id !== orderId));
  };


  return (
    <AppShell title="All Orders">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
                <CardTitle>All Orders</CardTitle>
                <CardDescription>View and manage all orders from your Shopify store. All fields are manually editable.</CardDescription>
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
                    <TableCell><Input value={order.orderId} onChange={(e) => handleFieldChange(order.id, 'orderId', e.target.value)} className="w-28" /></TableCell>
                    <TableCell><Input value={order.customerName} onChange={(e) => handleFieldChange(order.id, 'customerName', e.target.value)} className="w-40" /></TableCell>
                    <TableCell><Input value={order.customerAddress} onChange={(e) => handleFieldChange(order.id, 'customerAddress', e.target.value)} className="w-48 text-xs" /></TableCell>
                    <TableCell><Input value={order.pincode} onChange={(e) => handleFieldChange(order.id, 'pincode', e.target.value)} className="w-24" /></TableCell>
                    <TableCell><Input value={order.contactNo} onChange={(e) => handleFieldChange(order.id, 'contactNo', e.target.value)} className="w-32" /></TableCell>
                    <TableCell><Input value={order.productOrdered} onChange={(e) => handleFieldChange(order.id, 'productOrdered', e.target.value)} className="w-48" /></TableCell>
                    <TableCell><Input type="number" value={order.quantity} onChange={(e) => handleFieldChange(order.id, 'quantity', parseInt(e.target.value, 10) || 0)} className="w-20" /></TableCell>
                    <TableCell><Input value={order.price} onChange={(e) => handleFieldChange(order.id, 'price', e.target.value)} className="w-24" /></TableCell>
                    <TableCell><Input value={order.paymentStatus} onChange={(e) => handleFieldChange(order.id, 'paymentStatus', e.target.value)} className="w-32" /></TableCell>
                    <TableCell><Input type="date" value={order.date} onChange={(e) => handleFieldChange(order.id, 'date', e.target.value)} className="w-32" /></TableCell>
                    <TableCell className="text-center">
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
