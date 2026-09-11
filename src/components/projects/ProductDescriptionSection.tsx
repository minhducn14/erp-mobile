import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
  Linking,
  Modal,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import {
  ProductDescriptionSubmission,
  ProductDescriptionItem,
} from '@/services/productDescriptionService';
import { uploadToCloudinary } from '@/services/cloudinaryService';
import { BrandColors } from '@/constants/colors';
import { isValidUrl, normalizeUrl } from '@/utils/validators';
import {
  useProductDescriptionsQuery,
  useCreateProductDescriptionMutation,
  useSubmitProductDescriptionMutation,
  useApproveProductDescriptionMutation,
  useRejectProductDescriptionMutation,
} from '@/hooks/queries/useProjects';

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Bản nháp',
  PENDING_REVIEW: 'Chờ PM duyệt',
  APPROVED: 'Đã duyệt',
  REJECTED: 'Không duyệt',
};

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  DRAFT: { bg: '#F8FAFC', text: '#475569', border: '#E2E8F0' },
  PENDING_REVIEW: { bg: '#FFF7ED', text: '#C2410C', border: '#FFEDD5' },
  APPROVED: { bg: '#ECFDF5', text: '#047857', border: '#A7F3D0' },
  REJECTED: { bg: '#FFE4E6', text: '#BE123C', border: '#FECDD3' },
};

interface FormProductItem {
  productName: string;
  sourceType: 'LINK' | 'FILE';
  link: string;
  file: { uri: string; name: string; mimeType?: string; size?: number } | null;
  existingFile: { name: string; url: string; size?: number; publicId?: string } | null;
}

const emptyProduct = (): FormProductItem => ({
  productName: '',
  sourceType: 'LINK',
  link: '',
  file: null,
  existingFile: null,
});

const toEditableProduct = (item: ProductDescriptionItem): FormProductItem => ({
  productName: item.productName || '',
  sourceType: item.sourceType || 'LINK',
  link: item.sourceType === 'LINK' ? item.sourceUrl || '' : '',
  file: null,
  existingFile:
    item.sourceType === 'FILE'
      ? {
          name: item.sourceName || 'Tệp đính kèm',
          url: item.sourceUrl || '',
          size: item.size,
          publicId: item.publicId,
        }
      : null,
});

interface ProductDescriptionSectionProps {
  projectId: string;
  user: any;
  project: any;
}

export const ProductDescriptionSection: React.FC<ProductDescriptionSectionProps> = ({
  projectId,
  user,
  project,
}) => {
  const { data: submissionsRes, isLoading, refetch: refetchSubmissions } = useProductDescriptionsQuery(projectId);

  const submissions: ProductDescriptionSubmission[] = useMemo(() => {
    return Array.isArray(submissionsRes) ? submissionsRes : [];
  }, [submissionsRes]);

  const createSubmissionMutation = useCreateProductDescriptionMutation();
  const submitSubmissionMutation = useSubmitProductDescriptionMutation();
  const approveSubmissionMutation = useApproveProductDescriptionMutation();
  const rejectSubmissionMutation = useRejectProductDescriptionMutation();

  const [isSaving, setIsSaving] = useState(false);
  const [isReviewing, setIsReviewing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<number, number>>({});

  const [products, setProducts] = useState<FormProductItem[]>([emptyProduct()]);
  const [loadedSubmissionId, setLoadedSubmissionId] = useState<string | null>(null);

  // Reject Modal State
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [rejectTargetId, setRejectTargetId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const loadSubmissions = () => {
    refetchSubmissions();
  };

  const editableSubmission = useMemo(() => {
    return submissions.find(
      (sub) => sub.status === 'DRAFT' && sub.createdBy?.id === user?.id
    );
  }, [submissions, user?.id]);

  const hasPendingSubmission = submissions.some((sub) => sub.status === 'PENDING_REVIEW');
  const isAssignedPm =
    user?.role === 'PM' &&
    project?.team?.members?.some(
      (member: any) =>
        (member.role === 'PROJECT_MANAGER' || member.role === 'PM') && member.user?.id === user?.id
    );
  const isProjectLead = project?.team?.teamLead?.id === user?.id;
  const canManageSubmission = user?.role === 'BD' || isAssignedPm || isProjectLead;
  const canEdit = canManageSubmission && !hasPendingSubmission;
  const canReview = Boolean(isAssignedPm);

  useEffect(() => {
    if (editableSubmission && editableSubmission.id !== loadedSubmissionId) {
      setProducts(
        editableSubmission.items?.length
          ? editableSubmission.items.map(toEditableProduct)
          : [emptyProduct()]
      );
      setLoadedSubmissionId(editableSubmission.id);
    }
  }, [editableSubmission, loadedSubmissionId]);

  const updateProduct = (index: number, patch: Partial<FormProductItem>) => {
    setProducts((prev) => prev.map((item, idx) => (idx === index ? { ...item, ...patch } : item)));
  };

  const addProduct = () => {
    setProducts((prev) => [...prev, emptyProduct()]);
  };

  const removeProduct = (index: number) => {
    setProducts((prev) => (prev.length === 1 ? prev : prev.filter((_, idx) => idx !== index)));
  };

  const handlePickFile = async (index: number) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        updateProduct(index, {
          sourceType: 'FILE',
          file: {
            uri: asset.uri,
            name: asset.name,
            mimeType: asset.mimeType,
            size: asset.size,
          },
          existingFile: null,
          link: '',
        });
      }
    } catch {
      Alert.alert('Lỗi', 'Không thể chọn tệp tin từ máy.');
    }
  };

  const getProductSource = (product: FormProductItem) => {
    if (product.sourceType === 'LINK') {
      return product.link.trim()
        ? {
            sourceType: 'LINK',
            sourceName: product.link.trim(),
            sourceUrl: product.link.trim(),
          }
        : null;
    }

    if (product.existingFile?.url) {
      return {
        sourceType: 'FILE',
        sourceName: product.existingFile.name,
        sourceUrl: product.existingFile.url,
        size: product.existingFile.size,
        publicId: product.existingFile.publicId,
      };
    }

    return null;
  };

  const buildPayload = async () => {
    const normalized = [];

    for (let index = 0; index < products.length; index += 1) {
      const product = products[index];
      const productName = product.productName.trim();

      if (!productName) {
        throw new Error(`Vui lòng nhập tên sản phẩm ở dòng ${index + 1}`);
      }

      let source: any = getProductSource(product);
      if (product.sourceType === 'FILE' && product.file) {
        setIsUploading(true);
        const uploadedFile = await uploadToCloudinary(
          product.file,
          `GETVINI/ERP/projects/${projectId}/product-descriptions`,
          (progress) => setUploadProgress((prev) => ({ ...prev, [index]: progress }))
        );
        source = {
          sourceType: 'FILE',
          sourceName: uploadedFile.name,
          sourceUrl: uploadedFile.url,
          size: uploadedFile.size,
          publicId: uploadedFile.publicId,
        };
      }

      if (product.sourceType === 'LINK') {
        const rawLink = product.link.trim();
        if (!rawLink) {
          throw new Error(`Vui lòng nhập đường dẫn URL cho sản phẩm ${productName}`);
        }
        if (!isValidUrl(rawLink)) {
          throw new Error(`Đường dẫn URL không hợp lệ ở dòng ${index + 1} (${productName})`);
        }
        source = {
          sourceType: 'LINK',
          sourceName: rawLink,
          sourceUrl: normalizeUrl(rawLink),
        };
      }

      normalized.push({ productName, ...source });
    }

    return { items: normalized };
  };

  const handleCopySubmissionToForm = (sub: ProductDescriptionSubmission) => {
    if (!sub.items?.length) return;
    setProducts(sub.items.map(toEditableProduct));
    Alert.alert('Đã tải dữ liệu', `Đã điền thông tin từ bản ${sub.versionNumber ? 'Version ' + sub.versionNumber : 'gửi'} vào form. Bạn có thể chỉnh sửa và nhấn Gửi duyệt để tạo bản mới.`);
  };

  const resetForm = () => {
    setProducts([emptyProduct()]);
    setUploadProgress({});
  };

  const saveDraft = async () => {
    try {
      setIsSaving(true);
      setUploadProgress({});
      const payload = await buildPayload();

      await createSubmissionMutation.mutateAsync({ projectId, payload });
      Alert.alert('Thành công', 'Đã tạo bản mô tả sản phẩm mới (DRAFT)');
      resetForm();
      loadSubmissions();
    } catch (err: any) {
      Alert.alert('Lỗi', err?.message || 'Có lỗi xảy ra khi lưu bản mô tả sản phẩm');
    } finally {
      setIsSaving(false);
      setIsUploading(false);
    }
  };

  const submitForReview = async () => {
    try {
      setIsSaving(true);
      setUploadProgress({});
      const payload = await buildPayload();

      const createRes = await createSubmissionMutation.mutateAsync({ projectId, payload });
      const savedId = createRes?.id;

      if (savedId) {
        await submitSubmissionMutation.mutateAsync({ projectId, submissionId: savedId });
        Alert.alert('Thành công', 'Đã tạo bản mới và gửi PM duyệt thông tin chuẩn sản phẩm');
      }
      resetForm();
      loadSubmissions();
    } catch (err: any) {
      Alert.alert('Lỗi', err?.message || 'Có lỗi xảy ra khi gửi duyệt');
    } finally {
      setIsSaving(false);
      setIsUploading(false);
    }
  };

  const handleApprove = async (submissionId: string) => {
    try {
      setIsReviewing(true);
      await approveSubmissionMutation.mutateAsync({ projectId, submissionId });
      Alert.alert('Thành công', 'Đã duyệt version mô tả sản phẩm');
      loadSubmissions();
    } catch (err: any) {
      Alert.alert('Lỗi', err?.message || 'Duyệt thất bại');
    } finally {
      setIsReviewing(false);
    }
  };

  const handleOpenRejectModal = (submissionId: string) => {
    setRejectTargetId(submissionId);
    setRejectReason('');
    setRejectModalVisible(true);
  };

  const handleConfirmReject = async () => {
    if (!rejectTargetId) return;
    try {
      setIsReviewing(true);
      await rejectSubmissionMutation.mutateAsync({
        projectId,
        submissionId: rejectTargetId,
        reviewNote: rejectReason.trim() || undefined,
      });
      Alert.alert('Thành công', 'Đã từ chối duyệt bản mô tả sản phẩm');
      setRejectModalVisible(false);
      setRejectTargetId(null);
      setRejectReason('');
      loadSubmissions();
    } catch (err: any) {
      Alert.alert('Lỗi', err?.message || 'Từ chối thất bại');
    } finally {
      setIsReviewing(false);
    }
  };

  const handleOpenSourceLink = async (url?: string) => {
    if (!url) return;
    const targetUrl = normalizeUrl(url);

    try {
      const supported = await Linking.canOpenURL(targetUrl);
      if (supported) {
        await Linking.openURL(targetUrl);
      } else {
        Alert.alert('Lỗi', 'Đường dẫn URL không hỗ trợ hoặc không thể mở.');
      }
    } catch {
      Alert.alert('Lỗi', 'Không thể mở đường dẫn này.');
    }
  };

  const isWorking = isSaving || isUploading;

  return (
    <View className="bg-surface rounded-2xl p-4 border border-border gap-3.5">
      {/* Title Header */}
      <View className="flex-row justify-between items-center">
        <View className="flex-row items-center gap-2">
          <Feather name="package" size={18} color="#059669" />
          <Text className="text-[15px] font-bold text-text-primary">Mô tả sản phẩm (Thông tin chuẩn)</Text>
        </View>
        {isLoading && <ActivityIndicator size="small" color={BrandColors.primary} />}
      </View>

      {/* Version History List */}
      <View className="gap-3">
        {submissions.length > 0 ? (
          submissions.map((sub) => {
            const statusConfig = STATUS_COLORS[sub.status] || STATUS_COLORS.DRAFT;
            return (
              <View key={sub.id} className="bg-background rounded-xl p-3 border border-border gap-2.5">
                <View className="flex-row justify-between items-start">
                  <View className="flex-1">
                    <View className="flex-row items-center gap-2 flex-wrap">
                      <Text className="text-sm font-bold text-text-primary">
                        {sub.versionNumber ? `Version ${sub.versionNumber}` : 'Bản gửi chờ duyệt'}
                      </Text>
                      <View className="px-2 py-0.5 rounded-md border" style={{ backgroundColor: statusConfig.bg, borderColor: statusConfig.border }}>
                        <Text className="text-[11px] font-bold" style={{ color: statusConfig.text }}>
                          {STATUS_LABELS[sub.status] || sub.status}
                        </Text>
                      </View>
                    </View>
                    <Text className="text-[11px] text-text-secondary mt-0.5">
                      Người tạo: {sub.createdBy?.fullName || 'Không xác định'}
                      {sub.reviewedBy?.fullName ? ` - Người duyệt: ${sub.reviewedBy.fullName}` : ''}
                    </Text>
                    {sub.reviewNote ? (
                      <Text className="text-xs italic text-rose-600 mt-1">Lý do: {sub.reviewNote}</Text>
                    ) : null}
                  </View>
                </View>

                {/* Items in Version */}
                <View className="gap-1.5">
                  {sub.items?.map((item) => (
                    <View key={item.id} className="bg-surface px-3 py-2.5 rounded-lg border border-border gap-1.5">
                      <Text className="text-xs font-bold text-text-primary">
                        {item.productName}
                      </Text>
                      <TouchableOpacity
                        className="flex-row items-center gap-1.5 self-start bg-blue-50 px-2 py-1 rounded-md max-w-full"
                        onPress={() => handleOpenSourceLink(item.sourceUrl)}
                        activeOpacity={0.7}
                      >
                        <Feather
                          name={item.sourceType === 'LINK' ? 'link-2' : 'paperclip'}
                          size={13}
                          color="#2563EB"
                        />
                        <Text className="text-xs font-semibold text-blue-600 shrink" numberOfLines={1}>
                          {item.sourceName || item.sourceUrl}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>

                {/* Version Card Actions */}
                <View className="flex-row justify-end gap-2 mt-1">
                  {canManageSubmission && !hasPendingSubmission && (
                    <TouchableOpacity
                      className="flex-row items-center gap-1 px-2.5 py-1.5 rounded-lg border border-blue-200 bg-blue-50"
                      onPress={() => handleCopySubmissionToForm(sub)}
                      activeOpacity={0.7}
                    >
                      <Feather name="edit-3" size={13} color="#2563EB" />
                      <Text className="text-xs font-semibold text-blue-600">Sửa / Tạo bản mới từ bản này</Text>
                    </TouchableOpacity>
                  )}

                  {canReview && sub.status === 'PENDING_REVIEW' && (
                    <>
                      <TouchableOpacity
                        className="flex-row items-center gap-1 px-3 py-1.5 rounded-lg border border-rose-200 bg-rose-50"
                        onPress={() => handleOpenRejectModal(sub.id)}
                        disabled={isReviewing}
                        activeOpacity={0.8}
                      >
                        <Feather name="x-circle" size={14} color="#DC2626" />
                        <Text className="text-xs font-bold text-rose-600">Không duyệt</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        className="flex-row items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600"
                        onPress={() => handleApprove(sub.id)}
                        disabled={isReviewing}
                        activeOpacity={0.85}
                      >
                        <Feather name="check-circle" size={14} color="#FFFFFF" />
                        <Text className="text-xs font-bold text-white">Duyệt</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </View>
            );
          })
        ) : (
          <View className="py-4 items-center border border-dashed border-slate-300 rounded-xl">
            <Text className="text-xs text-text-muted italic">Chưa có thông tin chuẩn sản phẩm</Text>
          </View>
        )}
      </View>

      {/* Edit / New Submission Form */}
      {canManageSubmission && (
        <View className="bg-background rounded-xl p-3 border border-border gap-2.5 mt-1">
          <View className="flex-row justify-between items-start">
            <View className="flex-1">
              <Text className="text-xs font-bold text-text-primary">Tạo bản gửi mới</Text>
              {hasPendingSubmission && (
                <Text className="text-[11px] text-amber-600 mt-0.5">
                  Đang có bản chờ PM duyệt, bạn có thể chỉnh tiếp sau khi PM phản hồi.
                </Text>
              )}
            </View>

            <TouchableOpacity
              className={`flex-row items-center gap-1 bg-surface border border-blue-200 px-2.5 py-[5px] rounded-lg ${(!canEdit || isWorking) ? 'opacity-50' : ''}`}
              onPress={addProduct}
              disabled={!canEdit || isWorking}
              activeOpacity={0.7}
            >
              <Feather name="plus" size={14} color="#2563EB" />
              <Text className="text-xs font-bold text-blue-600">Thêm sản phẩm</Text>
            </TouchableOpacity>
          </View>

          {/* Form Products List */}
          <View className="gap-2.5">
            {products.map((prod, idx) => (
              <View key={idx} className="bg-surface rounded-xl p-2.5 border border-border gap-2">
                <View className="flex-row justify-between items-center">
                  <Text className="text-xs font-bold text-text-secondary">Sản phẩm {idx + 1}</Text>
                  {products.length > 1 && (
                    <TouchableOpacity
                      onPress={() => removeProduct(idx)}
                      disabled={!canEdit || isWorking}
                    >
                      <Feather name="trash-2" size={16} color="#EF4444" />
                    </TouchableOpacity>
                  )}
                </View>

                {/* Product Name Input */}
                <TextInput
                  className="bg-background border border-slate-300 rounded-lg px-2.5 py-2 text-xs text-text-primary"
                  placeholder="Nhập tên sản phẩm"
                  placeholderTextColor="#94A3B8"
                  value={prod.productName}
                  onChangeText={(val) => updateProduct(idx, { productName: val })}
                  editable={canEdit && !isWorking}
                />

                {/* Source Type Selector */}
                <View className="flex-row gap-2">
                  <TouchableOpacity
                    className={`flex-1 flex-row items-center justify-center gap-1.5 py-2 rounded-lg border bg-background ${prod.sourceType === 'LINK' ? 'border-blue-300 bg-blue-50' : 'border-border'}`}
                    onPress={() =>
                      updateProduct(idx, {
                        sourceType: 'LINK',
                        link: '',
                        file: null,
                        existingFile: null,
                      })
                    }
                    disabled={!canEdit || isWorking}
                  >
                    <Feather
                      name="link-2"
                      size={13}
                      color={prod.sourceType === 'LINK' ? '#2563EB' : '#64748B'}
                    />
                    <Text className={`text-xs ${prod.sourceType === 'LINK' ? 'text-blue-600 font-bold' : 'font-semibold text-text-secondary'}`}>
                      Link tham khảo
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    className={`flex-1 flex-row items-center justify-center gap-1.5 py-2 rounded-lg border bg-background ${prod.sourceType === 'FILE' ? 'border-blue-300 bg-blue-50' : 'border-border'}`}
                    onPress={() =>
                      updateProduct(idx, {
                        sourceType: 'FILE',
                        link: '',
                        file: null,
                        existingFile: null,
                      })
                    }
                    disabled={!canEdit || isWorking}
                  >
                    <Feather
                      name="paperclip"
                      size={13}
                      color={prod.sourceType === 'FILE' ? '#2563EB' : '#64748B'}
                    />
                    <Text className={`text-xs ${prod.sourceType === 'FILE' ? 'text-blue-600 font-bold' : 'font-semibold text-text-secondary'}`}>
                      File đính kèm
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Source Input details */}
                {prod.sourceType === 'LINK' ? (
                  <TextInput
                    className="bg-background border border-slate-300 rounded-lg px-2.5 py-2 text-xs text-text-primary"
                    placeholder="https://... (Nhập liên kết tài liệu)"
                    placeholderTextColor="#94A3B8"
                    value={prod.link}
                    onChangeText={(val) => updateProduct(idx, { link: val })}
                    autoCapitalize="none"
                    editable={canEdit && !isWorking}
                  />
                ) : (
                  <View className="flex-row items-center gap-2">
                    <TouchableOpacity
                      className="flex-row items-center gap-1 bg-slate-100 border border-slate-300 px-2.5 py-[7px] rounded-lg"
                      onPress={() => handlePickFile(idx)}
                      disabled={!canEdit || isWorking}
                      activeOpacity={0.8}
                    >
                      <Feather name="upload" size={14} color="#475569" />
                      <Text className="text-xs font-semibold text-slate-700">Chọn file</Text>
                    </TouchableOpacity>

                    <Text className="flex-1 text-xs text-text-secondary" numberOfLines={1}>
                      {prod.file?.name || prod.existingFile?.name || 'Chưa chọn file'}
                    </Text>

                    {isUploading && uploadProgress[idx] !== undefined && (
                      <Text className="text-[11px] font-bold text-blue-600">{uploadProgress[idx]}%</Text>
                    )}
                  </View>
                )}
              </View>
            ))}
          </View>

          {/* Save / Submit Footer */}
          <View className="flex-row justify-end gap-2 mt-1">
            <TouchableOpacity
              className={`flex-row items-center gap-1 px-3.5 py-2 rounded-lg border border-slate-300 bg-surface ${(!canEdit || isWorking) ? 'opacity-50' : ''}`}
              onPress={saveDraft}
              disabled={!canEdit || isWorking}
              activeOpacity={0.8}
            >
              <Feather name="save" size={15} color="#334155" />
              <Text className="text-xs font-semibold text-slate-700">Lưu nháp</Text>
            </TouchableOpacity>

            <TouchableOpacity
              className={`flex-row items-center gap-1 px-3.5 py-2 rounded-lg bg-blue-600 ${(!canEdit || isWorking) ? 'opacity-50' : ''}`}
              onPress={submitForReview}
              disabled={!canEdit || isWorking}
              activeOpacity={0.85}
            >
              {isWorking ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Feather name="send" size={15} color="#FFFFFF" />
                  <Text className="text-xs font-bold text-white">Gửi PM duyệt</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Modal nhập lý do không duyệt */}
      <Modal
        visible={rejectModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setRejectModalVisible(false)}
      >
        <View className="flex-1 bg-slate-900/65 justify-center items-center p-5">
          <View className="w-full max-w-[420px] bg-surface rounded-2xl p-[18px] gap-3 shadow-lg">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-2">
                <Feather name="x-circle" size={18} color="#DC2626" />
                <Text className="text-base font-bold text-text-primary">Lý do không duyệt</Text>
              </View>
              <TouchableOpacity
                onPress={() => setRejectModalVisible(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Feather name="x" size={18} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text className="text-xs text-text-secondary leading-4.5">
              Nhập thông tin phản hồi hoặc lý do từ chối bản mô tả sản phẩm này (có thể bỏ trống):
            </Text>

            <TextInput
              className="bg-background border border-slate-300 rounded-xl px-3 py-2.5 text-xs text-text-primary min-h-[80px]"
              placeholder="VD: Thiếu link tài liệu chuẩn kỹ thuật..."
              placeholderTextColor="#94A3B8"
              value={rejectReason}
              onChangeText={setRejectReason}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />

            <View className="flex-row justify-end items-center gap-2.5 mt-1">
              <TouchableOpacity
                className="px-3.5 py-2 rounded-lg bg-slate-100"
                onPress={() => setRejectModalVisible(false)}
                disabled={isReviewing}
                activeOpacity={0.8}
              >
                <Text className="text-xs font-semibold text-slate-600">Hủy</Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="px-3.5 py-2 rounded-lg bg-rose-600"
                onPress={handleConfirmReject}
                disabled={isReviewing}
                activeOpacity={0.85}
              >
                {isReviewing ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text className="text-xs font-bold text-white">Xác nhận không duyệt</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};
