import { IraqGovernorates } from '../types';

/** إحداثيات تقريبية لمراكز محافظات العراق [خط العرض، خط الطول] لاستخدامها في الخريطة */
export const governorateCoordinates: Record<IraqGovernorates, [number, number]> = {
  [IraqGovernorates.Baghdad]: [33.3152, 44.3661],
  [IraqGovernorates.Basra]: [30.5085, 47.7804],
  [IraqGovernorates.Mosul]: [36.34, 43.13],
  [IraqGovernorates.Erbil]: [36.1911, 44.0092],
  [IraqGovernorates.Sulaymaniyah]: [35.5613, 45.4369],
  [IraqGovernorates.Dohuk]: [36.867, 43.0],
  [IraqGovernorates.Kirkuk]: [35.4681, 44.3922],
  [IraqGovernorates.Anbar]: [32.5577, 43.4837],
  [IraqGovernorates.Karbala]: [32.6167, 44.0333],
  [IraqGovernorates.Najaf]: [32.029, 44.346],
  [IraqGovernorates.Babylon]: [32.482, 44.415],
  [IraqGovernorates.Wasit]: [32.6, 45.85],
  [IraqGovernorates.Diyala]: [33.75, 45.05],
  [IraqGovernorates.Salahuddin]: [34.45, 43.5833],
  [IraqGovernorates.Maysan]: [31.8333, 47.15],
  [IraqGovernorates.Muthanna]: [31.05, 45.1833],
  [IraqGovernorates.DhiQar]: [31.05, 46.25],
  [IraqGovernorates.Qadisiyyah]: [31.9833, 44.9333],
};

/** حدود العراق التقريبية لضبط نطاق الخريطة */
export const iraqBounds: [[number, number], [number, number]] = [
  [29.0, 38.8],   // جنوب غرب
  [37.4, 48.6],   // شمال شرق
];

/** مركز بغداد [خط العرض، خط الطول] — للـ zoom عند كون كل الوكلاء في بغداد */
export const baghdadCenter: [number, number] = governorateCoordinates[IraqGovernorates.Baghdad];

/**
 * استخراج إحداثيات (عرض، طول) من نص العنوان إذا كانت بالشكل 33.3179117,44.3253275
 * @returns [lat, lng] أو null إذا لم يُعثر على صيغة صحيحة أو كانت خارج حدود العراق التقريبية
 */
export function parseAddressCoordinates(address: string | null | undefined): [number, number] | null {
  const s = String(address || '').trim();
  const match = s.match(/(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)/);
  if (!match) return null;
  const lat = Number(match[1]);
  const lng = Number(match[2]);
  if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
  if (lat < 29 || lat > 37.5 || lng < 38.5 || lng > 49) return null;
  return [lat, lng];
}
