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

// Helper functions for external control
type ExternalControlState = 'Done' | 'Final Date' | 'E.Q.C Reception';

function determineExternalControlState(nextDate: Date): ExternalControlState {
  if (!nextDate || isNaN(nextDate.getTime())) {
    return 'E.Q.C Reception';
  }
  
  const today = new Date();
  const daysDiff = (nextDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
  
  if (daysDiff < 0) {
    return 'E.Q.C Reception'; // Red - Late
  } else if (daysDiff <= 7) {
    return 'Final Date'; // Yellow - In date but close
  }
  return 'Done'; // Green - In date
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

// API route handler for external control schedule updates
export async function GET() {
  console.log('[External Control Cron] Starting at', new Date().toISOString());
  
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
      console.log(`[External Control Cron] Processing batch of ${BATCH_SIZE}, processed ${totalProcessed} so far`);
      
      // Get a batch of records
      const { data: controls, error } = await supabase
        .from('external_control')
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
        console.error('[External Control Cron] Error fetching controls:', error);
        return NextResponse.json({ 
          success: false, 
          error: error.message,
          processed: totalProcessed,
          updated: updatedCount,
          failed: failedCount
        }, { status: 500 });
      }
      
      // If no more records, exit loop
      if (!controls || controls.length === 0) {
        hasMore = false;
        break;
      }
      
      // Track batch progress
      totalProcessed += controls.length;
      
      // If fewer records than batch size, this is last batch
      if (controls.length < BATCH_SIZE) {
        hasMore = false;
      }
      
      // Process each control in the batch
      for (const control of controls) {
        try {
          // Skip if manual update in specific states
          if (control.updated_by === 'manual' && 
              (control.state === 'E.Q.C Reception')) {
            continue;
          }
          
          // Get next date - may be in control.next_date field
          const nextDate = control.next_date ? new Date(control.next_date) : new Date();
          const state = determineExternalControlState(nextDate);
          const previousState = control.state;
          
          // Only update if state would change or it's an automatic update
          if (state !== previousState || control.updated_by !== 'manual') {
            let newNextDate = control.next_date;
            
            // If state is 'Done', calculate next date
            if (state === 'Done') {
              const baseDate = new Date();
              baseDate.setHours(12, 0, 0, 0);
              const nextDateObj = calculateNextDate(baseDate, control.frequency || 'monthly');
              newNextDate = nextDateObj.toISOString().split('T')[0];
            }
            
            // Check if record has control_id or id
            const idField = control.control_id ? 'control_id' : 'id';
            const controlId = control.control_id || control.id;
            
            if (!controlId) {
              console.warn(`[External Control Cron] Control missing ID, skipping`);
              continue;
            }
            
            // Update the external control record
            const { error: updateError } = await supabase
              .from('external_control')
              .update({
                state: state,
                next_date: newNextDate,
                last_updated: new Date().toISOString(),
                updated_by: 'automatic'
              })
              .eq(idField, controlId);
              
            if (updateError) {
              console.error(`[External Control Cron] Error updating control ${controlId}:`, updateError);
              failedCount++;
              continue;
            }
            
            // Create a history record
            const historyData = {
              control_id: controlId,
              performed_date: new Date().toISOString(),
              completed_date: new Date().toISOString(),
              state: state.toLowerCase(),
              external_control_state: state,
              description: `External control state changed from ${previousState || 'undefined'} to ${state}`,
              technician_notes: 'Automatic update by system',
              work_performed: state === 'Done' ? 'Automatic completion' : 'State update',
              parts_used: '',
              next_date: newNextDate,
              frequency: control.frequency || 'monthly'
            };
            
            const { error: historyError } = await supabase
              .from('equipment_history')
              .insert(historyData);
              
            if (historyError) {
              console.error(`[External Control Cron] Error creating history for control ${controlId}:`, historyError);
              // We continue even if history creation fails
            }
            
            updatedCount++;
          }
        } catch (error) {
          console.error('[External Control Cron] Error processing control:', error);
          failedCount++;
        }
      }
    }
    
    console.log(`[External Control Cron] Completed: processed ${totalProcessed}, updated ${updatedCount}, failed ${failedCount}`);
    
    return NextResponse.json({
      success: true,
      processed: totalProcessed,
      updatedCount,
      failedCount,
      notificationsSent,
      notificationsFailed
    });
    
  } catch (error) {
    console.error('[External Control Cron] Unexpected error:', error);
    return NextResponse.json({ 
      success: false, 
      error: (error as Error).message 
    }, { status: 500 });
  }
}
