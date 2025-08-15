
'use client';

import { AppShell } from "@/components/layout/app-shell";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { Send, PlusCircle, Trash2 } from "lucide-react";
import { v4 as uuidv4 } from 'uuid';

type OrderStatus = 'pending' | 'dispatched' | 'out-for-delivery' | 'delivered' | 'failed';

type EditableOrder = {
  id: string; // Internal ID for React keys
  orderId: string;
  customerName: string;
  trackingNumber: string;
  status: OrderStatus;
  estDelivery: string;
};

const createEmptyOrder = (): EditableOrder => ({
    id: uuidv4(),
    orderId: '',
    customerName: '',
    trackingNumber: '',
    status: 'pending',
    estDelivery: '',
});

export default function DeliveryTrackingPage() {
    const [orders, setOrders] = useState<EditableOrder[]>([]);

    const handleFieldChange = (internalId: string, field: keyof EditableOrder, value: string) => {
        setOrders(prevOrders =>
            prevOrders.map(order =>
                order.id === internalId ? { ...order, [field]: value } : order
            )
        );
    };

    const handleAddNewOrder = () => {
        setOrders(prevOrders => [...prevOrders, createEmptyOrder()]);
    };
    
    const handleRemoveOrder = (internalId: string) => {
        setOrders(prevOrders => prevOrders.filter(order => order.id !== internalId));
    }


  return (
    <AppShell title="Delivery Tracking">
      <Card>
        <CardHeader>
          <CardTitle>Delivery Management</CardTitle>
          <CardDescription>Manually add and manage your orders, update dispatch details, and track delivery status.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[150px]">Order ID</TableHead>
                <TableHead>Customer</TableHead>
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
                        placeholder="e.g., #1001"
                        value={order.orderId}
                        onChange={(e) => handleFieldChange(order.id, 'orderId', e.target.value)}
                      />
                  </TableCell>
                   <TableCell>
                      <Input 
                        placeholder="Customer Name"
                        value={order.customerName}
                        onChange={(e) => handleFieldChange(order.id, 'customerName', e.target.value)}
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
        </CardContent>
        <CardFooter className="justify-start border-t pt-6">
            <Button onClick={handleAddNewOrder}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Add New Order
            </Button>
        </CardFooter>
      </Card>
    </AppShell>
  );
}
