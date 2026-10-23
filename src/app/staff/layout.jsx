import Script from 'next/script';

export const metadata = { title: 'Заказы · DARKSKY', robots: { index: false, follow: false } };

// Inside Telegram the staff app is a Mini App: telegram-web-app.js gives the signed launch data for the sign-in
export default function StaffRoot({ children }) {
  return (
    <div className="min-h-screen bg-[#0a0a0d] text-[#f2f2f4] font-[Manrope,system-ui,sans-serif]">
      <Script src="https://telegram.org/js/telegram-web-app.js" strategy="afterInteractive" />
      {children}
    </div>
  );
}
