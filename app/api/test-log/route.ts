import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const LOG_FILE = path.join(process.cwd(), 'test-logs.txt');

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { testId, testName, status, error, duration, timestamp } = body;

        const logLine = JSON.stringify({
            timestamp: timestamp || new Date().toISOString(),
            testId,
            testName,
            status,
            error: error || null,
            duration: duration || null
        }) + '\n';

        // Append to log file
        fs.appendFileSync(LOG_FILE, logLine);

        // Also log to console for real-time monitoring
        const emoji = status === 'passed' ? '✅' : status === 'failed' ? '❌' : status === 'running' ? '🔄' : '⏭️';
        console.log(`${emoji} [TEST] ${testName} - ${status}${error ? `: ${error}` : ''}${duration ? ` (${duration}ms)` : ''}`);

        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('Test log error:', errorMessage);
        return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
    }
}

export async function GET() {
    try {
        if (!fs.existsSync(LOG_FILE)) {
            return NextResponse.json({ logs: [] });
        }

        const content = fs.readFileSync(LOG_FILE, 'utf-8');
        const logs = content
            .split('\n')
            .filter(line => line.trim())
            .map(line => {
                try {
                    return JSON.parse(line);
                } catch {
                    return null;
                }
            })
            .filter(Boolean);

        return NextResponse.json({ logs });
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ logs: [], error: errorMessage });
    }
}

export async function DELETE() {
    try {
        if (fs.existsSync(LOG_FILE)) {
            fs.unlinkSync(LOG_FILE);
        }
        return NextResponse.json({ success: true, message: 'Logs cleared' });
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
    }
}
