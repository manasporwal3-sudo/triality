
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Computes the standardized order status key based on time elapsed since creation.
 * Returns: 'placed' | 'preparing' | 'out_for_delivery' | 'delivered'
 */
export function computeOrderStatus(createdAt: any): string {
  if (!createdAt) return "placed";
  
  // Handle Firestore Timestamp or ISO string
  const createdDate = createdAt.toDate ? createdAt.toDate() : new Date(createdAt);
  const now = new Date();
  const diffInMinutes = (now.getTime() - createdDate.getTime()) / (1000 * 60);

  if (diffInMinutes < 1) return "placed";
  if (diffInMinutes < 15) return "preparing";
  if (diffInMinutes < 25) return "out_for_delivery";
  return "delivered";
}

/**
 * Maps standardized status keys to human-readable display labels.
 */
export const STATUS_LABELS: Record<string, string> = {
  placed: "Order Placed",
  preparing: "Preparing Food",
  out_for_delivery: "Out for Delivery",
  delivered: "Delivered"
};
