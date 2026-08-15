export interface LiveOrder {
  id: string;
  consumer: string;
  item: string;
  qty: string;
  payout: number;
  time: string;
  status: 'pending' | 'dispatched' | 'delivered';
  deliveryCode?: string;
}

const ORDER_KEY = 'zenvego_live_orders';
const NOTIF_KEY = 'zenvego_order_notification';

function readOrders(): LiveOrder[] {
  try {
    const raw = localStorage.getItem(ORDER_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeOrders(orders: LiveOrder[]) {
  localStorage.setItem(ORDER_KEY, JSON.stringify(orders));
}

export async function publishOrder(order: LiveOrder) {
  const existing = readOrders();
  const idx = existing.findIndex(o => o.id === order.id);
  if (idx !== -1) existing[idx] = order;
  else existing.unshift(order);
  writeOrders(existing);
  localStorage.setItem(NOTIF_KEY, JSON.stringify({ order, ts: Date.now() }));
  window.dispatchEvent(new CustomEvent('zenvego-order-changed', { detail: existing }));
}

export async function fetchOrders(): Promise<LiveOrder[]> {
  return readOrders();
}

export function subscribeToOrders(callback: (orders: LiveOrder[]) => void): () => void {
  fetchOrders().then(callback);

  const interval = setInterval(() => {
    fetchOrders().then(callback);
  }, 5000);

  const onStorage = (e: StorageEvent) => {
    if (e.key === ORDER_KEY || e.key === NOTIF_KEY) {
      fetchOrders().then(callback);
    }
  };
  const onCustom = () => fetchOrders().then(callback);

  window.addEventListener('storage', onStorage);
  window.addEventListener('zenvego-order-changed', onCustom);

  return () => {
    clearInterval(interval);
    window.removeEventListener('storage', onStorage);
    window.removeEventListener('zenvego-order-changed', onCustom);
  };
}

export function getLatestNotification(): { order: LiveOrder; ts: number } | null {
  try {
    const raw = localStorage.getItem(NOTIF_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function seedDefaultOrders() {
  const existing = readOrders();
  if (existing.length === 0) {
    const defaults: LiveOrder[] = [
      { id: 'TXN-09', consumer: 'Sarah Jenkins', item: 'Organic Vine Heirloom Tomatoes', qty: '3 lbs', payout: 14.40, time: '18m ago', status: 'dispatched', deliveryCode: 'ZVG-CONFIRM-902' },
      { id: 'TXN-08', consumer: 'Sarah Jenkins', item: 'Rainbow Heirloom Carrots Bunch', qty: '1 bunch', payout: 3.50, time: '42m ago', status: 'dispatched', deliveryCode: 'ZVG-CONFIRM-811' },
    ];
    writeOrders(defaults);
  }
}
