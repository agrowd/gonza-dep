'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import styles from './recibo.module.css';

export default function ReciboPage({ params }) {
  const unwrappedParams = use(params);
  const id = unwrappedParams.id;

  const [receipt, setReceipt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

  const handlePrint = () => {
    window.print();
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
        <button onClick={handlePrint} className={styles.btnPrint}>
          🖨️ Imprimir / Guardar como PDF
        </button>
      </div>

      {/* Official Receipt Box (Matching image3.png) */}
      <div className={styles.receiptBox}>
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
        <table className={styles.servicesTable}>
          <thead>
            <tr>
              <th style={{ width: '45%', textAlign: 'left' }}>Servicio</th>
              <th style={{ width: '20%', textAlign: 'right' }}>Precio Unit.</th>
              <th style={{ width: '15%', textAlign: 'center' }}>Cantidad</th>
              <th style={{ width: '20%', textAlign: 'right' }}>Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {receipt.items.map((item, idx) => (
              <tr key={idx}>
                <td style={{ textAlign: 'left' }}>{item.servicio}</td>
                <td style={{ textAlign: 'right' }}>${Number(item.precioUnitario).toFixed(2)}</td>
                <td style={{ textAlign: 'center' }}>{item.cantidad}</td>
                <td style={{ textAlign: 'right' }}>${Number(item.subtotal).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>

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
