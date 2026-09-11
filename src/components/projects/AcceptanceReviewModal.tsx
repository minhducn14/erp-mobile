import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
  Linking,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { AcceptanceItem, ACCEPTANCE_STATUS_CONFIG } from '@/services/acceptanceService';
import { useAcceptanceDetailQuery, useProcessAcceptanceMutation } from '@/hooks/queries/useAcceptances';
import { BrandColors } from '@/constants/colors';

interface AcceptanceReviewModalProps {
  visible: boolean;
  onClose: () => void;
  request: AcceptanceItem | null;
  onSuccess: () => void;
}

export default function AcceptanceReviewModal({
  visible,
  onClose,
  request,
  onSuccess,
}: AcceptanceReviewModalProps) {
  const router = useRouter();
  const [decisions, setDecisions] = useState<Record<string, any>>({});

  const { data: fullRequest, isLoading: isLoadingDetails } = useAcceptanceDetailQuery(
    visible && request?.id ? request.id : ''
  );

  const processAcceptanceMutation = useProcessAcceptanceMutation();
  const isSubmitting = processAcceptanceMutation.isPending;

  const handleGoToTask = (taskId?: string) => {
    if (!taskId) return;
    onClose();
    router.push(`/tasks/${taskId}` as any);
  };

  useEffect(() => {
    if (visible && fullRequest) {
      const services = (fullRequest as any).services || [];
      const initialDecisions: Record<string, any> = {};
      services.forEach((s: any) => {
        initialDecisions[s.id] = {
          status: 'APPROVED',
          feedback: '',
          resultDecisions: (s.results || [])
            .filter((r: any) => r.status !== 'APPROVED')
            .map((r: any) => ({
              taskId: r.taskId,
              status: 'APPROVED',
              feedback: '',
            })),
        };
      });
      setDecisions(initialDecisions);
    } else if (!visible) {
      setDecisions({});
    }
  }, [visible, fullRequest]);

  const handleServiceDecision = (serviceId: string, status: 'APPROVED' | 'REJECTED') => {
    setDecisions((prev) => {
      const current = prev[serviceId] || {};
      const updatedResultDecisions = (current.resultDecisions || []).map((rd: any) => ({
        ...rd,
        status,
      }));
      return {
        ...prev,
        [serviceId]: {
          ...current,
          status,
          resultDecisions: updatedResultDecisions,
        },
      };
    });
  };

  const handleResultDecision = (serviceId: string, taskId: string, status: 'APPROVED' | 'REJECTED') => {
    setDecisions((prev) => {
      const current = prev[serviceId] || {};
      const updatedResultDecisions = (current.resultDecisions || []).map((rd: any) =>
        rd.taskId === taskId ? { ...rd, status } : rd
      );
      const anyRejected = updatedResultDecisions.some((rd: any) => rd.status === 'REJECTED');
      return {
        ...prev,
        [serviceId]: {
          ...current,
          status: anyRejected ? 'REJECTED' : 'APPROVED',
          resultDecisions: updatedResultDecisions,
        },
      };
    });
  };

  const handleResultFeedback = (serviceId: string, taskId: string, feedback: string) => {
    setDecisions((prev) => {
      const current = prev[serviceId] || {};
      return {
        ...prev,
        [serviceId]: {
          ...current,
          resultDecisions: (current.resultDecisions || []).map((rd: any) =>
            rd.taskId === taskId ? { ...rd, feedback } : rd
          ),
        },
      };
    });
  };

  const handleOpenResultUrl = (url?: string) => {
    if (!url) return;
    let target = url;
    if (!target.startsWith('http://') && !target.startsWith('https://')) {
      target = 'https://' + target;
    }
    Linking.openURL(target).catch(() => {
      Alert.alert('Lỗi', 'Không thể mở liên kết kết quả.');
    });
  };

  const handleSubmit = async () => {
    if (!request?.id) return;

    const payload = Object.entries(decisions).map(([serviceId, data]: [string, any]) => ({
      serviceId,
      status: data.status,
      feedback: data.feedback,
      resultDecisions: data.resultDecisions,
    }));

    // Check if any rejected result is missing feedback
    for (const serviceDecision of payload) {
      for (const rd of serviceDecision.resultDecisions || []) {
        if (rd.status === 'REJECTED' && !rd.feedback?.trim()) {
          Alert.alert('Cảnh báo', 'Vui lòng nhập lý do từ chối cho kết quả bị loại.');
          return;
        }
      }
    }

    try {
      await processAcceptanceMutation.mutateAsync({
        id: request.id,
        decisions: payload,
      });

      Alert.alert('Thành công', 'Đã xử lý nghiệm thu thành công.');
      onClose();
      onSuccess();
    } catch (err: any) {
      Alert.alert('Lỗi', err?.message || 'Xử lý nghiệm thu thất bại.');
    }
  };

  if (!visible || !request) return null;

  const isReadOnly = request.status !== 'PENDING';
  const services = fullRequest?.services || request.services || [];
  const statusConfig = ACCEPTANCE_STATUS_CONFIG[request.status] || {
    text: request.status,
    color: '#64748B',
    bg: '#F1F5F9',
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={styles.title}>Phê duyệt nghiệm thu</Text>
                <View style={[styles.statusBadgeHeader, { backgroundColor: statusConfig.bg }]}>
                  <Text style={[styles.statusBadgeHeaderText, { color: statusConfig.color }]}>
                    {statusConfig.text}
                  </Text>
                </View>
              </View>
              <Text style={styles.subTitle} numberOfLines={1}>
                {request.name || request.project?.name || request.acceptanceCode || 'Nghiệm thu dịch vụ'}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Feather name="x" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          {isLoadingDetails ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color={BrandColors.primary} />
              <Text style={styles.loadingText}>Đang tải thông tin chi tiết...</Text>
            </View>
          ) : (
            <ScrollView style={styles.formBody} showsVerticalScrollIndicator={false}>
              {/* Creator & Status Info */}
              <View style={styles.infoCard}>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Người yêu cầu:</Text>
                  <Text style={styles.infoVal}>
                    {(fullRequest as any)?.requester?.fullName || fullRequest?.creator?.fullName || request.creator?.fullName || 'Team Lead'}
                  </Text>
                </View>
                {request.createdAt && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Ngày yêu cầu:</Text>
                    <Text style={styles.infoVal}>
                      {new Date(request.createdAt).toLocaleDateString('vi-VN')}
                    </Text>
                  </View>
                )}
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Trạng thái biên bản:</Text>
                  <Text style={[styles.infoVal, { color: statusConfig.color }]}>
                    {statusConfig.text}
                  </Text>
                </View>
                {request.note ? (
                  <View style={styles.noteBox}>
                    <Text style={styles.noteLabel}>Ghi chú từ người tạo:</Text>
                    <Text style={styles.noteText}>{request.note}</Text>
                  </View>
                ) : null}
              </View>

              {/* Service Items List */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  CHI TIẾT HẠNG MỤC DỊCH VỤ ({services.length})
                </Text>

                {services.map((service: any) => {
                  const serviceDecision = decisions[service.id] || {};
                  const results = service.results || [];
                  const serviceCode = service.code || service.service?.code || service.serviceCode;

                  const parentObj =
                    service.service?.parent ||
                    service.parent ||
                    service.parentService ||
                    service.serviceGroup ||
                    service.category;
                  const parentCode =
                    service.parentCode ||
                    service.parentServiceCode ||
                    service.service?.parentCode ||
                    service.service?.parent?.code ||
                    parentObj?.code ||
                    parentObj?.serviceCode;
                  const parentName =
                    service.parentName ||
                    service.parentServiceName ||
                    service.service?.parentName ||
                    parentObj?.name ||
                    parentObj?.serviceName;

                  return (
                    <View key={service.id} style={styles.serviceBox}>
                      <View style={styles.serviceHeader}>
                        <View style={{ flex: 1 }}>
                          <View style={styles.nameWithCodeRow}>
                            {parentCode && (
                              <View style={styles.parentCodeTag}>
                                <Text style={styles.parentCodeTagText}>#{parentCode}</Text>
                              </View>
                            )}
                            {serviceCode && (
                              <View style={styles.codeTag}>
                                <Text style={styles.codeTagText}>#{serviceCode}</Text>
                              </View>
                            )}
                            <Text style={styles.serviceName}>
                              {service.service?.name || service.name || 'Hạng mục dịch vụ'}
                            </Text>
                          </View>
                          {parentName ? (
                            <Text style={styles.parentServiceNameText}>
                              Dịch vụ cha: {parentName}
                            </Text>
                          ) : null}
                        </View>

                        {isReadOnly ? (
                          <View style={styles.readOnlyDecisionBadge}>
                            {service.status === 'APPROVED' || serviceDecision.status === 'APPROVED' ? (
                              <View style={styles.badgeSuccess}>
                                <Feather name="check-circle" size={12} color="#059669" />
                                <Text style={styles.badgeSuccessText}>Đã duyệt</Text>
                              </View>
                            ) : (
                              <View style={styles.badgeDanger}>
                                <Feather name="x-circle" size={12} color="#DC2626" />
                                <Text style={styles.badgeDangerText}>Từ chối</Text>
                              </View>
                            )}
                          </View>
                        ) : (
                          <View style={styles.decisionGroup}>
                            <TouchableOpacity
                              style={[
                                styles.decisionBtn,
                                serviceDecision.status === 'APPROVED' && styles.decisionBtnApproved,
                              ]}
                              onPress={() => handleServiceDecision(service.id, 'APPROVED')}
                            >
                              <Feather
                                name="check"
                                size={12}
                                color={serviceDecision.status === 'APPROVED' ? '#FFFFFF' : '#059669'}
                              />
                              <Text
                                style={[
                                  styles.decisionText,
                                  serviceDecision.status === 'APPROVED' && styles.decisionTextActive,
                                ]}
                              >
                                Duyệt
                              </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={[
                                styles.decisionBtn,
                                serviceDecision.status === 'REJECTED' && styles.decisionBtnRejected,
                              ]}
                              onPress={() => handleServiceDecision(service.id, 'REJECTED')}
                            >
                              <Feather
                                name="x"
                                size={12}
                                color={serviceDecision.status === 'REJECTED' ? '#FFFFFF' : '#DC2626'}
                              />
                              <Text
                                style={[
                                  styles.decisionText,
                                  serviceDecision.status === 'REJECTED' && styles.decisionTextActive,
                                ]}
                              >
                                Từ chối
                              </Text>
                            </TouchableOpacity>
                          </View>
                        )}
                      </View>

                      {/* Granular Task Results list */}
                      {results.length > 0 && (
                        <View style={styles.resultsList}>
                          {results.map((resItem: any, idx: number) => {
                            const resDecision = serviceDecision.resultDecisions?.find(
                              (rd: any) => rd.taskId === resItem.taskId
                            );
                            const isResApproved = resDecision?.status === 'APPROVED';
                            const isResRejected = resDecision?.status === 'REJECTED';
                            const taskCode = resItem.taskCode || resItem.task?.code || resItem.code;
                            const feedbackText = resItem.feedback || resDecision?.feedback;

                            return (
                              <View key={resItem.taskId || idx} style={styles.resultItemCard}>
                                <View style={styles.resultItemRow}>
                                  <TouchableOpacity
                                    style={{ flex: 1, minWidth: 0 }}
                                    onPress={() => handleGoToTask(resItem.taskId)}
                                    activeOpacity={0.7}
                                    disabled={!resItem.taskId}
                                  >
                                    <Text style={styles.resultItemName} numberOfLines={1}>
                                      {taskCode ? (
                                        <Text style={styles.taskCodeText}>#{taskCode} </Text>
                                      ) : null}
                                      {resItem.name || `Kết quả #${idx + 1}`}
                                      {resItem.taskId && (
                                        <Text style={{ fontSize: 11, color: '#0284C7' }}> ↗</Text>
                                      )}
                                    </Text>
                                    {resItem.url && (
                                      <TouchableOpacity
                                        onPress={() => handleOpenResultUrl(resItem.url)}
                                        style={styles.openUrlLink}
                                      >
                                        <Feather name="external-link" size={11} color={BrandColors.primary} />
                                        <Text style={styles.openUrlLinkText}>Xem tệp kết quả</Text>
                                      </TouchableOpacity>
                                    )}
                                  </TouchableOpacity>

                                  {isReadOnly ? (
                                    <View style={styles.readOnlyMiniBadge}>
                                      {resItem.status === 'APPROVED' ? (
                                        <View style={styles.badgeSuccessMini}>
                                          <Feather name="check" size={10} color="#059669" />
                                          <Text style={styles.badgeSuccessMiniText}>Đã duyệt</Text>
                                        </View>
                                      ) : (
                                        <View style={styles.badgeDangerMini}>
                                          <Feather name="x" size={10} color="#DC2626" />
                                          <Text style={styles.badgeDangerMiniText}>Từ chối</Text>
                                        </View>
                                      )}
                                    </View>
                                  ) : (
                                    <View style={styles.miniDecisionGroup}>
                                      <TouchableOpacity
                                        style={[
                                          styles.miniDecisionBtn,
                                          isResApproved && styles.miniDecisionApproved,
                                        ]}
                                        onPress={() =>
                                          handleResultDecision(service.id, resItem.taskId, 'APPROVED')
                                        }
                                      >
                                        <Feather
                                          name="check"
                                          size={12}
                                          color={isResApproved ? '#FFFFFF' : '#64748B'}
                                        />
                                      </TouchableOpacity>

                                      <TouchableOpacity
                                        style={[
                                          styles.miniDecisionBtn,
                                          isResRejected && styles.miniDecisionRejected,
                                        ]}
                                        onPress={() =>
                                          handleResultDecision(service.id, resItem.taskId, 'REJECTED')
                                        }
                                      >
                                        <Feather
                                          name="x"
                                          size={12}
                                          color={isResRejected ? '#FFFFFF' : '#64748B'}
                                        />
                                      </TouchableOpacity>
                                    </View>
                                  )}
                                </View>

                                {/* Feedback Input for Pending Mode */}
                                {!isReadOnly && isResRejected && (
                                  <View style={styles.feedbackBox}>
                                    <TextInput
                                      style={styles.feedbackInput}
                                      placeholder="Lý do từ chối kết quả này (Bắt buộc) *"
                                      placeholderTextColor="#FCA5A5"
                                      value={resDecision?.feedback || ''}
                                      onChangeText={(val) =>
                                        handleResultFeedback(service.id, resItem.taskId, val)
                                      }
                                    />
                                  </View>
                                )}

                                {/* Read-Only Feedback Callout */}
                                {isReadOnly && feedbackText ? (
                                  <View style={styles.feedbackReadOnlyBox}>
                                    <Feather name="alert-circle" size={12} color="#B91C1C" />
                                    <Text style={styles.feedbackReadOnlyText}>
                                      Lý do từ chối: {feedbackText}
                                    </Text>
                                  </View>
                                ) : null}
                              </View>
                            );
                          })}
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            </ScrollView>
          )}

          {/* Footer Actions */}
          <View style={styles.footer}>
            {isReadOnly ? (
              <View style={styles.readOnlyFooterRow}>
                <View style={styles.processedBadgeWrap}>
                  <Feather name="shield" size={14} color={statusConfig.color} />
                  <Text style={[styles.processedBadgeText, { color: statusConfig.color }]}>
                    Biên bản {statusConfig.text.toLowerCase()}
                  </Text>
                </View>
                <TouchableOpacity style={styles.closeFullBtn} onPress={onClose}>
                  <Text style={styles.closeFullText}>Đóng</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={isSubmitting}>
                  <Text style={styles.cancelText}>Đóng</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.submitBtn, isSubmitting && styles.btnDisabled]}
                  onPress={handleSubmit}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <>
                      <Feather name="check-circle" size={14} color="#FFFFFF" />
                      <Text style={styles.submitText}>Xác nhận phê duyệt</Text>
                    </>
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    gap: 14,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 12,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  subTitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  loadingBox: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
    color: '#64748B',
  },
  formBody: {
    gap: 14,
  },
  infoCard: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
    gap: 6,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  infoVal: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  noteBox: {
    marginTop: 4,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  noteLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  noteText: {
    fontSize: 12,
    color: '#334155',
    marginTop: 2,
    fontStyle: 'italic',
  },
  section: {
    gap: 10,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  serviceBox: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 12,
    gap: 10,
  },
  serviceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  serviceName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  nameWithCodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  codeTag: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  codeTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0369A1',
  },
  parentCodeTag: {
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  parentCodeTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#7E22CE',
  },
  parentServiceNameText: {
    fontSize: 11,
    color: '#6B21A8',
    fontWeight: '500',
    marginTop: 2,
  },
  taskCodeText: {
    fontWeight: '700',
    color: '#0284C7',
  },
  decisionGroup: {
    flexDirection: 'row',
    gap: 6,
  },
  decisionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  decisionBtnApproved: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  decisionBtnRejected: {
    backgroundColor: '#EF4444',
    borderColor: '#EF4444',
  },
  decisionText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  decisionTextActive: {
    color: '#FFFFFF',
  },
  resultsList: {
    gap: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  resultItemCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    gap: 6,
  },
  resultItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  resultItemName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  openUrlLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  openUrlLinkText: {
    fontSize: 11,
    fontWeight: '600',
    color: BrandColors.primary,
  },
  miniDecisionGroup: {
    flexDirection: 'row',
    gap: 4,
  },
  miniDecisionBtn: {
    width: 26,
    height: 26,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  miniDecisionApproved: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  miniDecisionRejected: {
    backgroundColor: '#EF4444',
    borderColor: '#EF4444',
  },
  feedbackBox: {
    marginTop: 4,
  },
  feedbackInput: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 12,
    color: '#991B1B',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 12,
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
  },
  cancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: BrandColors.primary,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  submitText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  statusBadgeHeader: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusBadgeHeaderText: {
    fontSize: 11,
    fontWeight: '700',
  },
  readOnlyDecisionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badgeSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  badgeSuccessText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#047857',
  },
  badgeDanger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  badgeDangerText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#B91C1C',
  },
  readOnlyMiniBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badgeSuccessMini: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeSuccessMiniText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#047857',
  },
  badgeDangerMini: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeDangerMiniText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#B91C1C',
  },
  feedbackReadOnlyBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 4,
  },
  feedbackReadOnlyText: {
    fontSize: 11,
    color: '#991B1B',
    fontWeight: '600',
    flex: 1,
  },
  readOnlyFooterRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  processedBadgeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  processedBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  closeFullBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
  },
  closeFullText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
  },
});
