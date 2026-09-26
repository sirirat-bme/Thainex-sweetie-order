export const metadata = {
  title: 'Thainexsweetie',
  description: 'ระบบสั่งอาหารร้านขนมหวาน Thainexsweetie',
};

export default function RootLayout({ children }) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  );
}
