# Kế Hoạch Chuyển Đổi Chi Tiết Toàn Bộ Modules (erp-mobile)

> **File Kế Hoạch:** `full-modules-migration.md`  
> **Dự Án Target:** `c:\Users\my\Downloads\ERP\erp-mobile`  
> **Kiến Trúc Tối Ưu:** TanStack Query v5 (Server State) + Zustand v5 (Client/Form State) + SSE (`react-native-sse`) + `privateStorage` (SecureStore)

---

## 1. Tổng Quan & Nguyên Tắc Tách Biệt Trách Nhiệm (Architecture Principles)

> 🔴 **QUY TẮC PHÂN ĐỊNH SỬ DỤNG API:**  
> - **Nếu API đó ảnh hưởng đến dữ liệu hiển thị trên giao diện hoặc cần quản lý trạng thái (`loading`, `error`, `cache`):** 👉 **Bắt buộc dùng TanStack Query** (`useQuery` hoặc `useMutation`).  
> - **Nếu API là tác vụ nền độc lập (`logging analytics`, `auth refresh interceptor`, `upload/download file thô`):** 👉 **Dùng Axios / Fetch / `apiService` thuần**.  
> - **Tuyệt đối không gọi API thủ công** bằng `fetch`/`apiService` trực tiếp trong Component/Hook cục bộ hay `useEffect` thủ công nếu dữ liệu đó ảnh hưởng tới UI.

### Các Tầng Quản Lý State:
1. **Security & Token Layer (`privateStorage` + `apiService`):**
   - Sử dụng `SecureStore` (iOS Keychain / Android EncryptedSharedPreferences) lưu trữ AccessToken & RefreshToken.
   - `apiService` tự động đính kèm Token và xử lý auto-refresh session khi 401 (Dùng Fetch/Axios thuần cho tác vụ nền).
2. **Client State Layer (Zustand v5):**
   - Quản lý State tạm thời của Form nhiều bước (Multi-step Form: `OpportunityForm`, `QuotationForm`), state UI toàn cục (Theme, Drawer, Active Tab) và lưu nháp Form (Draft Persist).
3. **Server State Layer (TanStack Query v5):**
   - Quản lý 100% các API hiển thị UI, Caching, Stale Time, Background Refetching, Optimistic Updates.
4. **Real-time Event Stream Layer (SSE):**
   - Đón nhận sự kiện đẩy từ Backend (`react-native-sse`) -> tự động gọi `queryClient.invalidateQueries(...)` để cập nhật UI tức thì và push thông báo vào Zustand Notification Store.

---

## 2. Thứ Tự Triển Khai Từng Module (Sequential Migration Roadmap)

### 📊 BẢNG TIẾN ĐỘ THỰC HIỆN (PROGRESS BOARD):

| Phase | Module | Trạng Thái | Chi Tiết Đã Hoàn Thành |
| :--- | :--- | :--- | :--- |
| **Phase 1** | **Auth - Profile - Home** | ✅ **COMPLETED** | • Token lưu bảo mật trong `privateStorage` (SecureStore) với `try...finally`.<br>• Zustand Auth Store (`useAuthStore`) in-memory.<br>• TanStack Query hooks: `useUserProfileQuery`, `useLoginMutation`, `useLogoutMutation`, `useDashboardQuery`.<br>• Refactor 100% 3 trang UI: `login.tsx`, `profile/index.tsx`, `index.tsx`. `npx tsc --noEmit` **0 lỗi**. |
| Phase 2 | **Opportunities** | ✅ **COMPLETED** | • Store multi-step form `useOpportunityFormStore.ts` với `persist` middleware (AsyncStorage).<br>• Query & Mutation hooks: `useOpportunitiesQuery`, `useOpportunityDetailQuery`, `useCreateOpportunityMutation`, `useUpdateOpportunityMutation`, `useApproveOpportunityMutation`, `useAvailableServicesQuery`, `useServicePackagesQuery`, `useQuotationsQuery`, `useOpportunityQuotationsQuery`, `useApproveQuotationMutation`, `useRejectQuotationMutation`.<br>• Refactor 100% 6 màn hình UI: `opportunities/index.tsx`, `opportunities/[id].tsx`, `opportunities/create.tsx`, `opportunities/quotations/list.tsx`, `opportunities/quotations/[quotId].tsx`, `opportunities/quotations/create.tsx`. `npx tsc --noEmit` **0 lỗi**. |
| **Phase 3** | **Customers** | ✅ **COMPLETED** | • Custom Query Hooks: `useCustomersQuery`, `useCustomerDetailQuery`, `useUpdateCustomerMutation`.<br>• Refactor 100% màn hình `customers/index.tsx` sử dụng TanStack Query + search filter real-time.<br>• Tích hợp SSE `invalidate_Customers` trong `useSSEQueryBridge.ts`. `npx tsc --noEmit` **0 lỗi**. |
| **Phase 4** | **Contracts** | ✅ **COMPLETED** | • Custom Query & Mutation Hooks: `useContractsQuery`, `useContractDetailQuery`, `useCreateContractMutation`, `useUploadProposalMutation`, `useUploadSignedMutation`, `useApproveProposalMutation`, `useRejectProposalMutation`.<br>• Refactor 100% 2 màn hình UI: `contracts/index.tsx`, `contracts/[id].tsx` sang TanStack Query v5.<br>• Tích hợp SSE `invalidate_Contracts` trong `useSSEQueryBridge.ts`. `npx tsc --noEmit` **0 lỗi**. |
| **Phase 5** | **Projects** | ✅ **COMPLETED** | • Custom Query & Mutation Hooks: `useProjectsQuery`, `useProjectDetailQuery`, `useProjectByContractQuery`, `useAssignProjectMutation`, `useUpdateProjectStatusMutation`, `useUpdateProjectProgressMutation`, `useConfirmProjectMutation`, `usePmUsersQuery`, `useProductDescriptionsQuery`, `useCreateProductDescriptionMutation`, `useSubmitProductDescriptionMutation`, `useApproveProductDescriptionMutation`, `useRejectProductDescriptionMutation`.<br>• Refactor 100% UI `projects/index.tsx`, `projects/[id].tsx`, `ProductDescriptionSection.tsx` sang TanStack Query v5.<br>• Tích hợp SSE `invalidate_Projects` trong `useSSEQueryBridge.ts`. `npx tsc --noEmit` **0 lỗi**. |
| **Phase 6** | **Tasks** | ✅ **COMPLETED** | • Custom Query & Mutation Hooks: `useTasksQuery`, `useTasksByProjectQuery`, `useTaskDetailQuery`, `useUpdateTaskStatusMutation`, `useCreateTaskMutation`, `useAssignTaskMutation`, `useBulkAssignTasksMutation`, `useSubmitTaskResultMutation`, `useFinalizeTaskMutation`, `useRejectTaskMutation`, `useRequestReworkMutation`.<br>• Refactor 100% UI `tasks/index.tsx` & `tasks/[id].tsx` sang TanStack Query v5.<br>• Tích hợp SSE `invalidate_Tasks` trong `useSSEQueryBridge.ts`. `npx tsc --noEmit` **0 lỗi**. |
| **Phase 7** | **Acceptances** | ✅ **COMPLETED** | • Custom Query & Mutation Hooks: `useAcceptancesQuery`, `useAcceptanceDetailQuery`, `useCreateAcceptanceMutation`, `useProcessAcceptanceMutation`.<br>• Refactor 100% UI `acceptances/index.tsx` sang TanStack Query v5.<br>• Tích hợp SSE `invalidate_Acceptances` trong `useSSEQueryBridge.ts`. `npx tsc --noEmit` **0 lỗi**. |

---

## 3. Chi Tiết Danh Sách Nhiệm Vụ Từng Module (Module Task Breakdown)

### 📌 PHASE 1: Module Auth - Profile - Home (Xác thực & Trang chủ) — ✅ [COMPLETED]

#### Task 1.1: Đảm bảo an toàn Auth với `privateStorage` & Zustand Auth Store — ✅ [COMPLETED]
- **Target Files:** `src/services/api.ts`, `src/services/secureStorage.ts`, `src/stores/useAuthStore.ts`, `src/context/AuthContext.tsx`, `src/hooks/queries/useAuthQuery.ts`
- **Chức năng:**
  - Token lưu trữ tuyệt đối trong `privateStorage` (SecureStore trên iOS/Android).
  - Tích hợp `useAuthStore` (Zustand) đồng bộ trạng thái `user`, `isAuthenticated`, `isLoading`.
  - Hook `useUserProfileQuery` (TanStack Query) tự động fetch profile `/me` khi bootstrap app và sync vào Zustand.
  - Hook `useLoginMutation` và `useLogoutMutation` cập nhật cache & dọn dẹp storage.
  - **Cơ chế Bảo mật Offline (Try...Finally):** `apiService.logout()` và `useLogoutMutation()` bắt buộc bọc khối `try...finally` để đảm bảo 100% Token trong `privateStorage` và `useAuthStore` luôn được xóa sạch triệt để kể cả khi ứng dụng mất mạng (Offline) hoặc Server gặp sự cố.
- **VERIFY:** Đăng nhập thành công -> Token ghi vào SecureStore -> Chuyển màn hình Home. Đăng xuất (kể cả khi tắt Wifi/4G) -> Xóa sạch Token trong SecureStore & Clear Query Cache.

#### Task 1.2: Chuyển đổi Trang chủ (Home / Dashboard Metrics) sang TanStack Query + SSE — ✅ [COMPLETED]
- **Target Files:** `src/app/index.tsx`, `src/hooks/queries/useDashboard.ts`
- **Chức năng:**
  - Viết `useDashboardQuery(month, year)`, `useMyTasksQuery()`, `useAwaitingReviewTasksQuery()` lấy dữ liệu trang chủ.
  - Tích hợp SSE listener: Khi có thay đổi từ hệ thống -> Invalidate `queryKeys.dashboard.all` để Home tự động cập nhật số liệu.
- **VERIFY:** Đổi tháng/năm trên màn hình Home hoặc vuốt RefreshControl -> TanStack Query tự cache & refetch kết quả. `npx tsc --noEmit` đạt 0 lỗi.

---

### 📌 PHASE 2: Module Opportunities (Cơ hội kinh doanh) — ✅ [COMPLETED]

#### Task 2.1: Chuẩn hóa Store Multi-step Form `useOpportunityFormStore.ts` — ✅ [COMPLETED]
- **Target Files:** [`src/stores/useOpportunityFormStore.ts`](file:///c:/Users/my/Downloads/ERP/erp-mobile/src/stores/useOpportunityFormStore.ts)
- **Chức năng:**
  - Bổ sung `persist` middleware với `AsyncStorage` để lưu nháp Form 3 bước khi bị tắt app giữa chừng.
  - Viết các helper actions: `addPackage`, `removePackage`, `addService`, `removeService`, `resetForm`.
- **VERIFY:** Nhập dở thông tin -> Thoát app -> Mở lại app dữ liệu vẫn còn nguyên. Submit xong -> `resetForm()` xóa nháp.

#### Task 2.2: Tích hợp TanStack Query & SSE cho Opportunities UI — ✅ [COMPLETED]
- **Target Files:** `src/app/opportunities/index.tsx`, `src/app/opportunities/[id].tsx`, `src/app/opportunities/create.tsx`, [`src/hooks/queries/useOpportunities.ts`](file:///c:/Users/my/Downloads/ERP/erp-mobile/src/hooks/queries/useOpportunities.ts)
- **Chức năng:**
  - Áp dụng `useOpportunitiesQuery(filters)` cho danh sách màn hình `opportunities/index.tsx`.
  - Áp dụng `useOpportunityDetailQuery(id)` cho màn hình chi tiết `opportunities/[id].tsx`.
  - Áp dụng `useCreateOpportunityMutation()` cho màn hình tạo mới `opportunities/create.tsx`.
  - Tích hợp SSE Event `invalidate_Opportunities` tự động refetch danh sách khi Web/Backend tạo hoặc sửa cơ hội.
- **VERIFY:** Kéo vuốt Refresh Control sử dụng `refetch()` từ TanStack Query, hiển thị Skeleton/Spinner chuẩn. `npx tsc --noEmit` **0 lỗi**.

#### Task 2.3: Tích hợp TanStack Query & SSE cho Sub-module Quotations (Báo giá) — ✅ [COMPLETED]
- **Target Files:** `src/app/opportunities/quotations/list.tsx`, `src/app/opportunities/quotations/[quotId].tsx`, `src/app/opportunities/quotations/create.tsx`, [`src/hooks/queries/useQuotations.ts`](file:///c:/Users/my/Downloads/ERP/erp-mobile/src/hooks/queries/useQuotations.ts)
- **Chức năng:**
  - Áp dụng `useQuotationsQuery(filters)` & `useOpportunityQuotationsQuery(opportunityId)` cho màn hình danh sách báo giá theo cơ hội (`list.tsx`).
  - Áp dụng `useQuotationDetailQuery(quotId)`, `useApproveQuotationMutation()`, `useRejectQuotationMutation()` cho màn hình chi tiết báo giá (`[quotId].tsx`).
  - Áp dụng `useCreateQuotationMutation()`, `useUpdateQuotationMutation()`, `useOpportunityServicesQuery()`, `useAvailableServicesQuery()`, `useServicePackagesQuery()` cho màn hình tạo/sửa báo giá (`create.tsx`).
  - Tích hợp SSE Event `invalidate_Quotations` tự động sync dữ liệu thời gian thực giữa Web và App Mobile.
- **VERIFY:** 100% UI Data-fetching và mutations của phân hệ Báo giá đã chuyển sang TanStack Query. TypeScript type-check thành công **0 lỗi**.

---

### 📌 PHASE 3: Module Customers (Khách hàng) — ✅ [COMPLETED]

#### Task 3.1: Viết Query Hooks & Cập nhật Service cho Phân hệ Khách hàng — ✅ [COMPLETED]
- **Target Files:** [`src/services/customerService.ts`](file:///c:/Users/my/Downloads/ERP/erp-mobile/src/services/customerService.ts), [`src/hooks/queries/useCustomers.ts`](file:///c:/Users/my/Downloads/ERP/erp-mobile/src/hooks/queries/useCustomers.ts), [`src/services/queryKeys.ts`](file:///c:/Users/my/Downloads/ERP/erp-mobile/src/services/queryKeys.ts)
- **Chức năng:**
  - Sử dụng Query Keys có sẵn: `queryKeys.customers.all`, `queryKeys.customers.list(filters)`, `queryKeys.customers.detail(id)`.
  - Hook `useCustomersQuery(filters)` hỗ trợ tìm kiếm theo tên/SĐT/mã MST & phân trang.
  - Hook `useCustomerDetailQuery(id)` lấy chi tiết thông tin khách hàng.
  - Hook `useUpdateCustomerMutation()` cập nhật thông tin khách hàng & auto-invalidate `customers.all`.
- **VERIFY:** `npx tsc --noEmit` 0 lỗi.

#### Task 3.2: Refactor Màn hình Khách hàng & Tích hợp SSE Realtime — ✅ [COMPLETED]
- **Target Files:** [`src/app/customers/index.tsx`](file:///c:/Users/my/Downloads/ERP/erp-mobile/src/app/customers/index.tsx), [`src/hooks/useSSEQueryBridge.ts`](file:///c:/Users/my/Downloads/ERP/erp-mobile/src/hooks/useSSEQueryBridge.ts)
- **Chức năng:**
  - Thay thế toàn bộ `useState`/`useEffect` fetch dữ liệu thủ công trong `src/app/customers/index.tsx` bằng `useCustomersQuery`.
  - Kết nối `FlatList` với `RefreshControl` dùng `refetch()` và `isFetching` của TanStack Query.
  - Bổ sung SSE handler `handleCustomerInvalidate` trong `useSSEQueryBridge.ts` để lắng nghe sự kiện `invalidate_Customers` từ Backend.
- **VERIFY:** Vuốt kéo làm mới tức thì, tìm kiếm khách hàng mượt mà từ cache. `npx tsc --noEmit` đạt **0 lỗi**.

---

### 📌 PHASE 4: Module Contracts (Hợp đồng) — ✅ [COMPLETED]

#### Task 4.1: Viết Query Hooks & Service Hợp đồng — ✅ [COMPLETED]
- **Target Files:** `src/services/contractService.ts`, `src/hooks/queries/useContracts.ts`, `src/services/queryKeys.ts`
- **Chức năng:**
  - Sử dụng Query Keys: `queryKeys.contracts.all`, `queryKeys.contracts.list(filters)`, `queryKeys.contracts.detail(id)`.
  - Viết `useContractsQuery(filters)` hỗ trợ phân trang & lọc theo trạng thái hợp đồng.
  - Viết `useContractDetailQuery(id)` lấy chi tiết hợp đồng & phụ lục/tiến độ thanh toán.
  - Viết các mutation hooks: `useCreateContractMutation`, `useUploadProposalMutation`, `useUploadSignedMutation`, `useApproveProposalMutation`, `useRejectProposalMutation` tự động invalidate cache `contracts.all` và `contracts.detail(id)`.
- **VERIFY:** `npx tsc --noEmit` đạt 0 lỗi.

#### Task 4.2: Refactor Màn hình Hợp đồng & Tích hợp SSE Realtime — ✅ [COMPLETED]
- **Target Files:** `src/app/contracts/index.tsx`, `src/app/contracts/[id].tsx`, `src/hooks/useSSEQueryBridge.ts`
- **Chức năng:**
  - Refactor 100% màn hình danh sách `contracts/index.tsx` và chi tiết `contracts/[id].tsx` sử dụng TanStack Query Hooks & Mutations.
  - Kết nối `RefreshControl` với `refetch()` & `isFetching`.
  - Tích hợp handler `handleContractInvalidate` đón nhận sự kiện SSE `invalidate_Contracts` để tự động làm mới cache hợp đồng thời gian thực khi có thay đổi từ hệ thống Web/Backend.
- **VERIFY:** Chuyển tab trạng thái phản hồi tức thì từ cache, làm mới mượt mà. `npx tsc --noEmit` đạt **0 lỗi**.

---

### 📌 PHASE 5: Module Projects (Dự án & Mô tả sản phẩm) — ✅ [COMPLETED]

#### Task 5.1: Chuẩn hóa Query Hooks Dự án & Product Descriptions — ✅ [COMPLETED]
- **Target Files:** [`src/hooks/queries/useProjects.ts`](file:///c:/Users/my/Downloads/ERP/erp-mobile/src/hooks/queries/useProjects.ts), `src/services/projectService.ts`, `src/services/productDescriptionService.ts`
- **Chức năng:**
  - Định nghĩa Query Keys: `queryKeys.projects.all`, `queryKeys.projects.list`, `queryKeys.projects.detail(id)`, `queryKeys.projects.productDescriptions(projectId)`.
  - Viết các hooks: `useProjectsQuery(filters)`, `useProjectDetailQuery(id)`, `useProjectByContractQuery(contractId)`, `useAssignProjectMutation`, `useUpdateProjectStatusMutation`, `useUpdateProjectProgressMutation`, `useConfirmProjectMutation`, `usePmUsersQuery`.
  - Viết các hooks cho Mô tả sản phẩm: `useProductDescriptionsQuery(projectId)`, `useCreateProductDescriptionMutation`, `useSubmitProductDescriptionMutation`, `useApproveProductDescriptionMutation`, `useRejectProductDescriptionMutation`.
- **VERIFY:** `npx tsc --noEmit` đạt 0 lỗi.

#### Task 5.2: Refactor Màn hình Dự án & Component Mô tả sản phẩm — ✅ [COMPLETED]
- **Target Files:** `src/app/projects/index.tsx`, `src/app/projects/[id].tsx`, `src/components/projects/ProductDescriptionSection.tsx`, `src/hooks/useSSEQueryBridge.ts`
- **Chức năng:**
  - Chuyển đổi 100% màn hình danh sách `projects/index.tsx` và chi tiết `projects/[id].tsx` sang sử dụng `useProjectsQuery` & `useProjectDetailQuery`.
  - Chuyển đổi `ProductDescriptionSection.tsx` sang `useProductDescriptionsQuery` và các mutation async hooks.
  - Tích hợp handler SSE `handleProjectInvalidate` trong `useSSEQueryBridge.ts` cho sự kiện `invalidate_Projects`.
- **VERIFY:** Vuốt làm mới với `RefreshControl` (`isFetching`), tự động sync cache thời gian thực từ SSE. `npx tsc --noEmit` đạt **0 lỗi**.

---

### 📌 PHASE 6: Module Tasks (Công việc) — ✅ [COMPLETED]

#### Task 6.1: Viết Query Hooks & Service Công việc — ✅ [COMPLETED]
- **Target Files:** [`src/hooks/queries/useTasks.ts`](file:///c:/Users/my/Downloads/ERP/erp-mobile/src/hooks/queries/useTasks.ts), `src/services/taskService.ts`, `src/services/queryKeys.ts`
- **Chức năng:**
  - Định nghĩa Query Keys: `queryKeys.tasks.all`, `queryKeys.tasks.list(filters)`, `queryKeys.tasks.detail(id)`.
  - Viết các hooks: `useTasksQuery(filters)`, `useTasksByProjectQuery(projectId)`, `useTaskDetailQuery(id)`.
  - Viết các mutation hooks: `useUpdateTaskStatusMutation`, `useCreateTaskMutation`, `useAssignTaskMutation`, `useBulkAssignTasksMutation`, `useSubmitTaskResultMutation`, `useFinalizeTaskMutation`, `useRejectTaskMutation`, `useRequestReworkMutation` tự động invalidate cache `tasks.all`, `tasks.detail(id)` và `projects.all`.
- **VERIFY:** `npx tsc --noEmit` đạt 0 lỗi.

#### Task 6.2: Refactor Màn hình Công việc & Tích hợp SSE Realtime — ✅ [COMPLETED]
- **Target Files:** `src/app/tasks/index.tsx`, `src/app/tasks/[id].tsx`, `src/hooks/useSSEQueryBridge.ts`
- **Chức năng:**
  - Refactor 100% màn hình `tasks/index.tsx` và chi tiết `tasks/[id].tsx` sang TanStack Query v5 hooks.
  - Tích hợp `RefreshControl` gắn với `refetch()` và `isFetching`.
  - Lắng nghe sự kiện SSE `invalidate_Tasks` trong `useSSEQueryBridge.ts` để làm mới danh sách nhiệm vụ tức thì theo thời gian thực.
- **VERIFY:** Đổi trạng thái tab mượt mà từ cache. `npx tsc --noEmit` đạt **0 lỗi**.

---

### 📌 PHASE 7: Module Acceptances (Nghiệm thu) — ✅ [COMPLETED]

#### Task 7.1: Viết Query Hooks & Service Nghiệm thu — ✅ [COMPLETED]
- **Target Files:** [`src/hooks/queries/useAcceptances.ts`](file:///c:/Users/my/Downloads/ERP/erp-mobile/src/hooks/queries/useAcceptances.ts), `src/services/acceptanceService.ts`, `src/services/queryKeys.ts`
- **Chức năng:**
  - Query Keys: `queryKeys.acceptances.all`, `queryKeys.acceptances.list(filters)`, `queryKeys.acceptances.detail(id)`.
  - Viết `useAcceptancesQuery(filters)` & `useAcceptanceDetailQuery(id)`.
  - Viết `useCreateAcceptanceMutation()` & `useProcessAcceptanceMutation()` tự động invalidate cache `acceptances.all`, `acceptances.detail(id)` và `projects.all`.
- **VERIFY:** `npx tsc --noEmit` đạt **0 lỗi**.

#### Task 7.2: Refactor Màn hình Nghiệm thu & Tích hợp SSE Realtime — ✅ [COMPLETED]
- **Target Files:** [`src/app/acceptances/index.tsx`](file:///c:/Users/my/Downloads/ERP/erp-mobile/src/app/acceptances/index.tsx), `src/hooks/useSSEQueryBridge.ts`
- **Chức năng:**
  - Refactor 100% màn hình `acceptances/index.tsx` sử dụng TanStack Query v5 `useAcceptancesQuery`.
  - Kết nối `RefreshControl` với `refetch()` và `isFetching`.
  - Tích hợp handler SSE `handleAcceptanceInvalidate` trong `useSSEQueryBridge.ts` lắng nghe sự kiện `invalidate_Acceptances`.
- **VERIFY:** `npx tsc --noEmit` đạt **0 lỗi**.

---

## 4. Phase X: Kiểm Thử & Xắc Nhận Tổng Thể (Master Verification Checklist)

- [x] **Auth Security Check:** Xắc nhận AccessToken / RefreshToken luôn được đọc/ghi thông qua `privateStorage` (`SecureStore`).
- [x] **Type Check:** Run `npx tsc --noEmit` đạt 0 lỗi trên toàn bộ 7 modules.
- [x] **Lint Check:** Run `npx expo lint` không phát hiện lỗi mã nguồn.
- [x] **SSE Invalidation Test:** Giả lập SSE event cho 7 modules -> Kiểm tra TanStack Query cache tự động invalidated / updated.
- [x] **Form Persist Test:** Kiểm tra lưu nháp thành công ở màn hình Cơ hội kinh doanh & Báo giá khi tắt app đột ngột.
