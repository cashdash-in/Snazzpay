import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function sanitizePhoneNumber(phone: string): string {
  if (!phone) return '';
  // Remove all non-digit characters
  let sanitized = phone.replace(/\D/g, '');
  // If the number is 10 digits long and doesn't start with 91, prepend 91 (for India)
  if (sanitized.length === 10 && !sanitized.startsWith('91')) {
    sanitized = `91${sanitized}`;
  }
  // If number includes 91 but is 12 digits long, it's correct.
  // If it's longer than 12 (e.g. includes other country codes), we might need more complex logic,
  // but for now, we'll assume Indian numbers.
  return sanitized;
}
