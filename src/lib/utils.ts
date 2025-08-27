
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function sanitizePhoneNumber(phone: string): string {
  if (!phone) return '';
  // Remove all characters that are not digits
  const digitsOnly = phone.replace(/\D/g, '');

  // If the number starts with '91' and has 12 digits, it's likely correct
  if (digitsOnly.startsWith('91') && digitsOnly.length === 12) {
    return digitsOnly;
  }
  
  // If the number is 10 digits long, it's a standard Indian mobile number. Prepend '91'.
  if (digitsOnly.length === 10) {
    return `91${digitsOnly}`;
  }

  // Fallback for any other case (e.g., already formatted, or different country code)
  // This will return the cleaned number, which may or may not be valid for WhatsApp,
  // but it's the best guess we can make.
  return digitsOnly;
}
