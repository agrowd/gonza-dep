'use client';

import { useState, useEffect, useRef, use } from 'react';
import Link from 'next/link';
import styles from './recibo.module.css';
import { exportOrPrintElement } from '@/lib/pdfExport.js';

export default function ReciboPage({ params }) {
  const unwrappedParams = use(params);
  const id = unwrappedParams.id;

  const receiptRef = useRef(null);
  const [receipt, setReceipt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/admin/turnos/${id}/recibo`)
      .then(res => {
        if (!res.ok) throw new Error('No se pudo cargar el recibo');
        return res.json();
      })
      .then(data => setReceipt(data))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  const handlePrint = async () => {
    if (isGenerating || !receiptRef.current) return;
    try {
      setIsGenerating(true);
      await exportOrPrintElement({
        element: receiptRef.current,
        filename: `Recibo_${receipt?.recibo?.numero || id}.pdf`,
        title: `Recibo Nº ${receipt?.recibo?.numero || id}`
      });
    } catch (err) {
      console.error('Error al imprimir recibo:', err);
      alert('No se pudo preparar la impresión del recibo.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (isGenerating || !receiptRef.current) return;
    try {
      setIsGenerating(true);
      await exportOrPrintElement({
        element: receiptRef.current,
        filename: `Recibo_${receipt?.recibo?.numero || id}.pdf`,
        title: `Recibo Nº ${receipt?.recibo?.numero || id}`,
        forcePdf: true
      });
    } catch (err) {
      console.error('Error al descargar PDF:', err);
      alert('No se pudo descargar el archivo PDF.');
    } finally {
      setIsGenerating(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 1rem', color: '#d4a54d', fontFamily: 'Arial, sans-serif' }}>
        Cargando recibo comercial...
      </div>
    );
  }

  if (error || !receipt) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 1rem', color: '#ef4444', fontFamily: 'Arial, sans-serif' }}>
        <h3>Error al cargar el recibo</h3>
        <p>{error || 'Recibo no encontrado'}</p>
        <Link href="/admin/agenda" style={{ color: '#d4a54d', textDecoration: 'underline', marginTop: '1rem', display: 'inline-block' }}>
          Volver a la Agenda
        </Link>
      </div>
    );
  }

  return (
    <div className={styles.pageContainer}>
      {/* Non-printable action bar */}
      <div className={styles.actionBar}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button onClick={() => window.history.back()} className={styles.btnSecondary}>
            ← Volver
          </button>
          <span style={{ fontSize: '0.9rem', color: '#666' }}>
            Recibo Nº {receipt.recibo.numero}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            onClick={handlePrint}
            className={styles.btnPrint}
            disabled={isGenerating}
            style={{ opacity: isGenerating ? 0.7 : 1, cursor: isGenerating ? 'not-allowed' : 'pointer' }}
          >
            {isGenerating ? '⏳ Procesando...' : '🖨️ Imprimir / AirPrint'}
          </button>
          <button
            onClick={handleDownloadPdf}
            className={styles.btnPrint}
            disabled={isGenerating}
            style={{ backgroundColor: '#1d4ed8', borderColor: '#1e40af', opacity: isGenerating ? 0.7 : 1, cursor: isGenerating ? 'not-allowed' : 'pointer' }}
          >
            📄 Descargar PDF
          </button>
        </div>
      </div>

      {/* Official Receipt Box (Matching image3.png) */}
      <div ref={receiptRef} className={styles.receiptBox}>
        {/* Header section with border */}
        <div className={styles.headerSection}>
          <div className={styles.headerLeft}>
            <h1 className={styles.brandTitle}>{receipt.emisor.nombre}</h1>
            <p className={styles.domicilio}>
              Domicilio comercial : {receipt.emisor.domicilio}
            </p>
          </div>

          <div className={styles.headerCenter}>
            <div className={styles.letterX}>{receipt.recibo.tipo}</div>
            <div className={styles.noValido}>{receipt.emisor.leyenda}</div>
          </div>

          <div className={styles.headerRight}>
            <h2 className={styles.reciboWord}>RECIBO</h2>
            <div className={styles.reciboNumero}>
              Nº {receipt.recibo.numero}
            </div>
            <div className={styles.reciboFecha}>
              Fecha emisión : {receipt.recibo.fechaEmision}
            </div>
          </div>
        </div>

        {/* Client details bar */}
        <div className={styles.clientBar}>
          <strong>Nombre / Razón social:</strong> {receipt.cliente.nombreCompleto}
          {receipt.cliente.dni && receipt.cliente.dni !== 'Sin registrar' && (
            <span style={{ marginLeft: '1.5rem', color: '#444' }}>
              <strong>DNI:</strong> {receipt.cliente.dni}
            </span>
          )}
        </div>

        {/* Services Table */}
        <div className={styles.tableWrapper}>
          <table className={styles.servicesTable}>
            <thead>
              <tr>
                <th style={{ width: '45%', textAlign: 'left' }}>Servicio</th>
                <th style={{ width: '22%', textAlign: 'right' }}>Precio Unit.</th>
                <th style={{ width: '13%', textAlign: 'center' }}>Cant.</th>
                <th style={{ width: '20%', textAlign: 'right' }}>Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {receipt.items.map((item, idx) => (
                <tr key={idx}>
                  <td style={{ textAlign: 'left' }}>{item.servicio}</td>
                  <td style={{ textAlign: 'right' }}>${Math.round(Number(item.precioUnitario)).toLocaleString('es-AR')}</td>
                  <td style={{ textAlign: 'center' }}>{item.cantidad}</td>
                  <td style={{ textAlign: 'right' }}>${Math.round(Number(item.subtotal)).toLocaleString('es-AR')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Total calculation */}
        <div className={styles.totalSection}>
          <div className={styles.totalRow}>
            <span className={styles.totalLabel}>Total</span>
            <span className={styles.totalValue}>
              ${Number(receipt.totales.valorTotal).toLocaleString('es-AR')}
            </span>
          </div>

          {receipt.totales.valorSeña > 0 && (
            <div style={{ fontSize: '0.85rem', color: '#555', marginTop: '0.35rem', textAlign: 'right' }}>
              <span>Seña abonada: ${Number(receipt.totales.valorSeña).toLocaleString('es-AR')} | Saldo restante: ${Number(receipt.totales.saldoPendiente).toLocaleString('es-AR')}</span>
            </div>
          )}
        </div>

        {/* Footer legend */}
        <div className={styles.footerSection}>
          <p className={styles.footerText}>{receipt.emisor.leyenda}</p>
          <p className={styles.pageText}>Página 1 de 1</p>
        </div>
      </div>
    </div>
  );
}
