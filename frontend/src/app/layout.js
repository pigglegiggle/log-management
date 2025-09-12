import { Anuphan } from "next/font/google";
import "./globals.css";
import 'primereact/resources/themes/lara-light-blue/theme.css';
import 'primereact/resources/primereact.min.css';
import 'primeicons/primeicons.css';

const anuphan = Anuphan({
  variable: "--font-anuphan",
  subsets: ["latin", "thai"],
});

export const metadata = {
  title: "Log Management System",
  description: "Centralized log management and security monitoring platform",
};

export default function RootLayout({ children }) {
  return (
    <html lang="th">
      <body
        className={`${anuphan.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
