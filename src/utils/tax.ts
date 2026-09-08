/**
 * Tra cứu thông tin doanh nghiệp theo Mã Số Thuế (MST) từ api.xinvoice.vn
 * Hỗ trợ MST 10 số hoặc 13 số
 */
export interface TaxInfoResult {
  name: string;
  address: string;
  status?: string;
  taxDepartment?: string;
}

export const fetchTaxInfo = async (taxId: string): Promise<TaxInfoResult | null> => {
  if (!taxId) return null;

  // Làm sạch mã số thuế: bỏ khoảng trắng và dấu gạch ngang
  const cleanTaxId = taxId.replace(/[\s-]/g, '');

  // Kiểm tra định dạng: 10 chữ số hoặc 13 chữ số
  if (!/^\d{10}(\d{3})?$/.test(cleanTaxId)) {
    return null;
  }

  try {
    const response = await fetch(`https://api.xinvoice.vn/gdt-api/tax-payer/${cleanTaxId}`);
    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    if (data && data.name) {
      return {
        name: data.name,
        address: data.address || '',
        status: data.status,
        taxDepartment: data.taxDepartment,
      };
    }
    return null;
  } catch (error) {
    console.error('Error fetching tax info:', error);
    return null;
  }
};
