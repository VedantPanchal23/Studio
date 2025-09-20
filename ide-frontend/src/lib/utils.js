// Simple className utility without Tailwind dependencies
export function cn(...inputs) {
  return inputs
    .filter(Boolean)
    .join(' ')
    .trim();
}