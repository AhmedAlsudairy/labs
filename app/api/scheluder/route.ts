import { NextResponse } from 'next/server';
import { updateAllSchedules } from '@/actions/admin/scheduleUpdates';

// Cron job runs every 6 hours (at 00:00, 06:00, 12:00, and 18:00)
// Cron schedule: 0 */6 * * *
export const maxDuration = 300; // 5-minute timeout
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// This endpoint can be called by a cron job service like Vercel Cron Jobs
export async function GET() {
  try {
    await updateAllSchedules();
    return NextResponse.json({ 
      success: true, 
      message: 'Schedules updated successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error updating schedules:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to update schedules', 
        error,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
