import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { adminFetchAlerts, adminMarkOrdersSeen } from '../../api';
import { useLive, useToast } from './AdminUI';

const AlertsContext = createContext({ unseen: 0, outOfStock: [], markSeen: () => {} });

export const useAlerts = () => useContext(AlertsContext);

export function AlertsProvider({ children }) {
  const toast = useToast();
  const [unseen, setUnseen] = useState(0);
  const [outOfStock, setOutOfStock] = useState([]);
  const known = useRef(null);

  const refresh = useCallback(() => {
    adminFetchAlerts()
      .then((res) => {
        setUnseen(res.unseenOrders);
        setOutOfStock(res.outOfStock);
        const ids = new Set(res.outOfStock.map((p) => p.id));
        if (known.current) {
          res.outOfStock
            .filter((p) => !known.current.has(p.id))
            .forEach((p) => toast(`${p.name} is now out of stock.`, 'error'));
        }
        known.current = ids;
      })
      .catch(() => {});
  }, [toast]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const markSeen = useCallback(() => {
    adminMarkOrdersSeen()
      .then(() => setUnseen(0))
      .catch(() => {});
  }, []);

  useLive(['products', 'orders', 'order:new'], (event) => {
    if (event.type === 'order:new') toast(`New order ${event.order_id} has been placed.`);
    refresh();
  });

  return (
    <AlertsContext.Provider value={{ unseen, outOfStock, markSeen }}>{children}</AlertsContext.Provider>
  );
}

export function StockReminder() {
  const { outOfStock } = useAlerts();
  const navigate = useNavigate();
  if (outOfStock.length === 0) return null;
  const shown = outOfStock.slice(0, 3);
  const more = outOfStock.length - shown.length;

  return (
    <div role="alert" className="admin-fade mb-4 flex flex-wrap items-center gap-3 border border-[#B3261E]/40 bg-red-50 px-4 py-3 text-sm text-[#8C1D18]">
      <AlertTriangle className="h-5 w-5 shrink-0 stroke-[1.5]" />
      <p className="min-w-0 flex-1">
        <strong>{shown.map((p) => p.name).join(', ')}</strong>
        {more > 0 && ` and ${more} more`} {outOfStock.length === 1 ? 'is' : 'are'} out of stock.
      </p>
      <button
        type="button"
        onClick={() => navigate('/admin/products')}
        className="border border-[#B3261E] px-3 py-1.5 text-xs uppercase tracking-wider transition-colors hover:bg-[#B3261E] hover:text-white"
      >
        Adjust stock
      </button>
    </div>
  );
}
