import 'server-only';
import QRCode from 'qrcode';

export const tableUrl = (base, token) => `${base}/t/${token}`;
export const qrSvg = url => QRCode.toString(url, { type: 'svg', margin: 1, errorCorrectionLevel: 'M', color: { dark: '#000000', light: '#ffffff' } });
