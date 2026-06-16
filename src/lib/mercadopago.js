import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';

// Initialize MercadoPago configuration
const accessToken = process.env.MP_ACCESS_TOKEN || 'TEST-4127599026364585-061613-cf2204c3e80ab44d0843ccae81123456-12345678'; // Use sandbox token by default for safety
const client = new MercadoPagoConfig({ accessToken });

export const mpPreference = new Preference(client);
export const mpPayment = new Payment(client);
