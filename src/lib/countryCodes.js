export const COUNTRY_CODES = [
  { code: '54', dial: '+54', flag: '🇦🇷', name: 'Argentina (+54)' },
  { code: '34', dial: '+34', flag: '🇪🇸', name: 'España (+34)' },
  { code: '598', dial: '+598', flag: '🇺🇾', name: 'Uruguay (+598)' },
  { code: '56', dial: '+56', flag: '🇨🇱', name: 'Chile (+56)' },
  { code: '595', dial: '+595', flag: '🇵🇾', name: 'Paraguay (+595)' },
  { code: '55', dial: '+55', flag: '🇧🇷', name: 'Brasil (+55)' },
  { code: '1', dial: '+1', flag: '🇺🇸', name: 'EE.UU. / Canadá (+1)' },
  { code: '52', dial: '+52', flag: '🇲🇽', name: 'México (+52)' },
  { code: '57', dial: '+57', flag: '🇨🇴', name: 'Colombia (+57)' },
  { code: '51', dial: '+51', flag: '🇵🇪', name: 'Perú (+51)' },
  { code: '591', dial: '+591', flag: '🇧🇴', name: 'Bolivia (+591)' },
  { code: '593', dial: '+593', flag: '🇪🇨', name: 'Ecuador (+593)' },
  { code: '58', dial: '+58', flag: '🇻🇪', name: 'Venezuela (+58)' },
  { code: '39', dial: '+39', flag: '🇮🇹', name: 'Italia (+39)' },
  { code: '49', dial: '+49', flag: '🇩🇪', name: 'Alemania (+49)' },
  { code: '33', dial: '+33', flag: '🇫🇷', name: 'Francia (+33)' },
  { code: '44', dial: '+44', flag: '🇬🇧', name: 'Reino Unido (+44)' },
  { code: 'custom', dial: '+', flag: '🌐', name: 'Otro país' }
];

export const parsePhoneCountryAndNumber = (fullPhone) => {
  if (!fullPhone) return { countryCode: '54', number: '', customCode: '' };
  const str = String(fullPhone).replace(/\D/g, '');
  if (!str) return { countryCode: '54', number: '', customCode: '' };

  if (str.startsWith('54')) {
    const num = str.startsWith('549') ? str.slice(3) : str.slice(2);
    return { countryCode: '54', number: num, customCode: '' };
  }
  if (str.startsWith('34')) {
    return { countryCode: '34', number: str.slice(2), customCode: '' };
  }
  if (str.startsWith('598')) {
    return { countryCode: '598', number: str.slice(3), customCode: '' };
  }
  if (str.startsWith('56')) {
    return { countryCode: '56', number: str.slice(2), customCode: '' };
  }
  if (str.startsWith('595')) {
    return { countryCode: '595', number: str.slice(3), customCode: '' };
  }
  if (str.startsWith('55')) {
    return { countryCode: '55', number: str.slice(2), customCode: '' };
  }
  if (str.startsWith('52')) {
    return { countryCode: '52', number: str.slice(2), customCode: '' };
  }
  if (str.startsWith('57')) {
    return { countryCode: '57', number: str.slice(2), customCode: '' };
  }
  if (str.startsWith('51')) {
    return { countryCode: '51', number: str.slice(2), customCode: '' };
  }
  if (str.startsWith('591')) {
    return { countryCode: '591', number: str.slice(3), customCode: '' };
  }
  if (str.startsWith('593')) {
    return { countryCode: '593', number: str.slice(3), customCode: '' };
  }
  if (str.startsWith('58')) {
    return { countryCode: '58', number: str.slice(2), customCode: '' };
  }
  if (str.startsWith('39')) {
    return { countryCode: '39', number: str.slice(2), customCode: '' };
  }
  if (str.startsWith('49')) {
    return { countryCode: '49', number: str.slice(2), customCode: '' };
  }
  if (str.startsWith('33')) {
    return { countryCode: '33', number: str.slice(2), customCode: '' };
  }
  if (str.startsWith('44')) {
    return { countryCode: '44', number: str.slice(2), customCode: '' };
  }
  if (str.startsWith('1') && str.length === 11) {
    return { countryCode: '1', number: str.slice(1), customCode: '' };
  }

  // Fallback: If 10 digits without country code, assume Argentina
  if (str.length === 10) {
    return { countryCode: '54', number: str, customCode: '' };
  }

  return { countryCode: '54', number: str, customCode: '' };
};

export const formatDisplayPhone = (fullPhone) => {
  if (!fullPhone) return '';
  const { countryCode, number } = parsePhoneCountryAndNumber(fullPhone);
  const found = COUNTRY_CODES.find(c => c.code === countryCode);
  const flag = found ? found.flag : '🌐';
  const dial = found ? found.dial : `+${countryCode}`;
  
  if (countryCode === '54') {
    return `${flag} ${dial} 9 ${number}`;
  }
  return `${flag} ${dial} ${number}`;
};

export const buildFullPhone = (countryCode, customCode, rawNumber) => {
  const cleanedNum = String(rawNumber || '').replace(/\D/g, '');
  if (!cleanedNum) return '';
  if (countryCode === '54') {
    return `549${cleanedNum.startsWith('9') ? cleanedNum.slice(1) : cleanedNum}`;
  }
  if (countryCode === 'custom') {
    const code = String(customCode || '').replace(/\D/g, '');
    return `${code}${cleanedNum}`;
  }
  return `${countryCode}${cleanedNum}`;
};
