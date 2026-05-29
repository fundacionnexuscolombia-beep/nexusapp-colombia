import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface RegistrationData {
    fullName: string;
    documentType: string;
    documentNumber: string;
    documentIssueDate: string;
    documentIssuePlace: string;
    birthDate: string;
    age: string;
    guardianName?: string;
    guardianDocument?: string;
    email: string;
    phone: string;
    cohort: string;
}

const loadImage = (url: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.src = url;
        img.crossOrigin = 'Anonymous';
        img.onload = () => resolve(img);
        img.onerror = reject;
    });
};

export const generateRegistrationDocument = async (data: RegistrationData) => {
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 10;                        // minimal side margins
    const contentWidth = pageWidth - margin * 2;
    const lineH = 3;                          // base line height in mm
    let yPos = 6;

    const sealSize = 22;                      // smaller seal — saves vertical space
    const sealX = pageWidth - margin - 52 + (52 / 2) - sealSize / 2;

    try {
        // -- Logo --
        try {
            const img = await loadImage('/assets/logo.png.png');
            const imgWidth = 28;
            const imgHeight = (img.height * imgWidth) / img.width;
            doc.addImage(img, 'PNG', (pageWidth - imgWidth) / 2, yPos, imgWidth, imgHeight);
            yPos += imgHeight + 2;
        } catch (e) {
            yPos += 8;
        }

        // -- Header --
        doc.setFontSize(10); doc.setFont('helvetica', 'bold');
        doc.text('FUNDACIÓN NEXUS COLOMBIA', pageWidth / 2, yPos, { align: 'center' });
        yPos += 4;

        doc.setFontSize(7); doc.setFont('helvetica', 'normal');
        doc.text('NIT: 901.888.996-1', pageWidth / 2, yPos, { align: 'center' });
        yPos += 4;

        doc.setFontSize(8.5); doc.setFont('helvetica', 'bold');
        doc.text('CONTRATO DE PRESTACIÓN DE SERVICIOS EDUCATIVOS', pageWidth / 2, yPos, { align: 'center' });
        yPos += 4;

        // -- Intro --
        doc.setFontSize(6.5); doc.setFont('helvetica', 'normal');
        const introText = `Entre los suscritos: FUNDACION NEXUS COLOMBIA NIT 901888996-1, domiciliada en BOGOTÁ D.C. (LA INSTITUCIÓN) y ${data.fullName} con ${data.documentType} ${data.documentNumber} (EL ESTUDIANTE), acuerdan el presente Contrato de Prestación de Servicios Educativos.`;
        const splitIntro = doc.splitTextToSize(introText, contentWidth);
        doc.text(splitIntro, margin, yPos);
        yPos += (splitIntro.length * lineH) + 3;

        // -- Student Info --
        doc.setFontSize(7.5); doc.setFont('helvetica', 'bold');
        doc.text('1. INFORMACIÓN DEL ESTUDIANTE', margin, yPos);
        yPos += 3.5;

        const programName = 'Taller de capacitación educación informal prepruebas de competencias para la Capacitación, inducción, orientación y apoyo para la presentación de Pruebas de reconocimiento de Competencias para el ICFES y/o convenios colegios virtuales 4 meses';

        const tableData: string[][] = [
            ['Nombre Completo', data.fullName],
            ['Identificación', `${data.documentType} ${data.documentNumber}`],
            ['Fecha/Lugar Exp.', `${data.documentIssueDate} - ${data.documentIssuePlace}`],
            ['Fecha Nacimiento', `${data.birthDate} (Edad: ${data.age} años)`],
        ];
        if (data.guardianName) {
            tableData.push(['Acudiente', data.guardianName]);
            tableData.push(['Doc. Acudiente', data.guardianDocument || '---']);
        }
        tableData.push(['Correo', data.email]);
        tableData.push(['Teléfono', data.phone]);
        tableData.push(['Cohorte/Grupo', data.cohort]);
        tableData.push(['Programa', programName]);

        autoTable(doc, {
            startY: yPos,
            body: tableData,
            theme: 'grid',
            styles: { fontSize: 6, cellPadding: 1.4, lineWidth: 0.1 },
            columnStyles: { 0: { fontStyle: 'bold', cellWidth: 32 } },
            margin: { left: margin, right: margin }
        });
        yPos = (doc as any).lastAutoTable.finalY + 4;

        // -- Clauses --
        doc.setFontSize(7.5); doc.setFont('helvetica', 'bold');
        doc.text('2. CLÁUSULAS DEL CONTRATO', margin, yPos);
        yPos += 3.5;

        const clauses = [
            { title: 'PRIMERA: OBJETO', content: 'LA INSTITUCIÓN prestará los servicios educativos descritos, facilitando acceso a NexusApp, materiales y tutoría académica.' },
            { title: 'SEGUNDA: COMPROMISOS DEL ESTUDIANTE', content: 'Cumplir horarios, mantener trato respetuoso, efectuar los pagos acordados y contar con medios tecnológicos básicos.' },
            { title: 'TERCERA: CONDICIONES ECONÓMICAS', content: 'Valor total $900.000 M/CTE. El incumplimiento de cuotas generará suspensión temporal del acceso sin exonerar obligaciones financieras.' },
            { title: 'CUARTA: PROPIEDAD INTELECTUAL', content: 'Los contenidos son propiedad de FUNDACIÓN NEXUS COLOMBIA. Prohibida su reproducción sin autorización.' },
            { title: 'QUINTA: DATOS PERSONALES', content: 'Ley 1581/2012: EL ESTUDIANTE autoriza el tratamiento de sus datos para fines académicos, administrativos y de comunicación.' },
            { title: 'SEXTA: FIRMA ELECTRÓNICA', content: 'La aceptación en NexusApp constituye firma electrónica válida (Ley 527/1999).' },
            { title: 'SÉPTIMA: TERMINACIÓN', content: 'Por cumplimiento del ciclo, mutuo acuerdo, o incumplimiento grave del reglamento institucional.' }
        ];

        doc.setFontSize(6.5);
        clauses.forEach(clause => {
            doc.setFont('helvetica', 'bold');
            doc.text(`CLÁUSULA ${clause.title}`, margin, yPos);
            yPos += lineH;
            doc.setFont('helvetica', 'normal');
            const split = doc.splitTextToSize(clause.content, contentWidth);
            doc.text(split, margin, yPos);
            yPos += (split.length * lineH) + 2.5;
        });

        // -- Signatures: reserve space equal to sealSize above the line --
        yPos += sealSize + 4;

        const signatureLineY = yPos;

        // Seal drawn fully above the institution line, never touching other text
        try {
            const sealImg = await loadImage('/assets/secretaria-seal.png');
            doc.addImage(sealImg, 'PNG', sealX, signatureLineY - sealSize, sealSize, sealSize);
        } catch (e) {
            console.warn('Seal load failed', e);
        }

        doc.line(margin, signatureLineY, margin + 52, signatureLineY);
        doc.line(pageWidth - margin - 52, signatureLineY, pageWidth - margin, signatureLineY);

        yPos = signatureLineY + 3.5;
        doc.setFontSize(7);
        doc.text(data.guardianName ? 'Firma del Acudiente' : 'Firma del Estudiante', margin, yPos);
        doc.text('Secretaría Académica', pageWidth - margin - 52, yPos);

        yPos += 3.5;
        if (data.guardianName) {
            doc.text(`${data.guardianName}`, margin, yPos);
            yPos += lineH;
            doc.text(`C.C. ${data.guardianDocument}`, margin, yPos);
        } else {
            doc.text(`${data.fullName}`, margin, yPos);
            yPos += lineH;
            doc.text(`C.C. ${data.documentNumber}`, margin, yPos);
        }

        // -- Footer --
        doc.setFontSize(6);
        doc.text('Generado automáticamente por NexusApp System', pageWidth / 2, 291, { align: 'center' });

        doc.save(`Contrato_Matricula_${data.documentNumber}.pdf`);

    } catch (error) {
        console.error('Error generating document:', error);
        alert('Error al generar el documento PDF');
    }
};
