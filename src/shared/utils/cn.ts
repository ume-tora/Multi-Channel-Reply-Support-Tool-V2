import { type ClassValue, clsx } from 'clsx';

/**
 * Utility function to merge class names
 * Combines clsx for conditional classes with Tailwind merge for better performance
 */
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}