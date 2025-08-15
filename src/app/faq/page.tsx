
'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import Link from "next/link";

const faqs = {
  en: [
    {
      question: "What is Secure Cash on Delivery (COD)?",
      answer: "Secure COD is a service that verifies your intent to receive a COD order. You authorize a temporary hold for the order amount on your card, which is not a payment. You still pay with cash upon delivery."
    },
    {
      question: "Is money deducted from my account when I authorize?",
      answer: "No, this is not a payment. It is a temporary hold, similar to how a hotel might hold an amount on your card at check-in. The money is not debited from your account."
    },
    {
      question: "When is the hold on my card released?",
      answer: "The hold is automatically released within 24-48 hours after you have paid the delivery agent in cash and the delivery is marked as successful."
    },
    {
      question: "What happens if I refuse the delivery or cancel after shipping?",
      answer: "If you refuse the delivery for reasons other than product damage, or if you cancel the order after it has been shipped, we will capture a shipping and handling fee of Rs. 300 from the authorized amount, as per our Terms and Conditions."
    },
    {
      question: "Is this process secure?",
      answer: "Absolutely. The entire authorization process is handled by Razorpay, a leading and secure payment gateway in India. We do not see or store your card details."
    },
  ],
  hi: [
    {
      question: "सिक्योर कैश ऑन डिलीवरी (सीओडी) क्या है?",
      answer: "सिक्योर सीओडी एक सेवा है जो आपके सीओडी ऑर्डर प्राप्त करने के इरादे को सत्यापित करती है। आप अपने कार्ड पर ऑर्डर राशि के लिए एक अस्थायी होल्ड को अधिकृत करते हैं, जो भुगतान नहीं है। आप अभी भी डिलीवरी पर नकद में भुगतान करते हैं।"
    },
    {
      question: "क्या मेरे खाते से तुरंत पैसा कट जाता है?",
      answer: "नहीं, यह भुगतान नहीं है। यह एक अस्थायी होल्ड है, ठीक उसी तरह जैसे कोई होटल चेक-इन के समय आपके कार्ड पर एक राशि होल्ड कर सकता है। आपके खाते से पैसा नहीं काटा जाता है।"
    },
    {
      question: "मेरे कार्ड पर होल्ड कब जारी किया जाता है?",
      answer: "जब आप डिलीवरी एजेंट को नकद में भुगतान कर देते हैं और डिलीवरी को सफल के रूप में चिह्नित किया जाता है, तो होल्ड 24-48 घंटों के भीतर स्वचालित रूप से जारी कर दिया जाता है।"
    },
    {
      question: "अगर मैं डिलीवरी लेने से मना कर दूं या शिपिंग के बाद रद्द कर दूं तो क्या होगा?",
      answer: "यदि आप उत्पाद के क्षतिग्रस्त होने के अलावा अन्य कारणों से डिलीवरी से इनकार करते हैं, या यदि आप इसे शिप किए जाने के बाद ऑर्डर रद्द करते हैं, तो हम शिपिंग और हैंडलिंग शुल्क के रूप में अधिकृत राशि में से 300 रुपये की कटौती करेंगे, जैसा कि हमारे नियमों और शर्तों में है।"
    },
    {
      question: "क्या यह प्रक्रिया सुरक्षित है?",
      answer: "बिल्कुल। पूरी प्राधिकरण प्रक्रिया भारत के एक प्रमुख और सुरक्षित भुगतान गेटवे, रेज़रपे द्वारा नियंत्रित की जाती है। हम आपके कार्ड का विवरण नहीं देखते या संग्रहीत नहीं करते हैं।"
    },
  ],
  mr: [
    {
      question: "सिक्योर कॅश ऑन डिलिव्हरी (सीओडी) म्हणजे काय?",
      answer: "सिक्योर सीओडी ही एक सेवा आहे जी तुमची सीओडी ऑर्डर प्राप्त करण्याचा तुमचा हेतू सत्यापित करते. तुम्ही तुमच्या कार्डवर ऑर्डरच्या रकमेसाठी तात्पुरते होल्ड अधिकृत करता, जे पेमेंट नाही. तुम्ही डिलिव्हरीच्या वेळी रोख पैसे देता."
    },
    {
      question: "मी अधिकृत केल्यावर माझ्या खात्यातून पैसे कापले जातात का?",
      answer: "नाही, हे पेमेंट नाही. हे तात्पुरते होल्ड आहे, जसे की हॉटेल चेक-इनच्या वेळी तुमच्या कार्डवर रक्कम होल्ड करू शकते. तुमच्या खात्यातून पैसे डेबिट होत नाहीत."
    },
    {
      question: "माझ्या कार्डवरील होल्ड कधी रिलीज होते?",
      answer: "तुम्ही डिलिव्हरी एजंटला रोख पैसे दिल्यानंतर आणि डिलिव्हरी यशस्वी म्हणून चिन्हांकित झाल्यावर 24-48 तासांच्या आत होल्ड आपोआप रिलीज होते."
    },
    {
      question: "मी डिलिव्हरी घेण्यास नकार दिल्यास किंवा शिपिंगनंतर रद्द केल्यास काय होईल?",
      answer: "तुम्ही उत्पादनाच्या नुकसानीव्यतिरिक्त इतर कारणांसाठी डिलिव्हरी नाकारल्यास, किंवा ऑर्डर पाठवल्यानंतर तुम्ही ती रद्द केल्यास, आम्ही आमच्या अटी व शर्तींनुसार शिपिंग आणि हँडलिंग शुल्कासाठी अधिकृत रकमेतून ३०० रुपये वसूल करू."
    },
    {
      question: "ही प्रक्रिया सुरक्षित आहे का?",
      answer: "नक्कीच. संपूर्ण प्राधिकरण प्रक्रिया रेझरपे, भारतातील एक अग्रगण्य आणि सुरक्षित पेमेंट गेटवेद्वारे हाताळली जाते. आम्ही तुमचे कार्ड तपशील पाहत नाही किंवा संग्रहित करत नाही."
    },
  ],
};


export default function FaqPage() {
    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
            <Card className="w-full max-w-3xl shadow-lg">
                <CardHeader className="text-center">
                    <CardTitle>Frequently Asked Questions</CardTitle>
                    <CardDescription>Get answers to your questions about the Secure COD process.</CardDescription>
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
                        <Link href="/secure-cod" passHref>
                            <span className="text-sm text-primary hover:underline cursor-pointer">Back to Secure COD Page</span>
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
