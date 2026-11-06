/**
 * Smart Print & PDF Exporter for iOS, Mobile, PWA and Desktop.
 * - In iOS Standalone / PWA: Generates a high-quality PDF and opens the native iOS Share Sheet (AirPrint / Save to Files / WhatsApp).
 * - In Desktop / Laptop: Uses standard window.print() for instant native browser print dialog, or direct PDF download.
 */
export async function exportOrPrintElement({
  element,
  filename = 'documento.pdf',
  title = 'Documento',
  forcePdf = false
}) {
  if (!element) return;

  const isIOS = typeof navigator !== 'undefined' && (
    /iPad|iPhone|iPod/.test(navigator.userAgent) || 
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
  const isStandalone = typeof window !== 'undefined' && (
    window.navigator.standalone === true || 
    (typeof window.matchMedia === 'function' && window.matchMedia('(display-mode: standalone)').matches)
  );

  // If desktop and not forcing PDF download, standard window.print() is instant and perfect
  if (!forcePdf && !isIOS && !isStandalone) {
    window.print();
    return;
  }

  // Dynamic imports for SSR safety and lightweight initial bundle
  const { default: html2canvas } = await import('html2canvas');
  const { default: jsPDF } = await import('jspdf');

  const pdf = new jsPDF('p', 'mm', 'a4');
  const pdfWidth = pdf.internal.pageSize.getWidth(); // 210mm
  const pdfHeight = pdf.internal.pageSize.getHeight(); // 297mm
  const marginMm = 8;
  const contentWidthMm = pdfWidth - (marginMm * 2); // 194mm
  const maxPageHeightMm = pdfHeight - (marginMm * 2); // 281mm

  // Check if element has explicit multi-page structure (e.g. .pdf-page in informe-mensual)
  let pdfPages = [];
  if (element.querySelectorAll) {
    pdfPages = Array.from(element.querySelectorAll('.pdf-page'));
  }
  if (pdfPages.length === 0 && element.classList?.contains('pdf-page')) {
    pdfPages = [element];
  }

  if (pdfPages.length > 0) {
    for (let i = 0; i < pdfPages.length; i++) {
      if (i > 0) pdf.addPage();
      const pageEl = pdfPages[i];
      const canvas = await html2canvas(pageEl, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const contentHeightMm = (canvas.height * contentWidthMm) / canvas.width;

      let renderWidth = contentWidthMm;
      let renderHeight = contentHeightMm;
      let renderX = marginMm;
      let renderY = marginMm;

      if (renderHeight > maxPageHeightMm) {
        const ratio = maxPageHeightMm / renderHeight;
        renderHeight = maxPageHeightMm;
        renderWidth = renderWidth * ratio;
        renderX = marginMm + (contentWidthMm - renderWidth) / 2;
      }
      pdf.addImage(imgData, 'JPEG', renderX, renderY, renderWidth, renderHeight);
    }
  } else {
    // Single container (e.g. .sheet or .receiptBox)
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff'
    });
    
    const contentHeightMm = (canvas.height * contentWidthMm) / canvas.width;

    if (contentHeightMm <= maxPageHeightMm) {
      pdf.addImage(
        canvas.toDataURL('image/jpeg', 0.95),
        'JPEG',
        marginMm,
        marginMm,
        contentWidthMm,
        contentHeightMm
      );
    } else {
      // Clean canvas slicing for multi-page tables (avoids negative coordinate clipping bugs)
      const pageHeightPx = Math.floor((maxPageHeightMm * canvas.width) / contentWidthMm);
      let sY = 0;
      let pageIndex = 0;

      while (sY < canvas.height) {
        if (pageIndex > 0) pdf.addPage();

        const sHeight = Math.min(pageHeightPx, canvas.height - sY);
        const pageCanvas = document.createElement('canvas');
        pageCanvas.width = canvas.width;
        pageCanvas.height = sHeight;
        const ctx = pageCanvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, pageCanvas.width, sHeight);
        ctx.drawImage(
          canvas,
          0,
          sY,
          canvas.width,
          sHeight,
          0,
          0,
          canvas.width,
          sHeight
        );

        const sliceData = pageCanvas.toDataURL('image/jpeg', 0.95);
        const sliceHeightMm = (sHeight * contentWidthMm) / canvas.width;
        pdf.addImage(sliceData, 'JPEG', marginMm, marginMm, contentWidthMm, sliceHeightMm);

        sY += sHeight;
        pageIndex++;
      }
    }
  }

  const safeFilename = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
  const pdfBlob = pdf.output('blob');
  const pdfFile = new File([pdfBlob], safeFilename, { type: 'application/pdf' });

  // On iOS / mobile devices:
  // Sharing a PDF file summons the native OS Share sheet with AirPrint built-in!
  if (!forcePdf && typeof navigator !== 'undefined' && navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
    try {
      await navigator.share({
        files: [pdfFile],
        title,
        text: title
      });
      return;
    } catch (err) {
      if (err.name === 'AbortError') return; // User cancelled share sheet
      console.warn('navigator.share failed, falling back to download:', err);
    }
  }

  // Fallback: Trigger download / open blob URL
  const blobUrl = URL.createObjectURL(pdfBlob);
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = pdfFile.name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
}
