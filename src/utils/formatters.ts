/**
 * Chuẩn Định Dạng Số & Tiền Tệ Hệ Thống Getvini ERP Mobile
 * Tuân thủ quy định: Toàn bộ số và tiền tệ phải có dấu phân cách hàng nghìn (dấu chấm .)
 */

/**
 * Định dạng số nguyên hoặc số thực với dấu phân cách hàng nghìn theo chuẩn vi-VN (dấu .)
 * Ví dụ: 1000000 -> "1.000.000", 1500.5 -> "1.500,5"
 */
/**
 * Định dạng số nguyên hoặc số thực với dấu phân cách hàng nghìn theo chuẩn vi-VN (dấu chấm .)
 * Sử dụng regex để đảm bảo 100% hoạt động chính xác trên React Native / Hermes
 * Ví dụ: 1000000 -> "1.000.000", 1500.5 -> "1.500,5"
 */
export const formatNumber = (value: number | string | undefined | null): string => {
  if (value === null || value === undefined || value === '') return '0';

  let num: number;
  if (typeof value === 'number') {
    if (isNaN(value)) return '0';
    num = value;
  } else {
    const cleanStr = String(value).trim();
    if (!cleanStr) return '0';

    // 1. Direct JS numeric string check (e.g., "510020000.000", "510020000", "1500.5")
    const directNum = Number(cleanStr);
    if (!isNaN(directNum)) {
      num = directNum;
    } else {
      // 2. Pre-formatted Vietnamese numeric string (e.g., "1.500.000,50" or "1.500.000")
      const parsedNum = Number(cleanStr.replace(/\./g, '').replace(/,/g, '.'));
      if (isNaN(parsedNum)) return '0';
      num = parsedNum;
    }
  }

  // Format integer part with dot (.) as thousand separator and decimal part with comma (,)
  const parts = num.toString().split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return parts.join(',');
};

/**
 * Định dạng tiền tệ với ký hiệu "₫" và dấu phân cách hàng nghìn (dấu chấm .)
 * Ví dụ: 15000000 -> "15.000.000 ₫"
 */
export const formatVND = (
  value: number | string | undefined | null,
  suffix: string = '₫'
): string => {
  return `${formatNumber(value)} ${suffix}`;
};

/**
 * Định dạng tiền tệ với hậu tố đầy đủ "VNĐ" và dấu phân cách hàng nghìn (dấu chấm .)
 * Ví dụ: 100000000 -> "100.000.000 VNĐ"
 */
export const formatVNDFull = (value: number | string | undefined | null): string => {
  return `${formatNumber(value)} VNĐ`;
};

/**
 * Tự động định dạng chuỗi người dùng đang gõ vào ô nhập tiền/số lượng (Real-time Mask)
 * Chỉ giữ lại các chữ số và tự động chèn dấu chấm phân cách hàng nghìn
 * Ví dụ: "1000000" -> "1.000.000"
 */
export const formatNumberInput = (value: string | number | undefined | null): string => {
  if (value === null || value === undefined || value === '') return '';
  const digitsOnly = String(value).replace(/\D/g, '');
  if (!digitsOnly) return '';
  return digitsOnly.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

/**
 * Chuyển chuỗi đã định dạng dấu chấm phân cách về lại số nguyên để gửi API hoặc tính toán
 * Ví dụ: "1.000.000" -> 1000000
 */
export const parseNumberInput = (formatted: string | undefined | null): number => {
  if (!formatted) return 0;
  const digitsOnly = String(formatted).replace(/\D/g, '');
  return digitsOnly ? Number(digitsOnly) : 0;
};

/**
 * Định dạng số lượng (áp dụng cho đơn hàng, hợp đồng, dịch vụ)
 * Ví dụ: 1000 -> "1.000"
 */
export const formatQuantity = (qty: number | string | undefined | null): string => {
  if (qty === null || qty === undefined || qty === '') return '1';
  const num = typeof qty === 'string' ? Number(qty.replace(/\D/g, '')) : qty;
  if (isNaN(num) || num <= 0) return '1';
  return String(num).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

/**
 * Định dạng tỷ lệ phần trăm
 * Ví dụ: 35 -> "35%"
 */
export const formatPercent = (val: number | string | undefined | null): string => {
  if (val === null || val === undefined || val === '') return '0%';
  const num = Number(val);
  if (isNaN(num)) return '0%';
  return `${num}%`;
};
