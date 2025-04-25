import { NextResponse } from 'next/server';
import { updateAllSchedules } from '@/actions/admin/scheduleUpdates';

// Helper function to get a date normalized to noon (12:00:00)
// This helps debug date calculation issues related to timezone handling
function getNormalizedNoonDate(): Date {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  return date;
}

// Cron job runs every 6 hours (at 00:00, 06:00, 12:00, and 18:00)
// Cron schedule: 0 */6 * * *

/**
 * Endpoint for schedule updates, called by Vercel Cron Jobs
 * This handles the automatic updating of maintenance, calibration, and external control schedules
 * It updates the states based on date calculations and handles notifications
 */
export async function GET() {
  // Check if this is a build-time static generation call
  // During build time, we want to return a simple response without actually running any operations
  if (process.env.VERCEL_ENV === 'production' && process.env.NEXT_PHASE === 'phase-production-build') {
    console.log('Build-time static generation detected. Skipping actual cron execution.');
    return NextResponse.json({ 
      success: true, 
      message: 'This is a static build response. The actual cron job will run at runtime.',
      timestamp: new Date().toISOString()
    });
  }
  
  console.log(`===== CRON JOB DEBUG =====${new Date().toISOString()}=====`);
  console.log(`[Cron Debug] Environment: ${process.env.NODE_ENV || 'not set'}`);
  console.log(`[Cron Debug] Website URL: ${process.env.NEXT_PUBLIC_WEBSITE_URL || 'not set'}`);
  console.log(`[Cron Debug] Timezone: ${Intl.DateTimeFormat().resolvedOptions().timeZone}`);
  console.log(`[Cron Debug] Current time: ${new Date().toString()}`);
  console.log(`[Cron Debug] Current date ISO: ${new Date().toISOString()}`);
  console.log(`[Cron Debug] Current date local: ${new Date().toLocaleString()}`);
  console.log(`[Cron Debug] Normalized noon date: ${getNormalizedNoonDate().toISOString()}`);
  console.log(`===== END ENVIRONMENT INFO =====`);
  
  try {
    console.log(`[Cron Debug] Starting updateAllSchedules() call`);
    // Execute all schedule updates and get detailed results
    const results = await updateAllSchedules();
    console.log(`[Cron Debug] updateAllSchedules() completed with status: ${results.overallSuccess ? 'SUCCESS' : 'FAILURE'}`);
    
    // Enhanced logging to debug notification issues
    console.log(`[Notification Debug] ===== NOTIFICATION ANALYSIS =====`);
    console.log(`[Notification Debug] Maintenance notifications sent: ${results.maintenance?.notificationsSent || 0}`);
    console.log(`[Notification Debug] Calibration notifications sent: ${results.calibration?.notificationsSent || 0}`);
    console.log(`[Notification Debug] External control notifications sent: ${results.externalControl?.notificationsSent || 0}`);
    
    if ((results.maintenance?.updatedCount || 0) > 0 && (results.maintenance?.notificationsSent || 0) === 0) {
      console.log(`[Notification Debug] Warning: ${results.maintenance?.updatedCount} maintenance records updated but no notifications sent.`);
      console.log(`[Notification Debug] This may be because states didn't change or all updated records were already in 'done' state.`);
    }
    
    if ((results.calibration?.updatedCount || 0) > 0 && (results.calibration?.notificationsSent || 0) === 0) {
      console.log(`[Notification Debug] Warning: ${results.calibration?.updatedCount} calibration records updated but no notifications sent.`);
      console.log(`[Notification Debug] This may be because states didn't change or all updated records were already in 'calibrated' state.`);
    }
    
    if ((results.externalControl?.updatedCount || 0) > 0 && (results.externalControl?.notificationsSent || 0) === 0) {
      console.log(`[Notification Debug] Warning: ${results.externalControl?.updatedCount} external control records updated but no notifications sent.`);
      console.log(`[Notification Debug] This may be because states didn't change or all updated records were already in 'Done' state.`);
    }
    console.log(`[Notification Debug] ===== END NOTIFICATION ANALYSIS =====`);
    
    // Log success or failure details
    if (results.overallSuccess) {
      console.log(`[Cron Debug] Cron job completed successfully`);
      console.log(`[Cron Debug] Maintenance updates: ${results.maintenance?.updatedCount || 0} schedules updated`);
      console.log(`[Cron Debug] Calibration updates: ${results.calibration?.updatedCount || 0} schedules updated`);
      console.log(`[Cron Debug] External control updates: ${results.externalControl?.updatedCount || 0} controls updated`);
      
      // Log any warnings or potential issues
      if (results.maintenance?.failedCount > 0) {
        console.warn(`[Cron Debug] Warning: ${results.maintenance.failedCount} maintenance schedules failed to update`);
      }
      if (results.calibration?.failedCount > 0) {
        console.warn(`[Cron Debug] Warning: ${results.calibration.failedCount} calibration schedules failed to update`);
      }
      if (results.externalControl?.failedCount > 0) {
        console.warn(`[Cron Debug] Warning: ${results.externalControl.failedCount} external controls failed to update`);
      }
    } else {
      console.error(`[Cron Debug] Cron job completed with errors:`, results.errors);
      // Log specific errors by category
      if (results.maintenance?.error) {
        console.error(`[Cron Debug] Maintenance error:`, results.maintenance.error);
      }
      if (results.calibration?.error) {
        console.error(`[Cron Debug] Calibration error:`, results.calibration.error);
      }
      if (results.externalControl?.error) {
        console.error(`[Cron Debug] External control error:`, results.externalControl.error);
      }
    }
    
    // Gather email notification details if available
    const emailDetails = {
      maintenance: results.maintenance?.notificationsSent || 0,
      calibration: results.calibration?.notificationsSent || 0,
      externalControl: results.externalControl?.notificationsSent || 0,
      failed: results.maintenance?.notificationsFailed || 0 + 
              results.calibration?.notificationsFailed || 0 + 
              results.externalControl?.notificationsFailed || 0
    };

    // Add email debugging information to response
    const emailDebugInfo = {
      smtp: process.env.SMTP_PASSWORD ? 'Configured' : 'Not configured',
      emailServer: 'lablaboman.live',
      fromAddress: 'noreplay@lablaboman.live',
      testRecipient: 'micronboy632@gmail.com'
    };
    
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
          failed: results.maintenance?.failedCount || 0,
          notificationsSent: results.maintenance?.notificationsSent || 0,
          notificationsFailed: results.maintenance?.notificationsFailed || 0
        },
        calibration: {
          updated: results.calibration?.updatedCount || 0,
          failed: results.calibration?.failedCount || 0,
          notificationsSent: results.calibration?.notificationsSent || 0,
          notificationsFailed: results.calibration?.notificationsFailed || 0
        },
        externalControl: {
          updated: results.externalControl?.updatedCount || 0,
          failed: results.externalControl?.failedCount || 0,
          notificationsSent: results.externalControl?.notificationsSent || 0,
          notificationsFailed: results.externalControl?.notificationsFailed || 0
        }
      },
      emailSummary: emailDetails,
      emailDebug: emailDebugInfo,
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
