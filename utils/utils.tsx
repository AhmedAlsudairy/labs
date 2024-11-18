import { Frequency, maintanace_state } from "@/types";
import { redirect } from "next/navigation";

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

export function calculateNextDate( frequency: Frequency,currentDate?: string | Date): string {
  // Handle optional currentDate parameter
  const date = currentDate 
    ? new Date(currentDate) 
    : new Date();
  
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
      return currentDate ? new Date(currentDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
  }
  
  return date.toISOString().split('T')[0];
}


export const getStateBackgroundColor = (state: maintanace_state) => {
  switch (state) {
    case 'done':
      return 'bg-green-100 dark:bg-green-900';
    case 'need maintance':
      return 'bg-yellow-100 dark:bg-yellow-900';
    case 'late maintance':
      return 'bg-red-100 dark:bg-red-900';
    default:
      return '';
  }
};