import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Payment } from '../types';

const loadImage = (url: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.src = url;
        img.onload = () => resolve(img);
        img.onerror = reject;
    });
};

export const generateReceipt = async (payment: Payment, studentName: string) => {
    // Thermal printer paper is usually 80mm wide. 
    // Height is flexible, we set a reasonable max height.
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [80, 240]
    });

    try {
        // -- Logo --
        // Attempt to load logo. If it fails, we continue without it.
        // -- Logo & Header --
        let yPos = 10; // Initial padding

        try {
            const img = await loadImage('/assets/logo.png.png');
            const imgWidth = 35; // Slightly larger logo
            const imgHeight = (img.height * imgWidth) / img.width;
            const x = (80 - imgWidth) / 2;

            doc.addImage(img, 'PNG', x, yPos, imgWidth, imgHeight);

            // Update yPos to be below the image + padding
            yPos += imgHeight + 8;
        } catch (e) {
            console.warn('Logo load failed', e);
            yPos += 20; // Default spacing if no logo
        }

        // -- Header --
        // Start below the logo area (approx 25mm down)

        doc.setFontSize(11); // Slightly larger for thermal readability
        doc.setFont('helvetica', 'bold');
        doc.text('NEXUS ACADEMY', 40, yPos, { align: 'center' });
        yPos += 5;

        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.text('Educación de Calidad', 40, yPos, { align: 'center' });
        yPos += 4;
        doc.text('Nit: 900.123.456-7', 40, yPos, { align: 'center' }); // Generic NIT if unknown
        yPos += 6;

        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text('COMPROBANTE DE PAGO', 40, yPos, { align: 'center' });
        yPos += 5;

        // -- Info Block --
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text(`Fecha: ${new Date().toLocaleString()}`, 40, yPos, { align: 'center' });
        yPos += 5;
        doc.text(`Recibo N°: ${payment.id.split('-')[0].toUpperCase()}`, 40, yPos, { align: 'center' });
        yPos += 8;

        // -- Separator --
        doc.setLineWidth(0.1);
        doc.line(5, yPos, 75, yPos);
        yPos += 5;

        // -- Data Table --
        const data = [
            ['Estudiante:', studentName],
            ['Documento:', 'C.C./T.I.'], // Placeholder or need to fetch
            ['Concepto:', payment.concept],
            ['Método:', payment.payment_method || 'N/A'],
            ['Ref:', payment.transaction_id || 'N/A'],
            ['Estado:', 'PAGADO'],
        ];

        autoTable(doc, {
            startY: yPos,
            head: [],
            body: data,
            theme: 'plain',
            styles: {
                fontSize: 8,
                cellPadding: 1,
                overflow: 'linebreak',
                valign: 'top'
            },
            columnStyles: {
                0: { fontStyle: 'bold', cellWidth: 20 },
                1: { cellWidth: 50 },
            },
            margin: { left: 5, right: 5 },
        });

        // -- Total --
        yPos = (doc as any).lastAutoTable.finalY + 5;

        doc.setLineWidth(0.1);
        doc.line(5, yPos, 75, yPos);
        yPos += 6;

        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(`TOTAL: $ ${Number(payment.amount).toLocaleString()}`, 40, yPos, { align: 'center' });
        yPos += 8;

        // -- Footer --
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.text('Gracias por su pago.', 40, yPos, { align: 'center' });
        yPos += 4;
        doc.text('Conserve este recibo como soporte.', 40, yPos, { align: 'center' });
        yPos += 4;
        doc.text('www.nexusacademy.edu.co', 40, yPos, { align: 'center' });

        // -- Save --
        doc.save(`recibo_${payment.id.split('-')[0]}.pdf`);

    } catch (error) {
        console.error('Error generating receipt:', error);
        alert('Ocurrió un error al generar el recibo PDF.');
    }
};
