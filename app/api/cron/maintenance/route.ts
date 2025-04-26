import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Mark this route as dynamic to prevent static prerendering
export const dynamic = 'force-dynamic';

// Set a longer duration for this route
export const maxDuration = 300; // 5 minutes

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Helper functions moved from scheduleUpdates.ts for maintenance
type MaintenanceState = 'done' | 'need maintance' | 'late maintance';

function determineMaintenanceState(nextDate: Date): MaintenanceState {
  if (!nextDate || isNaN(nextDate.getTime())) {
    return 'need maintance';
  }

  const today = new Date();
  const daysDiff = (nextDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
  
  if (daysDiff < -2) {
    return 'late maintance';
  } else if (daysDiff <= 0) {
    return 'need maintance';
  }
  return 'done';
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
      date.setMonth(date.getMonth() + 1);  // Default to monthly
  }
  
  return date;
}

// API route handler for maintenance schedule updates
export async function GET() {
  console.log('[Maintenance Cron] Starting at', new Date().toISOString());
  
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
      console.log(`[Maintenance Cron] Processing batch of ${BATCH_SIZE}, processed ${totalProcessed} so far`);
      
      // Get a batch of records
      const { data: schedules, error } = await supabase
        .from('maintenance_schedule')
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
        console.error('[Maintenance Cron] Error fetching schedules:', error);
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
              (schedule.state === 'need maintance' || schedule.state === 'late maintance')) {
            continue;
          }
          
          const nextDate = new Date(schedule.next_date);
          const state = determineMaintenanceState(nextDate);
          const previousState = schedule.state;
          
          // Update if automatic or state is 'done'
          let newNextDate = schedule.next_date;
          if (schedule.updated_by !== 'manual' || state === 'done') {
            if (state === 'done') {
              // Calculate next date
              const baseDate = new Date();
              baseDate.setHours(12, 0, 0, 0);
              const nextDateObj = calculateNextDate(baseDate, schedule.frequency);
              newNextDate = nextDateObj.toISOString().split('T')[0];
            }
            
            // Update schedule
            const { error: updateError } = await supabase
              .from('maintenance_schedule')
              .update({
                next_date: newNextDate,
                state: state,
                last_updated: new Date().toISOString(),
                updated_by: 'automatic'
              })
              .eq('schedule_id', schedule.schedule_id);
              
            if (updateError) {
              console.error('[Maintenance Cron] Update error:', updateError);
              failedCount++;
              continue;
            }
            
            // Create history record
            await supabase
              .from('equipment_history')
              .insert({
                schedule_id: schedule.schedule_id,
                performed_date: new Date().toISOString(),
                completed_date: new Date().toISOString(),
                state: state,
                description: `Maintenance schedule state changed from ${previousState} to ${state}`,
                work_performed: state === 'done' ? 'Automatic maintenance completion' : '',
                next_maintenance_date: newNextDate
              });
              
            updatedCount++;
          }
        } catch (error) {
          console.error('[Maintenance Cron] Error processing schedule:', error);
          failedCount++;
        }
      }
    }
    
    console.log(`[Maintenance Cron] Completed: processed ${totalProcessed}, updated ${updatedCount}, failed ${failedCount}`);
    
    return NextResponse.json({
      success: true,
      processed: totalProcessed,
      updatedCount,
      failedCount,
      notificationsSent,
      notificationsFailed
    });
    
  } catch (error) {
    console.error('[Maintenance Cron] Unexpected error:', error);
    return NextResponse.json({ 
      success: false, 
      error: (error as Error).message 
    }, { status: 500 });
  }
}
