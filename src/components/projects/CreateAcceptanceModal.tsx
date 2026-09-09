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
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { acceptanceService } from '@/services/acceptanceService';
import { BrandColors } from '@/constants/colors';

interface CreateAcceptanceModalProps {
  visible: boolean;
  onClose: () => void;
  contract?: any;
  projectId: string;
  onSuccess: () => void;
}

const TASK_STATUS_CONFIG: Record<
  string,
  { label: string; bg: string; color: string; icon: string }
> = {
  COMPLETED: { label: 'Đã hoàn thành', bg: '#DCFCE7', color: '#166534', icon: 'check-circle' },
  DOING: { label: 'Đang làm', bg: '#DBEAFE', color: '#1E40AF', icon: 'clock' },
  AWAITING_REVIEW: { label: 'Chờ duyệt', bg: '#FEF3C7', color: '#92400E', icon: 'eye' },
  REWORKING: { label: 'Cần làm lại', bg: '#F3E8FF', color: '#6B21A8', icon: 'rotate-ccw' },
  OVERDUE: { label: 'Quá hạn', bg: '#FEE2E2', color: '#991B1B', icon: 'alert-triangle' },
  TODO: { label: 'Chưa bắt đầu', bg: '#F1F5F9', color: '#475569', icon: 'circle' },
};

export default function CreateAcceptanceModal({
  visible,
  onClose,
  contract,
  projectId,
  onSuccess,
}: CreateAcceptanceModalProps) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [expandedServices, setExpandedServices] = useState<Record<string, boolean>>({});
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleGoToTask = (taskId: string) => {
    if (!taskId) return;
    onClose();
    router.push(`/tasks/${taskId}` as any);
  };

  const generateDefaultName = (contractCode?: string) => {
    const dateStr = new Date().toLocaleDateString('vi-VN');
    return contractCode ? `NT-${contractCode}-${dateStr}` : `NT-${dateStr}`;
  };

  useEffect(() => {
    if (visible) {
      setSelectedServiceIds([]);
      setExpandedServices({});
      setNote('');
      setName(generateDefaultName(contract?.contractCode));
    }
  }, [visible, contract?.contractCode]);

  const isValidStatus = (s: any) => s.status === 'ACTIVE' || s.status === 'ACCEPTANCE_REJECTED';

  const availableServices = contract?.services?.filter(
    (s: any) =>
      isValidStatus(s) &&
      s.results?.some((r: any) => r.status === 'PENDING') &&
      s.tasks?.every((t: any) => t.status === 'COMPLETED')
  ) || [];

  const rejectedServices = contract?.services?.filter(
    (s: any) =>
      isValidStatus(s) &&
      s.results?.some((r: any) => r.status === 'PENDING') &&
      s.tasks?.some((t: any) => t.status !== 'COMPLETED')
  ) || [];

  const toggleServiceSelection = (id: string) => {
    setSelectedServiceIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleServiceExpand = (id: string) => {
    setExpandedServices((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCreate = async () => {
    if (availableServices.length > 0 && selectedServiceIds.length === 0) {
      Alert.alert('Cảnh báo', 'Vui lòng chọn ít nhất một hạng mục dịch vụ để nghiệm thu.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await acceptanceService.createAcceptanceRequest({
        projectId,
        name: name.trim() || undefined,
        note: note.trim() || undefined,
        serviceIds: selectedServiceIds.length > 0 ? selectedServiceIds : undefined,
      });

      if (res.error) {
        Alert.alert('Lỗi', res.error || 'Gửi yêu cầu nghiệm thu thất bại.');
      } else {
        Alert.alert('Thành công', 'Đã gửi yêu cầu nghiệm thu thành công.');
        setNote('');
        setName('');
        setSelectedServiceIds([]);
        onSuccess();
        onClose();
      }
    } catch (err: any) {
      Alert.alert('Lỗi', err?.message || 'Có lỗi xảy ra khi tạo yêu cầu nghiệm thu.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Gửi nghiệm thu dịch vụ</Text>
              {contract?.contractCode && (
                <Text style={styles.contractCode}>Hợp đồng: #{contract.contractCode}</Text>
              )}
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Feather name="x" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.formBody} showsVerticalScrollIndicator={false}>
            {/* Batch Name Section */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>TÊN ĐỢT NGHIỆM THU</Text>
              <TextInput
                style={[styles.input, styles.inputDisabled]}
                value={name}
                editable={false}
                selectTextOnFocus={false}
              />
            </View>

            {/* Service Selection Section */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>HẠNG MỤC DỊCH VỤ ĐỦ ĐIỀU KIỆN</Text>

              {availableServices.length > 0 ? (
                <View style={styles.serviceList}>
                  {availableServices.map((service: any) => {
                    const isSelected = selectedServiceIds.includes(service.id);
                    const isExpanded = !!expandedServices[service.id];
                    const serviceName = service.service?.name || service.name || 'Hạng mục dịch vụ';
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

                    const tasksList = service.tasks || [];

                    return (
                      <View
                        key={service.id}
                        style={[styles.serviceCard, isSelected && styles.serviceCardSelected]}
                      >
                        <TouchableOpacity
                          style={styles.serviceHeaderRow}
                          onPress={() => toggleServiceSelection(service.id)}
                          activeOpacity={0.7}
                        >
                          <View style={[styles.checkbox, isSelected && styles.checkboxChecked]}>
                            {isSelected && <Feather name="check" size={12} color="#FFFFFF" />}
                          </View>
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
                              <Text
                                style={[styles.serviceName, isSelected && styles.serviceNameSelected]}
                                numberOfLines={1}
                              >
                                {serviceName}
                              </Text>
                            </View>
                            {parentName ? (
                              <Text style={styles.parentServiceNameText}>
                                Dịch vụ cha: {parentName}
                              </Text>
                            ) : null}
                            <Text style={styles.serviceMetaSuccess}>
                              ✅ Tất cả {tasksList.length}/{tasksList.length} công việc con đã hoàn thành
                            </Text>
                          </View>

                          <TouchableOpacity
                            style={styles.expandBtn}
                            onPress={() => toggleServiceExpand(service.id)}
                          >
                            <Feather
                              name={isExpanded ? 'chevron-up' : 'chevron-down'}
                              size={18}
                              color="#64748B"
                            />
                          </TouchableOpacity>
                        </TouchableOpacity>

                        {/* Breakdown of Linked Tasks */}
                        {isExpanded && tasksList.length > 0 && (
                          <View style={styles.tasksBreakdown}>
                            <Text style={styles.breakdownTitle}>
                              CÁC CÔNG VIỆC LIÊN KẾT TRONG HẠNG MỤC:
                            </Text>
                            {tasksList.map((t: any) => {
                              const statusCfg =
                                TASK_STATUS_CONFIG[t.status] || TASK_STATUS_CONFIG['TODO'];
                              const taskCode = t.code || t.taskCode;
                              return (
                                <TouchableOpacity
                                  key={t.id}
                                  style={styles.taskItemRow}
                                  onPress={() => handleGoToTask(t.id)}
                                  activeOpacity={0.7}
                                >
                                  <Feather
                                    name={statusCfg.icon as any}
                                    size={14}
                                    color={statusCfg.color}
                                  />
                                  <Text style={styles.taskItemName} numberOfLines={1}>
                                    {taskCode ? (
                                      <Text style={styles.taskCodeText}>#{taskCode} </Text>
                                    ) : null}
                                    {t.name}
                                  </Text>
                                  <View
                                    style={[
                                      styles.miniBadge,
                                      { backgroundColor: statusCfg.bg },
                                    ]}
                                  >
                                    <Text style={[styles.miniBadgeText, { color: statusCfg.color }]}>
                                      {statusCfg.label}
                                    </Text>
                                  </View>
                                  <Feather name="chevron-right" size={13} color="#94A3B8" />
                                </TouchableOpacity>
                              );
                            })}
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              ) : (
                <View style={styles.warningBox}>
                  <Feather name="alert-circle" size={20} color="#D97706" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.warningTitle}>Không có dịch vụ đủ điều kiện nghiệm thu</Text>
                    <Text style={styles.warningDesc}>
                      Dịch vụ chỉ có thể nghiệm thu khi TẤT CẢ các công việc liên kết trực thuộc đã ở trạng thái Hoàn thành.
                    </Text>
                  </View>
                </View>
              )}

              {/* Disabled / Incomplete Services Section */}
              {rejectedServices.length > 0 && (
                <View style={styles.disabledSection}>
                  <Text style={styles.subLabel}>
                    HẠNG MỤC CHƯA ĐỦ ĐIỀU KIỆN (CÒN TASK CHƯA XONG) ({rejectedServices.length})
                  </Text>
                  {rejectedServices.map((service: any) => {
                    const isExpanded = !!expandedServices[service.id];
                    const serviceName = service.service?.name || service.name || 'Hạng mục dịch vụ';
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

                    const tasksList = service.tasks || [];
                    const completedTasks = tasksList.filter((t: any) => t.status === 'COMPLETED');
                    const uncompletedTasks = tasksList.filter((t: any) => t.status !== 'COMPLETED');

                    return (
                      <View key={service.id} style={styles.disabledServiceCard}>
                        <TouchableOpacity
                          style={styles.disabledHeaderRow}
                          onPress={() => toggleServiceExpand(service.id)}
                          activeOpacity={0.7}
                        >
                          <View style={styles.disabledLockWrap}>
                            <Feather name="lock" size={14} color="#EF4444" />
                          </View>
                          <View style={{ flex: 1 }}>
                            <View style={styles.nameWithCodeRow}>
                              {parentCode && (
                                <View style={styles.parentCodeTagRed}>
                                  <Text style={styles.parentCodeTagRedText}>#{parentCode}</Text>
                                </View>
                              )}
                              {serviceCode && (
                                <View style={styles.codeTagRed}>
                                  <Text style={styles.codeTagRedText}>#{serviceCode}</Text>
                                </View>
                              )}
                              <Text style={styles.disabledServiceName} numberOfLines={1}>
                                {serviceName}
                              </Text>
                            </View>
                            {parentName ? (
                              <Text style={styles.parentServiceNameTextRed}>
                                Dịch vụ cha: {parentName}
                              </Text>
                            ) : null}
                            <Text style={styles.disabledServiceMeta}>
                              Còn {uncompletedTasks.length}/{tasksList.length} công việc chưa hoàn thành
                            </Text>
                          </View>

                          <TouchableOpacity
                            style={styles.expandBtn}
                            onPress={() => toggleServiceExpand(service.id)}
                          >
                            <Feather
                              name={isExpanded ? 'chevron-up' : 'chevron-down'}
                              size={18}
                              color="#94A3B8"
                            />
                          </TouchableOpacity>
                        </TouchableOpacity>

                        {/* Breakdown showing EXACTLY which tasks are holding back acceptance */}
                        {isExpanded && tasksList.length > 0 && (
                          <View style={styles.tasksBreakdownDisabled}>
                            <Text style={styles.breakdownTitleWarn}>
                              CẦN HOÀN THÀNH CÁC CÔNG VIỆC SAU ĐỂ ĐỦ ĐIỀU KIỆN:
                            </Text>
                            {tasksList.map((t: any) => {
                              const isDone = t.status === 'COMPLETED';
                              const statusCfg =
                                TASK_STATUS_CONFIG[t.status] || TASK_STATUS_CONFIG['TODO'];
                              const taskCode = t.code || t.taskCode;
                              return (
                                <TouchableOpacity
                                  key={t.id}
                                  style={[
                                    styles.taskItemRow,
                                    !isDone && { backgroundColor: '#FEF2F2' },
                                  ]}
                                  onPress={() => handleGoToTask(t.id)}
                                  activeOpacity={0.7}
                                >
                                  <Feather
                                    name={statusCfg.icon as any}
                                    size={14}
                                    color={statusCfg.color}
                                  />
                                  <Text
                                    style={[
                                      styles.taskItemName,
                                      !isDone && { fontWeight: '700', color: '#991B1B' },
                                    ]}
                                    numberOfLines={1}
                                  >
                                    {taskCode ? (
                                      <Text style={styles.taskCodeText}>#{taskCode} </Text>
                                    ) : null}
                                    {t.name}
                                  </Text>
                                  <View
                                    style={[
                                      styles.miniBadge,
                                      { backgroundColor: statusCfg.bg },
                                    ]}
                                  >
                                    <Text style={[styles.miniBadgeText, { color: statusCfg.color }]}>
                                      {statusCfg.label}
                                    </Text>
                                  </View>
                                  <Feather name="chevron-right" size={13} color="#94A3B8" />
                                </TouchableOpacity>
                              );
                            })}
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              )}
            </View>

            {/* Note */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>GHI CHÚ NGHIỆM THU</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Nhập ghi chú nghiệm thu (không bắt buộc)..."
                placeholderTextColor="#94A3B8"
                multiline
                numberOfLines={3}
                value={note}
                onChangeText={setNote}
              />
            </View>
          </ScrollView>

          {/* Footer Actions */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={isSubmitting}>
              <Text style={styles.cancelText}>Hủy bỏ</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.submitBtn,
                (isSubmitting || (availableServices.length > 0 && selectedServiceIds.length === 0)) &&
                  styles.btnDisabled,
              ]}
              onPress={handleCreate}
              disabled={isSubmitting || (availableServices.length > 0 && selectedServiceIds.length === 0)}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Feather name="send" size={14} color="#FFFFFF" />
                  <Text style={styles.submitText}>Gửi yêu cầu</Text>
                </>
              )}
            </TouchableOpacity>
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
  contractCode: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  formBody: {
    gap: 14,
  },
  formGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  subLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#EF4444',
    marginTop: 14,
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  serviceList: {
    gap: 10,
  },
  serviceCard: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 12,
    gap: 8,
  },
  serviceCardSelected: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  serviceHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  serviceName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
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
  codeTagRed: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  codeTagRedText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#B91C1C',
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
  parentCodeTagRed: {
    backgroundColor: '#FCE7F3',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  parentCodeTagRedText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#BE185D',
  },
  parentServiceNameText: {
    fontSize: 11,
    color: '#6B21A8',
    fontWeight: '500',
    marginTop: 2,
  },
  parentServiceNameTextRed: {
    fontSize: 11,
    color: '#9D174D',
    fontWeight: '500',
    marginTop: 2,
  },
  taskCodeText: {
    fontWeight: '700',
    color: '#0284C7',
  },
  serviceNameSelected: {
    color: '#065F46',
  },
  serviceMetaSuccess: {
    fontSize: 11,
    fontWeight: '600',
    color: '#059669',
    marginTop: 2,
  },
  expandBtn: {
    padding: 4,
  },
  tasksBreakdown: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#D1FAE5',
    gap: 6,
  },
  tasksBreakdownDisabled: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#FEE2E2',
    gap: 6,
  },
  breakdownTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#047857',
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  breakdownTitleWarn: {
    fontSize: 10,
    fontWeight: '800',
    color: '#B91C1C',
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  taskItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  taskItemName: {
    flex: 1,
    fontSize: 12,
    color: '#334155',
  },
  miniBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  miniBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 14,
    padding: 14,
  },
  warningTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#B45309',
  },
  warningDesc: {
    fontSize: 12,
    color: '#D97706',
    marginTop: 2,
    lineHeight: 16,
  },
  disabledSection: {
    marginTop: 8,
    gap: 8,
  },
  disabledServiceCard: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
    borderRadius: 14,
    padding: 12,
    gap: 8,
  },
  disabledHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  disabledLockWrap: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledServiceName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#991B1B',
  },
  disabledServiceMeta: {
    fontSize: 11,
    color: '#DC2626',
    fontWeight: '600',
    marginTop: 1,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A',
  },
  inputDisabled: {
    backgroundColor: '#F1F5F9',
    borderColor: '#E2E8F0',
    color: '#475569',
    fontWeight: '700',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
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
    backgroundColor: '#10B981',
  },
  btnDisabled: {
    opacity: 0.5,
  },
  submitText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
