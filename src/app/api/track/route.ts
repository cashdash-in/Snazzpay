
import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, setDoc, increment } from 'firebase/firestore';
import { format } from 'date-fns';

type AnalyticsEvent = 
    | 'secureCodClick' 
    | 'magazineVisit' 
    | 'secureCodSessionStart' 
    | 'magazineSessionStart' 
    | 'sessionEnd'
    | 'tryOnAttempt'
    | 'tryOnSuccess'
    | 'geneeOpen'
    | 'geneeSearch'
    | 'geneeCartAdd';

export async function POST(request: Request) {
    try {
        const { event, type }: { event: AnalyticsEvent; type?: string } = await request.json();

        if (!event) {
            return NextResponse.json({ error: 'Event name is required.' }, { status: 400 });
        }
        
        const dateString = format(new Date(), 'yyyy-MM-dd');
        const analyticsDocRef = doc(db, 'analytics', dateString);

        // Map events to counter field names
        const fieldMap: Record<AnalyticsEvent, string> = {
            secureCodClick: 'secureCodClicks',
            magazineVisit: 'magazineVisits',
            secureCodSessionStart: 'secureCodActiveSessions',
            magazineSessionStart: 'magazineActiveSessions',
            sessionEnd: type === 'secure' ? 'secureCodActiveSessions' : 'magazineActiveSessions',
            tryOnAttempt: 'tryOnAttempts',
            tryOnSuccess: 'tryOnSuccesses',
            geneeOpen: 'geneeOpens',
            geneeSearch: 'geneeSearches',
            geneeCartAdd: 'geneeCartAdds'
        };

        const fieldName = fieldMap[event];
        const incrementValue = event === 'sessionEnd' ? -1 : 1;

        await setDoc(analyticsDocRef, {
            [fieldName]: increment(incrementValue),
            lastUpdated: new Date().toISOString()
        }, { merge: true });

        return NextResponse.json({ success: true, message: `Event '${event}' tracked.` });

    } catch (error: any) {
        console.error("--- Analytics Tracking Error ---", error);
        return NextResponse.json({ error: `Failed to track event: ${error.message}` }, { status: 500 });
    }
}
