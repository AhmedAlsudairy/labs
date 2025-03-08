import { Frequency, FrequencyEnum } from "@/types";
import { addDays, addWeeks, addMonths, addYears } from "date-fns";

export function calculateNextDate(frequency: Frequency, currentDate: Date = new Date()): Date {
  const date = new Date(currentDate);
  
  switch (frequency) {
    case FrequencyEnum.DAILY:
      return addDays(date, 1);
    case FrequencyEnum.WEEKLY:
      return addDays(date, 7);
    case FrequencyEnum.BIWEEKLY:
      return addDays(date, 14);
    case FrequencyEnum.MONTHLY:
      return addMonths(date, 1);
    case FrequencyEnum.BIMONTHLY:
      return addMonths(date, 2);
    case FrequencyEnum.QUARTERLY:
      return addMonths(date, 3);
    case FrequencyEnum.BIANNUAL:
      return addMonths(date, 6);
    case FrequencyEnum.ANNUALLY:
      return addYears(date, 1);
    default:
      return date;
  }
}
