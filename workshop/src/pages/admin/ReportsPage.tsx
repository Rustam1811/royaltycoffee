import React, { useState, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  DocumentArrowDownIcon,
  CalendarDaysIcon,
  FunnelIcon,
  TableCellsIcon,
  ChartBarIcon,
  BuildingOffice2Icon,
  PrinterIcon,
} from '@heroicons/react/24/outline';
import { Card, CardBody, CardHeader, Button } from '@/components/ui';
import { getAllOrders, getAllClients, getAllProducts, getWorkshopSettings } from '@/services';
import { WorkshopOrder, WorkshopClient, OrderStatus, LocalizedString, WorkshopProduct } from '@/types';
import * as XLSX from 'xlsx';
import XLSXStyle from 'xlsx-js-style';

// ─── Constants ───
const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Ожидает',
  confirmed: 'Подтверждён',
  in_production: 'Готовится',
  ready: 'Готов',
  delivered: 'Доставлен',
  cancelled: 'Отменён',
};

const COMPANY_INFO = {
  name: 'ИП «SunFood Workshop»',
  bin: '123456789012',
  address: 'г. Алматы',
};

const getLocalizedName = (name: LocalizedString): string =>
  name.ru || name.en || name.kz || '';

/** Auto-fit column widths based on cell content */
const autoFitColumns = (data: (string | number)[][]): { wch: number }[] => {
  const colCount = Math.max(...data.map(r => r.length));
  const widths: number[] = new Array(colCount).fill(4);
  data.forEach(row => {
    row.forEach((cell, i) => {
      const len = cell != null ? String(cell).length : 0;
      if (len > widths[i]) widths[i] = len;
    });
  });
  return widths.map(w => ({ wch: Math.min(w + 3, 60) }));
};

// ─── Date helpers ───
const toDateStr = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const formatDateRu = (d: Date) =>
  new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(d);

const formatDateTimeRu = (d: Date) =>
  new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(d);

// ─── Stat card ───
const StatCard: React.FC<{
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  color: string;
}> = ({ icon: Icon, label, value, sub, color }) => (
  <Card>
    <CardBody className="flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-xs text-slate-500">{label}</p>
        <p className="text-lg font-bold text-slate-900">{value}</p>
        {sub && <p className="text-[11px] text-slate-400">{sub}</p>}
      </div>
    </CardBody>
  </Card>
);

type ReportType = 'orders' | 'summary_client' | 'summary_product' | 'invoices' | 'matrix';

/**
 * Страница отчётов с выгрузкой в Excel
 */
const ReportsPage: React.FC = () => {
  // Date range: default = current month
  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const [dateFrom, setDateFrom] = useState(toDateStr(firstOfMonth));
  const [dateTo, setDateTo] = useState(toDateStr(now));
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');
  const [reportType, setReportType] = useState<ReportType>('orders');

  const [orders, setOrders] = useState<WorkshopOrder[]>([]);
  const [clients, setClients] = useState<WorkshopClient[]>([]);
  const [products, setProducts] = useState<WorkshopProduct[]>([]);
  const [ownOutletIds, setOwnOutletIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [exporting, setExporting] = useState(false);

  // ─── Load data ───
  const loadData = async () => {
    setLoading(true);
    try {
      const [ordersData, clientsData, productsData, settingsData] = await Promise.all([
        getAllOrders(),
        getAllClients(),
        getAllProducts(),
        getWorkshopSettings(),
      ]);
      setOrders(ordersData);
      setClients(clientsData);
      setProducts(productsData);
      setOwnOutletIds(settingsData.ownOutletIds ?? []);
      setLoaded(true);
    } catch (err) {
      console.error('Error loading report data:', err);
    } finally {
      setLoading(false);
    }
  };

  // ─── Filtered orders ───
  const filteredOrders = useMemo(() => {
    const from = new Date(dateFrom + 'T00:00:00');
    const to = new Date(dateTo + 'T23:59:59');
    return orders.filter(o => {
      const d = o.createdAt;
      if (d < from || d > to) return false;
      if (statusFilter !== 'all' && o.status !== statusFilter) return false;
      return true;
    });
  }, [orders, dateFrom, dateTo, statusFilter]);

  // ─── Stats ───
  const totalAmount = filteredOrders.reduce((s, o) => s + o.totalAmount, 0);
  const deliveredOrders = filteredOrders.filter(o => o.status === 'delivered');
  const deliveredAmount = deliveredOrders.reduce((s, o) => s + o.totalAmount, 0);
  const uniqueClients = new Set(filteredOrders.map(o => o.clientId)).size;

  // ─── Client map for lookup ───
  const clientMap = useMemo(() => {
    const m = new Map<string, WorkshopClient>();
    clients.forEach(c => m.set(c.id, c));
    return m;
  }, [clients]);

  const productColorMap = useMemo(() => {
    const m = new Map<string, string>();
    products.forEach(p => { if (p.color) m.set(p.id, p.color); });
    return m;
  }, [products]);

  // ─── Invoice data grouped by outlet ───
  interface InvoiceLine { name: string; unit: string; price: number; qty: number; sum: number }
  interface OutletInvoice {
    outletId: string;
    outletName: string;
    outletAddress: string;
    clientName: string;
    company: string;
    lines: InvoiceLine[];
    total: number;
  }

  const invoices = useMemo<OutletInvoice[]>(() => {
    if (reportType !== 'invoices' || filteredOrders.length === 0) return [];

    const groups = new Map<string, { outletName: string; outletAddress: string; clientName: string; clientId: string; orders: WorkshopOrder[] }>();
    filteredOrders.forEach(o => {
      const g = groups.get(o.outletId);
      if (g) { g.orders.push(o); } else {
        groups.set(o.outletId, { outletName: o.outletName, outletAddress: o.outletAddress, clientName: o.clientName, clientId: o.clientId, orders: [o] });
      }
    });

    const result: OutletInvoice[] = [];
    groups.forEach((g, outletId) => {
      const products = new Map<string, InvoiceLine>();
      g.orders.forEach(order => {
        order.items.forEach(item => {
          const key = item.productId;
          const ex = products.get(key);
          if (ex) { ex.qty += item.quantity; ex.sum += item.subtotal; }
          else { products.set(key, { name: getLocalizedName(item.productName), unit: item.unit, price: item.price, qty: item.quantity, sum: item.subtotal }); }
        });
      });
      const lines = Array.from(products.values())
        .sort((a, b) => a.name.localeCompare(b.name, 'ru'))
        .map(l => ({ ...l, price: l.qty > 0 ? Math.round(l.sum / l.qty) : l.price }));
      const total = lines.reduce((s, l) => s + l.sum, 0);
      const company = clientMap.get(g.clientId)?.companyName || '';
      result.push({ outletId, outletName: g.outletName, outletAddress: g.outletAddress, clientName: g.clientName, company, lines, total });
    });
    return result.sort((a, b) => a.clientName.localeCompare(b.clientName, 'ru'));
  }, [filteredOrders, reportType, clientMap]);

  // ─── Print invoices ───
  const invoiceRef = useRef<HTMLDivElement>(null);
  const handlePrint = () => {
    if (!invoiceRef.current) return;
    const html = invoiceRef.current.innerHTML;
    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Накладные</title>
      <style>
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; color: #1e293b; padding: 0; }
        .invoice-page { page-break-after: always; padding: 32px 40px; max-width: 800px; margin: 0 auto; }
        .invoice-page:last-child { page-break-after: auto; }
        h2 { font-size: 20px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; border-bottom: 2px solid #1e293b; padding-bottom: 6px; margin-bottom: 16px; }
        .meta { font-size: 13px; color: #475569; line-height: 1.7; margin-bottom: 16px; }
        .meta b { color: #1e293b; }
        table { width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 16px; }
        th { background: #f1f5f9; text-align: left; padding: 8px 10px; font-weight: 600; border: 1px solid #cbd5e1; }
        th.r { text-align: right; }
        td { padding: 7px 10px; border: 1px solid #e2e8f0; }
        td.r { text-align: right; font-variant-numeric: tabular-nums; }
        tr:nth-child(even) td { background: #f8fafc; }
        .total-row td { font-weight: 700; background: #f1f5f9 !important; border-top: 2px solid #94a3b8; }
        .signatures { display: flex; justify-content: space-between; margin-top: 32px; font-size: 13px; color: #475569; }
        .sig-line { border-bottom: 1px solid #94a3b8; width: 180px; display: inline-block; margin-left: 8px; }
        @media print { body { padding: 0; } .invoice-page { padding: 24px; } }
      </style></head><body>${html}</body></html>`);
    win.document.close();
    setTimeout(() => win.print(), 300);
  };

  // ─── Export to Excel ───
  const handleExport = () => {
    if (filteredOrders.length === 0) return;
    setExporting(true);

    try {
      const periodStr = `${dateFrom.replace(/-/g, '')}_${dateTo.replace(/-/g, '')}`;
      const typeLabels: Record<ReportType, string> = {
        orders: 'Заказы',
        summary_client: 'По_клиентам',
        summary_product: 'По_продукции',
        invoices: 'Накладные',
        matrix: 'Матрица',
      };
      const typeLabel = typeLabels[reportType];
      const fileName = `Отчёт_${typeLabel}_${periodStr}.xlsx`;

      if (reportType === 'matrix') {
        exportMatrixSheet(fileName);
        return;
      }

      const wb = XLSX.utils.book_new();
      if (reportType === 'orders') {
        exportOrdersSheet(wb);
      } else if (reportType === 'summary_client') {
        exportClientSummarySheet(wb);
      } else if (reportType === 'summary_product') {
        exportProductSummarySheet(wb);
      } else if (reportType === 'invoices') {
        exportInvoicesPerOutlet(wb);
      }
      XLSX.writeFile(wb, fileName);
    } catch (err) {
      console.error('Export error:', err);
    } finally {
      setExporting(false);
    }
  };

  // ─── Sheet: All orders (detailed, one row per item) ───
  const exportOrdersSheet = (wb: XLSX.WorkBook) => {
    const header = [
      [COMPANY_INFO.name],
      [`БИН: ${COMPANY_INFO.bin}`],
      [`Адрес: ${COMPANY_INFO.address}`],
      [],
      [`Отчёт по заказам за период: ${formatDateRu(new Date(dateFrom))} – ${formatDateRu(new Date(dateTo))}`],
      [`Дата формирования: ${formatDateTimeRu(new Date())}`],
      [`Всего заказов: ${filteredOrders.length} | Общая сумма: ${totalAmount.toLocaleString('ru-RU')} ₸`],
      [],
      ['№', 'Дата заказа', 'Клиент', 'Компания', 'Точка', 'Адрес точки', 'Позиция', 'Кол-во', 'Ед.', 'Цена за ед. (₸)', 'Сумма (₸)', 'Статус', 'Примечание'],
    ];

    let rowNum = 1;
    const rows: (string | number)[][] = [];

    filteredOrders.forEach(order => {
      const client = clientMap.get(order.clientId);
      order.items.forEach((item, idx) => {
        rows.push([
          idx === 0 ? rowNum : '',
          idx === 0 ? formatDateTimeRu(order.createdAt) : '',
          idx === 0 ? order.clientName : '',
          idx === 0 ? (client?.companyName || '—') : '',
          idx === 0 ? order.outletName : '',
          idx === 0 ? order.outletAddress : '',
          getLocalizedName(item.productName),
          item.quantity,
          item.unit,
          item.price,
          item.subtotal,
          idx === 0 ? STATUS_LABELS[order.status] : '',
          idx === 0 ? (order.notes || '') : '',
        ]);
      });
      // Order total row
      rows.push([
        '', '', '', '', '', '', '', '', '', 'ИТОГО по заказу:', order.totalAmount, '', '',
      ]);
      rowNum++;
    });

    // Grand total
    rows.push([]);
    rows.push(['', '', '', '', '', '', '', '', '', 'ИТОГО:', totalAmount, '', '']);

    const allData = [...header, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(allData);
    ws['!cols'] = autoFitColumns(allData);

    XLSX.utils.book_append_sheet(wb, ws, 'Заказы');
  };

  // ─── Sheet: Summary by client ───
  const exportClientSummarySheet = (wb: XLSX.WorkBook) => {
    const header = [
      [COMPANY_INFO.name],
      [`БИН: ${COMPANY_INFO.bin}`],
      [],
      [`Сводка по клиентам за период: ${formatDateRu(new Date(dateFrom))} – ${formatDateRu(new Date(dateTo))}`],
      [`Дата формирования: ${formatDateTimeRu(new Date())}`],
      [],
      ['№', 'Клиент', 'Компания', 'Кол-во заказов', 'Доставлено', 'Отменено', 'Общая сумма (₸)', 'Сумма доставленных (₸)'],
    ];

    // Aggregate by client
    const clientAgg = new Map<string, {
      name: string;
      company: string;
      total: number;
      delivered: number;
      cancelled: number;
      amount: number;
      deliveredAmount: number;
    }>();

    filteredOrders.forEach(order => {
      const key = order.clientId;
      const existing = clientAgg.get(key) || {
        name: order.clientName,
        company: clientMap.get(order.clientId)?.companyName || '—',
        total: 0,
        delivered: 0,
        cancelled: 0,
        amount: 0,
        deliveredAmount: 0,
      };
      existing.total++;
      existing.amount += order.totalAmount;
      if (order.status === 'delivered') {
        existing.delivered++;
        existing.deliveredAmount += order.totalAmount;
      }
      if (order.status === 'cancelled') existing.cancelled++;
      clientAgg.set(key, existing);
    });

    const rows: (string | number)[][] = [];
    let idx = 1;
    let grandTotal = 0;
    let grandDelivered = 0;

    Array.from(clientAgg.values())
      .sort((a, b) => b.amount - a.amount)
      .forEach(c => {
        rows.push([
          idx++,
          c.name,
          c.company,
          c.total,
          c.delivered,
          c.cancelled,
          c.amount,
          c.deliveredAmount,
        ]);
        grandTotal += c.amount;
        grandDelivered += c.deliveredAmount;
      });

    rows.push([]);
    rows.push(['', '', 'ИТОГО:', clientAgg.size, '', '', grandTotal, grandDelivered]);

    const allData = [...header, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(allData);
    ws['!cols'] = autoFitColumns(allData);
    XLSX.utils.book_append_sheet(wb, ws, 'По клиентам');
  };

  // ─── Sheet: Summary by product ───
  const exportProductSummarySheet = (wb: XLSX.WorkBook) => {
    const header = [
      [COMPANY_INFO.name],
      [`БИН: ${COMPANY_INFO.bin}`],
      [],
      [`Сводка по продукции за период: ${formatDateRu(new Date(dateFrom))} – ${formatDateRu(new Date(dateTo))}`],
      [`Дата формирования: ${formatDateTimeRu(new Date())}`],
      [],
      ['№', 'Наименование продукции', 'Ед. измерения', 'Кол-во заказано', 'Сумма (₸)', 'Средняя цена (₸)', 'Кол-во заказов'],
    ];

    // Only count delivered or non-cancelled
    const activeOrders = filteredOrders.filter(o => o.status !== 'cancelled');

    const productAgg = new Map<string, {
      name: string;
      unit: string;
      quantity: number;
      amount: number;
      ordersCount: Set<string>;
    }>();

    activeOrders.forEach(order => {
      order.items.forEach(item => {
        const key = item.productId;
        const existing = productAgg.get(key) || {
          name: getLocalizedName(item.productName),
          unit: item.unit,
          quantity: 0,
          amount: 0,
          ordersCount: new Set<string>(),
        };
        existing.quantity += item.quantity;
        existing.amount += item.subtotal;
        existing.ordersCount.add(order.id);
        productAgg.set(key, existing);
      });
    });

    const rows: (string | number)[][] = [];
    let idx = 1;
    let grandQty = 0;
    let grandAmount = 0;

    Array.from(productAgg.values())
      .sort((a, b) => b.amount - a.amount)
      .forEach(p => {
        const avgPrice = p.quantity > 0 ? Math.round(p.amount / p.quantity) : 0;
        rows.push([
          idx++,
          p.name,
          p.unit,
          p.quantity,
          p.amount,
          avgPrice,
          p.ordersCount.size,
        ]);
        grandQty += p.quantity;
        grandAmount += p.amount;
      });

    rows.push([]);
    rows.push(['', 'ИТОГО:', '', grandQty, grandAmount, '', '']);

    const allData = [...header, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(allData);
    ws['!cols'] = autoFitColumns(allData);
    XLSX.utils.book_append_sheet(wb, ws, 'По продукции');
  };

  // ─── Sheet: Invoices per outlet (накладные) ───
  const exportInvoicesPerOutlet = (wb: XLSX.WorkBook) => {
    // Group orders by outletId
    const outletGroups = new Map<string, {
      outletName: string;
      outletAddress: string;
      clientName: string;
      orders: WorkshopOrder[];
    }>();

    filteredOrders.forEach(order => {
      const key = order.outletId;
      const existing = outletGroups.get(key);
      if (existing) {
        existing.orders.push(order);
      } else {
        outletGroups.set(key, {
          outletName: order.outletName,
          outletAddress: order.outletAddress,
          clientName: order.clientName,
          orders: [order],
        });
      }
    });

    // Aggregate products per outlet across all orders
    let sheetIdx = 0;
    const summaryRows: (string | number)[][] = [];

    outletGroups.forEach((group) => {
      sheetIdx++;
      const { outletName, outletAddress, clientName, orders: outletOrders } = group;

      // Merge all items from all orders into a single product list
      const productMap = new Map<string, {
        name: string;
        unit: string;
        price: number;
        quantity: number;
        subtotal: number;
      }>();

      outletOrders.forEach(order => {
        order.items.forEach(item => {
          const key = item.productId;
          const existing = productMap.get(key);
          if (existing) {
            existing.quantity += item.quantity;
            existing.subtotal += item.subtotal;
          } else {
            productMap.set(key, {
              name: getLocalizedName(item.productName),
              unit: item.unit,
              price: item.price,
              quantity: item.quantity,
              subtotal: item.subtotal,
            });
          }
        });
      });

      const outletTotal = Array.from(productMap.values()).reduce((s, p) => s + p.subtotal, 0);

      // Clean invoice header
      const header: (string | number)[][] = [
        ['НАКЛАДНАЯ'],
        [`${formatDateRu(new Date(dateFrom))} – ${formatDateRu(new Date(dateTo))}`],
        [],
        [`Клиент: ${clientName}`],
        [`Точка: ${outletName}`],
        ...(outletAddress ? [[`Адрес: ${outletAddress}`] as (string | number)[]] : []),
        [],
        ['№', 'Наименование', 'Кол-во', 'Ед.', 'Цена (₸)', 'Сумма (₸)'],
      ];

      // Product rows sorted alphabetically
      const rows: (string | number)[][] = [];
      let lineNum = 1;

      Array.from(productMap.values())
        .sort((a, b) => a.name.localeCompare(b.name, 'ru'))
        .forEach(product => {
          const unitPrice = product.quantity > 0 ? Math.round(product.subtotal / product.quantity) : product.price;
          rows.push([
            lineNum++,
            product.name,
            product.quantity,
            product.unit,
            unitPrice,
            product.subtotal,
          ]);
        });

      // Total
      rows.push([]);
      rows.push(['', '', '', '', 'ИТОГО:', outletTotal]);
      rows.push([]);
      rows.push(['Отпустил ___________________', '', '', '', 'Получил ___________________', '']);

      const allData = [...header, ...rows];
      const ws = XLSX.utils.aoa_to_sheet(allData);
      ws['!cols'] = autoFitColumns(allData);

      // Sheet name: truncate to 31 chars (Excel limit)
      const rawName = `${sheetIdx}. ${outletName}`;
      const sheetName = rawName.length > 31 ? rawName.slice(0, 31) : rawName;
      XLSX.utils.book_append_sheet(wb, ws, sheetName);

      // Collect for summary
      summaryRows.push([
        sheetIdx,
        clientName,
        outletName,
        outletOrders.length,
        outletTotal,
      ]);
    });

    // Summary sheet
    const summaryHeader: (string | number)[][] = [
      ['СВОДКА НАКЛАДНЫХ'],
      [`Период: ${formatDateRu(new Date(dateFrom))} – ${formatDateRu(new Date(dateTo))}`],
      [`Дата: ${formatDateTimeRu(new Date())}`],
      [],
      ['№', 'Клиент', 'Точка', 'Заказов', 'Сумма (₸)'],
    ];

    summaryRows.push([]);
    summaryRows.push(['', '', 'ИТОГО:', filteredOrders.length, totalAmount]);

    const summaryData = [...summaryHeader, ...summaryRows];
    const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
    summaryWs['!cols'] = autoFitColumns(summaryData);

    // Insert summary as the first sheet
    XLSX.utils.book_append_sheet(wb, summaryWs, 'Сводка');
    // Move summary sheet to first position
    const sheetNames = wb.SheetNames;
    const lastIdx = sheetNames.length - 1;
    const summaryName = sheetNames.splice(lastIdx, 1)[0];
    sheetNames.unshift(summaryName);
  };

  // ─── Matrix data: products × outlets ───
  interface MatrixData {
    productNames: string[];           // row labels (product names)
    outletNames: string[];            // column labels (outlet names)
    grid: number[][];                 // grid[productIdx][outletIdx] = quantity
    productTotals: number[];          // total qty per product (ИТОГО column)
    outletTotals: number[];           // total qty per outlet (всего row)
    outletCroissants: number[];       // croissant qty per outlet
    outletCroissantAmounts: number[]; // monetary sum for croissants per outlet
    outletAmounts: number[];          // sum of item subtotals per outlet (товарная стоимость)
    outletDiscountedAmounts: number[];// sum with discounts per outlet (order.totalAmount)
    grandTotal: number;               // total quantity all
    grandCroissants: number;          // total croissants
    grandCroissantAmount: number;     // total monetary amount for croissants
    grandAmount: number;              // total monetary amount (from item subtotals)
    grandDiscountedAmount: number;    // total with discounts applied
    productPrices: number[];          // price per unit for each product
    productUnits: string[];           // unit for each product
    isCroissant: boolean[];           // whether product is a croissant
  }

  /** Build matrix for a set of orders, using provided product/outlet lists for consistency */
  const buildMatrix = (
    dayOrders: WorkshopOrder[],
    allProductIds: string[],
    allProductInfo: Map<string, { name: string; price: number; unit: string }>,
    allOutletIds: string[],
    allOutletNames: string[],
  ): MatrixData => {
    // qty map: productId → outletId → quantity
    const qtyMap = new Map<string, Map<string, number>>();
    // subtotal-based amount per outlet (raw goods value, NOT order.totalAmount)
    const amountMap = new Map<string, number>();
    // discounted amount per outlet (order.totalAmount, with discounts applied)
    const discountedAmountMap = new Map<string, number>();

    dayOrders.forEach(order => {
      // Track discounted total per outlet
      discountedAmountMap.set(order.outletId, (discountedAmountMap.get(order.outletId) || 0) + order.totalAmount);
      order.items.forEach(item => {
        const pid = item.productId;
        if (!qtyMap.has(pid)) qtyMap.set(pid, new Map());
        const pMap = qtyMap.get(pid)!;
        pMap.set(order.outletId, (pMap.get(order.outletId) || 0) + item.quantity);
        // Amount from item subtotals (price × qty), not from discounted totalAmount
        amountMap.set(order.outletId, (amountMap.get(order.outletId) || 0) + item.subtotal);
      });
    });

    const productNames = allProductIds.map(pid => allProductInfo.get(pid)?.name || '');
    const productPrices = allProductIds.map(pid => allProductInfo.get(pid)?.price || 0);
    const productUnits = allProductIds.map(pid => allProductInfo.get(pid)?.unit || '');

    const grid: number[][] = allProductIds.map(pid => {
      const pMap = qtyMap.get(pid);
      return allOutletIds.map(oid => pMap?.get(oid) || 0);
    });

    const productTotals = grid.map(row => row.reduce((s, v) => s + v, 0));
    const outletTotals = allOutletIds.map((_, oi) => grid.reduce((s, row) => s + row[oi], 0));
    const isCroissant = productNames.map(name => /круассан/i.test(name));
    const outletCroissants = allOutletIds.map((_, oi) =>
      grid.reduce((s, row, pi) => s + (isCroissant[pi] ? row[oi] : 0), 0)
    );
    const outletCroissantAmounts = allOutletIds.map((_, oi) =>
      grid.reduce((s, row, pi) => s + (isCroissant[pi] ? row[oi] * productPrices[pi] : 0), 0)
    );
    const outletAmounts = allOutletIds.map(oid => amountMap.get(oid) || 0);
    const outletDiscountedAmounts = allOutletIds.map(oid => discountedAmountMap.get(oid) || 0);

    return {
      productNames,
      outletNames: allOutletNames,
      grid,
      productTotals,
      outletTotals,
      outletCroissants,
      outletCroissantAmounts,
      outletAmounts,
      outletDiscountedAmounts,
      grandTotal: outletTotals.reduce((s, v) => s + v, 0),
      grandCroissants: outletCroissants.reduce((s, v) => s + v, 0),
      grandCroissantAmount: outletCroissantAmounts.reduce((s, v) => s + v, 0),
      grandAmount: outletAmounts.reduce((s, v) => s + v, 0),
      grandDiscountedAmount: outletDiscountedAmounts.reduce((s, v) => s + v, 0),
      productPrices,
      productUnits,
      isCroissant,
    };
  };

  /** Collect all unique products and outlets across all active orders */
  const matrixMeta = useMemo(() => {
    if (reportType !== 'matrix' || filteredOrders.length === 0) return null;
    const activeOrders = filteredOrders.filter(o => o.status !== 'cancelled');
    if (activeOrders.length === 0) return null;

    const outletSet = new Map<string, string>();
    const productSet = new Map<string, { name: string; price: number; unit: string }>();

    activeOrders.forEach(order => {
      if (!outletSet.has(order.outletId)) outletSet.set(order.outletId, order.outletName);
      order.items.forEach(item => {
        if (!productSet.has(item.productId)) {
          productSet.set(item.productId, { name: getLocalizedName(item.productName), price: item.price, unit: item.unit });
        }
      });
    });

    const outletEntries = Array.from(outletSet.entries()).sort((a, b) => {
      const aOwn = ownOutletIds.includes(a[0]);
      const bOwn = ownOutletIds.includes(b[0]);
      if (aOwn !== bOwn) return aOwn ? -1 : 1;
      return a[1].localeCompare(b[1], 'ru');
    });
    const productEntries = Array.from(productSet.entries()).sort((a, b) => a[1].name.localeCompare(b[1].name, 'ru'));

    return {
      activeOrders,
      allOutletIds: outletEntries.map(e => e[0]),
      allOutletNames: outletEntries.map(e => e[1]),
      allProductIds: productEntries.map(e => e[0]),
      allProductInfo: productSet,
    };
  }, [filteredOrders, reportType, ownOutletIds]);

  // Aggregate matrix for inline preview
  const matrixData = useMemo<MatrixData | null>(() => {
    if (!matrixMeta) return null;
    return buildMatrix(matrixMeta.activeOrders, matrixMeta.allProductIds, matrixMeta.allProductInfo, matrixMeta.allOutletIds, matrixMeta.allOutletNames);
  }, [matrixMeta]);

  // ─── Sheet: Matrix (products × outlets) — one sheet per day ───
  const exportMatrixSheet = (fileName: string) => {
    if (!matrixMeta) return;
    const { activeOrders, allProductIds, allProductInfo, allOutletIds, allOutletNames } = matrixMeta;

    const buildStyledSheet = (sheetLabel: string, m: ReturnType<typeof buildMatrix>) => {
      // Build rows as plain arrays first
      const allData: (string | number)[][] = [
        [sheetLabel],
        ['', 'Наименование', 'ИТОГО', ...allOutletNames],
        ...m.productNames.map((name, pi) => [
          pi + 1, name, m.productTotals[pi] || '', ...m.grid[pi].map(v => v || ''),
        ]),
        [],
        ['', 'всего', m.grandTotal, ...m.outletTotals.map(v => v || '')],
        ['', 'кол-во Круассанов', m.grandCroissants, ...m.outletCroissants.map(v => v || '')],
        ['', 'сумма за Круассаны', m.grandCroissantAmount || '', ...m.outletCroissantAmounts.map(v => v || '')],
        [],
        ['', 'сумма (без скидки)', m.grandAmount, ...m.outletAmounts.map(v => v || '')],
        ...(m.grandDiscountedAmount !== m.grandAmount
          ? [['', 'к оплате (со скидкой)', m.grandDiscountedAmount, ...m.outletDiscountedAmounts.map(v => v || '')]]
          : []),
      ];

      const ws = XLSXStyle.utils.aoa_to_sheet(allData);
      ws['!cols'] = autoFitColumns(allData);

      const BORDER = { style: 'thin', color: { rgb: 'AAAAAA' } };
      const CELL_BORDER = { top: BORDER, bottom: BORDER, left: BORDER, right: BORDER };

      // Apply borders to all data cells (skip empty rows)
      const numCols = 3 + allOutletIds.length;
      allData.forEach((row, ri) => {
        if (row.length === 0) return;
        for (let ci = 0; ci < numCols; ci++) {
          const addr = XLSXStyle.utils.encode_cell({ r: ri, c: ci });
          if (!ws[addr]) ws[addr] = { v: '', t: 's' };
          ws[addr].s = { ...(ws[addr].s || {}), border: CELL_BORDER };
        }
      });

      // Distinct pastel palette — cycles automatically per product index
      const AUTO_PALETTE = [
        'FFF3CD', 'D4EDDA', 'D1ECF1', 'F8D7DA', 'E2D9F3',
        'FCE5CD', 'D6EAF8', 'FDEBD0', 'D5F5E3', 'FADBD8',
        'EBF5FB', 'F4ECF7', 'FEF9E7', 'E8F8F5', 'FDEDEC',
      ];

      // Apply row fill colors (product rows start at row index 2)
      m.productNames.forEach((_, pi) => {
        const pid = allProductIds[pi];
        const manualColor = productColorMap.get(pid);
        const rgb = manualColor
          ? manualColor.replace('#', '').toUpperCase()
          : AUTO_PALETTE[pi % AUTO_PALETTE.length];
        const rowIdx = 2 + pi; // 0: title, 1: header, 2+: products
        for (let ci = 0; ci < numCols; ci++) {
          const addr = XLSXStyle.utils.encode_cell({ r: rowIdx, c: ci });
          if (!ws[addr]) ws[addr] = { v: '', t: 's' };
          ws[addr].s = { fill: { patternType: 'solid', fgColor: { rgb } }, font: { color: { rgb: '000000' } }, border: CELL_BORDER };
        }
      });

      return ws;
    };

    // Group orders by date (DD.MM)
    const dayGroups = new Map<string, { label: string; sortKey: string; orders: WorkshopOrder[] }>();
    activeOrders.forEach(order => {
      const d = order.createdAt;
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const label = `${dd}.${mm}`;
      const sortKey = `${d.getFullYear()}-${mm}-${dd}`;
      const group = dayGroups.get(sortKey);
      if (group) { group.orders.push(order); } else {
        dayGroups.set(sortKey, { label, sortKey, orders: [order] });
      }
    });

    const sortedDays = Array.from(dayGroups.values()).sort((a, b) => a.sortKey.localeCompare(b.sortKey));

    const wb = XLSXStyle.utils.book_new();

    sortedDays.forEach(day => {
      const m = buildMatrix(day.orders, allProductIds, allProductInfo, allOutletIds, allOutletNames);
      XLSXStyle.utils.book_append_sheet(wb, buildStyledSheet(day.label, m), day.label);
    });

    if (sortedDays.length > 1 && matrixData) {
      const period = `${sortedDays[0].label} – ${sortedDays[sortedDays.length - 1].label}`;
      const name = `Сводка ${period}`;
      XLSXStyle.utils.book_append_sheet(wb, buildStyledSheet(name, matrixData), 'Сводка');
    }

    // Write and trigger browser download
    const wbout: ArrayBuffer = XLSXStyle.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ─── Quick presets ───
  const setPreset = (preset: 'today' | 'week' | 'month' | 'quarter') => {
    const today = new Date();
    let from: Date;
    switch (preset) {
      case 'today':
        from = today;
        break;
      case 'week': {
        from = new Date(today);
        from.setDate(today.getDate() - 7);
        break;
      }
      case 'month':
        from = new Date(today.getFullYear(), today.getMonth(), 1);
        break;
      case 'quarter': {
        const q = Math.floor(today.getMonth() / 3) * 3;
        from = new Date(today.getFullYear(), q, 1);
        break;
      }
    }
    setDateFrom(toDateStr(from));
    setDateTo(toDateStr(today));
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#3D0A11] via-[#4D0E16] to-[#5A0D17] text-white px-5 pt-10 pb-4">
        <div className="flex items-center gap-3">
          <DocumentArrowDownIcon className="w-7 h-7" />
          <div>
            <h1 className="text-xl font-bold">Отчёты</h1>
            <p className="text-white/60 text-sm mt-0.5">Выгрузка в Excel для бухгалтерии</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4 max-w-xl mx-auto">
        {/* Date range */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card>
            <CardHeader className="flex items-center gap-2">
              <CalendarDaysIcon className="w-5 h-5 text-workshop-500" />
              <h3 className="font-semibold text-slate-900">Период</h3>
            </CardHeader>
            <CardBody className="space-y-3">
              {/* Quick presets */}
              <div className="flex flex-wrap gap-2">
                {([
                  ['today', 'Сегодня'],
                  ['week', 'Неделя'],
                  ['month', 'Месяц'],
                  ['quarter', 'Квартал'],
                ] as const).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => setPreset(key)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-workshop-50 text-workshop-700 hover:bg-workshop-100 transition-colors"
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">С</label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={e => setDateFrom(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-workshop-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">По</label>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={e => setDateTo(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-workshop-500"
                  />
                </div>
              </div>
            </CardBody>
          </Card>
        </motion.div>

        {/* Filters */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <Card>
            <CardHeader className="flex items-center gap-2">
              <FunnelIcon className="w-5 h-5 text-slate-500" />
              <h3 className="font-semibold text-slate-900">Фильтр по статусу</h3>
            </CardHeader>
            <CardBody>
              <div className="flex flex-wrap gap-2">
                {(['all', 'delivered', 'pending', 'confirmed', 'in_production', 'ready', 'cancelled'] as const).map(s => (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                      ${statusFilter === s
                        ? 'bg-workshop-500 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                  >
                    {s === 'all' ? 'Все статусы' : STATUS_LABELS[s]}
                  </button>
                ))}
              </div>
            </CardBody>
          </Card>
        </motion.div>

        {/* Report type */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card>
            <CardHeader className="flex items-center gap-2">
              <TableCellsIcon className="w-5 h-5 text-emerald-500" />
              <h3 className="font-semibold text-slate-900">Тип отчёта</h3>
            </CardHeader>
            <CardBody className="space-y-2">
              {([
                { key: 'matrix' as ReportType, label: 'Матрица (продукция × точки)', desc: 'Таблица: строки — продукты, столбцы — точки, ячейки — кол-во' },
                { key: 'orders' as ReportType, label: 'Детальный по заказам', desc: 'Каждый заказ с позициями, клиентом, точкой' },
                { key: 'invoices' as ReportType, label: 'Накладные по точкам', desc: 'Отдельный лист на каждую точку — для отдачи клиенту' },
                { key: 'summary_client' as ReportType, label: 'Сводка по клиентам', desc: 'Итоги по каждому клиенту: заказы, суммы' },
                { key: 'summary_product' as ReportType, label: 'Сводка по продукции', desc: 'Кол-во и суммы по каждому наименованию' },
              ]).map(rt => (
                <button
                  key={rt.key}
                  onClick={() => setReportType(rt.key)}
                  className={`w-full text-left p-3 rounded-xl border transition-all ${
                    reportType === rt.key
                      ? 'border-workshop-500 bg-workshop-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <p className={`text-sm font-semibold ${reportType === rt.key ? 'text-workshop-700' : 'text-slate-800'}`}>
                    {rt.label}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">{rt.desc}</p>
                </button>
              ))}
            </CardBody>
          </Card>
        </motion.div>

        {/* Load & Preview */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          {!loaded ? (
            <Button fullWidth onClick={loadData} loading={loading} size="lg">
              <ChartBarIcon className="w-5 h-5 mr-2" />
              Загрузить данные
            </Button>
          ) : (
            <div className="space-y-4">
              {/* Stats */}
              <div className="grid grid-cols-2 gap-3">
                <StatCard
                  icon={TableCellsIcon}
                  label="Заказов"
                  value={filteredOrders.length.toString()}
                  sub={`Сумма: ${totalAmount.toLocaleString('ru-RU')} ₸`}
                  color="bg-blue-50 text-blue-600"
                />
                <StatCard
                  icon={DocumentArrowDownIcon}
                  label="Доставлено"
                  value={deliveredOrders.length.toString()}
                  sub={`${deliveredAmount.toLocaleString('ru-RU')} ₸`}
                  color="bg-green-50 text-green-600"
                />
                <StatCard
                  icon={BuildingOffice2Icon}
                  label="Клиентов"
                  value={uniqueClients.toString()}
                  color="bg-purple-50 text-purple-600"
                />
                <StatCard
                  icon={ChartBarIcon}
                  label="Средний чек"
                  value={filteredOrders.length > 0 ? `${Math.round(totalAmount / filteredOrders.length).toLocaleString('ru-RU')} ₸` : '0'}
                  color="bg-amber-50 text-amber-600"
                />
              </div>

              {/* Preview table (first 5 orders) */}
              {filteredOrders.length > 0 && (
                <Card>
                  <CardHeader>
                    <h3 className="font-semibold text-slate-900 text-sm">
                      Предпросмотр ({Math.min(5, filteredOrders.length)} из {filteredOrders.length})
                    </h3>
                  </CardHeader>
                  <CardBody className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200">
                            <th className="text-left px-3 py-2 font-semibold text-slate-600">Дата</th>
                            <th className="text-left px-3 py-2 font-semibold text-slate-600">Клиент</th>
                            <th className="text-left px-3 py-2 font-semibold text-slate-600">Точка</th>
                            <th className="text-right px-3 py-2 font-semibold text-slate-600">Сумма</th>
                            <th className="text-center px-3 py-2 font-semibold text-slate-600">Статус</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredOrders.slice(0, 5).map(order => (
                            <tr key={order.id} className="border-b border-slate-100 last:border-0">
                              <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{formatDateRu(order.createdAt)}</td>
                              <td className="px-3 py-2 text-slate-800 font-medium">{order.clientName}</td>
                              <td className="px-3 py-2 text-slate-600">{order.outletName}</td>
                              <td className="px-3 py-2 text-right font-semibold text-slate-900">{order.totalAmount.toLocaleString('ru-RU')} ₸</td>
                              <td className="px-3 py-2 text-center">
                                <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                  order.status === 'delivered' ? 'bg-green-100 text-green-700'
                                  : order.status === 'cancelled' ? 'bg-red-100 text-red-700'
                                  : 'bg-amber-100 text-amber-700'
                                }`}>
                                  {STATUS_LABELS[order.status]}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardBody>
                </Card>
              )}

              {/* ── Inline Invoice Preview (Накладные) ── */}
              {reportType === 'invoices' && invoices.length > 0 && (
                <Card>
                  <CardHeader className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <BuildingOffice2Icon className="w-5 h-5 text-workshop-500" />
                      <h3 className="font-semibold text-slate-900 text-sm">
                        Накладные ({invoices.length})
                      </h3>
                    </div>
                    <button
                      onClick={handlePrint}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                    >
                      <PrinterIcon className="w-4 h-4" />
                      Печать
                    </button>
                  </CardHeader>
                  <CardBody className="p-0">
                    <div ref={invoiceRef} className="divide-y divide-slate-200">
                      {invoices.map((inv, idx) => (
                        <div key={inv.outletId} className="invoice-page p-5">
                          {/* Title */}
                          <h2 className="text-base font-bold tracking-widest uppercase text-slate-800 border-b-2 border-slate-800 pb-1.5 mb-3">
                            Накладная №{idx + 1}
                          </h2>

                          {/* Meta */}
                          <div className="text-xs text-slate-500 leading-relaxed mb-3 space-y-0.5">
                            <p>
                              <span className="font-semibold text-slate-700">Период:</span>{' '}
                              {formatDateRu(new Date(dateFrom))} – {formatDateRu(new Date(dateTo))}
                            </p>
                            <p>
                              <span className="font-semibold text-slate-700">Клиент:</span>{' '}
                              {inv.clientName}
                              {inv.company ? ` (${inv.company})` : ''}
                            </p>
                            <p>
                              <span className="font-semibold text-slate-700">Точка:</span>{' '}
                              {inv.outletName}
                            </p>
                            {inv.outletAddress && (
                              <p>
                                <span className="font-semibold text-slate-700">Адрес:</span>{' '}
                                {inv.outletAddress}
                              </p>
                            )}
                          </div>

                          {/* Table */}
                          <div className="overflow-x-auto -mx-5 px-5">
                            <table className="w-full text-xs border-collapse">
                              <thead>
                                <tr className="bg-slate-100">
                                  <th className="border border-slate-300 px-2.5 py-2 text-left font-semibold text-slate-600 w-8">№</th>
                                  <th className="border border-slate-300 px-2.5 py-2 text-left font-semibold text-slate-600">Наименование</th>
                                  <th className="border border-slate-300 px-2.5 py-2 text-right font-semibold text-slate-600 w-14">Кол-во</th>
                                  <th className="border border-slate-300 px-2.5 py-2 text-left font-semibold text-slate-600 w-10">Ед.</th>
                                  <th className="border border-slate-300 px-2.5 py-2 text-right font-semibold text-slate-600 w-20">Цена (₸)</th>
                                  <th className="border border-slate-300 px-2.5 py-2 text-right font-semibold text-slate-600 w-24">Сумма (₸)</th>
                                </tr>
                              </thead>
                              <tbody>
                                {inv.lines.map((line, li) => (
                                  <tr key={li} className={li % 2 === 1 ? 'bg-slate-50' : ''}>
                                    <td className="border border-slate-200 px-2.5 py-1.5 text-slate-500">{li + 1}</td>
                                    <td className="border border-slate-200 px-2.5 py-1.5 text-slate-800 font-medium">{line.name}</td>
                                    <td className="border border-slate-200 px-2.5 py-1.5 text-right tabular-nums text-slate-700">{line.qty}</td>
                                    <td className="border border-slate-200 px-2.5 py-1.5 text-slate-500">{line.unit}</td>
                                    <td className="border border-slate-200 px-2.5 py-1.5 text-right tabular-nums text-slate-700">{line.price.toLocaleString('ru-RU')}</td>
                                    <td className="border border-slate-200 px-2.5 py-1.5 text-right tabular-nums font-semibold text-slate-900">{line.sum.toLocaleString('ru-RU')}</td>
                                  </tr>
                                ))}
                              </tbody>
                              <tfoot>
                                <tr className="bg-slate-100 border-t-2 border-slate-400">
                                  <td colSpan={5} className="border border-slate-300 px-2.5 py-2 text-right font-bold text-slate-800">ИТОГО:</td>
                                  <td className="border border-slate-300 px-2.5 py-2 text-right font-bold tabular-nums text-slate-900 text-sm">{inv.total.toLocaleString('ru-RU')} ₸</td>
                                </tr>
                              </tfoot>
                            </table>
                          </div>

                          {/* Signatures */}
                          <div className="flex justify-between mt-5 text-xs text-slate-500">
                            <p>Отпустил <span className="inline-block w-36 border-b border-slate-400 ml-1" /></p>
                            <p>Получил <span className="inline-block w-36 border-b border-slate-400 ml-1" /></p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardBody>
                </Card>
              )}

              {/* ── Inline Matrix Preview ── */}
              {reportType === 'matrix' && matrixData && (
                <Card>
                  <CardHeader className="flex items-center gap-2">
                    <TableCellsIcon className="w-5 h-5 text-workshop-500" />
                    <h3 className="font-semibold text-slate-900 text-sm">
                      Матрица продукция × точки
                    </h3>
                  </CardHeader>
                  <CardBody className="p-0">
                    <div className="overflow-x-auto">
                      <table className="text-xs border-collapse min-w-max">
                        <thead>
                          <tr className="bg-slate-100">
                            <th className="sticky left-0 bg-slate-100 z-10 border border-slate-300 px-2 py-2 text-left font-semibold text-slate-600 min-w-[40px]">№</th>
                            <th className="sticky left-[40px] bg-slate-100 z-10 border border-slate-300 px-2 py-2 text-left font-semibold text-slate-600 min-w-[180px]">Наименование</th>
                            <th className="border border-slate-300 px-2 py-2 text-center font-bold text-slate-800 min-w-[50px] bg-amber-50">ИТОГО</th>
                            {matrixData.outletNames.map((name, i) => (
                              <th key={i} className="border border-slate-300 px-2 py-2 text-center font-semibold text-slate-600 min-w-[50px] whitespace-nowrap">
                                <span className="writing-vertical text-[10px]">{name}</span>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {matrixData.productNames.map((name, pi) => {
                            const pid = matrixMeta!.allProductIds[pi];
                            const rowColor = productColorMap.get(pid);
                            return (
                            <tr key={pi} style={rowColor ? { backgroundColor: rowColor } : undefined} className={!rowColor ? (pi % 2 === 0 ? 'bg-white' : 'bg-slate-50') : ''}>
                              <td className="sticky left-0 z-10 border border-slate-200 px-2 py-1.5 text-slate-500 text-center bg-inherit">{pi + 1}</td>
                              <td className="sticky left-[40px] z-10 border border-slate-200 px-2 py-1.5 font-medium text-slate-800 bg-inherit">{name}</td>
                              <td className="border border-slate-200 px-2 py-1.5 text-center font-bold text-slate-900 bg-amber-50">
                                {matrixData.productTotals[pi] || ''}
                              </td>
                              {matrixData.grid[pi].map((qty, oi) => (
                                <td key={oi} className="border border-slate-200 px-2 py-1.5 text-center tabular-nums text-slate-700">
                                  {qty || ''}
                                </td>
                              ))}
                            </tr>
                            );
                          })}
                        </tbody>
                        <tfoot>
                          <tr className="bg-slate-200 font-bold">
                            <td className="sticky left-0 bg-slate-200 z-10 border border-slate-300 px-2 py-2"></td>
                            <td className="sticky left-[40px] bg-slate-200 z-10 border border-slate-300 px-2 py-2 text-slate-800">всего</td>
                            <td className="border border-slate-300 px-2 py-2 text-center text-slate-900 bg-amber-100">{matrixData.grandTotal}</td>
                            {matrixData.outletTotals.map((v, i) => (
                              <td key={i} className="border border-slate-300 px-2 py-2 text-center tabular-nums text-slate-800">{v || ''}</td>
                            ))}
                          </tr>
                          <tr className="bg-orange-50 font-semibold">
                            <td className="sticky left-0 bg-orange-50 z-10 border border-slate-300 px-2 py-2"></td>
                            <td className="sticky left-[40px] bg-orange-50 z-10 border border-slate-300 px-2 py-2 text-orange-700">кол-во Круассанов</td>
                            <td className="border border-slate-300 px-2 py-2 text-center text-orange-800 bg-orange-100">{matrixData.grandCroissants}</td>
                            {matrixData.outletCroissants.map((v, i) => (
                              <td key={i} className="border border-slate-300 px-2 py-2 text-center tabular-nums text-orange-700">{v || ''}</td>
                            ))}
                          </tr>
                          <tr className="bg-green-50 font-semibold">
                            <td className="sticky left-0 bg-green-50 z-10 border border-slate-300 px-2 py-2"></td>
                            <td className="sticky left-[40px] bg-green-50 z-10 border border-slate-300 px-2 py-2 text-green-700">Сумма (₸)</td>
                            <td className="border border-slate-300 px-2 py-2 text-center text-green-800 bg-green-100">{matrixData.grandAmount.toLocaleString('ru-RU')}</td>
                            {matrixData.outletAmounts.map((v, i) => (
                              <td key={i} className="border border-slate-300 px-2 py-2 text-center tabular-nums text-green-700">{v ? v.toLocaleString('ru-RU') : ''}</td>
                            ))}
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </CardBody>
                </Card>
              )}

              {/* Export button */}
              <Button
                fullWidth
                size="lg"
                onClick={handleExport}
                loading={exporting}
                disabled={filteredOrders.length === 0}
              >
                <DocumentArrowDownIcon className="w-5 h-5 mr-2" />
                Скачать Excel ({reportType === 'orders' ? 'Детальный' : reportType === 'invoices' ? 'Накладные' : reportType === 'summary_client' ? 'По клиентам' : reportType === 'matrix' ? 'Матрица' : 'По продукции'})
              </Button>

              {filteredOrders.length === 0 && (
                <p className="text-center text-sm text-slate-400">
                  Нет данных за выбранный период
                </p>
              )}

              {/* Refresh */}
              <button
                onClick={loadData}
                className="w-full text-center text-xs text-workshop-500 hover:text-workshop-700 py-2"
              >
                Обновить данные
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default ReportsPage;
