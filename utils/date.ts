import { Frequency } from "@/types";
import { addDays, addWeeks, addMonths, addYears } from "date-fns";

export function calculateNextDate(frequency: Frequency, currentDate: Date): Date {
  switch (frequency) {
    case 'daily':
      return addDays(currentDate, 1);
    case 'weekly':
      return addDays(currentDate, 7);
    case 'biweekly':
      return addDays(currentDate, 14);
    case 'monthly':
      return addMonths(currentDate, 1);
    case 'bimonthly':
      return addMonths(currentDate, 2);
    case 'quarterly':
      return addMonths(currentDate, 3);
    case 'biannual':
      return addMonths(currentDate, 6);
    case 'annually':
      return addYears(currentDate, 1);
    default:
      return currentDate;
  }
}
