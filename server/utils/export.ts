// @ts-ignore - json2csv types issue
import { Parser } from 'json2csv';
import ExcelJS from 'exceljs';

export interface AnalyticsExportData {
  summary: any;
  technicianPerformance?: any[];
  bookings?: any[];
  payments?: any[];
  auditLogs?: any[];
}

export async function exportToCSV(data: AnalyticsExportData, reportType: string): Promise<string> {
  let csvData: any[] = [];
  let fields: string[] = [];

  switch (reportType) {
    case 'analytics':
      // Summary stats
      csvData.push({
        metric: 'Total Orders',
        value: data.summary.total_orders || 0
      });
      csvData.push({
        metric: 'Completed Orders',
        value: data.summary.completed_orders || 0
      });
      csvData.push({
        metric: 'Total Revenue',
        value: data.summary.total_revenue || 0
      });
      csvData.push({
        metric: 'Wallet Revenue',
        value: data.summary.wallet_revenue || 0
      });
      csvData.push({
        metric: 'Moyasar Revenue',
        value: data.summary.moyasar_revenue || 0
      });
      csvData.push({
        metric: 'Tabby Revenue',
        value: data.summary.tabby_revenue || 0
      });
      fields = ['metric', 'value'];
      break;

    case 'technicians':
      csvData = data.technicianPerformance || [];
      fields = ['technician_name', 'total_orders', 'completed_orders', 'average_rating', 'total_earnings'];
      break;

    case 'bookings':
      csvData = data.bookings || [];
      fields = ['id', 'customer_name', 'service', 'status', 'total_amount', 'created_at', 'completed_at'];
      break;

    case 'payments':
      csvData = data.payments || [];
      fields = ['id', 'booking_id', 'amount', 'payment_method', 'status', 'created_at'];
      break;

    case 'financial':
      // Revenue breakdown
      csvData.push({
        metric: 'Total Revenue',
        amount: data.summary.total_revenue || 0,
        percentage: 100
      });
      csvData.push({
        metric: 'Wallet Payments',
        amount: data.summary.wallet_revenue || 0,
        percentage: ((data.summary.wallet_revenue || 0) / (data.summary.total_revenue || 1) * 100).toFixed(2)
      });
      csvData.push({
        metric: 'Moyasar Payments',
        amount: data.summary.moyasar_revenue || 0,
        percentage: ((data.summary.moyasar_revenue || 0) / (data.summary.total_revenue || 1) * 100).toFixed(2)
      });
      csvData.push({
        metric: 'Tabby Payments',
        amount: data.summary.tabby_revenue || 0,
        percentage: ((data.summary.tabby_revenue || 0) / (data.summary.total_revenue || 1) * 100).toFixed(2)
      });
      fields = ['metric', 'amount', 'percentage'];
      break;

    default:
      throw new Error('Invalid report type');
  }

  const parser = new Parser({ fields });
  return parser.parse(csvData);
}

export async function exportToExcel(data: AnalyticsExportData, reportType: string): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Cleaning Services Admin';
  workbook.created = new Date();

  switch (reportType) {
    case 'analytics': {
      // Summary sheet
      const summarySheet = workbook.addWorksheet('Summary');
      summarySheet.columns = [
        { header: 'Metric', key: 'metric', width: 30 },
        { header: 'Value', key: 'value', width: 20 }
      ];
      summarySheet.addRow({ metric: 'Total Orders', value: data.summary.total_orders || 0 });
      summarySheet.addRow({ metric: 'Completed Orders', value: data.summary.completed_orders || 0 });
      summarySheet.addRow({ metric: 'Cancelled Orders', value: data.summary.cancelled_orders || 0 });
      summarySheet.addRow({ metric: 'Total Revenue (SAR)', value: data.summary.total_revenue || 0 });
      summarySheet.addRow({ metric: 'Wallet Revenue (SAR)', value: data.summary.wallet_revenue || 0 });
      summarySheet.addRow({ metric: 'Moyasar Revenue (SAR)', value: data.summary.moyasar_revenue || 0 });
      summarySheet.addRow({ metric: 'Tabby Revenue (SAR)', value: data.summary.tabby_revenue || 0 });

      // Technician performance sheet
      if (data.technicianPerformance && data.technicianPerformance.length > 0) {
        const techSheet = workbook.addWorksheet('Technician Performance');
        techSheet.columns = [
          { header: 'Technician', key: 'technician_name', width: 30 },
          { header: 'Total Orders', key: 'total_orders', width: 15 },
          { header: 'Completed', key: 'completed_orders', width: 15 },
          { header: 'Avg Rating', key: 'average_rating', width: 15 },
          { header: 'Earnings (SAR)', key: 'total_earnings', width: 20 }
        ];
        data.technicianPerformance.forEach(tech => techSheet.addRow(tech));
      }
      break;
    }

    case 'financial': {
      // Revenue breakdown sheet
      const revenueSheet = workbook.addWorksheet('Revenue Breakdown');
      revenueSheet.columns = [
        { header: 'Payment Method', key: 'metric', width: 30 },
        { header: 'Amount (SAR)', key: 'amount', width: 20 },
        { header: 'Percentage', key: 'percentage', width: 15 }
      ];
      
      const totalRevenue = data.summary.total_revenue || 0;
      revenueSheet.addRow({
        metric: 'Total Revenue',
        amount: totalRevenue,
        percentage: '100%'
      });
      revenueSheet.addRow({
        metric: 'Wallet Payments',
        amount: data.summary.wallet_revenue || 0,
        percentage: `${((data.summary.wallet_revenue || 0) / (totalRevenue || 1) * 100).toFixed(2)}%`
      });
      revenueSheet.addRow({
        metric: 'Moyasar (Cards/Mada/Apple Pay)',
        amount: data.summary.moyasar_revenue || 0,
        percentage: `${((data.summary.moyasar_revenue || 0) / (totalRevenue || 1) * 100).toFixed(2)}%`
      });
      revenueSheet.addRow({
        metric: 'Tabby (Buy Now Pay Later)',
        amount: data.summary.tabby_revenue || 0,
        percentage: `${((data.summary.tabby_revenue || 0) / (totalRevenue || 1) * 100).toFixed(2)}%`
      });

      // Audit logs sheet
      if (data.auditLogs && data.auditLogs.length > 0) {
        const auditSheet = workbook.addWorksheet('Audit Logs');
        auditSheet.columns = [
          { header: 'Date', key: 'created_at', width: 20 },
          { header: 'Action', key: 'action', width: 25 },
          { header: 'Resource Type', key: 'resource_type', width: 20 },
          { header: 'Resource ID', key: 'resource_id', width: 35 },
          { header: 'User ID', key: 'user_id', width: 35 }
        ];
        data.auditLogs.forEach(log => auditSheet.addRow(log));
      }
      break;
    }

    case 'bookings': {
      if (data.bookings && data.bookings.length > 0) {
        const bookingsSheet = workbook.addWorksheet('Bookings');
        bookingsSheet.columns = [
          { header: 'Booking ID', key: 'id', width: 35 },
          { header: 'Customer', key: 'customer_name', width: 25 },
          { header: 'Service', key: 'service', width: 30 },
          { header: 'Status', key: 'status', width: 20 },
          { header: 'Amount (SAR)', key: 'total_amount', width: 15 },
          { header: 'Created At', key: 'created_at', width: 20 },
          { header: 'Completed At', key: 'completed_at', width: 20 }
        ];
        data.bookings.forEach(booking => bookingsSheet.addRow(booking));
      }
      break;
    }

    case 'technicians': {
      if (data.technicianPerformance && data.technicianPerformance.length > 0) {
        const techSheet = workbook.addWorksheet('Technician Performance');
        techSheet.columns = [
          { header: 'Technician', key: 'technician_name', width: 30 },
          { header: 'Total Orders', key: 'total_orders', width: 15 },
          { header: 'Completed', key: 'completed_orders', width: 15 },
          { header: 'Avg Rating', key: 'average_rating', width: 15 },
          { header: 'Earnings (SAR)', key: 'total_earnings', width: 20 }
        ];
        data.technicianPerformance.forEach(tech => techSheet.addRow(tech));
      }
      break;
    }

    case 'payments': {
      if (data.payments && data.payments.length > 0) {
        const paymentsSheet = workbook.addWorksheet('Payments');
        paymentsSheet.columns = [
          { header: 'Payment ID', key: 'id', width: 35 },
          { header: 'Booking ID', key: 'booking_id', width: 35 },
          { header: 'Amount (SAR)', key: 'amount', width: 15 },
          { header: 'Payment Method', key: 'payment_method', width: 20 },
          { header: 'Status', key: 'status', width: 15 },
          { header: 'Created At', key: 'created_at', width: 20 }
        ];
        data.payments.forEach(payment => paymentsSheet.addRow(payment));
      }
      break;
    }

    default:
      throw new Error('Invalid report type');
  }

  // Style header rows
  workbook.eachSheet(sheet => {
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };
  });

  return await workbook.xlsx.writeBuffer() as Buffer;
}
