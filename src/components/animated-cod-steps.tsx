
'use client';

import { useEffect, useState } from 'react';
import { ShoppingCart, MousePointerClick, ShieldCheck, CreditCard, Truck, Home } from 'lucide-react';
import { cn } from '@/lib/utils';
import Image from 'next/image';

const steps = [
  {
    icon: ShoppingCart,
    title: 'Select Product',
    description: 'You choose your favorite product on our website.',
  },
  {
    icon: MousePointerClick,
    title: 'Click "Secure COD"',
    description: 'You select our modern & safe payment option at checkout.',
  },
  {
    icon: ShieldCheck,
    title: 'Verify with ₹1',
    description: 'A tiny, refundable payment confirms your order intent.',
  },
  {
    icon: CreditCard,
    title: 'Secure Full Value',
    description: 'Your payment is held safely in your personal Trust Wallet.',
  },
  {
    icon: Truck,
    title: 'Order Dispatched',
    description: 'We pack and ship your order. Funds are now sent to us.',
  },
  {
    icon: Home,
    title: 'Delivered to You',
    description: 'You receive your product hassle-free, with no cash exchange.',
  },
];

const TimelineEvent = ({ step, index, isVisible }: { step: (typeof steps)[0], index: number, isVisible: boolean }) => {
    const { icon: Icon, title, description } = step;
    const isEven = index % 2 === 0;

    return (
        <div className={cn("flex items-start gap-4 sm:gap-8 transition-opacity duration-700 delay-200", isVisible ? "opacity-100" : "opacity-0", !isEven && "sm:flex-row-reverse")}>
            <div className="hidden sm:flex flex-col items-center">
                 <div className="flex-shrink-0 w-32 h-32 relative">
                    <Image 
                        src="https://placehold.co/200x200.png"
                        alt="Cartoon character showing a step"
                        layout="fill"
                        objectFit="contain"
                        data-ai-hint="indian character cartoon"
                    />
                 </div>
            </div>
            <div className="relative flex-grow">
                 <div className="hidden sm:block absolute top-6 bg-border h-0.5 w-full" style={isEven ? { left: '-50%' } : { right: '-50%' }} />
                 <div className={cn("absolute top-6 h-full w-0.5 bg-border", isEven ? "left-[-2rem] sm:left-[-4rem]" : "right-[-2rem] sm:right-[-4rem]")}/>
                 <div className={cn(
                    "absolute top-4 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center ring-4 ring-background",
                    isEven ? "left-[-2.9rem] sm:left-[-4.9rem]" : "right-[-2.9rem] sm:right-[-4.9rem]"
                 )}>
                    <Icon className="w-5 h-5"/>
                 </div>
                <div className={cn("p-4 rounded-lg border bg-card text-card-foreground shadow-sm w-full", isEven ? "text-left" : "sm:text-right")}>
                    <h3 className="font-bold text-lg text-primary">{title}</h3>
                    <p className="text-muted-foreground">{description}</p>
                </div>
            </div>
        </div>
    )
}


export function AnimatedCodSteps() {
  const [visibleSteps, setVisibleSteps] = useState(0);

  useEffect(() => {
    const timers = steps.map((_, index) => 
      setTimeout(() => {
        setVisibleSteps(prev => prev + 1);
      }, index * 500) // Stagger the appearance of each step
    );
    
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8 py-8 relative">
        <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-border -translate-x-1/2 sm:hidden"/>
         {steps.map((step, index) => (
            <TimelineEvent key={index} step={step} index={index} isVisible={index < visibleSteps} />
         ))}
    </div>
  );
}
