import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  Alert,
  Linking,
  Modal,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import {
  productDescriptionService,
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

      const res = await productDescriptionService.createSubmission(projectId, payload);
      if (res.error) throw new Error(res.error);
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

      // Mỗi lần gửi duyệt sẽ tạo 1 bản submission mới
      const createRes = await productDescriptionService.createSubmission(projectId, payload);
      if (createRes.error) throw new Error(createRes.error);
      const savedId = createRes.data?.id;

      if (savedId) {
        const submitRes = await productDescriptionService.submitSubmission(projectId, savedId);
        if (submitRes.error) throw new Error(submitRes.error);
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
      const res = await productDescriptionService.approveSubmission(projectId, submissionId);
      if (res.error) throw new Error(res.error);
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
      const res = await productDescriptionService.rejectSubmission(
        projectId,
        rejectTargetId,
        rejectReason.trim() || undefined
      );
      if (res.error) throw new Error(res.error);
      Alert.alert('Thành công', 'Đã từ chối duyệt bản mô tả sản phẩm');
      setRejectModalVisible(false);
      setRejectTargetId(null);
      setRejectReason('');
      loadSubmissions();
    } catch (err: any) {
      Alert.alert('Lỗi', err?.message || 'Không duyệt thất bại');
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
    <View style={styles.card}>
      {/* Title Header */}
      <View style={styles.cardHeaderBetween}>
        <View style={styles.cardHeader}>
          <Feather name="package" size={18} color="#059669" />
          <Text style={styles.cardTitle}>Mô tả sản phẩm (Thông tin chuẩn)</Text>
        </View>
        {isLoading && <ActivityIndicator size="small" color={BrandColors.primary} />}
      </View>

      {/* Version History List */}
      <View style={styles.submissionsList}>
        {submissions.length > 0 ? (
          submissions.map((sub) => {
            const statusConfig = STATUS_COLORS[sub.status] || STATUS_COLORS.DRAFT;
            return (
              <View key={sub.id} style={styles.versionCard}>
                <View style={styles.versionHeaderRow}>
                  <View style={{ flex: 1 }}>
                    <View style={styles.versionTitleRow}>
                      <Text style={styles.versionTitle}>
                        {sub.versionNumber ? `Version ${sub.versionNumber}` : 'Bản gửi chờ duyệt'}
                      </Text>
                      <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg, borderColor: statusConfig.border }]}>
                        <Text style={[styles.statusBadgeText, { color: statusConfig.text }]}>
                          {STATUS_LABELS[sub.status] || sub.status}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.versionMetaText}>
                      Người tạo: {sub.createdBy?.fullName || 'Không xác định'}
                      {sub.reviewedBy?.fullName ? ` - Người duyệt: ${sub.reviewedBy.fullName}` : ''}
                    </Text>
                    {sub.reviewNote ? (
                      <Text style={styles.reviewNoteText}>Lý do: {sub.reviewNote}</Text>
                    ) : null}
                  </View>
                </View>

                {/* Items in Version */}
                <View style={styles.itemsContainer}>
                  {sub.items?.map((item) => (
                    <View key={item.id} style={styles.itemRow}>
                      <Text style={styles.itemProductName}>
                        {item.productName}
                      </Text>
                      <TouchableOpacity
                        style={styles.itemSourceLinkBtn}
                        onPress={() => handleOpenSourceLink(item.sourceUrl)}
                        activeOpacity={0.7}
                      >
                        <Feather
                          name={item.sourceType === 'LINK' ? 'link-2' : 'paperclip'}
                          size={13}
                          color="#2563EB"
                        />
                        <Text style={styles.itemSourceLinkText} numberOfLines={1}>
                          {item.sourceName || item.sourceUrl}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>

                {/* Version Card Actions */}
                <View style={styles.reviewActionsRow}>
                  {canManageSubmission && !hasPendingSubmission && (
                    <TouchableOpacity
                      style={styles.copyFormBtn}
                      onPress={() => handleCopySubmissionToForm(sub)}
                      activeOpacity={0.7}
                    >
                      <Feather name="edit-3" size={13} color="#2563EB" />
                      <Text style={styles.copyFormBtnText}>Sửa / Tạo bản mới từ bản này</Text>
                    </TouchableOpacity>
                  )}

                  {canReview && sub.status === 'PENDING_REVIEW' && (
                    <>
                      <TouchableOpacity
                        style={styles.rejectBtn}
                        onPress={() => handleOpenRejectModal(sub.id)}
                        disabled={isReviewing}
                        activeOpacity={0.8}
                      >
                        <Feather name="x-circle" size={14} color="#DC2626" />
                        <Text style={styles.rejectBtnText}>Không duyệt</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.approveBtn}
                        onPress={() => handleApprove(sub.id)}
                        disabled={isReviewing}
                        activeOpacity={0.85}
                      >
                        <Feather name="check-circle" size={14} color="#FFFFFF" />
                        <Text style={styles.approveBtnText}>Duyệt</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </View>
            );
          })
        ) : (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>Chưa có thông tin chuẩn sản phẩm</Text>
          </View>
        )}
      </View>

      {/* Edit / New Submission Form */}
      {canManageSubmission && (
        <View style={styles.formContainer}>
          <View style={styles.formHeaderRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.formTitle}>Tạo bản gửi mới</Text>
              {hasPendingSubmission && (
                <Text style={styles.pendingWarningText}>
                  Đang có bản chờ PM duyệt, bạn có thể chỉnh tiếp sau khi PM phản hồi.
                </Text>
              )}
            </View>

            <TouchableOpacity
              style={[styles.addProductBtn, (!canEdit || isWorking) && styles.btnDisabled]}
              onPress={addProduct}
              disabled={!canEdit || isWorking}
              activeOpacity={0.7}
            >
              <Feather name="plus" size={14} color="#2563EB" />
              <Text style={styles.addProductBtnText}>Thêm sản phẩm</Text>
            </TouchableOpacity>
          </View>

          {/* Form Products List */}
          <View style={styles.productsFormList}>
            {products.map((prod, idx) => (
              <View key={idx} style={styles.productFormCard}>
                <View style={styles.productFormHeaderRow}>
                  <Text style={styles.productNumberTitle}>Sản phẩm {idx + 1}</Text>
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
                  style={styles.textInput}
                  placeholder="Nhập tên sản phẩm"
                  placeholderTextColor="#94A3B8"
                  value={prod.productName}
                  onChangeText={(val) => updateProduct(idx, { productName: val })}
                  editable={canEdit && !isWorking}
                />

                {/* Source Type Selector */}
                <View style={styles.sourceTypeRow}>
                  <TouchableOpacity
                    style={[
                      styles.sourceTypeBtn,
                      prod.sourceType === 'LINK' && styles.sourceTypeBtnActive,
                    ]}
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
                    <Text
                      style={[
                        styles.sourceTypeBtnText,
                        prod.sourceType === 'LINK' && styles.sourceTypeBtnTextActive,
                      ]}
                    >
                      Link tham khảo
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.sourceTypeBtn,
                      prod.sourceType === 'FILE' && styles.sourceTypeBtnActive,
                    ]}
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
                    <Text
                      style={[
                        styles.sourceTypeBtnText,
                        prod.sourceType === 'FILE' && styles.sourceTypeBtnTextActive,
                      ]}
                    >
                      File đính kèm
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Source Input details */}
                {prod.sourceType === 'LINK' ? (
                  <TextInput
                    style={styles.textInput}
                    placeholder="https://... (Nhập liên kết tài liệu)"
                    placeholderTextColor="#94A3B8"
                    value={prod.link}
                    onChangeText={(val) => updateProduct(idx, { link: val })}
                    autoCapitalize="none"
                    editable={canEdit && !isWorking}
                  />
                ) : (
                  <View style={styles.filePickerBox}>
                    <TouchableOpacity
                      style={styles.pickFileBtn}
                      onPress={() => handlePickFile(idx)}
                      disabled={!canEdit || isWorking}
                      activeOpacity={0.8}
                    >
                      <Feather name="upload" size={14} color="#475569" />
                      <Text style={styles.pickFileBtnText}>Chọn file</Text>
                    </TouchableOpacity>

                    <Text style={styles.fileNameDisplay} numberOfLines={1}>
                      {prod.file?.name || prod.existingFile?.name || 'Chưa chọn file'}
                    </Text>

                    {isUploading && uploadProgress[idx] !== undefined && (
                      <Text style={styles.uploadPercentText}>{uploadProgress[idx]}%</Text>
                    )}
                  </View>
                )}
              </View>
            ))}
          </View>

          {/* Save / Submit Footer */}
          <View style={styles.formFooterActions}>
            <TouchableOpacity
              style={[styles.saveDraftBtn, (!canEdit || isWorking) && styles.btnDisabled]}
              onPress={saveDraft}
              disabled={!canEdit || isWorking}
              activeOpacity={0.8}
            >
              <Feather name="save" size={15} color="#334155" />
              <Text style={styles.saveDraftBtnText}>Lưu nháp</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.submitReviewBtn, (!canEdit || isWorking) && styles.btnDisabled]}
              onPress={submitForReview}
              disabled={!canEdit || isWorking}
              activeOpacity={0.85}
            >
              {isWorking ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Feather name="send" size={15} color="#FFFFFF" />
                  <Text style={styles.submitReviewBtnText}>Gửi PM duyệt</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Modal nhập lý do không duyệt (Tương tự Web prompt) */}
      <Modal
        visible={rejectModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setRejectModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContentCard}>
            <View style={styles.modalHeaderRow}>
              <View style={styles.modalHeaderTitleRow}>
                <Feather name="x-circle" size={18} color="#DC2626" />
                <Text style={styles.modalHeaderTitle}>Lý do không duyệt</Text>
              </View>
              <TouchableOpacity
                onPress={() => setRejectModalVisible(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Feather name="x" size={18} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalDescriptionText}>
              Nhập thông tin phản hồi hoặc lý do từ chối bản mô tả sản phẩm này (có thể bỏ trống):
            </Text>

            <TextInput
              style={styles.modalTextArea}
              placeholder="VD: Thiếu link tài liệu chuẩn kỹ thuật..."
              placeholderTextColor="#94A3B8"
              value={rejectReason}
              onChangeText={setRejectReason}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />

            <View style={styles.modalFooterRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setRejectModalVisible(false)}
                disabled={isReviewing}
                activeOpacity={0.8}
              >
                <Text style={styles.modalCancelBtnText}>Hủy</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalConfirmRejectBtn}
                onPress={handleConfirmReject}
                disabled={isReviewing}
                activeOpacity={0.85}
              >
                {isReviewing ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalConfirmRejectBtnText}>Xác nhận không duyệt</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardHeaderBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  submissionsList: {
    gap: 12,
  },
  versionCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 10,
  },
  versionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  versionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  versionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  versionMetaText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  reviewNoteText: {
    fontSize: 12,
    fontStyle: 'italic',
    color: '#DC2626',
    marginTop: 4,
  },
  itemsContainer: {
    gap: 6,
  },
  itemRow: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
  },
  itemProductName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  itemSourceLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    maxWidth: '100%',
  },
  itemSourceLinkText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2563EB',
    flexShrink: 1,
  },
  reviewActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 4,
  },
  copyFormBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    backgroundColor: '#EFF6FF',
  },
  copyFormBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2563EB',
  },
  rejectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FECDD3',
    backgroundColor: '#FFF1F2',
  },
  rejectBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#DC2626',
  },
  approveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#059669',
  },
  approveBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  emptyBox: {
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#CBD5E1',
    borderRadius: 10,
  },
  emptyText: {
    fontSize: 12,
    color: '#94A3B8',
    fontStyle: 'italic',
  },
  formContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 10,
    marginTop: 4,
  },
  formHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  formTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  pendingWarningText: {
    fontSize: 11,
    color: '#D97706',
    marginTop: 2,
  },
  addProductBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  addProductBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563EB',
  },
  productsFormList: {
    gap: 10,
  },
  productFormCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
  },
  productFormHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  productNumberTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    color: '#0F172A',
  },
  sourceTypeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  sourceTypeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  sourceTypeBtnActive: {
    borderColor: '#93C5FD',
    backgroundColor: '#EFF6FF',
  },
  sourceTypeBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  sourceTypeBtnTextActive: {
    color: '#2563EB',
    fontWeight: '700',
  },
  filePickerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pickFileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
  },
  pickFileBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  fileNameDisplay: {
    flex: 1,
    fontSize: 12,
    color: '#64748B',
  },
  uploadPercentText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563EB',
  },
  formFooterActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 4,
  },
  saveDraftBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
  },
  saveDraftBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  submitReviewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#2563EB',
  },
  submitReviewBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  btnDisabled: {
    opacity: 0.5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContentCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    gap: 12,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalHeaderTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  modalDescriptionText: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
  },
  modalTextArea: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#0F172A',
    minHeight: 80,
  },
  modalFooterRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
  },
  modalCancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  modalCancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  modalConfirmRejectBtn: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
    backgroundColor: '#DC2626',
  },
  modalConfirmRejectBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
