import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, FileSpreadsheet, FileText, Search } from 'lucide-react';
import { adminFetchReports } from '../../api';
import { ConfirmModal, useLive } from './AdminUI';
import { money } from './ProductSummary';

const compact = (n) => {
  if (n >= 1_000_000) return `₱${(n / 1_000_000).toFixed(2).replace(/\.?0+$/, '')}M`;
  if (n >= 10_000) return `₱${(n / 1_000).toFixed(2).replace(/\.?0+$/, '')}K`;
  return `₱${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
};

const niceMax = (value) => {
  if (value <= 0) return 4;
  const pow = 10 ** Math.floor(Math.log10(value));
  const n = value / pow;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return step * pow;
};

function smoothPath(points) {
  if (points.length < 2) return '';
  let d = `M ${points[0][0]} ${points[0][1]}`;
  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[i - 1] || points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] || p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2[0]} ${p2[1]}`;
  }
  return d;
}

const saveBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

// jsPDF's built-in fonts can't draw the ₱ sign, so the PDF uses "PHP"
const php = (n) =>
  `PHP ${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const svgToPng = (svg) =>
  new Promise((resolve, reject) => {
    const { width: w, height: h } = svg.viewBox.baseVal;
    const clone = svg.cloneNode(true);
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    clone.setAttribute('width', w);
    clone.setAttribute('height', h);
    const xml = new XMLSerializer().serializeToString(clone);
    const img = new Image();
    img.onload = () => {
      const scale = 2;
      const canvas = document.createElement('canvas');
      canvas.width = w * scale;
      canvas.height = h * scale;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve({ url: canvas.toDataURL('image/png'), w, h });
    };
    img.onerror = reject;
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(xml)}`;
  });

function LineChart({ data, valueKey, format, axisFormat }) {
  const [hover, setHover] = useState(null);
  const W = 600;
  const H = 270;
  const pad = { left: 56, right: 16, top: 14, bottom: 34 };
  const innerW = W - pad.left - pad.right;
  const innerH = H - pad.top - pad.bottom;
  const max = niceMax(Math.max(0, ...data.map((d) => d[valueKey])));
  const x = (i) => pad.left + (data.length === 1 ? innerW / 2 : (i / (data.length - 1)) * innerW);
  const y = (v) => pad.top + innerH - (v / max) * innerH;
  const points = data.map((d, i) => [x(i), y(d[valueKey])]);
  const line = smoothPath(points);
  const area = points.length > 1 ? `${line} L ${points[points.length - 1][0]} ${pad.top + innerH} L ${points[0][0]} ${pad.top + innerH} Z` : '';
  const ticks = [0, 1, 2, 3, 4].map((t) => (max / 4) * t);
  const labelStep = Math.max(1, Math.ceil(data.length / 6));
  const active = hover !== null ? data[hover] : null;

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" onMouseLeave={() => setHover(null)}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.left} x2={W - pad.right} y1={y(t)} y2={y(t)} stroke="#2D3831" strokeOpacity="0.1" strokeDasharray="3 4" />
            <text x={pad.left - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill="#2D3831" fillOpacity="0.6">
              {axisFormat(t)}
            </text>
          </g>
        ))}
        {data.map((d, i) =>
          i % labelStep === 0 ? (
            <text key={d.label} x={x(i)} y={H - 10} textAnchor="middle" fontSize="11" fill="#2D3831" fillOpacity="0.6">
              {d.label}
            </text>
          ) : null
        )}
        {area && <path d={area} fill="#0F4C3A" fillOpacity="0.07" className="admin-fade" />}
        <path d={line} fill="none" stroke="#0F4C3A" strokeWidth="2.5" strokeLinecap="round" pathLength="1" className="admin-draw" />
        {points.length === 1 && <circle cx={points[0][0]} cy={points[0][1]} r="4" fill="#0F4C3A" />}
        {active && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={pad.top} y2={pad.top + innerH} stroke="#0F4C3A" strokeOpacity="0.3" />
            <circle cx={x(hover)} cy={y(active[valueKey])} r="5" fill="#fff" stroke="#0F4C3A" strokeWidth="2.5" />
          </g>
        )}
        {data.map((d, i) => (
          <rect
            key={d.label}
            x={x(i) - innerW / data.length / 2}
            y={pad.top}
            width={Math.max(8, innerW / data.length)}
            height={innerH}
            fill="transparent"
            onMouseEnter={() => setHover(i)}
          />
        ))}
      </svg>
      {active && (
        <div
          className="pointer-events-none absolute -translate-x-1/2 border border-[#2D3831]/20 bg-white px-3 py-2 text-xs shadow-lg"
          style={{ left: `${(x(hover) / W) * 100}%`, top: `${(y(active[valueKey]) / H) * 100 - 6}%`, transform: 'translate(-50%, -100%)' }}
        >
          <p className="text-[#2D3831]/60">{active.label}</p>
          <p className="font-semibold text-[#2D3A31]">{format(active[valueKey])}</p>
        </div>
      )}
    </div>
  );
}

function Kpi({ label, value, delay }) {
  return (
    <div className="admin-row border border-[#2D3831]/15 bg-white px-5 py-4" style={{ animationDelay: `${delay}ms` }}>
      <p className="text-sm text-[#2D3831]">{label}</p>
      <p className="mt-6 text-center text-3xl text-[#2D3A31] md:text-4xl">{value}</p>
    </div>
  );
}

export default function AdminReports() {
  const [month, setMonth] = useState('');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [animKey, setAnimKey] = useState(0);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState('');
  const [downloadConfirm, setDownloadConfirm] = useState('');
  const chartsRef = useRef(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 250);
    return () => clearTimeout(t);
  }, [searchInput]);

  const load = useCallback(() => {
    adminFetchReports(month)
      .then((res) => {
        setData(res);
        setAnimKey((k) => k + 1);
        setError('');
      })
      .catch((err) => setError(err.message));
  }, [month]);

  useEffect(() => {
    load();
  }, [load]);

  useLive(['orders', 'order:new', 'products'], load);

  const perPage = 8;
  const filtered = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    return data.products.filter((p) => !q || p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q));
  }, [data, search]);
  const pages = Math.max(1, Math.ceil(filtered.length / perPage));
  const current = Math.min(page, pages);
  const rows = filtered.slice((current - 1) * perPage, current * perPage);

  const top = data ? data.products.filter((p) => p.sold > 0).slice(0, 5) : [];
  const topMax = Math.max(1, ...top.map((p) => p.sold));
  const topIds = new Set(top.map((p) => p.id));

  const periodLabel = month ? data?.months.find((m) => m.value === month)?.label || month : 'All Time';
  const fileBase = `sales-report-${month || 'all-time'}`;

  const downloadPdf = async () => {
    if (!data) return;
    setBusy('pdf');
    try {
      const [{ jsPDF }, { default: autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
      const doc = new jsPDF({ unit: 'mm', format: 'a4' });
      const M = 14;
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const contentW = pageW - M * 2;
      const green = [15, 76, 58];
      let y = 18;

      doc.setFont('helvetica', 'bold').setFontSize(20).setTextColor(...green);
      doc.text('SALES REPORT', M, y);
      doc.setFont('helvetica', 'normal').setFontSize(10).setTextColor(70);
      y += 7;
      doc.text(`Period: ${periodLabel}`, M, y);
      y += 5;
      doc.text(`Generated: ${new Date().toLocaleString('en-US')}`, M, y);
      y += 4;

      const k = data.kpis;
      autoTable(doc, {
        startY: y + 2,
        head: [['Total Orders', 'Cancelled', 'Total Sales', 'Customers', 'Average Sales']],
        body: [[k.totalOrders, k.cancelledOrders, php(k.totalSales), k.customers, php(k.averageSales)]],
        theme: 'grid',
        styles: { halign: 'center', fontSize: 10 },
        headStyles: { fillColor: green },
        margin: { left: M, right: M },
      });
      y = doc.lastAutoTable.finalY + 8;

      const svgs = chartsRef.current ? [...chartsRef.current.querySelectorAll('svg')] : [];
      const titles = ['Total Orders', 'Total Sales'];
      for (let i = 0; i < svgs.length; i += 1) {
        const img = await svgToPng(svgs[i]);
        const h = (contentW * img.h) / img.w;
        if (y + h + 8 > pageH - 14) {
          doc.addPage();
          y = 18;
        }
        doc.setFont('helvetica', 'bold').setFontSize(12).setTextColor(...green);
        doc.text(titles[i] || 'Chart', M, y);
        doc.addImage(img.url, 'PNG', M, y + 2, contentW, h);
        y += h + 10;
      }

      if (top.length) {
        if (y > pageH - 60) {
          doc.addPage();
          y = 18;
        }
        doc.setFont('helvetica', 'bold').setFontSize(12).setTextColor(...green);
        doc.text('Top Products Sold', M, y);
        autoTable(doc, {
          startY: y + 3,
          head: [['#', 'Product', 'Items Sold']],
          body: top.map((p, i) => [i + 1, p.name, p.sold]),
          theme: 'grid',
          headStyles: { fillColor: green },
          columnStyles: { 0: { cellWidth: 12, halign: 'center' }, 2: { halign: 'center', cellWidth: 30 } },
          margin: { left: M, right: M },
        });
        y = doc.lastAutoTable.finalY + 8;
      }

      if (y > pageH - 50) {
        doc.addPage();
        y = 18;
      }
      doc.setFont('helvetica', 'bold').setFontSize(12).setTextColor(...green);
      doc.text('All Products', M, y);
      autoTable(doc, {
        startY: y + 3,
        head: [['Product Name', 'Category', 'Sold Items', 'Total Sales']],
        body: data.products.map((p) => [p.name, p.category, p.sold, php(p.sales)]),
        theme: 'grid',
        headStyles: { fillColor: green },
        columnStyles: { 2: { halign: 'center' }, 3: { halign: 'right' } },
        margin: { left: M, right: M },
      });

      const total = doc.getNumberOfPages();
      for (let i = 1; i <= total; i += 1) {
        doc.setPage(i);
        doc.setFont('helvetica', 'normal').setFontSize(8).setTextColor(120);
        doc.text(`Page ${i} of ${total}`, pageW - M, pageH - 8, { align: 'right' });
      }

      doc.save(`${fileBase}.pdf`);
    } catch (err) {
      console.error(err);
      setError('Could not create the PDF. Please try again.');
    } finally {
      setBusy('');
    }
  };

  const downloadExcel = async () => {
    if (!data) return;
    setBusy('xlsx');
    try {
      const ExcelJS = (await import('exceljs')).default;
      const wb = new ExcelJS.Workbook();
      wb.creator = 'Admin';
      wb.created = new Date();
      const peso = '"₱"#,##0.00';

      const styleHeader = (row) => {
        row.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        row.alignment = { vertical: 'middle', horizontal: 'center' };
        row.eachCell((c) => {
          c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F4C3A' } };
        });
      };

      // Sheet 1: Summary
      const s1 = wb.addWorksheet('Summary');
      s1.columns = [{ width: 26 }, { width: 24 }];
      s1.addRow(['Sales Report']).font = { bold: true, size: 16, color: { argb: 'FF0F4C3A' } };
      s1.addRow(['Period', periodLabel]);
      s1.addRow(['Generated', new Date().toLocaleString('en-US')]);
      s1.addRow([]);
      styleHeader(s1.addRow(['Metric', 'Value']));
      const k = data.kpis;
      s1.addRow(['Total Orders', k.totalOrders]);
      s1.addRow(['Cancelled Orders', k.cancelledOrders]);
      const salesRow = s1.addRow(['Total Sales', k.totalSales]);
      salesRow.getCell(2).numFmt = peso;
      s1.addRow(['Customers', k.customers]);
      const avgRow = s1.addRow(['Average Sales', k.averageSales]);
      avgRow.getCell(2).numFmt = peso;
      s1.eachRow((r, n) => {
        if (n > 5) r.getCell(2).alignment = { horizontal: 'right' };
      });

      // Sheet 2: Sales over time
      const s2 = wb.addWorksheet(data.granularity === 'day' ? 'Daily Sales' : 'Monthly Sales');
      s2.columns = [
        { header: data.granularity === 'day' ? 'Day' : 'Month', key: 'label', width: 18 },
        { header: 'Orders', key: 'orders', width: 12 },
        { header: 'Sales', key: 'sales', width: 18, style: { numFmt: peso } },
      ];
      styleHeader(s2.getRow(1));
      data.series.forEach((r) => s2.addRow(r));
      s2.views = [{ state: 'frozen', ySplit: 1 }];

      // Sheet 3: Products
      const s3 = wb.addWorksheet('Products');
      s3.columns = [
        { header: 'Product Name', key: 'name', width: 38 },
        { header: 'Category', key: 'category', width: 20 },
        { header: 'Total Sold Items', key: 'sold', width: 18 },
        { header: 'Total Sales', key: 'sales', width: 18, style: { numFmt: peso } },
      ];
      styleHeader(s3.getRow(1));
      data.products.forEach((p) => s3.addRow(p));
      s3.autoFilter = { from: 'A1', to: 'D1' };
      s3.views = [{ state: 'frozen', ySplit: 1 }];

      const buffer = await wb.xlsx.writeBuffer();
      saveBlob(
        new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
        `${fileBase}.xlsx`
      );
    } catch (err) {
      console.error(err);
      setError('Could not create the Excel file. Please try again.');
    } finally {
      setBusy('');
    }
  };

  const th = 'border border-[#2D3831]/10 bg-[#EDEBE8] px-3 py-4 text-left text-base';
  const td = 'border border-[#2D3831]/10 px-3 py-3 text-sm align-middle';

  return (
    <div>
      <h1 className="text-right text-[26px] uppercase tracking-wide sm:text-4xl md:text-6xl">Reports</h1>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-[#2D3831]/70">
          Sales count delivered and completed orders. Cancelled orders are not included.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={month}
            onChange={(e) => {
              setMonth(e.target.value);
              setPage(1);
            }}
            aria-label="Report period"
            className="h-12 min-w-[200px] border border-[#2D3831]/60 bg-white px-3 text-sm outline-none focus:border-[#2D3A31]"
          >
            <option value="">All Time</option>
            {(data?.months || []).map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setDownloadConfirm('pdf')}
            disabled={!data || !!busy}
            className="flex h-12 items-center gap-2 border border-[#0F4C3A] px-4 text-sm text-[#0F4C3A] transition-colors hover:bg-[#0F4C3A] hover:text-white disabled:opacity-40"
          >
            <FileText className="h-4 w-4" /> {busy === 'pdf' ? 'Creating...' : 'PDF'}
          </button>
          <button
            type="button"
            onClick={() => setDownloadConfirm('xlsx')}
            disabled={!data || !!busy}
            className="flex h-12 items-center gap-2 bg-[#0F4C3A] px-4 text-sm text-white transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            <FileSpreadsheet className="h-4 w-4" /> {busy === 'xlsx' ? 'Creating...' : 'Excel'}
          </button>
        </div>
      </div>

      {error && <p role="alert" className="mt-4 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      {downloadConfirm && (
        <ConfirmModal
          title={`Download ${downloadConfirm === 'pdf' ? 'PDF' : 'Excel'} report?`}
          message={`Create and download the ${downloadConfirm === 'pdf' ? 'PDF' : 'Excel'} sales report for ${periodLabel}?`}
          confirmLabel="Download"
          onCancel={() => setDownloadConfirm('')}
          onConfirm={() => {
            const download = downloadConfirm === 'pdf' ? downloadPdf : downloadExcel;
            setDownloadConfirm('');
            download();
          }}
        />
      )}

      {!data && !error && <p className="mt-10 text-center text-[#2D3831]/60">Loading...</p>}

      {data && (
        <div key={animKey}>
          <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-5">
            <Kpi label="Total Orders" value={data.kpis.totalOrders.toLocaleString()} delay={0} />
            <Kpi label="Cancelled Orders" value={data.kpis.cancelledOrders.toLocaleString()} delay={50} />
            <Kpi label="Total Sales" value={compact(data.kpis.totalSales)} delay={100} />
            <Kpi label="Customers" value={data.kpis.customers.toLocaleString()} delay={150} />
            <Kpi label="Average Sales" value={money(data.kpis.averageSales)} delay={200} />
          </div>

          <div ref={chartsRef} className="mt-4 grid gap-4 lg:grid-cols-2">
            <section className="admin-fade border border-[#2D3831]/15 bg-white p-5">
              <div className="flex items-baseline justify-between">
                <h2 className="text-base">Total Orders</h2>
                <span className="text-sm font-semibold">{data.kpis.totalOrders.toLocaleString()}</span>
              </div>
              <LineChart data={data.series} valueKey="orders" format={(v) => `${v} order${v === 1 ? '' : 's'}`} axisFormat={(v) => String(Math.round(v))} />
            </section>
            <section className="admin-fade border border-[#2D3831]/15 bg-white p-5">
              <div className="flex items-baseline justify-between">
                <h2 className="text-base">Total Sales</h2>
                <span className="text-sm font-semibold">{compact(data.kpis.totalSales)}</span>
              </div>
              <LineChart data={data.series} valueKey="sales" format={(v) => money(v)} axisFormat={(v) => compact(v)} />
            </section>
          </div>

          <section className="admin-fade mt-4 border border-[#2D3831]/15 bg-white p-5">
            <h2 className="text-base">Top Products Sold</h2>
            {top.length === 0 ? (
              <p className="py-8 text-center text-sm text-[#2D3831]/60">No sales in this period.</p>
            ) : (
              <ul className="mt-4 space-y-4">
                {top.map((p, i) => (
                  <li key={p.id}>
                    <div className="flex items-baseline justify-between gap-3 text-sm">
                      <span className="min-w-0 truncate">{p.name}</span>
                      <span className="shrink-0 font-semibold">{p.sold}</span>
                    </div>
                    <div className="mt-1 h-2.5 bg-[#2D3831]/10">
                      <div
                        className="admin-bar h-full bg-[#0F4C3A]"
                        style={{ width: `${(p.sold / topMax) * 100}%`, animationDelay: `${i * 80}ms` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="admin-fade mt-4 bg-white p-4 md:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-2xl uppercase tracking-wide md:text-3xl">All Products</h2>
              <div className="relative w-full max-w-md">
                <input
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search"
                  className="h-12 w-full border border-[#2D3831]/60 bg-white pl-3 pr-10 text-sm outline-none focus:border-[#2D3A31]"
                />
                <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2" />
              </div>
            </div>

            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse">
                <thead>
                  <tr>
                    <th className={th}>Product Name</th>
                    <th className={th}>Category</th>
                    <th className={`${th} text-center`}>Total Sold Items</th>
                    <th className={`${th} text-center`}>Total Sales</th>
                  </tr>
                </thead>
                <tbody key={`${current}-${search}`} className="admin-fade">
                  {rows.map((p, i) => (
                    <tr key={p.id} className="admin-row" style={{ animationDelay: `${i * 40}ms` }}>
                      <td className={td}>
                        <div className="flex items-center gap-3">
                          <img src={p.image} alt="" className="h-10 w-10 shrink-0 rounded-lg bg-[#EBE5DE] object-cover" />
                          <span className="min-w-0">{p.name}</span>
                          {topIds.has(p.id) && (
                            <span className="shrink-0 border border-[#0F4C3A] px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-[#0F4C3A]">Top seller</span>
                          )}
                        </div>
                      </td>
                      <td className={td}>{p.category}</td>
                      <td className={`${td} text-center`}>{p.sold.toLocaleString()}</td>
                      <td className={`${td} text-center`}>{money(p.sales)}</td>
                    </tr>
                  ))}
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={4} className={`${td} py-12 text-center text-[#2D3831]/60`}>No products found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex items-center justify-end gap-6">
              <span className="text-xs text-[#2D3831]/60">Page {current} of {pages}</span>
              <button type="button" disabled={current <= 1} onClick={() => setPage(current - 1)} aria-label="Previous page" className="p-2 text-[#6B4F3A] transition-opacity disabled:opacity-30">
                <ChevronLeft className="h-7 w-7" />
              </button>
              <button type="button" disabled={current >= pages} onClick={() => setPage(current + 1)} aria-label="Next page" className="p-2 text-[#6B4F3A] transition-opacity disabled:opacity-30">
                <ChevronRight className="h-7 w-7" />
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}