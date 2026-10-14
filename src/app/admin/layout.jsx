export const metadata = { title: 'DARKSKY · Админка', robots: { index: false, follow: false } };

export default function AdminRoot({ children }) {
  return <div className="min-h-screen bg-[#0a0a0d] text-[#f2f2f4] font-[Manrope,system-ui,sans-serif]">{children}</div>;
}
