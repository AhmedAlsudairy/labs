import { Frequency } from "@/types";
import { addDays, addWeeks, addMonths, addYears } from "date-fns";

export function calculateNextDate(frequency: Frequency, currentDate: Date = new Date()): Date {
  // Normalize date to ensure consistent date calculations regardless of timezone
  // Create a date that's set to the UTC values of the input date to prevent timezone shifts
  let date = new Date(currentDate);
  // Ensure we're getting the date in the correct timezone by setting it to noon
  // This prevents timezone issues causing date to shift backwards
  date.setHours(12, 0, 0, 0);
  
  let result: Date;
  
  switch (frequency) {
    case 'daily':
      result = addDays(date, 1);
      break;
    case 'weekly':
      result = addDays(date, 7);
      break;
    case 'biweekly':
      result = addDays(date, 14);
      break;
    case 'monthly':
      result = addMonths(date, 1);
      break;
    case 'bimonthly':
      result = addMonths(date, 2);
      break;
    case 'quarterly':
      result = addMonths(date, 3);
      break;
    case 'biannual':
      result = addMonths(date, 6);
      break;
    case 'annually':
      result = addYears(date, 1);
      break;
    default:
      result = date;
  }
  
  // Normalize the result date to remove any time components
  // This ensures we get just the date with no timezone adjustments
  result.setHours(12, 0, 0, 0);
  
  return result;
}
