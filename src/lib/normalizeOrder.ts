/**
 * Standardizes order data across the application.
 * Handles legacy fields and ensures critical fields like totalAmount and items exist.
 */
export const normalizeOrder = (order: any) => {
  if (!order) return null;

  const items = Array.isArray(order.items) ? order.items : [];

  // Derive totalAmount from legacy "total" field or calculate from items if missing
  const derivedTotal = order.totalAmount || order.total || items.reduce((sum: number, item: any) => {
    const price = Number(item.price) || 0;
    const qty = Number(item.quantity) || 1;
    return sum + (price * qty);
  }, 0);

  return {
    ...order,
    id: order.id,
    orderId: order.orderId || order.id,
    totalAmount: Number(derivedTotal) || 0,
    items,
    userId: order.userId || '',
    userEmail: order.userEmail || '',
    status: order.status || 'placed',
    createdAt: order.createdAt,
    deliveryDetails: order.deliveryDetails || {},
    isCancelled: !!order.isCancelled,
    cancelledAt: order.cancelledAt,
    refundInitiated: !!order.refundInitiated,
    refundInitiatedAt: order.refundInitiatedAt,
    refundCompleted: !!order.refundCompleted,
    paymentMethod: order.paymentMethod || 'COD',
    paymentStatus: order.paymentStatus || 'pending',
    isRated: !!order.isRated,
    ratings: order.ratings || { taste: 0, packaging: 0, delivery: 0 },
    reviewText: order.reviewText || '',
    ratedAt: order.ratedAt
  };
};
