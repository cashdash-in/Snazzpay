
'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import Link from "next/link";

const faqs = {
  en: [
    {
      question: "What is Secure COD with a Trust Wallet?",
      answer: "It's a modern way to place a Cash on Delivery order. You authorize the order amount, which is held securely in your personal Snazzify Trust Wallet. You still pay with cash upon delivery, and the held amount is released back to you automatically. This process reduces fraud and ensures genuine orders."
    },
    {
      question: "Is money deducted from my account when I authorize?",
      answer: "No, this is not a payment. It is a temporary hold on your funds, which are kept safe in your Trust Wallet. The money is not debited from your account. It's similar to how a hotel might hold an amount on your card at check-in."
    },
    {
      question: "When is the hold in my Trust Wallet released?",
      answer: "The hold is automatically released within 24-48 hours after you have paid the delivery agent in cash and the delivery is marked as successful."
    },
    {
      question: "What happens if I refuse the delivery or cancel after shipping?",
      answer: "If you refuse the delivery for reasons other than product damage, or if you cancel the order after it has been shipped, we will capture a shipping and handling fee of Rs. 300 from the amount held in your Trust Wallet, as per our Terms and Conditions."
    },
    {
      question: "Is the Trust Wallet process secure?",
      answer: "Absolutely. The entire authorization process is handled by Razorpay, a leading and secure payment gateway in India. We do not see or store your card details. Your funds are secured in the wallet and only handled based on the delivery outcome."
    },
  ],
  hi: [
    {
      question: "ट्रस्ट वॉलेट के साथ सिक्योर सीओडी क्या है?",
      answer: "यह कैश ऑन डिलीवरी ऑर्डर देने का एक आधुनिक तरीका है। आप ऑर्डर की राशि को अधिकृत करते हैं, जो आपके व्यक्तिगत स्नैज़िफाई ट्रस्ट वॉलेट में सुरक्षित रूप से रखी जाती है। आप अभी भी डिलीवरी पर नकद में भुगतान करते हैं, और रखी गई राशि स्वचालित रूप से आपको वापस कर दी जाती है। यह प्रक्रिया धोखाधड़ी को कम करती है और वास्तविक ऑर्डर सुनिश्चित करती है।"
    },
    {
      question: "क्या मेरे खाते से तुरंत पैसा कट जाता है?",
      answer: "नहीं, यह भुगतान नहीं है। यह आपके फंड पर एक अस्थायी होल्ड है, जिसे आपके ट्रस्ट वॉलेट में सुरक्षित रखा जाता है। आपके खाते से पैसा नहीं काटा जाता है। यह उसी तरह है जैसे कोई होटल चेक-इन के समय आपके कार्ड पर एक राशि होल्ड कर सकता है।"
    },
    {
      question: "मेरे ट्रस्ट वॉलेट में होल्ड कब जारी किया जाता है?",
      answer: "जब आप डिलीवरी एजेंट को नकद में भुगतान कर देते हैं और डिलीवरी को सफल के रूप में चिह्नित किया जाता है, तो होल्ड 24-48 घंटों के भीतर स्वचालित रूप से जारी कर दिया जाता है।"
    },
    {
      question: "अगर मैं डिलीवरी लेने से मना कर दूं या शिपिंग के बाद रद्द कर दूं तो क्या होगा?",
      answer: "यदि आप उत्पाद के क्षतिग्रस्त होने के अलावा अन्य कारणों से डिलीवरी से इनकार करते हैं, या यदि आप इसे शिप किए जाने के बाद ऑर्डर रद्द करते हैं, तो हम आपके ट्रस्ट वॉलेट में रखी गई राशि में से शिपिंग और हैंडलिंग शुल्क के रूप में 300 रुपये की कटौती करेंगे, जैसा कि हमारे नियमों और शर्तों में है।"
    },
    {
      question: "क्या यह ट्रस्ट वॉलेट प्रक्रिया सुरक्षित है?",
      answer: "बिल्कुल। पूरी प्राधिकरण प्रक्रिया भारत के एक प्रमुख और सुरक्षित भुगतान गेटवे, रेज़रपे द्वारा नियंत्रित की जाती है। हम आपके कार्ड का विवरण नहीं देखते या संग्रहीत नहीं करते हैं। आपके फंड वॉलेट में सुरक्षित हैं और केवल डिलीवरी के परिणाम के आधार पर संभाले जाते हैं।"
    },
  ],
  mr: [
    {
      question: "ट्रस्ट वॉलेटसह सुरक्षित सीओडी म्हणजे काय?",
      answer: "कॅश ऑन डिलिव्हरी ऑर्डर देण्याचा हा एक आधुनिक मार्ग आहे. तुम्ही ऑर्डरची रक्कम अधिकृत करता, जी तुमच्या वैयक्तिक स्नॅझिफाय ट्रस्ट वॉलेटमध्ये सुरक्षितपणे ठेवली जाते. तुम्ही डिलिव्हरीच्या वेळी रोख पैसे देता आणि ठेवलेली रक्कम आपोआप तुम्हाला परत केली जाते. ही प्रक्रिया फसवणूक कमी करते आणि अस्सल ऑर्डर सुनिश्चित करते."
    },
    {
      question: "मी अधिकृत केल्यावर माझ्या खात्यातून पैसे कापले जातात का?",
      answer: "नाही, हे पेमेंट नाही. हे तुमच्या निधीवर तात्पुरते होल्ड आहे, जे तुमच्या ट्रस्ट वॉलेटमध्ये सुरक्षित ठेवले जाते. तुमच्या खात्यातून पैसे डेबिट होत नाहीत. हे हॉटेल चेक-इनच्या वेळी तुमच्या कार्डवर रक्कम होल्ड करण्यासारखे आहे."
    },
    {
      question: "माझ्या ट्रस्ट वॉलेटमधील होल्ड कधी रिलीज होते?",
      answer: "तुम्ही डिलिव्हरी एजंटला रोख पैसे दिल्यानंतर आणि डिलिव्हरी यशस्वी म्हणून चिन्हांकित झाल्यावर 24-48 तासांच्या आत होल्ड आपोआप रिलीज होते."
    },
    {
      question: "मी डिलिव्हरी घेण्यास नकार दिल्यास किंवा शिपिंगनंतर रद्द केल्यास काय होईल?",
      answer: "तुम्ही उत्पादनाच्या नुकसानीव्यतिरिक्त इतर कारणांसाठी डिलिव्हरी नाकारल्यास, किंवा ऑर्डर पाठवल्यानंतर तुम्ही ती रद्द केल्यास, आम्ही आमच्या अटी व शर्तींनुसार तुमच्या ट्रस्ट वॉलेटमध्ये ठेवलेल्या रकमेतून शिपिंग आणि हँडलिंग शुल्कासाठी ३०० रुपये वसूल करू."
    },
    {
      question: "ही ट्रस्ट वॉलेट प्रक्रिया सुरक्षित आहे का?",
      answer: "नक्कीच. संपूर्ण प्राधिकरण प्रक्रिया रेझरपे, भारतातील एक अग्रगण्य आणि सुरक्षित पेमेंट गेटवेद्वारे हाताळली जाते. आम्ही तुमचे कार्ड तपशील पाहत नाही किंवा संग्रहित करत नाही. तुमचा निधी वॉलेटमध्ये सुरक्षित आहे आणि केवळ डिलिव्हरीच्या निकालावर आधारित हाताळला जातो."
    },
  ],
};


export default function FaqPage() {
    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
            <Card className="w-full max-w-3xl shadow-lg">
                <CardHeader className="text-center">
                    <CardTitle>Frequently Asked Questions</CardTitle>
                    <CardDescription>Get answers to your questions about Secure COD and your Trust Wallet.</CardDescription>
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
