'use client';
import { api } from './api';

export default function LogoutButton({ className = 'rounded-lg border border-white/15 px-3 py-2 text-white/70 hover:text-white' }) {
  return <button onClick={async () => { await api('/api/admin/logout'); location.href = '/admin/login'; }} className={className}>Выйти</button>;
}
