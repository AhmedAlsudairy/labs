import { Frequency, maintanace_state } from "@/types";
import { redirect } from "next/navigation";
import { addDays, addWeeks, addMonths, addYears } from "date-fns";

/**
 * Redirects to a specified path with an encoded message as a query parameter.
 * @param {('error' | 'success')} type - The type of message, either 'error' or 'success'.
 * @param {string} path - The path to redirect to.
 * @param {string} message - The message to be encoded and added as a query parameter.
 * @returns {never} This function doesn't return as it triggers a redirect.
 */
export function encodedRedirect(
  type: "error" | "success",
  path: string,
  message: string,
) {
  return redirect(`${path}?${type}=${encodeURIComponent(message)}`);
}


export const formatDeviceAge = (receiptDate: Date, currentDate: Date) => {
  const diffYears = currentDate.getFullYear() - receiptDate.getFullYear();
  const diffMonths = currentDate.getMonth() - receiptDate.getMonth();
  
  if (diffYears > 0) {
    return `${diffYears} year${diffYears > 1 ? 's' : ''}`;
  } else if (diffMonths > 0) {
    return `${diffMonths} month${diffMonths > 1 ? 's' : ''}`;
  } else {
    const diffDays = Math.floor((currentDate.getTime() - receiptDate.getTime()) / (1000 * 60 * 60 * 24));
    return `${diffDays} day${diffDays > 1 ? 's' : ''}`;
  }
};

// Ensure this has the same signature as date-utils.ts version for consistency
export function calculateNextDate(frequency: Frequency, currentDate: Date = new Date()): Date {
  // Use the implementation from date-utils.ts for consistency
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

// export const getStateBackgroundColor = (state: maintanace_state) => {
//   switch (state) {
//     case 'done':
//       return 'bg-green-100 dark:bg-green-900';
//     case 'need maintance':
//       return 'bg-yellow-100 dark:bg-yellow-900';
//     case 'late maintance':
//       return 'bg-red-100 dark:bg-red-900';
//     default:
//       return '';
//   }
// };