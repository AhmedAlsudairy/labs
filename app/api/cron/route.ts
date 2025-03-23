import { NextResponse } from 'next/server';
import { updateAllSchedules } from '@/actions/admin/scheduleUpdates';

// Cron job runs every 6 hours (at 00:00, 06:00, 12:00, and 18:00)
// Cron schedule: 0 */6 * * *

/**
 * Endpoint for schedule updates, called by Vercel Cron Jobs
 * This handles the automatic updating of maintenance, calibration, and external control schedules
 * It updates the states based on date calculations and handles notifications
 */
export async function GET() {
  console.log(`Cron job started at ${new Date().toISOString()}`);
  
  try {
    // Execute all schedule updates and get detailed results
    const results = await updateAllSchedules();
    
    // Log success or failure details
    if (results.overallSuccess) {
      console.log('Cron job completed successfully');
      console.log(`Maintenance updates: ${results.maintenance?.updatedCount || 0} schedules updated`);
      console.log(`Calibration updates: ${results.calibration?.updatedCount || 0} schedules updated`);
      console.log(`External control updates: ${results.externalControl?.updatedCount || 0} controls updated`);
    } else {
      console.error('Cron job completed with errors:', results.errors);
    }
    
    return NextResponse.json({ 
      success: results.overallSuccess, 
      message: results.overallSuccess ? 'Schedules updated successfully' : 'Some schedule updates failed',
      timestamp: new Date().toISOString(),
      executionTime: {
        startTime: results.startTime,
        endTime: results.endTime,
        durationMs: new Date(results.endTime).getTime() - new Date(results.startTime).getTime()
      },
      statistics: {
        maintenance: {
          updated: results.maintenance?.updatedCount || 0,
          failed: results.maintenance?.failedCount || 0
        },
        calibration: {
          updated: results.calibration?.updatedCount || 0,
          failed: results.calibration?.failedCount || 0
        },
        externalControl: {
          updated: results.externalControl?.updatedCount || 0,
          failed: results.externalControl?.failedCount || 0
        }
      },
      errors: results.errors.length > 0 ? results.errors : undefined
    });
  } catch (error) {
    console.error('Fatal error updating schedules:', error);
    
    // Send detailed error response
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to update schedules', 
        error: {
          message: (error as Error).message,
          stack: process.env.NODE_ENV === 'development' ? (error as Error).stack : undefined
        },
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
