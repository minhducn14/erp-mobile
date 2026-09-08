---
name: Getvini Mobile ERP
version: 1.0.0
colors:
  primary: "#F38820"
  primary-dark: "#D97010"
  primary-light: "#FFF7ED"
  primary-border: "#FDCB9E"
  surface: "#FFFFFF"
  background: "#F8FAFC"
  text-primary: "#0F172A"
  text-secondary: "#64748B"
  text-muted: "#94A3B8"
  border: "#E2E8F0"
  success: "#10B981"
  success-light: "#ECFDF5"
  warning: "#F59E0B"
  warning-light: "#FFFBEB"
  info: "#3B82F6"
  info-light: "#EFF6FF"
  danger: "#EF4444"
  danger-light: "#FEF2F2"
rounded:
  sm: 6px
  md: 10px
  lg: 14px
  xl: 18px
  full: 9999px
spacing:
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 20px
  2xl: 24px
components:
  card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.xl}"
    borderColor: "{colors.border}"
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#FFFFFF"
    rounded: "{rounded.md}"
---

# Getvini Mobile ERP Design System

## Overview
Giao diện di động chuyên nghiệp cho hệ thống Quản trị nguồn lực doanh nghiệp Getvini ERP. Thiết kế hướng đến hiệu năng cao, tối ưu thao tác một tay trên thiết bị di động, độ tương phản sắc nét theo tiêu chuẩn doanh nghiệp.

## Colors
- **Primary (#F38820):** Màu cam nhận diện Getvini, được dùng làm điểm nhấn tương tác chính (Primary Actions, Badge đang chọn, Icon phân hệ trọng yếu).
- **Background (#F8FAFC):** Nền slate siêu nhẹ mang lại cảm giác dễ chịu, sạch sẽ và tách bạch với các thẻ nội dung card.
- **Surface (#FFFFFF):** Nền trắng cho các thẻ card, container nhập liệu, bottom nav.
- **Semantic Colors:**
  - Success (#10B981): Trạng thái hoàn thành (DONE), nghiệm thu thành công.
  - Warning (#F59E0B): Trạng thái chờ xử lý, chờ duyệt (AWAITING_REVIEW).
  - Info (#3B82F6): Nhiệm vụ đang thực hiện (IN_PROGRESS), thông tin hỗ trợ.
  - Danger (#EF4444): Quá hạn, hủy bỏ, đăng xuất.

## Layout & Spacing
- Mọi vùng chạm cảm ứng tối thiểu 44x44px.
- Thẻ danh sách cách lề hai bên 16px.
- Khoảng cách giữa các thẻ danh sách 12px.

## Chuẩn Định Dạng Số & Tiền Tệ (Number & Currency Standard)
- **Dấu phân cách hàng nghìn bắt buộc:**
  - Mọi số lượng, đơn giá, doanh thu, ngân sách, công nợ, tổng tiền trong toàn bộ ứng dụng **bắt buộc phải có dấu phân cách hàng nghìn theo chuẩn Việt Nam (dấu chấm `.`)**.
  - Ví dụ: `100.000.000 VNĐ`, `15.500.000 ₫`, số lượng `1.200`.
- **Ô nhập liệu số tiền & số lượng (Real-time Masking):**
  - Mọi ô input nhận số tiền hoặc số lượng lớn phải tự động format dấu phân cách hàng nghìn theo thời gian thực (`formatNumberInput`) ngay khi người dùng gõ phím.
  - Tuyệt đối không để người dùng tự nhập một chuỗi số dính liền như `100000000` gây nhầm lẫn chữ số 0.
- **Tính chính xác trong báo cáo ERP:**
  - Không viết tắt mơ hồ như `13 Tr` hay `2,5 Tỷ` trên các thẻ thông tin chi tiết, thẻ cơ hội, báo giá, hoặc bảng kê dịch vụ. Luôn hiển thị đầy đủ và rõ ràng từng hàng đơn vị: `12.500.000 ₫`.
- **Thư viện chuẩn dùng chung:**
  - Luôn sử dụng bộ helper tập trung từ `@/utils/formatters` (`formatVND`, `formatNumber`, `formatNumberInput`, `parseNumberInput`, `formatQuantity`).

## Do's and Don'ts
- **DO** sử dụng màu cam `#F38820` làm trọng tâm nhận diện thương hiệu Getvini.
- **DO** luôn áp dụng dấu phân cách hàng nghìn (dấu `.`) cho toàn bộ các con số và tiền tệ.
- **DO** sử dụng utility `@/utils/formatters` cho mọi tác vụ format số/tiền.
- **DON'T** hiển thị số trần không phân cách (ví dụ `50000000` là vi phạm tiêu chuẩn).
- **DON'T** sử dụng các màu tím/gradient lạc lõng không thuộc bảng màu Getvini.
- **DO** xử lý đầy đủ các trạng thái Loading, Empty State, Error State và Pull-to-refresh cho mọi màn hình.
