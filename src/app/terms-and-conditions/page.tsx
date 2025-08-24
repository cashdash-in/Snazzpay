
'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function TermsAndConditionsPage() {
    const router = useRouter();

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
            <Card className="w-full max-w-2xl shadow-lg">
                <CardHeader className="text-center">
                    <CardTitle>Terms and Conditions</CardTitle>
                    <CardDescription>Please select the terms applicable to your role to continue.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Link href="/terms/customer" passHref>
                         <Card className="hover:bg-muted transition-colors cursor-pointer">
                            <CardHeader className="flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle className="text-lg">For Customers</CardTitle>
                                    <CardDescription>Terms governing the Secure COD and Trust Wallet features.</CardDescription>
                                </div>
                                <ArrowRight className="h-5 w-5 text-muted-foreground" />
                            </CardHeader>
                        </Card>
                    </Link>
                    <Link href="/terms/partner-pay" passHref>
                        <Card className="hover:bg-muted transition-colors cursor-pointer">
                            <CardHeader className="flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle className="text-lg">For Partner Pay Agents</CardTitle>
                                    <CardDescription>Terms for agents in the Snazzify Coin network.</CardDescription>
                                </div>
                                <ArrowRight className="h-5 w-5 text-muted-foreground" />
                            </CardHeader>
                        </Card>
                    </Link>
                    <Link href="/terms/logistics" passHref>
                         <Card className="hover:bg-muted transition-colors cursor-pointer">
                            <CardHeader className="flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle className="text-lg">For Logistics Partners</CardTitle>
                                    <CardDescription>Terms for delivery and fleet management partners.</CardDescription>
                                </div>
                                <ArrowRight className="h-5 w-5 text-muted-foreground" />
                            </CardHeader>
                        </Card>
                    </Link>
                </CardContent>
                <CardFooter>
                    <Button variant="outline" onClick={() => router.back()}>Go Back</Button>
                </CardFooter>
            </Card>
        </div>
    );
}
