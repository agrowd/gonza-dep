'use client';
import React from 'react';
import { COUNTRY_CODES } from '@/lib/countryCodes.js';

export default function PhoneInput({
  countryCode = '54',
  onCountryChange,
  customCode = '',
  onCustomCodeChange,
  phoneNumber = '',
  onPhoneChange,
  required = false,
  placeholder,
  className,
  style
}) {
  const defaultPlaceholder = countryCode === '54' ? 'Ej. 11 7673 5678' : (countryCode === '34' ? 'Ej. 636 84 40 16' : 'Ej. Número de celular');

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        border: '1px solid var(--border-color)',
        borderRadius: '8px',
        overflow: 'hidden',
        backgroundColor: 'var(--bg-secondary)',
        width: '100%',
        boxSizing: 'border-box',
        ...style
      }}
      className={className}
    >
      <select
        value={countryCode}
        onChange={(e) => onCountryChange && onCountryChange(e.target.value)}
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.06)',
          border: 'none',
          borderRight: '1px solid var(--border-color)',
          color: 'var(--text-primary)',
          padding: '0.75rem 0.5rem',
          fontSize: '0.85rem',
          cursor: 'pointer',
          outline: 'none',
          fontWeight: 600,
          flexShrink: 0,
          maxWidth: '120px'
        }}
      >
        {COUNTRY_CODES.map((c) => (
          <option key={c.code} value={c.code} style={{ backgroundColor: '#1e1e1e', color: '#fff' }}>
            {c.flag} {c.dial}
          </option>
        ))}
      </select>

      {countryCode === 'custom' && (
        <div style={{ display: 'flex', alignItems: 'center', borderRight: '1px solid var(--border-color)', padding: '0 0.4rem', backgroundColor: 'rgba(255, 255, 255, 0.03)' }}>
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600 }}>+</span>
          <input
            type="text"
            placeholder="Cod"
            value={customCode}
            onChange={(e) => onCustomCodeChange && onCustomCodeChange(e.target.value.replace(/\D/g, ''))}
            style={{
              width: '45px',
              border: 'none',
              padding: '0.75rem 0.2rem',
              textAlign: 'center',
              outline: 'none',
              backgroundColor: 'transparent',
              color: 'var(--text-primary)',
              fontWeight: 600,
              fontSize: '0.85rem'
            }}
          />
        </div>
      )}

      <input
        type="tel"
        value={phoneNumber}
        onChange={(e) => onPhoneChange && onPhoneChange(e.target.value)}
        required={required}
        placeholder={placeholder || defaultPlaceholder}
        style={{
          border: 'none',
          flex: 1,
          padding: '0.75rem',
          outline: 'none',
          backgroundColor: 'transparent',
          color: 'var(--text-primary)',
          fontSize: '0.9rem',
          minWidth: 0,
          boxSizing: 'border-box'
        }}
      />
    </div>
  );
}
