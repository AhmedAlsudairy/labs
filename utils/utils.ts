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