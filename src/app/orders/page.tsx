
'use client';

import { AppShell } from "@/components/layout/app-shell";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { MandateStatus } from "@/components/mandate-status";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import { getOrders, type Order as ShopifyOrder } from "@/services/shopify";
import { format } from "date-fns";
import { useState, useEffect } from "react";

type Order = {
  orderId: string;
  customerName: string;
  amount: number;
  paymentStatus: 'Paid' | 'Pending' | 'COD' | 'Refunded' | 'Authorized' | 'Partially Paid' | 'Voided';
  mandateStatus: 'active' | 'pending' | 'failed' | 'completed' | 'none';
  date: string;
};

function mapShopifyOrderToAppOrder(shopifyOrder: ShopifyOrder): Order {
    const customer = shopifyOrder.customer;
    const customerName = customer ? `${customer.first_name || ''} ${customer.last_name || ''}`.trim() : 'N/A';
    
    let paymentStatus: Order['paymentStatus'] = 'Pending';
    switch (shopifyOrder.financial_status) {
        case 'paid':
            paymentStatus = 'Paid';
            break;
        case 'pending':
            paymentStatus = 'Pending';
            break;
        case 'refunded':
        case 'partially_refunded':
            paymentStatus = 'Refunded';
            break;
        case 'authorized':
            paymentStatus = 'Authorized';
            break;
        case 'partially_paid':
            paymentStatus = 'Partially Paid';
            break;
        case 'voided':
            paymentStatus = 'Voided';
            break;
        default:
            paymentStatus = 'Pending';
    }


    return {
        orderId: shopifyOrder.name,
        customerName,
        amount: parseFloat(shopifyOrder.total_price),
        paymentStatus,
        mandateStatus: 'none', // This needs to be determined based on your app's logic
        date: format(new Date(shopifyOrder.created_at), "yyyy-MM-dd"),
    };
}


export default function OrdersPage() {
  const [allOrders, setAllOrders] = useState<Order[]>([]);

  useEffect(() => {
    async function fetchOrders() {
        const shopifyOrders = await getOrders();
        const orders = shopifyOrders.map(mapShopifyOrderToAppOrder);
        setAllOrders(orders);
    }
    fetchOrders();
  }, []);


  return (
    <AppShell title="Orders">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                  <CardTitle>All Orders</CardTitle>
                  <CardDescription>View and manage all orders from your Shopify store.</CardDescription>
              </div>
              <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search orders..." className="pl-8" />
              </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order ID</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-center">Payment Status</TableHead>
                <TableHead className="text-center">Mandate Status</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allOrders.map((order) => (
                <TableRow key={order.orderId}>
                  <TableCell className="font-medium">{order.orderId}</TableCell>
                  <TableCell>{order.customerName}</TableCell>
                  <TableCell className="text-right">₹{order.amount.toFixed(2)}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant={order.paymentStatus === 'Paid' ? 'default' : 'secondary'} className={order.paymentStatus === 'Paid' ? 'bg-green-500 hover:bg-green-600' : ''}>
                      {order.paymentStatus}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    {order.mandateStatus !== 'none' ? <MandateStatus status={order.mandateStatus} /> : <Badge variant="outline">N/A</Badge>}
                  </TableCell>
                  <TableCell>{order.date}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AppShell>
  );
}
