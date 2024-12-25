'use server';

import { ExternalControlHistory } from "@/types";
import { updateExternalControlSchedules } from "./scheduleUpdates";
import { sendEmail } from "@/utils/resend/email";
import { getLaboratoryById } from "./lab";
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

// Helper function to filter out undefined emails
function filterValidEmails(emails: (string | undefined)[]): string[] {
  return emails.filter((email): email is string => !!email);
}

function isValidManagerId(id: string | undefined): id is string {
  return id !== undefined && id !== '';
}

// Get history by external control ID
export async function getHistoryByExternalControlId(externalControlId: number) {
  const { data, error } = await supabase
    .from('external_control_history')
    .select(`
      *,
      external_control:external_control_id (
        equipment_id,
        description
      )
    `)
    .eq('external_control_id', externalControlId)
    .order('performed_date', { ascending: false });

  if (error) return { error };
  return { data };
}

// Add external control history
export async function addExternalControlHistory(
  data: Omit<ExternalControlHistory, 'history_id' | 'created_at' | 'updated_at'>,
  lab_id: number,
  equipment_id: number
) {
  // Insert history record
  const { data: result, error } = await supabase
    .from('external_control_history')
    .insert([{
      ...data,
      created_at: new Date(),
      updated_at: new Date()
    }])
    .select()
    .single();

  if (error) return { error };

  // Update external control with new state and next date
  const { error: updateError } = await supabase
    .from('external_control')
    .update({
      state: data.external_control_state,
      next_date: data.next_date,
      last_updated: new Date().toISOString()
    })
    .eq('control_id', data.external_control_id);

  if (updateError) {
    console.error('Error updating external control:', updateError);
    throw updateError;
  }

  // Get lab details for email notification
  const lab = await getLaboratoryById(lab_id);
  if (!lab) throw new Error('Laboratory not found');

  // Send email notifications
  const emailAddresses = filterValidEmails([
    lab.manager_email,
    lab.biomedical_email,
    lab.company_engineer_email
  ]);

  if (emailAddresses.length > 0) {
    const emailSubject = `External Control Status Update: ${data.external_control_state}`;
    const emailContent = `
      External Control Status has been updated:
      State: ${data.external_control_state}
      Next Date: ${data.next_date}
      Description: ${data.description}
      Work Performed: ${data.work_performed || 'N/A'}
      Parts Used: ${data.parts_used || 'N/A'}
      Technician Notes: ${data.technician_notes || 'N/A'}
    `;

    await sendEmail({
      to: emailAddresses,
      subject: emailSubject,
      text: emailContent,
    });
  }

  // Update schedules
  await updateExternalControlSchedules(equipment_id);

  return { data: result };
}

// Update external control history
export async function updateExternalControlHistory(
  historyId: number,
  updates: Partial<Omit<ExternalControlHistory, 'history_id' | 'created_at'>>
) {
  const { data, error } = await supabase
    .from('external_control_history')
    .update({
      ...updates,
      updated_at: new Date()
    })
    .eq('history_id', historyId)
    .select()
    .single();

  if (error) return { error };
  return { data };
}

// Delete external control history
export async function deleteExternalControlHistory(historyId: number) {
  const { error } = await supabase
    .from('external_control_history')
    .delete()
    .eq('history_id', historyId);

  if (error) return { error };
  return { success: true };
}

// Get single external control history record
export async function getExternalControlHistoryById(historyId: number) {
  const { data, error } = await supabase
    .from('external_control_history')
    .select('*')
    .eq('history_id', historyId)
    .single();

  if (error) return { error };
  return { data };
}
