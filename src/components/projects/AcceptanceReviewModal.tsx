import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
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
      <View className="flex-1 bg-slate-900/50 justify-end">
        <View className="bg-white rounded-t-[24px] p-5 gap-3.5 max-h-[90%]">
          {/* Header */}
          <View className="flex-row justify-between items-center border-b border-slate-100 pb-3">
            <View className="flex-1">
              <View className="flex-row items-center gap-2">
                <Text className="text-[17px] font-extrabold text-slate-900">Phê duyệt nghiệm thu</Text>
                <View className="px-2 py-0.5 rounded-md" style={{ backgroundColor: statusConfig.bg }}>
                  <Text className="text-[11px] font-bold" style={{ color: statusConfig.color }}>
                    {statusConfig.text}
                  </Text>
                </View>
              </View>
              <Text className="text-xs text-slate-500 mt-0.5" numberOfLines={1}>
                {request.name || request.project?.name || request.acceptanceCode || 'Nghiệm thu dịch vụ'}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} className="p-1.5 rounded-lg bg-slate-100">
              <Feather name="x" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          {isLoadingDetails ? (
            <View className="py-10 items-center justify-center gap-2.5">
              <ActivityIndicator size="large" color={BrandColors.primary} />
              <Text className="text-[13px] text-slate-500">Đang tải thông tin chi tiết...</Text>
            </View>
          ) : (
            <ScrollView className="gap-3.5" showsVerticalScrollIndicator={false}>
              {/* Creator & Status Info */}
              <View className="bg-slate-50 border border-slate-200 rounded-xl p-3 gap-1.5 mb-3">
                <View className="flex-row justify-between items-center">
                  <Text className="text-xs text-slate-500">Người yêu cầu:</Text>
                  <Text className="text-xs font-bold text-slate-900">
                    {(fullRequest as any)?.requester?.fullName || fullRequest?.creator?.fullName || request.creator?.fullName || 'Team Lead'}
                  </Text>
                </View>
                {request.createdAt && (
                  <View className="flex-row justify-between items-center">
                    <Text className="text-xs text-slate-500">Ngày yêu cầu:</Text>
                    <Text className="text-xs font-bold text-slate-900">
                      {new Date(request.createdAt).toLocaleDateString('vi-VN')}
                    </Text>
                  </View>
                )}
                <View className="flex-row justify-between items-center">
                  <Text className="text-xs text-slate-500">Trạng thái biên bản:</Text>
                  <Text className="text-xs font-bold" style={{ color: statusConfig.color }}>
                    {statusConfig.text}
                  </Text>
                </View>
                {request.note ? (
                  <View className="mt-1 pt-1.5 border-t border-slate-200">
                    <Text className="text-[11px] font-bold text-slate-500">Ghi chú từ người tạo:</Text>
                    <Text className="text-xs text-slate-700 mt-0.5 italic">{request.note}</Text>
                  </View>
                ) : null}
              </View>

              {/* Service Items List */}
              <View className="gap-2.5 mb-3">
                <Text className="text-[11px] font-extrabold text-slate-500 tracking-wider">
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
                    <View key={service.id} className="bg-white border border-slate-200 rounded-2xl p-3 gap-2.5">
                      <View className="flex-row items-center justify-between gap-2">
                        <View className="flex-1">
                          <View className="flex-row items-center gap-1.5 flex-wrap">
                            {parentCode && (
                              <View className="bg-purple-100 px-1.5 py-0.5 rounded">
                                <Text className="text-[11px] font-bold text-purple-700">#{parentCode}</Text>
                              </View>
                            )}
                            {serviceCode && (
                              <View className="bg-sky-100 px-1.5 py-0.5 rounded">
                                <Text className="text-[11px] font-bold text-sky-700">#{serviceCode}</Text>
                              </View>
                            )}
                            <Text className="text-sm font-bold text-slate-900">
                              {service.service?.name || service.name || 'Hạng mục dịch vụ'}
                            </Text>
                          </View>
                          {parentName ? (
                            <Text className="text-[11px] color-purple-800 font-medium mt-0.5">
                              Dịch vụ cha: {parentName}
                            </Text>
                          ) : null}
                        </View>

                        {isReadOnly ? (
                          <View className="flex-row items-center">
                            {service.status === 'APPROVED' || serviceDecision.status === 'APPROVED' ? (
                              <View className="flex-row items-center gap-1 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-200">
                                <Feather name="check-circle" size={12} color="#059669" />
                                <Text className="text-[11px] font-bold text-emerald-700">Đã duyệt</Text>
                              </View>
                            ) : (
                              <View className="flex-row items-center gap-1 bg-red-50 px-2 py-1 rounded-md border border-red-200">
                                <Feather name="x-circle" size={12} color="#DC2626" />
                                <Text className="text-[11px] font-bold text-red-700">Từ chối</Text>
                              </View>
                            )}
                          </View>
                        ) : (
                          <View className="flex-row gap-1.5">
                            <TouchableOpacity
                              className={`flex-row items-center gap-1 px-2.5 py-1.5 rounded-lg border ${
                                serviceDecision.status === 'APPROVED'
                                  ? 'bg-emerald-500 border-emerald-500'
                                  : 'bg-slate-50 border-slate-200'
                              }`}
                              onPress={() => handleServiceDecision(service.id, 'APPROVED')}
                            >
                              <Feather
                                name="check"
                                size={12}
                                color={serviceDecision.status === 'APPROVED' ? '#FFFFFF' : '#059669'}
                              />
                              <Text
                                className={`text-[11px] font-bold ${
                                  serviceDecision.status === 'APPROVED' ? 'text-white' : 'text-slate-500'
                                }`}
                              >
                                Duyệt
                              </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              className={`flex-row items-center gap-1 px-2.5 py-1.5 rounded-lg border ${
                                serviceDecision.status === 'REJECTED'
                                  ? 'bg-red-500 border-red-500'
                                  : 'bg-slate-50 border-slate-200'
                              }`}
                              onPress={() => handleServiceDecision(service.id, 'REJECTED')}
                            >
                              <Feather
                                name="x"
                                size={12}
                                color={serviceDecision.status === 'REJECTED' ? '#FFFFFF' : '#DC2626'}
                              />
                              <Text
                                className={`text-[11px] font-bold ${
                                  serviceDecision.status === 'REJECTED' ? 'text-white' : 'text-slate-500'
                                }`}
                              >
                                Từ chối
                              </Text>
                            </TouchableOpacity>
                          </View>
                        )}
                      </View>

                      {/* Granular Task Results list */}
                      {results.length > 0 && (
                        <View className="gap-2 pt-2 border-t border-slate-100">
                          {results.map((resItem: any, idx: number) => {
                            const resDecision = serviceDecision.resultDecisions?.find(
                              (rd: any) => rd.taskId === resItem.taskId
                            );
                            const isResApproved = resDecision?.status === 'APPROVED';
                            const isResRejected = resDecision?.status === 'REJECTED';
                            const taskCode = resItem.taskCode || resItem.task?.code || resItem.code;
                            const feedbackText = resItem.feedback || resDecision?.feedback;

                            return (
                              <View key={resItem.taskId || idx} className="bg-slate-50 rounded-xl p-2.5 gap-1.5">
                                <View className="flex-row items-center justify-between gap-2">
                                  <TouchableOpacity
                                    className="flex-1 min-w-0"
                                    onPress={() => handleGoToTask(resItem.taskId)}
                                    activeOpacity={0.7}
                                    disabled={!resItem.taskId}
                                  >
                                    <Text className="text-[13px] font-semibold text-slate-700" numberOfLines={1}>
                                      {taskCode ? (
                                        <Text className="font-bold text-sky-600">#{taskCode} </Text>
                                      ) : null}
                                      {resItem.name || `Kết quả #${idx + 1}`}
                                      {resItem.taskId && (
                                        <Text className="text-[11px] text-sky-600"> ↗</Text>
                                      )}
                                    </Text>
                                    {resItem.url && (
                                      <TouchableOpacity
                                        onPress={() => handleOpenResultUrl(resItem.url)}
                                        className="flex-row items-center gap-1 mt-0.5"
                                      >
                                        <Feather name="external-link" size={11} color={BrandColors.primary} />
                                        <Text className="text-[11px] font-semibold text-primary">Xem tệp kết quả</Text>
                                      </TouchableOpacity>
                                    )}
                                  </TouchableOpacity>

                                  {isReadOnly ? (
                                    <View className="flex-row items-center">
                                      {resItem.status === 'APPROVED' ? (
                                        <View className="flex-row items-center gap-0.5 bg-emerald-50 px-1.5 py-0.5 rounded">
                                          <Feather name="check" size={10} color="#059669" />
                                          <Text className="text-[10px] font-bold text-emerald-700">Đã duyệt</Text>
                                        </View>
                                      ) : (
                                        <View className="flex-row items-center gap-0.5 bg-red-50 px-1.5 py-0.5 rounded">
                                          <Feather name="x" size={10} color="#DC2626" />
                                          <Text className="text-[10px] font-bold text-red-700">Từ chối</Text>
                                        </View>
                                      )}
                                    </View>
                                  ) : (
                                    <View className="flex-row gap-1">
                                      <TouchableOpacity
                                        className={`w-6.5 h-6.5 rounded-md border items-center justify-center ${
                                          isResApproved
                                            ? 'bg-emerald-500 border-emerald-500'
                                            : 'bg-white border-slate-300'
                                        }`}
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
                                        className={`w-6.5 h-6.5 rounded-md border items-center justify-center ${
                                          isResRejected
                                            ? 'bg-red-500 border-red-500'
                                            : 'bg-white border-slate-300'
                                        }`}
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
                                  <View className="mt-1">
                                    <TextInput
                                      className="bg-red-50 border border-red-200 rounded-lg px-2.5 py-1.5 text-xs text-red-900"
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
                                  <View className="flex-row items-center gap-1.5 bg-red-50 border border-red-200 rounded-lg px-2.5 py-1.5 mt-1">
                                    <Feather name="alert-circle" size={12} color="#B91C1C" />
                                    <Text className="text-[11px] text-red-900 font-semibold flex-1">
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
          <View className="flex-row justify-end gap-2.5 border-t border-slate-100 pt-3">
            {isReadOnly ? (
              <View className="flex-1 flex-row items-center justify-between">
                <View className="flex-row items-center gap-1.5">
                  <Feather name="shield" size={14} color={statusConfig.color} />
                  <Text className="text-xs font-bold" style={{ color: statusConfig.color }}>
                    Biên bản {statusConfig.text.toLowerCase()}
                  </Text>
                </View>
                <TouchableOpacity className="px-5 py-2.5 rounded-xl bg-slate-100" onPress={onClose}>
                  <Text className="text-sm font-bold text-slate-700">Đóng</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <TouchableOpacity className="px-4 py-3 rounded-xl bg-slate-100" onPress={onClose} disabled={isSubmitting}>
                  <Text className="text-sm font-semibold text-slate-600">Đóng</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className={`flex-row items-center gap-1.5 px-5 py-3 rounded-xl bg-primary ${
                    isSubmitting ? 'opacity-50' : ''
                  }`}
                  onPress={handleSubmit}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <>
                      <Feather name="check-circle" size={14} color="#FFFFFF" />
                      <Text className="text-sm font-bold text-white">Xác nhận phê duyệt</Text>
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
