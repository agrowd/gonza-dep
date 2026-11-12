/**
 * Smart Print & PDF Exporter for iOS, Mobile, PWA and Desktop.
 * - In iOS / Mobile: Generates a high-quality A4 PDF with desktop print proportions (compact Goldilocks, 1 single page)
 *   and opens the native iOS Share Sheet with AirPrint.
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

  // Capture options ensuring Desktop A4 layout regardless of mobile screen width
  const captureOptions = {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: '#ffffff',
    windowWidth: 850,
    windowHeight: 1200,
    onclone: (clonedDoc, clonedEl) => {
      // 1. Force the cloned iframe document body to desktop A4 width
      if (clonedDoc.body) {
        clonedDoc.body.style.width = '850px';
        clonedDoc.body.style.minWidth = '850px';
        clonedDoc.body.style.maxWidth = '850px';
        clonedDoc.body.style.margin = '0 auto';
        clonedDoc.body.style.padding = '0';
        clonedDoc.body.style.backgroundColor = '#ffffff';
        clonedDoc.body.style.overflow = 'visible';
      }

      // 2. Add class and ensure cloned element has standard A4 print dimensions
      if (clonedEl) {
        clonedEl.classList.add('pdfCaptureA4');
        clonedEl.style.width = '780px';
        clonedEl.style.minWidth = '780px';
        clonedEl.style.maxWidth = '780px';
        clonedEl.style.margin = '0 auto';
        clonedEl.style.boxSizing = 'border-box';
        clonedEl.style.backgroundColor = '#ffffff';
      }

      // 3. Inject A4 print styles directly into cloned iframe head to override any mobile screen styles
      const styleEl = clonedDoc.createElement('style');
      styleEl.innerHTML = `
        @media all {
          html, body {
            width: 850px !important;
            min-width: 850px !important;
            max-width: 850px !important;
            margin: 0 auto !important;
            padding: 0 !important;
            background: #ffffff !important;
          }

          .pdfCaptureA4, [data-a4-sheet="true"] {
            width: 780px !important;
            min-width: 780px !important;
            max-width: 780px !important;
            padding: 14px 18px !important;
            margin: 0 auto !important;
            background-color: #ffffff !important;
            box-sizing: border-box !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            overflow: visible !important;
          }

          .pdfCaptureA4 header, [data-a4-sheet="true"] header {
            display: flex !important;
            justify-content: space-between !important;
            align-items: center !important;
            border-bottom: 2px solid #7a1f1e !important;
            padding-bottom: 0.35rem !important;
            margin-bottom: 0.4rem !important;
          }

          .pdfCaptureA4 img, [data-a4-sheet="true"] img {
            height: 38px !important;
            width: auto !important;
            max-width: 110px !important;
          }

          .pdfCaptureA4 h1, [data-a4-sheet="true"] h1 {
            font-size: 1.15rem !important;
            color: #7a1f1e !important;
            margin: 0 0 0.1rem 0 !important;
            font-weight: 700 !important;
            letter-spacing: 0.02em !important;
          }

          .pdfCaptureA4 table, [data-a4-sheet="true"] table {
            width: 100% !important;
            table-layout: fixed !important;
            border-collapse: collapse !important;
            margin-top: 0.25rem !important;
          }

          .pdfCaptureA4 colgroup col:nth-child(1), [data-a4-sheet="true"] colgroup col:nth-child(1) {
            width: 26% !important;
          }
          .pdfCaptureA4 colgroup col:nth-child(2), [data-a4-sheet="true"] colgroup col:nth-child(2) {
            width: 32% !important;
          }
          .pdfCaptureA4 colgroup col:nth-child(3), [data-a4-sheet="true"] colgroup col:nth-child(3) {
            width: 42% !important;
          }

          .pdfCaptureA4 th, [data-a4-sheet="true"] th {
            background-color: #f7f6f2 !important;
            border-bottom: 2px solid #7a1f1e !important;
            color: #7a1f1e !important;
            padding: 0.35rem 0.45rem !important;
            font-size: 0.74rem !important;
            font-weight: 700 !important;
          }

          .pdfCaptureA4 td, [data-a4-sheet="true"] td {
            border-bottom: 1px solid #e0e0e0 !important;
            padding: 0.35rem 0.45rem !important;
            font-size: 0.8rem !important;
            line-height: 1.22 !important;
          }

          .pdfCaptureA4 footer, [data-a4-sheet="true"] footer {
            display: block !important;
            margin-top: 0.6rem !important;
            padding-top: 0.3rem !important;
            font-size: 0.65rem !important;
            border-top: 1px solid #e5e5e5 !important;
          }

          .pdf-page {
            width: 850px !important;
            max-width: 850px !important;
            min-width: 850px !important;
            margin: 0 auto !important;
            box-sizing: border-box !important;
          }
        }
      `;
      clonedDoc.head.appendChild(styleEl);
    }
  };

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
      const canvas = await html2canvas(pageEl, captureOptions);
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
    const canvas = await html2canvas(element, captureOptions);
    
    const contentHeightMm = (canvas.height * contentWidthMm) / canvas.width;

    // Up to 15% overflow can scale to fit on 1 single page without awkward orphan splits
    const singlePageThresholdMm = maxPageHeightMm * 1.15;

    if (contentHeightMm <= singlePageThresholdMm) {
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

      pdf.addImage(
        canvas.toDataURL('image/jpeg', 0.95),
        'JPEG',
        renderX,
        renderY,
        renderWidth,
        renderHeight
      );
    } else {
      // Genuine multi-page table (> 1.15 pages) -> Slice cleanly
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

  const isMobileDevice = isIOS || (typeof navigator !== 'undefined' && /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));

  // On iOS / mobile devices:
  // Sharing a PDF file summons the native OS Share sheet with AirPrint, "Guardar en Archivos" and WhatsApp!
  if (typeof navigator !== 'undefined' && navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
    try {
      await navigator.share({
        files: [pdfFile],
        title,
        text: title
      });
      return;
    } catch (err) {
      if (err.name === 'AbortError') return; // User cancelled share sheet
      console.warn('navigator.share failed, falling back to open/download:', err);
    }
  }

  const blobUrl = URL.createObjectURL(pdfBlob);

  if (isMobileDevice) {
    // Mobile WebKit / Chrome blocks programmatic <a download> on blob URLs.
    // Opening in a new window/tab displays the PDF natively with full save/share controls.
    window.open(blobUrl, '_blank');
    setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
    return;
  }

  // Desktop: Standard download link
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = pdfFile.name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
}
