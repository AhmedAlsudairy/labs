import { createClient } from '@supabase/supabase-js';
import { addDays, addWeeks, addMonths, addYears } from 'date-fns';
import { sendEmail } from '@/utils/resend/email';
import { EquipmentHistory } from '@/types';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
