import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ChevronLeft, ChevronRight, X, FileSpreadsheet, FileText } from 'lucide-react';
import { adminFetchOrders, adminFetchYears, adminUpdateOrderStatus } from '../../api';
import { ConfirmModal, ReasonDialog, SlidingTabs, useLive, useToast } from './AdminUI';
import { useAlerts } from './AdminAlerts';
import { ProductModal, money } from './ProductSummary';

const tabs = [
  { label: 'Pending', status: 'Pending' },
  { label: 'Processing', status: 'Processing' },
  { label: 'Out for Delivery', status: 'Out for Delivery' },
  { label: 'Completed', status: 'Completed' },
  { label: 'Cancelled', status: 'Cancelled' },
];

const cancelReasons = ['Out of stock', 'Customer request', 'Unable to deliver to address', 'Payment or fraud concern', 'Duplicate order', 'Others'];

const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const sortOptions = [
  { value: '', label: 'Latest to Oldest' },
  { value: 'oldest', label: 'Oldest to Latest' },
  { value: 'high', label: 'Highest total' },
  { value: 'low', label: 'Lowest total' },
];

const statusColor = {
  Pending: 'text-[#8A6A3F]',
  Processing: 'text-[#B7791F]',
  'Out for Delivery': 'text-[#2F6F8F]',
  Delivered: 'text-[#2F6F8F]',
  Completed: 'text-[#2D6A4F]',
  Cancelled: 'text-[#B3261E]',
};

const peso = money;

const formatDateTime = (iso) =>
  new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

const formatAddress = (s) =>
  [s.street, s.barangay, s.city, s.province, s.region, s.zip].filter(Boolean).join(', ');

const selectClass =
  'h-12 border border-[#2D3831]/60 bg-white px-3 text-sm text-[#2D3831] outline-none focus:border-[#2D3A31]';

function Field({ label, children }) {
  return (
    <div>
      <p className="text-sm text-[#2D3831]">{label}</p>
      <div className="mt-1 min-h-[2rem] border border-[#2D3831]/40 bg-white px-2 py-1.5 text-sm text-[#2D3831] break-words">
        {children}
      </div>
    </div>
  );
}

function OrderModal({ order, busy, error, onClose, onAction, onOpenProduct }) {
  const canAct = ['Pending', 'Processing'].includes(order.status);
  const approveLabel = order.status === 'Processing' ? 'Mark Out for Delivery' : 'Approve Order';

  return (
    <div className="admin-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className="admin-modal relative max-h-[92vh] w-full max-w-3xl overflow-y-auto bg-white px-6 py-8 shadow-2xl sm:px-10"
      >
        <button type="button" onClick={onClose} aria-label="Close" className="absolute right-6 top-6 flex h-9 w-9 items-center justify-center rounded-full border border-[#2D3831]/60 hover:bg-[#2D3831]/5">
          <X className="h-4 w-4" />
        </button>
        <h2 className="text-center text-3xl uppercase tracking-[0.12em]">Order Information</h2>

        <div className="mt-6 grid gap-8 md:grid-cols-[1.2fr_1fr]">
          <div className="flex flex-col">
            <span className="w-fit rounded-md border border-[#2D3831] px-3 py-1 text-xs">
              Order ID: <strong>{order.id}</strong>
            </span>
            <ul className="mt-3 grid grid-cols-2 gap-4">
              {order.items.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => onOpenProduct(item.id)}
                    title="View product details"
                    className="block w-full overflow-hidden rounded-2xl bg-[#EBE5DE] transition-opacity hover:opacity-80"
                  >
                    <img src={item.image} alt={item.name} className="aspect-square w-full object-cover" />
                  </button>
                  <div className="mt-1 flex items-baseline justify-between gap-2">
                    <span className="min-w-0 truncate text-sm font-semibold text-[#2D3A31]">
                      {item.quantity}× {item.name}
                    </span>
                    <span className="shrink-0 text-xs">{peso(item.price)}</span>
                  </div>
                </li>
              ))}
            </ul>

            <div className="mt-auto pt-8">
              {(order.shippingFee > 0 || order.shippingFeeOriginal > 0) && (
                <div className="flex items-center justify-between pb-2 text-sm text-[#2D3831]/80">
                  <span>Shipping{order.shippingPromo ? ` (${order.shippingPromo})` : ''}</span>
                  <span>
                    {order.shippingFeeOriginal > order.shippingFee && (
                      <span className="mr-2 text-xs text-[#2D3831]/50 line-through">{peso(order.shippingFeeOriginal)}</span>
                    )}
                    {order.shippingFee > 0 ? peso(order.shippingFee) : 'Free shipping'}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between border-t border-[#2D3831]/50 pt-3">
                <span className="font-semibold">TOTAL</span>
                <span className="text-lg">{peso(order.total)}</span>
              </div>
              {canAct && (
                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => onAction('cancel')}
                    className="border border-[#B3261E] px-5 py-3 text-sm text-[#B3261E] hover:bg-red-50 disabled:opacity-50"
                  >
                    Cancel Order
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => onAction('approve')}
                    className="border border-[#2D6A4F] px-5 py-3 text-sm text-[#2D6A4F] hover:bg-[#2D6A4F]/10 disabled:opacity-50"
                  >
                    {approveLabel}
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-center text-lg font-bold uppercase text-[#2D3A31]">Delivery Details</h3>
            <Field label="Name:">{order.shipping?.name}</Field>
            <Field label="Email:">{order.customerEmail}</Field>
            <Field label="Phone Number:">{order.shipping?.phone}</Field>
            <Field label="Delivery Address:">
              <div className="min-h-[3.5rem]">{order.shipping && formatAddress(order.shipping)}</div>
            </Field>
            <Field label="Method:">{order.paymentMethod === 'cod' ? 'Cash on Delivery' : order.paymentMethod}</Field>
            <div className="flex items-center justify-between pt-1 text-sm">
              <span>Status:</span>
              <span className={`font-bold uppercase ${statusColor[order.status] || ''}`}>{order.status}</span>
            </div>
            {order.status === 'Cancelled' && order.cancelReason && (
              <p className="text-xs text-[#2D3831]/70">Reason: {order.cancelReason}</p>
            )}
            {order.status === 'Out for Delivery' && (
              <p className="text-xs text-[#2D3831]/70">Waiting for the customer to confirm they received the order.</p>
            )}
            {order.status === 'Processing' && (
              <div className="flex justify-end">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onAction('revert')}
                  className="border border-[#B3261E] px-5 py-3 text-sm text-[#B3261E] hover:bg-red-50 disabled:opacity-50"
                >
                  Revert Status
                </button>
              </div>
            )}
          </div>
        </div>

        {error && <p role="alert" className="mt-6 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      </div>
    </div>
  );
}

export default function AdminOrders() {
  const navigate = useNavigate();
  const toast = useToast();
  const { markSeen } = useAlerts();
  const [status, setStatus] = useState('Pending');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');
  const [sort, setSort] = useState('');
  const [page, setPage] = useState(1);
  const [exportBusy, setExportBusy] = useState('');
  const [downloadConfirm, setDownloadConfirm] = useState('');
  const [years, setYears] = useState([]);
  const [data, setData] = useState({ orders: [], pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);
  const [productId, setProductId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');
  const [confirm, setConfirm] = useState(null);
  const [animKey, setAnimKey] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    adminFetchYears()
      .then(({ years: list }) => setYears(list))
      .catch(() => {});
  }, []);

  const load = useCallback(() => {
    const params = { status, page };
    if (search) params.search = search;
    if (month) params.month = month;
    if (year) params.year = year;
    if (sort) params.sort = sort;
    return adminFetchOrders(params)
      .then((res) => {
        setData(res);
        setAnimKey((k) => k + 1);
        setError('');
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [status, page, search, month, year, sort]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    markSeen();
  }, [markSeen]);

  useLive(['orders', 'order:new'], (event) => {
    if (event.type === 'order:new') markSeen();
    load();
  });

  useEffect(() => {
    if (!selected) return;
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      if (productId) setProductId(null);
      else setSelected(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selected, productId]);

  const changeFilter = (setter) => (e) => {
    setter(e.target.value);
    setPage(1);
  };

  const openOrder = (order) => {
    setActionError('');
    setSelected(order);
  };

  const confirmCopy = (action, order) => {
    if (action === 'cancel') {
      return { title: 'Cancel order?', message: `Order ${order.id} will be marked as cancelled.`, label: 'Cancel Order', danger: true };
    }
    if (action === 'revert') {
      return { title: 'Revert status?', message: `Order ${order.id} will go back to Pending.`, label: 'Revert', danger: true };
    }
    const next = { Pending: 'Processing', Processing: 'Out for Delivery' }[order.status];
    if (order.status === 'Processing') {
      return { title: 'Mark out for delivery?', message: `Order ${order.id} will move to ${next}. The customer will be asked to confirm when it arrives.`, label: 'Mark Out for Delivery', danger: false };
    }
    return { title: 'Approve order?', message: `Order ${order.id} will move to ${next}.`, label: 'Approve', danger: false };
  };

  const runAction = async (reason) => {
    const { action } = confirm;
    setBusy(true);
    setActionError('');
    try {
      const { order } = await adminUpdateOrderStatus(selected.id, action, reason);
      setConfirm(null);
      setSelected(null);
      setProductId(null);
      toast(`Order ${order.id} is now ${order.status}.`);
      await load();
    } catch (err) {
      setConfirm(null);
      setActionError(err.message);
      toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const exportLabel = [status, month ? months[Number(month) - 1] : '', year].filter(Boolean).join(' · ');
  const exportBase = `orders-${status.toLowerCase().replaceAll(' ', '-')}-${year || 'all-years'}${month ? `-${String(month).padStart(2, '0')}` : ''}`;

  const fetchAllOrders = async () => {
    const filters = { status, page: 1, limit: 50 };
    if (search) filters.search = search;
    if (month) filters.month = month;
    if (year) filters.year = year;
    if (sort) filters.sort = sort;

    const firstPage = await adminFetchOrders(filters);
    const orders = [...firstPage.orders];
    for (let currentPage = 2; currentPage <= firstPage.pages; currentPage += 1) {
      const result = await adminFetchOrders({ ...filters, page: currentPage });
      orders.push(...result.orders);
    }
    return orders;
  };

  const downloadOrders = async (format) => {
    setExportBusy(format);
    setError('');
    try {
      const orders = await fetchAllOrders();
      if (format === 'pdf') {
        const [{ jsPDF }, { default: autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
        const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape' });
        const margin = 12;
        const green = [15, 76, 58];
        doc.setFont('helvetica', 'bold').setFontSize(18).setTextColor(...green);
        doc.text('ORDERS', margin, 16);
        doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(70);
        doc.text(`Status: ${exportLabel}`, margin, 22);
        doc.text(`Generated: ${new Date().toLocaleString('en-US')}`, margin, 27);
        autoTable(doc, {
          startY: 32,
          head: [['Order ID', 'Date & Time', 'Customer', 'Products', 'Status', 'Total']],
          body: orders.map((order) => [
            order.id,
            formatDateTime(order.date),
            order.customerEmail,
            order.items.map((item) => `${item.quantity}x ${item.name}`).join(', '),
            order.status,
            `PHP ${Number(order.total || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          ]),
          theme: 'grid',
          styles: { fontSize: 8, cellPadding: 2.5, overflow: 'linebreak' },
          headStyles: { fillColor: green },
          columnStyles: { 0: { cellWidth: 28 }, 1: { cellWidth: 36 }, 2: { cellWidth: 48 }, 4: { cellWidth: 28 }, 5: { cellWidth: 30, halign: 'right' } },
          margin: { left: margin, right: margin },
        });
        doc.save(`${exportBase}.pdf`);
      } else {
        const ExcelJS = (await import('exceljs')).default;
        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'Admin';
        workbook.created = new Date();
        const sheet = workbook.addWorksheet('Orders');
        sheet.columns = [
          { header: 'Order ID', key: 'id', width: 18 },
          { header: 'Date & Time', key: 'date', width: 24 },
          { header: 'Customer Email', key: 'customer', width: 32 },
          { header: 'Products', key: 'products', width: 56 },
          { header: 'Status', key: 'status', width: 22 },
          { header: 'Total', key: 'total', width: 16, style: { numFmt: '"₱"#,##0.00' } },
          { header: 'Phone', key: 'phone', width: 18 },
          { header: 'Delivery Address', key: 'address', width: 56 },
          { header: 'Payment Method', key: 'payment', width: 22 },
          { header: 'Cancellation Reason', key: 'reason', width: 32 },
        ];
        const header = sheet.getRow(1);
        header.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        header.alignment = { vertical: 'middle', horizontal: 'center' };
        header.eachCell((cell) => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F4C3A' } };
        });
        orders.forEach((order) => {
          sheet.addRow({
            id: order.id,
            date: formatDateTime(order.date),
            customer: order.customerEmail,
            products: order.items.map((item) => `${item.quantity}x ${item.name} (${peso(item.price)})`).join(', '),
            status: order.status,
            total: order.total,
            phone: order.shipping?.phone || '',
            address: order.shipping ? formatAddress(order.shipping) : '',
            payment: order.paymentMethod === 'cod' ? 'Cash on Delivery' : order.paymentMethod || '',
            reason: order.cancelReason || '',
          });
        });
        sheet.autoFilter = { from: 'A1', to: 'J1' };
        sheet.views = [{ state: 'frozen', ySplit: 1 }];
        const buffer = await workbook.xlsx.writeBuffer();
        const url = URL.createObjectURL(new Blob([buffer], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        }));
        const link = document.createElement('a');
        link.href = url;
        link.download = `${exportBase}.xlsx`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
    } catch (err) {
      console.error(err);
      setError(err.message || `Could not create the ${format === 'pdf' ? 'PDF' : 'Excel'} file. Please try again.`);
    } finally {
      setExportBusy('');
    }
  };

  const productCell = (order) => {
    const first = order.items[0];
    const more = order.items.length - 1;
    return (
      <>
        <span className="font-medium">{first.quantity}×</span> {first.name}
        {more > 0 && <span className="text-[#2D3831]/60"> + {more} more</span>}
      </>
    );
  };

  const th = 'border border-[#2D3831]/10 bg-[#EDEBE8] px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider';
  const td = 'border border-[#2D3831]/10 px-3 py-3 text-sm align-middle';

  return (
    <div>
      <h1 className="text-right text-[26px] uppercase tracking-wide sm:text-4xl md:text-6xl">Orders Management</h1>

      <div className="mt-4 overflow-x-auto bg-white p-2">
        <SlidingTabs
          items={tabs.map((t) => ({ key: t.status, label: t.label }))}
          value={status}
          onChange={(key) => {
            setStatus(key);
            setPage(1);
          }}
          className="flex min-w-[640px] gap-2"
          pillClassName="rounded-full bg-[#0F4C3A]"
          buttonClassName="flex-1 whitespace-nowrap rounded-full px-5 py-3 text-sm uppercase tracking-wide md:text-lg"
          activeClassName="text-white"
          inactiveClassName="hover:bg-[#2D3831]/5"
        />
      </div>

      <div className="mt-4 bg-white p-4 md:p-6">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[200px] flex-1">
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search"
              className="h-12 w-full border border-[#2D3831]/60 bg-white pl-3 pr-10 text-sm outline-none focus:border-[#2D3A31]"
            />
            <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2" />
          </div>
          <select value={month} onChange={changeFilter(setMonth)} className={selectClass} aria-label="Month">
            <option value="">All Months</option>
            {months.map((m, i) => (
              <option key={m} value={i + 1}>{m}</option>
            ))}
          </select>
          <select value={year} onChange={changeFilter(setYear)} className={selectClass} aria-label="Year">
            <option value="">All Years</option>
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <select value={sort} onChange={changeFilter(setSort)} className={selectClass} aria-label="Sort">
            {sortOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setDownloadConfirm('pdf')}
            disabled={loading || !!exportBusy}
            className="flex h-12 items-center gap-2 border border-[#0F4C3A] px-4 text-sm text-[#0F4C3A] transition-colors hover:bg-[#0F4C3A] hover:text-white disabled:opacity-40"
          >
            <FileText className="h-4 w-4" /> {exportBusy === 'pdf' ? 'Creating...' : 'PDF'}
          </button>
          <button
            type="button"
            onClick={() => setDownloadConfirm('xlsx')}
            disabled={loading || !!exportBusy}
            className="flex h-12 items-center gap-2 bg-[#0F4C3A] px-4 text-sm text-white transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            <FileSpreadsheet className="h-4 w-4" /> {exportBusy === 'xlsx' ? 'Creating...' : 'Excel'}
          </button>
        </div>

        {error && <p role="alert" className="mt-4 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
        {downloadConfirm && (
          <ConfirmModal
            title={`Download ${downloadConfirm === 'pdf' ? 'PDF' : 'Excel'} orders?`}
            message={`Create a ${downloadConfirm === 'pdf' ? 'PDF' : 'Excel'} file for ${exportLabel}${search ? ` matching “${search}”` : ''}${month || year ? ' with the selected date filters' : ''}. All matching orders will be included, not just the current page.`}
            confirmLabel="Download"
            busy={!!exportBusy}
            onCancel={() => setDownloadConfirm('')}
            onConfirm={() => {
              const format = downloadConfirm;
              setDownloadConfirm('');
              downloadOrders(format);
            }}
          />
        )}

        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[860px] border-collapse">
            <thead>
              <tr>
                <th className={th}>Order ID</th>
                <th className={th}>Date &amp; Time</th>
                <th className={th}>Customer</th>
                <th className={th}>Product/s</th>
                <th className={th}>Status</th>
                <th className={th}>Total Amount</th>
                <th className={th}>Action</th>
              </tr>
            </thead>
            <tbody key={animKey} className="admin-fade">
              {data.orders.map((o, i) => (
                <tr key={o.id} className="admin-row" style={{ animationDelay: `${i * 40}ms` }}>
                  <td className={`${td} font-medium`}>{o.id}</td>
                  <td className={td}>{formatDateTime(o.date)}</td>
                  <td className={`${td} break-all`}>{o.customerEmail}</td>
                  <td className={td}>{productCell(o)}</td>
                  <td className={`${td} text-xs font-bold uppercase ${statusColor[o.status] || ''}`}>{o.status}</td>
                  <td className={td}>{peso(o.total)}</td>
                  <td className={td}>
                    <button
                      type="button"
                      onClick={() => openOrder(o)}
                      className="border border-[#2D3831]/60 px-4 py-1.5 text-xs uppercase tracking-wider hover:bg-[#2D3A31] hover:text-[#F9F6F0]"
                    >
                      Details
                    </button>
                  </td>
                </tr>
              ))}
              {!loading && data.orders.length === 0 && (
                <tr>
                  <td colSpan={7} className={`${td} py-16 text-center text-[#2D3831]/60`}>
                    No {status.toLowerCase()} orders found.
                  </td>
                </tr>
              )}
              {loading && data.orders.length === 0 && (
                <tr>
                  <td colSpan={7} className={`${td} py-16 text-center text-[#2D3831]/60`}>
                    Loading...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex items-center justify-end gap-6">
          <span className="text-xs text-[#2D3831]/60">
            Page {data.page || page} of {data.pages}
          </span>
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            aria-label="Previous page"
            className="p-2 text-[#6B4F3A] disabled:opacity-30"
          >
            <ChevronLeft className="h-7 w-7" />
          </button>
          <button
            type="button"
            disabled={page >= data.pages}
            onClick={() => setPage((p) => p + 1)}
            aria-label="Next page"
            className="p-2 text-[#6B4F3A] disabled:opacity-30"
          >
            <ChevronRight className="h-7 w-7" />
          </button>
        </div>
      </div>

      {selected && (
        <OrderModal
          order={selected}
          busy={busy}
          error={actionError}
          onClose={() => setSelected(null)}
          onAction={(action) => setConfirm({ action })}
          onOpenProduct={setProductId}
        />
      )}
      {selected && productId && (
        <ProductModal
          productId={productId}
          onBack={() => setProductId(null)}
          onEdit={(product) => navigate('/admin/products', { state: { editId: product.id } })}
        />
      )}
      {confirm?.action === 'cancel' && selected && (
        <ReasonDialog
          title="Cancel order?"
          message={`Order ${selected.id} will be marked as cancelled.`}
          reasons={cancelReasons}
          confirmLabel="Cancel Order"
          cancelLabel="Keep order"
          busy={busy}
          onConfirm={runAction}
          onCancel={() => setConfirm(null)}
        />
      )}
      {confirm && confirm.action !== 'cancel' && selected && (() => {
        const copy = confirmCopy(confirm.action, selected);
        return (
          <ConfirmModal
            title={copy.title}
            message={copy.message}
            confirmLabel={copy.label}
            danger={copy.danger}
            busy={busy}
            onConfirm={() => runAction()}
            onCancel={() => setConfirm(null)}
          />
        );
      })()}
    </div>
  );
}
