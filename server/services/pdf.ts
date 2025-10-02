import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { Booking, User, Service, Address } from '@shared/schema';
import { bilingual } from '../utils/bilingual';

interface InvoiceData {
  booking: Booking;
  user: User;
  service: Service;
  address: Address;
  items: Array<{
    description: string;
    quantity: number;
    unit_price: number;
    total: number;
  }>;
  subtotal: number;
  vat_amount: number;
  total_amount: number;
}

class PDFService {
  private uploadsDir: string;

  constructor() {
    this.uploadsDir = path.join(process.cwd(), 'uploads', 'invoices');
    
    // Ensure uploads directory exists
    if (!fs.existsSync(this.uploadsDir)) {
      fs.mkdirSync(this.uploadsDir, { recursive: true });
    }
  }

  async generateInvoice(booking: Booking, language: string = 'en'): Promise<{
    invoice_number: string;
    pdf_url: string;
    download_url: string;
  }> {
    const isArabic = language === 'ar';
    const invoiceNumber = `INV-${new Date().getFullYear()}-${booking.id.slice(-8).toUpperCase()}`;
    const filename = `${invoiceNumber}.pdf`;
    const filepath = path.join(this.uploadsDir, filename);

    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margin: 50,
          font: isArabic ? 'Times-Roman' : 'Helvetica', // Use system fonts for Arabic support
        });

        // Pipe the PDF to a file
        const stream = fs.createWriteStream(filepath);
        doc.pipe(stream);

        // Set text direction for Arabic
        if (isArabic) {
          doc.text('', 0, 0, { align: 'right' });
        }

        // Header
        this.addHeader(doc, invoiceNumber, isArabic);
        
        // Company Info
        this.addCompanyInfo(doc, isArabic);
        
        // Customer Info
        this.addCustomerInfo(doc, booking, isArabic);
        
        // Invoice Details
        this.addInvoiceDetails(doc, booking, isArabic);
        
        // Items Table
        this.addItemsTable(doc, booking, isArabic);
        
        // Total Section
        this.addTotalSection(doc, booking, isArabic);
        
        // Footer
        this.addFooter(doc, isArabic);

        // Finalize the PDF
        doc.end();

        stream.on('finish', () => {
          const baseUrl = process.env.APP_URL || 'https://api.cleanserve.sa';
          resolve({
            invoice_number: invoiceNumber,
            pdf_url: `${baseUrl}/uploads/invoices/${filename}`,
            download_url: `${baseUrl}/api/v2/invoices/${invoiceNumber}/download`,
          });
        });

        stream.on('error', reject);

      } catch (error) {
        reject(error);
      }
    });
  }

  private addHeader(doc: PDFKit.PDFDocument, invoiceNumber: string, isArabic: boolean): void {
    const logoX = isArabic ? doc.page.width - 150 : 50;
    const textX = isArabic ? 50 : doc.page.width - 200;

    // Logo placeholder (you can add actual logo here)
    doc.fontSize(24)
       .fillColor('#2563eb')
       .text('🧽', logoX, 50)
       .fontSize(20)
       .text(isArabic ? 'كلين سيرف' : 'CleanServe', logoX + 30, 55);

    // Invoice title and number
    doc.fontSize(28)
       .fillColor('#1f2937')
       .text(isArabic ? 'فاتورة' : 'INVOICE', textX, 50, { align: isArabic ? 'right' : 'left' });
    
    doc.fontSize(14)
       .fillColor('#6b7280')
       .text(`${isArabic ? 'رقم الفاتورة:' : 'Invoice #'} ${invoiceNumber}`, textX, 85, { align: isArabic ? 'right' : 'left' });
    
    // Date
    doc.text(`${isArabic ? 'التاريخ:' : 'Date:'} ${bilingual.formatDate(new Date(), language)}`, textX, 105, { align: isArabic ? 'right' : 'left' });
  }

  private addCompanyInfo(doc: PDFKit.PDFDocument, isArabic: boolean): void {
    const startX = isArabic ? doc.page.width - 250 : 50;
    
    doc.fontSize(12)
       .fillColor('#1f2937')
       .text(isArabic ? 'كلين سيرف للخدمات المنزلية' : 'CleanServe Home Services', startX, 150, { align: isArabic ? 'right' : 'left' })
       .text(isArabic ? 'الرياض، المملكة العربية السعودية' : 'Riyadh, Saudi Arabia', startX, 165, { align: isArabic ? 'right' : 'left' })
       .text(isArabic ? 'هاتف: +966 11 234 5678' : 'Phone: +966 11 234 5678', startX, 180, { align: isArabic ? 'right' : 'left' })
       .text('support@cleanserve.sa', startX, 195, { align: isArabic ? 'right' : 'left' })
       .text(isArabic ? 'الرقم الضريبي: 300123456789003' : 'VAT Number: 300123456789003', startX, 210, { align: isArabic ? 'right' : 'left' });
  }

  private addCustomerInfo(doc: PDFKit.PDFDocument, booking: any, isArabic: boolean): void {
    const startX = isArabic ? 50 : doc.page.width - 250;
    
    doc.fontSize(14)
       .fillColor('#1f2937')
       .text(isArabic ? 'فاتورة إلى:' : 'Bill To:', startX, 150, { align: isArabic ? 'right' : 'left' });
    
    doc.fontSize(12)
       .text(booking.user?.name || 'Customer', startX, 170, { align: isArabic ? 'right' : 'left' })
       .text(booking.user?.email || '', startX, 185, { align: isArabic ? 'right' : 'left' })
       .text(booking.user?.phone || '', startX, 200, { align: isArabic ? 'right' : 'left' })
       .text(booking.address?.address || '', startX, 215, { align: isArabic ? 'right' : 'left', width: 200 });
  }

  private addInvoiceDetails(doc: PDFKit.PDFDocument, booking: any, isArabic: boolean): void {
    const y = 280;
    
    // Draw line
    doc.strokeColor('#e5e7eb')
       .lineWidth(1)
       .moveTo(50, y - 10)
       .lineTo(doc.page.width - 50, y - 10)
       .stroke();

    doc.fontSize(12)
       .fillColor('#374151');

    if (isArabic) {
      doc.text(`معرف الطلب: ${booking.id}`, doc.page.width - 200, y, { align: 'right' })
         .text(`تاريخ الخدمة: ${bilingual.formatDate(booking.scheduledDate, 'ar')}`, doc.page.width - 200, y + 15, { align: 'right' })
         .text(`وقت الخدمة: ${bilingual.formatTime(booking.scheduledTime, 'ar')}`, doc.page.width - 200, y + 30, { align: 'right' });
    } else {
      doc.text(`Order ID: ${booking.id}`, 50, y)
         .text(`Service Date: ${bilingual.formatDate(booking.scheduledDate, 'en')}`, 50, y + 15)
         .text(`Service Time: ${bilingual.formatTime(booking.scheduledTime, 'en')}`, 50, y + 30);
    }
  }

  private addItemsTable(doc: PDFKit.PDFDocument, booking: any, isArabic: boolean): void {
    const tableTop = 350;
    const tableLeft = 50;
    const tableWidth = doc.page.width - 100;
    
    // Table headers
    doc.fontSize(12)
       .fillColor('#374151');

    const headers = isArabic 
      ? ['الإجمالي', 'السعر', 'الكمية', 'الوصف']
      : ['Total', 'Price', 'Qty', 'Description'];
    
    const colWidths = [100, 80, 60, tableWidth - 240];
    let x = isArabic ? tableLeft + tableWidth - colWidths[0] : tableLeft;

    // Draw header background
    doc.rect(tableLeft, tableTop - 5, tableWidth, 25)
       .fillColor('#f8fafc')
       .fill();

    doc.fillColor('#374151');

    headers.forEach((header, i) => {
      const colX = isArabic ? x : tableLeft + colWidths.slice(0, i).reduce((a, b) => a + b, 0);
      doc.text(header, colX, tableTop + 5, { width: colWidths[i], align: isArabic ? 'right' : 'left' });
    });

    // Table rows
    let currentY = tableTop + 35;
    
    // Main service
    const servicePrice = parseFloat(booking.serviceCost.toString());
    const discountAmount = parseFloat(booking.discountAmount?.toString() || '0');
    const netServicePrice = servicePrice - discountAmount;

    this.addTableRow(doc, {
      description: isArabic ? 'خدمة التنظيف' : 'Cleaning Service',
      quantity: 1,
      price: netServicePrice,
      total: netServicePrice
    }, currentY, tableLeft, colWidths, isArabic);

    currentY += 25;

    // Spare parts if any
    const sparePartsCost = parseFloat(booking.sparePartsCost?.toString() || '0');
    if (sparePartsCost > 0) {
      this.addTableRow(doc, {
        description: isArabic ? 'قطع الغيار' : 'Spare Parts',
        quantity: 1,
        price: sparePartsCost,
        total: sparePartsCost
      }, currentY, tableLeft, colWidths, isArabic);
      currentY += 25;
    }

    // Draw bottom line
    doc.strokeColor('#e5e7eb')
       .lineWidth(1)
       .moveTo(tableLeft, currentY + 5)
       .lineTo(tableLeft + tableWidth, currentY + 5)
       .stroke();
  }

  private addTableRow(doc: PDFKit.PDFDocument, item: any, y: number, tableLeft: number, colWidths: number[], isArabic: boolean): void {
    doc.fontSize(11)
       .fillColor('#1f2937');

    const values = [
      `${item.total.toFixed(2)} ${isArabic ? 'ريال' : 'SAR'}`,
      `${item.price.toFixed(2)} ${isArabic ? 'ريال' : 'SAR'}`,
      item.quantity.toString(),
      item.description
    ];

    values.forEach((value, i) => {
      const colIndex = isArabic ? i : values.length - 1 - i;
      const colX = tableLeft + colWidths.slice(0, colIndex).reduce((a, b) => a + b, 0);
      doc.text(value, colX, y, { width: colWidths[colIndex], align: isArabic ? 'right' : 'left' });
    });
  }

  private addTotalSection(doc: PDFKit.PDFDocument, booking: any, isArabic: boolean): void {
    const startY = 480;
    const rightX = doc.page.width - 200;
    const leftX = rightX - 100;

    const subtotal = parseFloat(booking.serviceCost.toString()) + parseFloat(booking.sparePartsCost?.toString() || '0');
    const discountAmount = parseFloat(booking.discountAmount?.toString() || '0');
    const vatAmount = parseFloat(booking.vatAmount.toString());
    const totalAmount = parseFloat(booking.totalAmount.toString());

    doc.fontSize(12)
       .fillColor('#374151');

    // Subtotal
    doc.text(isArabic ? 'المجموع الفرعي:' : 'Subtotal:', leftX, startY, { align: isArabic ? 'right' : 'left' });
    doc.text(`${subtotal.toFixed(2)} ${isArabic ? 'ريال' : 'SAR'}`, rightX, startY, { align: 'right' });

    // Discount (if any)
    if (discountAmount > 0) {
      doc.text(isArabic ? 'الخصم:' : 'Discount:', leftX, startY + 20, { align: isArabic ? 'right' : 'left' });
      doc.text(`-${discountAmount.toFixed(2)} ${isArabic ? 'ريال' : 'SAR'}`, rightX, startY + 20, { align: 'right' });
    }

    // VAT
    const vatY = discountAmount > 0 ? startY + 40 : startY + 20;
    doc.text(isArabic ? 'ضريبة القيمة المضافة (15%):' : 'VAT (15%):', leftX, vatY, { align: isArabic ? 'right' : 'left' });
    doc.text(`${vatAmount.toFixed(2)} ${isArabic ? 'ريال' : 'SAR'}`, rightX, vatY, { align: 'right' });

    // Draw line above total
    const totalY = vatY + 25;
    doc.strokeColor('#374151')
       .lineWidth(2)
       .moveTo(leftX, totalY - 5)
       .lineTo(rightX + 100, totalY - 5)
       .stroke();

    // Total
    doc.fontSize(16)
       .fillColor('#1f2937');
    doc.text(isArabic ? 'الإجمالي:' : 'Total:', leftX, totalY, { align: isArabic ? 'right' : 'left' });
    doc.text(`${totalAmount.toFixed(2)} ${isArabic ? 'ريال' : 'SAR'}`, rightX, totalY, { align: 'right' });
  }

  private addFooter(doc: PDFKit.PDFDocument, isArabic: boolean): void {
    const footerY = doc.page.height - 100;

    // Draw line
    doc.strokeColor('#e5e7eb')
       .lineWidth(1)
       .moveTo(50, footerY - 20)
       .lineTo(doc.page.width - 50, footerY - 20)
       .stroke();

    doc.fontSize(10)
       .fillColor('#6b7280')
       .text(
         isArabic 
           ? 'شكراً لك لاختيار خدماتنا. لأي استفسارات، يرجى الاتصال بنا على support@cleanserve.sa'
           : 'Thank you for choosing our services. For any inquiries, please contact us at support@cleanserve.sa',
         50,
         footerY,
         { align: 'center', width: doc.page.width - 100 }
       );

    doc.text(
      isArabic
        ? 'هذه فاتورة مُنشأة إلكترونياً ولا تتطلب توقيعاً.'
        : 'This is an electronically generated invoice and does not require a signature.',
      50,
      footerY + 20,
      { align: 'center', width: doc.page.width - 100 }
    );
  }

  async generateReceiptPDF(paymentData: any, language: string = 'en'): Promise<string> {
    const isArabic = language === 'ar';
    const receiptNumber = `RCP-${Date.now()}`;
    const filename = `${receiptNumber}.pdf`;
    const filepath = path.join(this.uploadsDir, filename);

    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ size: 'A4', margin: 50 });
        const stream = fs.createWriteStream(filepath);
        doc.pipe(stream);

        // Header
        doc.fontSize(20)
           .fillColor('#2563eb')
           .text(isArabic ? 'إيصال دفع' : 'Payment Receipt', 50, 50, { align: 'center' });

        doc.fontSize(14)
           .fillColor('#374151')
           .text(`${isArabic ? 'رقم الإيصال:' : 'Receipt #'} ${receiptNumber}`, 50, 100)
           .text(`${isArabic ? 'التاريخ:' : 'Date:'} ${bilingual.formatDate(new Date(), language)}`, 50, 120);

        // Payment details
        doc.text(`${isArabic ? 'المبلغ المدفوع:' : 'Amount Paid:'} ${paymentData.amount} ${isArabic ? 'ريال' : 'SAR'}`, 50, 160)
           .text(`${isArabic ? 'طريقة الدفع:' : 'Payment Method:'} ${paymentData.method}`, 50, 180)
           .text(`${isArabic ? 'حالة الدفع:' : 'Payment Status:'} ${paymentData.status}`, 50, 200);

        doc.end();

        stream.on('finish', () => {
          const baseUrl = process.env.APP_URL || 'https://api.cleanserve.sa';
          resolve(`${baseUrl}/uploads/invoices/${filename}`);
        });

        stream.on('error', reject);
      } catch (error) {
        reject(error);
      }
    });
  }

  async generateReportPDF(reportData: any, reportType: string, language: string = 'en'): Promise<string> {
    const isArabic = language === 'ar';
    const filename = `report-${reportType}-${Date.now()}.pdf`;
    const filepath = path.join(this.uploadsDir, filename);

    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ size: 'A4', margin: 50 });
        const stream = fs.createWriteStream(filepath);
        doc.pipe(stream);

        // Add report content based on type
        doc.fontSize(18)
           .text(isArabic ? `تقرير ${reportType}` : `${reportType} Report`, 50, 50);

        doc.fontSize(12)
           .text(`${isArabic ? 'تاريخ الإنشاء:' : 'Generated on:'} ${bilingual.formatDate(new Date(), language)}`, 50, 80);

        // Add report data
        let y = 120;
        Object.entries(reportData).forEach(([key, value]) => {
          doc.text(`${key}: ${value}`, 50, y);
          y += 20;
        });

        doc.end();

        stream.on('finish', () => {
          const baseUrl = process.env.APP_URL || 'https://api.cleanserve.sa';
          resolve(`${baseUrl}/uploads/invoices/${filename}`);
        });

        stream.on('error', reject);
      } catch (error) {
        reject(error);
      }
    });
  }
}

export const pdfService = new PDFService();
