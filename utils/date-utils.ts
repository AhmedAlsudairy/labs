import { Frequency } from "@/types";
import { addDays, addWeeks, addMonths, addYears } from "date-fns";

export function calculateNextDate(frequency: Frequency, currentDate: Date = new Date()): Date {
  const date = new Date(currentDate);
  
  switch (frequency) {
    case 'daily':
      return addDays(date, 1);
    case 'weekly':
      return addDays(date, 7);
    case 'biweekly':
      return addDays(date, 14);
    case 'monthly':
      return addMonths(date, 1);
    case 'bimonthly':
      return addMonths(date, 2);
    case 'quarterly':
      return addMonths(date, 3);
    case 'biannual':
      return addMonths(date, 6);
    case 'annually':
      return addYears(date, 1);
    default:
      return date;
  }
}
