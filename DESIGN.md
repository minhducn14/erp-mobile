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

## Do's and Don'ts
- **DO** sử dụng màu cam `#F38820` làm trọng tâm nhận diện thương hiệu Getvini.
- **DON'T** sử dụng các màu tím/gradient lạc lõng không thuộc bảng màu Getvini.
- **DO** xử lý đầy đủ các trạng thái Loading, Empty State, Error State và Pull-to-refresh cho mọi màn hình.
