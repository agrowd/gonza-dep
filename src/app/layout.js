import "./globals.css";

export const metadata = {
  title: "Gonzalo | Depilación Láser Masculina",
  description: "Agenda de turnos y reserva online para depilación definitiva de hombres con tecnología Soprano ICE.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
