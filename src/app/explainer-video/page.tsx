
'use client';

import { useState } from 'react';
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createExplainerVideo } from '@/ai/flows/create-explainer-video';
import { Loader2, Clapperboard, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function ExplainerVideoPage() {
    const [isLoading, setIsLoading] = useState(false);
    const [videoDataUri, setVideoDataUri] = useState<string | null>(null);
    const { toast } = useToast();

    const handleGenerateVideo = async () => {
        setIsLoading(true);
        setVideoDataUri(null);
        toast({
            title: "Video Generation Started",
            description: "This may take a minute or two. Please wait...",
        });

        try {
            const result = await createExplainerVideo();
            setVideoDataUri(result.videoDataUri);
            toast({
                title: "Video Generated Successfully!",
                description: "Your animated explainer video is ready.",
            });
        } catch (error: any) {
            console.error("Video generation failed:", error);
            toast({
                variant: "destructive",
                title: "Video Generation Failed",
                description: error.message || "An unknown error occurred.",
            });
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleDownload = () => {
        if (!videoDataUri) return;
        const link = document.createElement('a');
        link.href = videoDataUri;
        link.download = 'snazzify-explainer-video.mp4';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <AppShell title="Animated Explainer Video">
            <Card className="max-w-4xl mx-auto">
                <CardHeader>
                    <CardTitle>Generate Your Explainer Video</CardTitle>
                    <CardDescription>
                        Click the button below to generate a short, animated video explaining your unique 'Secure COD' and 'Trust Wallet' process.
                        This can be used on your website or social media to help customers understand how it works.
                    </CardDescription>
                </CardHeader>
                <CardContent className="text-center space-y-6">
                    {!isLoading && !videoDataUri && (
                         <Button onClick={handleGenerateVideo}>
                            <Clapperboard className="mr-2 h-4 w-4" />
                            Generate Animation
                        </Button>
                    )}

                    {isLoading && (
                        <div className="flex flex-col items-center justify-center p-8 space-y-4 bg-muted rounded-lg">
                            <Loader2 className="h-12 w-12 animate-spin text-primary" />
                            <p className="text-lg font-medium">Generating your video...</p>
                            <p className="text-sm text-muted-foreground">This can take up to a minute. Please don't navigate away.</p>
                        </div>
                    )}

                    {videoDataUri && (
                        <div className="space-y-4">
                            <video controls autoPlay loop className="w-full rounded-lg shadow-lg" key={videoDataUri}>
                                <source src={videoDataUri} type="video/mp4" />
                                Your browser does not support the video tag.
                            </video>
                             <Button onClick={handleDownload}>
                                <Download className="mr-2 h-4 w-4" />
                                Download Video
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </AppShell>
    );
}
