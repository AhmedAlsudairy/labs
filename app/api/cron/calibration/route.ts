import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Mark this route as dynamic to prevent static prerendering
export const dynamic = 'force-dynamic';

// Set maximum duration allowed for Hobby plan
export const maxDuration = 60; // 60 seconds (Hobby plan limit)

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Helper functions for calibration
type CalibrationState = 'calibrated' | 'need calibration' | 'late calibration';

function determineCalibrationState(nextDate: Date): CalibrationState {
  if (!nextDate || isNaN(nextDate.getTime())) {
    return 'need calibration';
  }

  const today = new Date();
  const daysDiff = (nextDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
  
  if (daysDiff < 0) {
    return 'late calibration';
  } else if (daysDiff <= 3) { // 3-day warning
    return 'need calibration';
  }
  return 'calibrated';
}

// Calculate next date based on frequency
function calculateNextDate(currentDate: Date, frequency: string): Date {
  const date = new Date(currentDate);
  
  switch (frequency) {
    case 'daily':
      date.setDate(date.getDate() + 1);
      break;
    case 'weekly':
      date.setDate(date.getDate() + 7);
      break;
    case 'biweekly':
      date.setDate(date.getDate() + 14);
      break;
    case 'monthly':
      date.setMonth(date.getMonth() + 1);
      break;
    case 'bimonthly':
      date.setMonth(date.getMonth() + 2);
      break;
    case 'quarterly':
      date.setMonth(date.getMonth() + 3);
      break;
    case 'biannual':
      date.setMonth(date.getMonth() + 6);
      break;
    case 'annually':
      date.setFullYear(date.getFullYear() + 1);
      break;
    default:
      date.setMonth(date.getMonth() + 1); // Default to monthly
  }
  
  return date;
}

// API route handler for calibration schedule updates
export async function GET() {
  console.log('[Calibration Cron] Starting at', new Date().toISOString());
  
  try {
    // Process in smaller batches to avoid timeouts
    const BATCH_SIZE = 20;
    let totalProcessed = 0;
    let hasMore = true;
    let updatedCount = 0;
    let failedCount = 0;
    let notificationsSent = 0;
    let notificationsFailed = 0;
    
    while (hasMore) {
      console.log(`[Calibration Cron] Processing batch of ${BATCH_SIZE}, processed ${totalProcessed} so far`);
      
      // Get a batch of records
      const { data: schedules, error } = await supabase
        .from('calibration_schedule')
        .select(`
          *,
          equipment:equipment_id (
            *,
            device (*),
            laboratory:lab_id (
              *
            )
          )
        `)
        .range(totalProcessed, totalProcessed + BATCH_SIZE - 1);
        
      if (error) {
        console.error('[Calibration Cron] Error fetching schedules:', error);
        return NextResponse.json({ 
          success: false, 
          error: error.message,
          processed: totalProcessed,
          updated: updatedCount,
          failed: failedCount
        }, { status: 500 });
      }
      
      // If no more records, exit loop
      if (!schedules || schedules.length === 0) {
        hasMore = false;
        break;
      }
      
      // Track batch progress
      totalProcessed += schedules.length;
      
      // If fewer records than batch size, this is last batch
      if (schedules.length < BATCH_SIZE) {
        hasMore = false;
      }
      
      // Process each schedule in the batch
      for (const schedule of schedules) {
        try {
          // Skip if manual update in specific states
          if (schedule.updated_by === 'manual' && 
              (schedule.state === 'need calibration' || schedule.state === 'late calibration')) {
            continue;
          }
          
          const nextDate = new Date(schedule.next_date);
          const state = determineCalibrationState(nextDate);
          const previousState = schedule.state;
          
          // Update if automatic or state is 'calibrated'
          let newNextDate = schedule.next_date;
          if (schedule.updated_by !== 'manual' || state === 'calibrated') {
            if (state === 'calibrated') {
              // Calculate next date
              const baseDate = new Date();
              baseDate.setHours(12, 0, 0, 0);
              const nextDateObj = calculateNextDate(baseDate, schedule.frequency);
              newNextDate = nextDateObj.toISOString().split('T')[0];
            }
            
            // Update schedule
            const { error: updateError } = await supabase
              .from('calibration_schedule')
              .update({
                next_date: newNextDate,
                state: state,
                last_updated: new Date().toISOString(),
                updated_by: 'automatic'
              })
              .eq('calibration_schedule_id', schedule.calibration_schedule_id);
              
            if (updateError) {
              console.error('[Calibration Cron] Update error:', updateError);
              failedCount++;
              continue;
            }
            
            // Create history record
            await supabase
              .from('equipment_history')
              .insert({
                calibration_schedule_id: schedule.calibration_schedule_id,
                performed_date: new Date().toISOString(),
                completed_date: new Date().toISOString(),
                state: state,
                description: `Calibration schedule state changed from ${previousState} to ${state}`,
                calibration_results: state === 'calibrated' ? 'Automatic calibration completion' : '',
                next_calibration_date: newNextDate
              });
              
            updatedCount++;
          }
        } catch (error) {
          console.error('[Calibration Cron] Error processing schedule:', error);
          failedCount++;
        }
      }
    }
    
    console.log(`[Calibration Cron] Completed: processed ${totalProcessed}, updated ${updatedCount}, failed ${failedCount}`);
    
    return NextResponse.json({
      success: true,
      processed: totalProcessed,
      updatedCount,
      failedCount,
      notificationsSent,
      notificationsFailed
    });
    
  } catch (error) {
    console.error('[Calibration Cron] Unexpected error:', error);
    return NextResponse.json({ 
      success: false, 
      error: (error as Error).message 
    }, { status: 500 });
  }
}
