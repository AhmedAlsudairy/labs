import { NextResponse } from 'next/server';
import { syncMaintenanceSchedulesWithHistory } from '@/actions/admin/scheduleUpdates';

// API handler for manually syncing maintenance schedules with their history records
export async function GET() {
  try {
    console.log('Starting manual sync of maintenance schedules with history');
    
    // Run the sync utility
    const results = await syncMaintenanceSchedulesWithHistory();
    
    // Return the results
    return NextResponse.json({
      success: results.success,
      message: results.success ? 'Maintenance schedules synced with history successfully' : 'Failed to sync some maintenance schedules',
      timestamp: new Date().toISOString(),
      results: {
        updatedCount: results.updatedCount,
        failedCount: results.failedCount,
        updatedSchedules: results.updatedSchedules,
        failedSchedules: results.failedSchedules
      }
    });
  } catch (error) {
    console.error('Error in maintenance history sync API:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to sync maintenance schedules with history',
        error: (error as Error).message,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}