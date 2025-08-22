
'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import Link from "next/link";

const faqs = {
  en: [
    {
      question: "What is Secure COD? Do I pay cash on delivery?",
      answer: "Secure COD is a modern, upfront payment method. You pay for the order now, and we hold your money securely in your personal Snazzify Trust Wallet. There is no need to pay any cash to the courier. This reduces fraud and ensures a faster, more secure delivery."
    },
    {
      question: "Is my money safe in the Trust Wallet?",
      answer: "Absolutely. Your funds are held in a secure Trust Wallet powered by Razorpay, a leading payment gateway. We only transfer the funds to our account after your product has been dispatched. This protects you from non-delivery and gives you time to cancel."
    },
    {
      question: "When are the funds transferred to Snazzify?",
      answer: "The payment is transferred from your Trust Wallet to our account only when your order is dispatched from our warehouse. You will be notified when this happens."
    },
    {
      question: "How do I cancel my order?",
      answer: "You can cancel your order anytime before it is dispatched for a full refund. You can also cancel up to 3 days after receiving the product. For all cancellations, a small service fee to cover shipping and handling may be deducted from your refund."
    },
    {
      question: "Why is this better than traditional Cash on Delivery?",
      answer: "This modern approach eliminates the risks of handling cash, reduces fraudulent orders, and allows us to process and ship your order with higher priority. It's a safer, faster, and more reliable way to shop."
    },
  ],
  hi: [
    {
      question: "सिक्योर सीओडी क्या है? क्या मुझे डिलीवरी के समय नकद भुगतान करना होगा?",
      answer: "सिक्योर सीओडी एक आधुनिक, अग्रिम भुगतान पद्धति है। आप अभी ऑर्डर के लिए भुगतान करते हैं, और हम आपके पैसे को आपके व्यक्तिगत स्नैज़िफाई ट्रस्ट वॉलेट में सुरक्षित रूप से रखते हैं। कूरियर को कोई नकद भुगतान करने की आवश्यकता नहीं है। यह धोखाधड़ी को कम करता है और एक तेज, अधिक सुरक्षित डिलीवरी सुनिश्चित करता है।"
    },
    {
      question: "क्या मेरा पैसा ट्रस्ट वॉलेट में सुरक्षित है?",
      answer: "बिल्कुल। आपका फंड रेजरपे द्वारा संचालित एक सुरक्षित ट्रस्ट वॉलेट में रखा जाता है। हम आपके उत्पाद के भेजे जाने के बाद ही फंड को अपने खाते में स्थानांतरित करते हैं। यह आपको नॉन-डिलीवरी से बचाता है और आपको रद्द करने का समय देता है।"
    },
    {
      question: "फंड स्नैज़िफाई को कब ट्रांसफर किया जाता है?",
      answer: "भुगतान आपके ट्रस्ट वॉलेट से हमारे खाते में तभी स्थानांतरित किया जाता है जब आपका ऑर्डर हमारे गोदाम से भेज दिया जाता है। ऐसा होने पर आपको सूचित किया जाएगा।"
    },
    {
      question: "मैं अपना ऑर्डर कैसे रद्द कर सकता हूं?",
      answer: "आप पूरे रिफंड के लिए भेजे जाने से पहले किसी भी समय अपना ऑर्डर रद्द कर सकते हैं। आप उत्पाद प्राप्त करने के 3 दिन बाद तक भी रद्द कर सकते हैं। सभी रद्दीकरणों के लिए, आपके रिफंड से शिपिंग और हैंडलिंग को कवर करने के लिए एक छोटा सेवा शुल्क काटा जा सकता है।"
    },
    {
      question: "यह पारंपरिक कैश ऑन डिलीवरी से बेहतर क्यों है?",
      answer: "यह आधुनिक दृष्टिकोण नकदी संभालने के जोखिमों को समाप्त करता है, धोखाधड़ी वाले ऑर्डर कम करता है, और हमें आपके ऑर्डर को उच्च प्राथमिकता के साथ संसाधित करने और भेजने की अनुमति देता है। यह खरीदारी करने का एक सुरक्षित, तेज और अधिक विश्वसनीय तरीका है।"
    },
  ],
  mr: [
    {
      question: "सिक्योर सीओडी म्हणजे काय? मला डिलिव्हरीच्या वेळी रोख पैसे द्यावे लागतील का?",
      answer: "सिक्योर सीओडी ही एक आधुनिक, आगाऊ पेमेंट पद्धत आहे. तुम्ही आता ऑर्डरसाठी पैसे देता आणि आम्ही तुमचे पैसे तुमच्या वैयक्तिक स्नॅझिफाय ट्रस्ट वॉलेटमध्ये सुरक्षित ठेवतो. कुरिअरला कोणतीही रोख रक्कम देण्याची गरज नाही. यामुळे फसवणूक कमी होते आणि जलद, अधिक सुरक्षित डिलिव्हरी सुनिश्चित होते."
    },
    {
      question: "माझे पैसे ट्रस्ट वॉलेटमध्ये सुरक्षित आहेत का?",
      answer: "नक्कीच. तुमचा निधी रेझरपेद्वारे समर्थित सुरक्षित ट्रस्ट वॉलेटमध्ये ठेवला जातो. आम्ही तुमचे उत्पादन पाठवल्यानंतरच निधी आमच्या खात्यात हस्तांतरित करतो. हे तुम्हाला न-डिलिव्हरीपासून वाचवते आणि तुम्हाला रद्द करण्यासाठी वेळ देते."
    },
    {
      question: "निधी स्नॅझिफायला केव्हा हस्तांतरित केला जातो?",
      answer: "जेव्हा तुमची ऑर्डर आमच्या वेअरहाऊसमधून पाठवली जाते तेव्हाच तुमच्या ट्रस्ट वॉलेटमधून आमच्या खात्यात पेमेंट हस्तांतरित केले जाते. असे झाल्यावर तुम्हाला सूचित केले जाईल."
    },
    {
      question: "मी माझी ऑर्डर कशी रद्द करू शकेन?",
      answer: "तुम्ही संपूर्ण परताव्यासाठी पाठवण्यापूर्वी कधीही तुमची ऑर्डर रद्द करू शकता. तुम्ही उत्पादन मिळाल्यानंतर ३ दिवसांपर्यंत रद्द करू शकता. सर्व रद्द करण्यांसाठी, तुमच्या परताव्यातून शिपिंग आणि हाताळणी कव्हर करण्यासाठी एक लहान सेवा शुल्क कापले जाऊ शकते."
    },
    {
      question: "हे पारंपारिक कॅश ऑन डिलिव्हरीपेक्षा चांगले का आहे?",
      answer: "हा आधुनिक दृष्टिकोन रोख हाताळण्याचे धोके दूर करतो, फसव्या ऑर्डर कमी करतो आणि आम्हाला तुमच्या ऑर्डरवर उच्च प्राधान्याने प्रक्रिया करण्यास आणि पाठविण्यास अनुमती देतो. खरेदी करण्याचा हा एक सुरक्षित, जलद आणि अधिक विश्वासार्ह मार्ग आहे."
    },
  ],
};


export default function FaqPage() {
    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
            <Card className="w-full max-w-3xl shadow-lg">
                <CardHeader className="text-center">
                    <CardTitle>Frequently Asked Questions</CardTitle>
                    <CardDescription>Get answers to your questions about our modern Secure COD payment method.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Tabs defaultValue="en" className="w-full">
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="en">English</TabsTrigger>
                            <TabsTrigger value="hi">हिन्दी</TabsTrigger>
                            <TabsTrigger value="mr">मराठी</TabsTrigger>
                        </TabsList>
                        
                        <FaqContent lang="en" />
                        <FaqContent lang="hi" />
                        <FaqContent lang="mr" />

                    </Tabs>

                    <div className="text-center mt-6">
                        <Link href="/secure-cod" className="text-sm text-primary hover:underline cursor-pointer">
                           Back to Secure COD Page
                        </Link>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}


function FaqContent({ lang }: { lang: 'en' | 'hi' | 'mr' }) {
    return (
        <TabsContent value={lang} className="mt-6">
            <Accordion type="single" collapsible className="w-full">
                {faqs[lang].map((faq, index) => (
                    <AccordionItem value={`item-${index}`} key={index}>
                        <AccordionTrigger className="text-left">{faq.question}</AccordionTrigger>
                        <AccordionContent>
                            {faq.answer}
                        </AccordionContent>
                    </AccordionItem>
                ))}
            </Accordion>
        </TabsContent>
    );
}
