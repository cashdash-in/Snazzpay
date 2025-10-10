
import { NextResponse } from 'next/server';
import { getDocument, saveDocument } from '@/services/firestore';
import { format } from 'date-fns';

type AnalyticsEvent = 'secureCodClick' | 'magazineVisit' | 'secureCodSessionStart' | 'magazineSessionStart' | 'sessionEnd';

export async function POST(request: Request) {
    try {
        const { event, type }: { event: AnalyticsEvent; type?: 'secure' | 'magazine' } = await request.json();

        if (!event) {
            return NextResponse.json({ error: 'Event name is required.' }, { status: 400 });
        }
        
        const today = format(new Date(), 'yyyy-MM-dd');
        const docRef = `analytics/${today}`;

        const currentStats = await getDocument<any>(docRef.split('/')[0], docRef.split('/')[1]) || {
            secureCodClicks: 0,
            magazineVisits: 0,
            secureCodActiveSessions: 0,
            magazineActiveSessions: 0
        };

        const updateData: any = {};

        switch (event) {
            case 'secureCodClick':
                updateData.secureCodClicks = (currentStats.secureCodClicks || 0) + 1;
                break;
            case 'magazineVisit':
                updateData.magazineVisits = (currentStats.magazineVisits || 0) + 1;
                break;
            case 'secureCodSessionStart':
                updateData.secureCodActiveSessions = (currentStats.secureCodActiveSessions || 0) + 1;
                break;
            case 'magazineSessionStart':
                 updateData.magazineActiveSessions = (currentStats.magazineActiveSessions || 0) + 1;
                break;
            case 'sessionEnd':
                if (type === 'secure') {
                    updateData.secureCodActiveSessions = Math.max(0, (currentStats.secureCodActiveSessions || 0) - 1);
                } else if (type === 'magazine') {
                    updateData.magazineActiveSessions = Math.max(0, (currentStats.magazineActiveSessions || 0) - 1);
                }
                break;
            default:
                return NextResponse.json({ error: 'Invalid event name.' }, { status: 400 });
        }
        
        await saveDocument('analytics', { ...currentStats, ...updateData }, today);

        return NextResponse.json({ success: true, message: `Event '${event}' tracked.` });

    } catch (error: any) {
        console.error("--- Analytics Tracking Error ---", error);
        return NextResponse.json({ error: `Failed to track event: ${error.message}` }, { status: 500 });
    }
}
