
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, DollarSign, ShieldCheck, Zap } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

const features = [
    {
        icon: ShieldCheck,
        title: "Eliminate COD Fraud",
        description: "Our Secure COD model requires upfront payment authorization, virtually eliminating fake orders and reducing RTO rates."
    },
    {
        icon: Zap,
        title: "Faster Payouts",
        description: "No more waiting for cash to be collected and remitted. Funds are captured as soon as you dispatch the order."
    },
    {
        icon: DollarSign,
        title: "Increased Conversions",
        description: "Build trust with customers through a transparent and secure payment process, leading to higher order completion rates."
    }
];

export default function SellerLandingPage() {
    return (
        <div className="bg-gray-50 min-h-screen">
            <header className="container mx-auto p-4 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <ShieldCheck className="h-8 w-8 text-primary" />
                    <h1 className="text-2xl font-bold">SnazzPay</h1>
                </div>
                <div className="space-x-2">
                    <Link href="/auth/login">
                        <Button variant="ghost">Login</Button>
                    </Link>
                    <Link href="/auth/signup">
                        <Button>Start Selling</Button>
                    </Link>
                </div>
            </header>

            <main className="container mx-auto py-12 px-4 text-center">
                <section className="max-w-4xl mx-auto">
                    <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-gray-900">
                        Modernize Your E-commerce Business. Sell Smarter, Not Harder.
                    </h2>
                    <p className="mt-6 text-lg text-muted-foreground">
                        Join the growing network of sellers who are increasing their profits and reducing operational headaches with SnazzPay's revolutionary Secure Cash on Delivery system.
                    </p>
                    <div className="mt-8 flex justify-center gap-4">
                        <Link href="/auth/signup">
                            <Button size="lg">Get Started for Free</Button>
                        </Link>
                         <Link href="/secure-cod-info" target="_blank">
                            <Button size="lg" variant="outline">How It Works</Button>
                        </Link>
                    </div>
                </section>

                <section className="mt-20">
                     <Image 
                        src="https://picsum.photos/1200/500"
                        alt="Dashboard preview"
                        width={1200}
                        height={500}
                        className="rounded-lg shadow-2xl"
                        data-ai-hint="app dashboard screenshot"
                    />
                </section>
                
                <section className="mt-20 max-w-5xl mx-auto">
                     <h3 className="text-3xl font-bold text-center">Why Sellers Love SnazzPay</h3>
                     <p className="text-muted-foreground text-center mt-2 mb-10">The ultimate toolkit for modern e-commerce.</p>
                     <div className="grid md:grid-cols-3 gap-8">
                        {features.map(feature => (
                            <Card key={feature.title}>
                                <CardHeader className="items-center">
                                    <div className="p-3 bg-primary/10 rounded-full">
                                        <feature.icon className="h-8 w-8 text-primary" />
                                    </div>
                                    <CardTitle>{feature.title}</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-muted-foreground">{feature.description}</p>
                                </CardContent>
                            </Card>
                        ))}
                     </div>
                </section>

                 <section className="mt-20">
                    <Card className="max-w-4xl mx-auto bg-primary text-primary-foreground text-left">
                        <CardHeader>
                            <CardTitle className="text-3xl">Ready to get started?</CardTitle>
                            <CardDescription className="text-primary-foreground/80">Create your account today and start securing your orders.</CardDescription>
                        </CardHeader>
                        <CardFooter>
                            <Link href="/auth/signup">
                                <Button size="lg" variant="secondary">Create Seller Account</Button>
                            </Link>
                        </CardFooter>
                    </Card>
                </section>
            </main>
             <footer className="container mx-auto text-center py-6 text-muted-foreground text-sm">
                <p>&copy; {new Date().getFullYear()} SnazzPay. All rights reserved.</p>
             </footer>
        </div>
    );
}
