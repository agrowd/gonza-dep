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
  const defaultPlaceholder = countryCode === '54' ? 'Ej. 11 7673 5678' : (countryCode === '34' ? 'Ej. 636 84 40 16' : 'Número de celular');

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'stretch',
        border: '1px solid var(--border-color, #3a3a3a)',
        borderRadius: '8px',
        overflow: 'hidden',
        backgroundColor: 'var(--bg-secondary, #1a1a1a)',
        width: '100%',
        boxSizing: 'border-box',
        position: 'relative',
        ...style
      }}
      className={className}
    >
      <div style={{ position: 'relative', flex: '0 0 auto', display: 'flex', alignItems: 'center' }}>
        <select
          value={countryCode}
          onChange={(e) => onCountryChange && onCountryChange(e.target.value)}
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.08)',
            border: 'none',
            borderRight: '1px solid var(--border-color, #3a3a3a)',
            color: 'var(--text-primary, #ffffff)',
            padding: '0.7rem 0.5rem',
            fontSize: '0.85rem',
            cursor: 'pointer',
            outline: 'none',
            fontWeight: 600,
            width: 'auto',
            minWidth: '95px',
            maxWidth: '120px',
            height: '100%',
            boxSizing: 'border-box'
          }}
        >
          {COUNTRY_CODES.map((c) => (
            <option key={c.code} value={c.code} style={{ backgroundColor: '#1e1e1e', color: '#ffffff' }}>
              {c.flag} {c.dial}
            </option>
          ))}
        </select>
      </div>

      {countryCode === 'custom' && (
        <div style={{ display: 'flex', alignItems: 'center', borderRight: '1px solid var(--border-color, #3a3a3a)', padding: '0 0.35rem', backgroundColor: 'rgba(255, 255, 255, 0.04)', flex: '0 0 auto' }}>
          <span style={{ color: 'var(--text-secondary, #999)', fontSize: '0.85rem', fontWeight: 600 }}>+</span>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            placeholder="Cod"
            value={customCode}
            onChange={(e) => onCustomCodeChange && onCustomCodeChange(e.target.value.replace(/\D/g, ''))}
            style={{
              width: '45px',
              border: 'none',
              padding: '0.7rem 0.2rem',
              textAlign: 'center',
              outline: 'none',
              backgroundColor: 'transparent',
              color: 'var(--text-primary, #ffffff)',
              fontWeight: 600,
              fontSize: '0.85rem',
              boxSizing: 'border-box'
            }}
          />
        </div>
      )}

      <input
        type="tel"
        inputMode="numeric"
        pattern="[0-9]*"
        value={phoneNumber}
        onChange={(e) => {
          const cleanNum = e.target.value.replace(/\D/g, '');
          if (onPhoneChange) onPhoneChange(cleanNum);
        }}
        required={required}
        placeholder={placeholder || defaultPlaceholder}
        style={{
          border: 'none',
          flex: '1 1 0%',
          width: '100%',
          minWidth: '0px',
          padding: '0.7rem 0.75rem',
          outline: 'none',
          backgroundColor: 'transparent',
          color: 'var(--text-primary, #ffffff)',
          fontSize: '0.9rem',
          boxSizing: 'border-box',
          margin: 0
        }}
      />
    </div>
  );
}
