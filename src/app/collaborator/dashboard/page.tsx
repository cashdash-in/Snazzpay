
'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LogOut, DollarSign, ShoppingCart, BookOpen } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function CollaboratorDashboardPage() {
    const router = useRouter();
    const { toast } = useToast();

    const handleLogout = () => {
        localStorage.removeItem('loggedInCollaboratorMobile');
        toast({ title: "Logged Out" });
        router.push('/collaborator/login');
    };

    return (
        <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
            <div className="max-w-4xl mx-auto">
                <header className="flex flex-col sm:flex-row justify-between sm:items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800">Collaborator Dashboard</h1>
                        <p className="text-muted-foreground">Welcome! Here's your performance overview.</p>
                    </div>
                    <Button variant="outline" onClick={handleLogout}>
                        <LogOut className="mr-2 h-4 w-4" />
                        Logout
                    </Button>
                </header>

                <main className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle>Total Commission</CardTitle>
                            <DollarSign className="h-6 w-6 text-green-500" />
                        </CardHeader>
                        <CardContent>
                            <p className="text-4xl font-bold">₹1,250.00</p>
                            <p className="text-xs text-muted-foreground">Earned from all successful sales.</p>
                        </CardContent>
                        <CardFooter>
                             <Link href="/collaborator/commissions" className="w-full">
                                <Button className="w-full">View Details</Button>
                            </Link>
                        </CardFooter>
                    </Card>
                     <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle>My Order Requests</CardTitle>
                            <ShoppingCart className="h-6 w-6 text-blue-500" />
                        </CardHeader>
                        <CardContent>
                             <p className="text-muted-foreground">View orders you've generated and push them to sellers.</p>
                        </CardContent>
                         <CardFooter>
                            <Link href="/collaborator/orders" className="w-full">
                                <Button className="w-full" variant="secondary">View My Orders</Button>
                            </Link>
                        </CardFooter>
                    </Card>
                     <Card className="md:col-span-2">
                        <CardHeader>
                            <CardTitle>Smart Magazine Library</CardTitle>
                            <CardDescription>Find all available magazines to share with your network.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="text-muted-foreground text-center py-4">You have access to all magazines created by admins, vendors, and sellers.</p>
                        </CardContent>
                        <CardFooter>
                            <Link href="/collaborator/magazines" className="w-full">
                                <Button className="w-full" variant="secondary">
                                    <BookOpen className="mr-2 h-4 w-4"/>
                                    Go to Magazine Library
                                </Button>
                            </Link>
                        </CardFooter>
                    </Card>
                </main>
            </div>
        </div>
    );
}
