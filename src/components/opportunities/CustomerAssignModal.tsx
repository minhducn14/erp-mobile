import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { BrandColors } from '@/constants/colors';
import { customerService, CustomerItem } from '@/services/customerService';
import { opportunityService } from '@/services/opportunityService';
import { fetchTaxInfo } from '@/utils/tax';

export interface CustomerAssignData {
  customerType: 'DIRECT' | 'REFERRAL';
  customerStatus: 'EXISTING' | 'POTENTIAL';
  selectedReferralPartnerId?: string;
  selectedCustomerId?: string;
  leadName?: string;
  leadPhone?: string;
  leadEmail?: string;
  leadAddress?: string;
  leadTaxId?: string;
}

interface CustomerAssignModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (data: CustomerAssignData) => Promise<void>;
  initialData?: {
    customerType?: 'DIRECT' | 'REFERRAL' | string;
    customerId?: string;
    customer?: { id: string; name: string; phone?: string; email?: string; address?: string; taxId?: string };
    leadName?: string;
    leadPhone?: string;
    leadEmail?: string;
    leadAddress?: string;
    leadTaxId?: string;
    referralPartnerId?: string;
  };
}

export const CustomerAssignModal: React.FC<CustomerAssignModalProps> = ({
  visible,
  onClose,
  onSave,
  initialData,
}) => {
  const { height } = useWindowDimensions();

  // Mode & Status
  const [customerType, setCustomerType] = useState<'DIRECT' | 'REFERRAL'>('DIRECT');
  const [customerStatus, setCustomerStatus] = useState<'EXISTING' | 'POTENTIAL'>('EXISTING');

  // Existing customer selection
  const [customers, setCustomers] = useState<CustomerItem[]>([]);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');

  // Referral Partners
  const [referralPartners, setReferralPartners] = useState<Array<{ id: string; name: string; phone?: string; taxId?: string }>>([]);
  const [selectedReferralPartnerId, setSelectedReferralPartnerId] = useState<string>('');

  // Potential lead form
  const [leadTaxId, setLeadTaxId] = useState('');
  const [leadName, setLeadName] = useState('');
  const [leadPhone, setLeadPhone] = useState('');
  const [leadEmail, setLeadEmail] = useState('');
  const [leadAddress, setLeadAddress] = useState('');
  const [isFetchingTax, setIsFetchingTax] = useState(false);

  // Submitting
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load Initial Data & Catalogs
  useEffect(() => {
    if (!visible) return;

    // Prefill from initialData
    if (initialData?.customerType === 'REFERRAL') {
      setCustomerType('REFERRAL');
    } else {
      setCustomerType('DIRECT');
    }

    if (initialData?.customerId || initialData?.customer?.id) {
      setCustomerStatus('EXISTING');
      setSelectedCustomerId(initialData?.customerId || initialData?.customer?.id || '');
    } else if (initialData?.leadName) {
      setCustomerStatus('POTENTIAL');
      setLeadName(initialData.leadName || '');
      setLeadPhone(initialData.leadPhone || '');
      setLeadEmail(initialData.leadEmail || '');
      setLeadAddress(initialData.leadAddress || '');
      setLeadTaxId(initialData.leadTaxId || '');
    } else {
      setCustomerStatus('EXISTING');
    }

    if (initialData?.referralPartnerId) {
      setSelectedReferralPartnerId(initialData.referralPartnerId);
    }

    // Fetch existing customers and partners
    const loadCatalogs = async () => {
      setIsLoadingCustomers(true);
      try {
        const [custRes, partRes] = await Promise.all([
          customerService.getCustomers(),
          opportunityService.getReferralPartners(),
        ]);
        if (custRes.data && Array.isArray(custRes.data)) {
          setCustomers(custRes.data);
        }
        if (partRes.data && Array.isArray(partRes.data)) {
          setReferralPartners(partRes.data);
        }
      } catch {
        // silent fail
      } finally {
        setIsLoadingCustomers(false);
      }
    };

    loadCatalogs();
  }, [visible, initialData]);

  // Filtered Customers
  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return customers;
    const lower = customerSearch.toLowerCase();
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(lower) ||
        (c.taxId && c.taxId.includes(lower)) ||
        (c.phoneNumber && c.phoneNumber.includes(lower)) ||
        (c.phone && c.phone.includes(lower))
    );
  }, [customers, customerSearch]);

  // Tax ID Auto Fetch Handler
  const handleFetchTax = async () => {
    const cleanTax = leadTaxId.replace(/[\s-]/g, '');
    if (!cleanTax || cleanTax.length < 10) {
      Alert.alert('Mã số thuế không hợp lệ', 'Mã số thuế phải có 10 hoặc 13 chữ số.');
      return;
    }

    setIsFetchingTax(true);
    try {
      const data = await fetchTaxInfo(cleanTax);
      if (data && data.name) {
        setLeadName(data.name);
        if (data.address) setLeadAddress(data.address);
        Alert.alert('Thành công', 'Đã tự động điền tên doanh nghiệp và địa chỉ theo MST.');
      } else {
        Alert.alert('Thông báo', 'Không tìm thấy thông tin doanh nghiệp với mã số thuế này.');
      }
    } catch {
      Alert.alert('Lỗi', 'Không thể kết nối tới cơ sở dữ liệu tra cứu thuế.');
    } finally {
      setIsFetchingTax(false);
    }
  };

  // Submit Handler
  const handleSave = async () => {
    if (customerType === 'REFERRAL' && !selectedReferralPartnerId) {
      Alert.alert('Thiếu thông tin', 'Vui lòng chọn đối tác giới thiệu.');
      return;
    }

    if (customerStatus === 'EXISTING') {
      if (!selectedCustomerId) {
        Alert.alert('Thiếu thông tin', 'Vui lòng chọn khách hàng hiện hữu từ danh sách.');
        return;
      }
    } else {
      if (!leadName.trim()) {
        Alert.alert('Thiếu thông tin', 'Vui lòng nhập tên khách hàng tiềm năng.');
        return;
      }

      if (leadPhone.trim()) {
        const phoneRegex = /^\+?[0-9]{10,15}$/;
        if (!phoneRegex.test(leadPhone.trim())) {
          Alert.alert('Lỗi', 'Số điện thoại không hợp lệ (10-15 chữ số).');
          return;
        }
      }

      if (leadEmail.trim()) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(leadEmail.trim())) {
          Alert.alert('Lỗi', 'Địa chỉ email không hợp lệ.');
          return;
        }
      }
    }

    setIsSubmitting(true);
    try {
      await onSave({
        customerType,
        customerStatus,
        selectedReferralPartnerId: customerType === 'REFERRAL' ? selectedReferralPartnerId : undefined,
        selectedCustomerId: customerStatus === 'EXISTING' ? selectedCustomerId : undefined,
        leadName: customerStatus === 'POTENTIAL' ? leadName.trim() : undefined,
        leadPhone: customerStatus === 'POTENTIAL' ? leadPhone.trim() : undefined,
        leadEmail: customerStatus === 'POTENTIAL' ? leadEmail.trim() : undefined,
        leadAddress: customerStatus === 'POTENTIAL' ? leadAddress.trim() : undefined,
        leadTaxId: customerStatus === 'POTENTIAL' ? leadTaxId.trim() : undefined,
      });
      onClose();
    } catch (err: any) {
      Alert.alert('Lỗi', err?.message || 'Có lỗi xảy ra khi lưu thông tin khách hàng.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.sheetContainer, { maxHeight: height * 0.9 }]}>
          {/* Sheet Header */}
          <View style={styles.sheetHeader}>
            <View>
              <Text style={styles.sheetTitle}>Thêm thông tin khách hàng</Text>
              <Text style={styles.sheetSub}>Gắn khách hàng trực tiếp hoặc đối tác giới thiệu</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <Feather name="x" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          <KeyboardAwareScrollView
            style={styles.sheetBody}
            contentContainerStyle={styles.sheetBodyContent}
            enableOnAndroid={true}
            enableAutomaticScroll={true}
            extraScrollHeight={Platform.OS === 'ios' ? 40 : 80}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* 1. Chọn loại khách hàng */}
            <View style={styles.formGroup}>
              <Text style={styles.groupLabel}>Hình thức quan hệ</Text>
              <View style={styles.segmentedRow}>
                <TouchableOpacity
                  style={[styles.segmentBtn, customerType === 'DIRECT' && styles.segmentBtnActive]}
                  onPress={() => setCustomerType('DIRECT')}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name="person-outline"
                    size={16}
                    color={customerType === 'DIRECT' ? '#2563EB' : '#64748B'}
                  />
                  <Text style={[styles.segmentBtnText, customerType === 'DIRECT' && styles.segmentBtnTextActive]}>
                    Khách hàng trực tiếp
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.segmentBtn, customerType === 'REFERRAL' && styles.segmentBtnActive]}
                  onPress={() => setCustomerType('REFERRAL')}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name="people-outline"
                    size={16}
                    color={customerType === 'REFERRAL' ? '#2563EB' : '#64748B'}
                  />
                  <Text style={[styles.segmentBtnText, customerType === 'REFERRAL' && styles.segmentBtnTextActive]}>
                    Đối tác giới thiệu
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Đối tác giới thiệu (Nếu chọn REFERRAL) */}
            {customerType === 'REFERRAL' && (
              <View style={styles.formGroup}>
                <Text style={styles.groupLabel}>
                  Đối tác giới thiệu <Text style={styles.reqStar}>*</Text>
                </Text>
                <View style={styles.partnerListContainer}>
                  {referralPartners.length > 0 ? (
                    referralPartners.map((p) => {
                      const isSelected = selectedReferralPartnerId === p.id;
                      return (
                        <TouchableOpacity
                          key={p.id}
                          style={[styles.partnerItemChip, isSelected && styles.partnerItemChipActive]}
                          onPress={() => setSelectedReferralPartnerId(p.id)}
                          activeOpacity={0.8}
                        >
                          <Ionicons
                            name={isSelected ? 'checkmark-circle' : 'ellipse-outline'}
                            size={16}
                            color={isSelected ? '#2563EB' : '#94A3B8'}
                          />
                          <Text style={[styles.partnerChipText, isSelected && styles.partnerChipTextActive]}>
                            {p.name} {p.taxId ? `(${p.taxId})` : ''}
                          </Text>
                        </TouchableOpacity>
                      );
                    })
                  ) : (
                    <Text style={styles.emptyHintText}>Chưa có danh sách đối tác giới thiệu.</Text>
                  )}
                </View>
              </View>
            )}

            {/* 2. Chọn trạng thái: Hiện hữu vs Tiềm năng */}
            <View style={styles.formGroup}>
              <Text style={styles.groupLabel}>Trạng thái khách hàng</Text>
              <View style={styles.segmentedRow}>
                <TouchableOpacity
                  style={[styles.segmentBtn, customerStatus === 'EXISTING' && styles.segmentBtnActive]}
                  onPress={() => setCustomerStatus('EXISTING')}
                  activeOpacity={0.8}
                >
                  <Feather
                    name="check-circle"
                    size={15}
                    color={customerStatus === 'EXISTING' ? '#2563EB' : '#64748B'}
                  />
                  <Text style={[styles.segmentBtnText, customerStatus === 'EXISTING' && styles.segmentBtnTextActive]}>
                    Khách hiện hữu
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.segmentBtn, customerStatus === 'POTENTIAL' && styles.segmentBtnActive]}
                  onPress={() => setCustomerStatus('POTENTIAL')}
                  activeOpacity={0.8}
                >
                  <Feather
                    name="user-plus"
                    size={15}
                    color={customerStatus === 'POTENTIAL' ? '#2563EB' : '#64748B'}
                  />
                  <Text style={[styles.segmentBtnText, customerStatus === 'POTENTIAL' && styles.segmentBtnTextActive]}>
                    Khách tiềm năng (Lead)
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* --- NHÁNH 1: KHÁCH HÀNG HIỆN HỮU --- */}
            {customerStatus === 'EXISTING' ? (
              <View style={styles.formGroup}>
                <Text style={styles.groupLabel}>
                  Chọn khách hàng <Text style={styles.reqStar}>*</Text>
                </Text>

                {/* Search box */}
                <View style={styles.searchBoxWrap}>
                  <Feather name="search" size={16} color="#94A3B8" />
                  <TextInput
                    style={styles.searchTextInput}
                    placeholder="Tìm theo tên công ty, MST, SĐT..."
                    placeholderTextColor="#94A3B8"
                    value={customerSearch}
                    onChangeText={setCustomerSearch}
                  />
                  {customerSearch.length > 0 && (
                    <TouchableOpacity onPress={() => setCustomerSearch('')}>
                      <Feather name="x" size={15} color="#94A3B8" />
                    </TouchableOpacity>
                  )}
                </View>

                {/* Customer List */}
                {isLoadingCustomers ? (
                  <View style={styles.loadingBox}>
                    <ActivityIndicator size="small" color={BrandColors.primary} />
                    <Text style={styles.loadingText}>Đang tải danh sách khách hàng...</Text>
                  </View>
                ) : (
                  <View style={styles.customerSelectList}>
                    {filteredCustomers.slice(0, 15).map((c) => {
                      const isSelected = selectedCustomerId === c.id;
                      const displayPhone = c.phoneNumber || c.phone;
                      return (
                        <TouchableOpacity
                          key={c.id}
                          style={[styles.customerOptionCard, isSelected && styles.customerOptionCardSelected]}
                          onPress={() => setSelectedCustomerId(c.id)}
                          activeOpacity={0.8}
                        >
                          <View style={[styles.customerRadio, isSelected && styles.customerRadioSelected]}>
                            {isSelected && <View style={styles.customerRadioDot} />}
                          </View>
                          <View style={styles.customerMetaBox}>
                            <Text
                              style={[styles.customerOptionName, isSelected && styles.customerOptionNameSelected]}
                              numberOfLines={1}
                            >
                              {c.name}
                            </Text>
                            <View style={styles.customerOptionSubRow}>
                              {c.taxId ? <Text style={styles.customerOptionBadge}>MST: {c.taxId}</Text> : null}
                              {displayPhone ? <Text style={styles.customerOptionSubText}>SĐT: {displayPhone}</Text> : null}
                            </View>
                          </View>
                        </TouchableOpacity>
                      );
                    })}

                    {filteredCustomers.length === 0 && (
                      <View style={styles.emptyCustomerBox}>
                        <Feather name="inbox" size={24} color="#CBD5E1" />
                        <Text style={styles.emptyCustomerText}>
                          Không tìm thấy khách hàng nào phù hợp với từ khóa.
                        </Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
            ) : (
              /* --- NHÁNH 2: KHÁCH HÀNG TIỀM NĂNG (LEAD MỚI) --- */
              <View style={styles.potentialFormContainer}>
                {/* MST & Nút Tra Cứu */}
                <View style={styles.formGroup}>
                  <Text style={styles.groupLabel}>Mã số thuế doanh nghiệp (nếu có)</Text>
                  <View style={styles.taxInputRow}>
                    <TextInput
                      style={[styles.textInput, { flex: 1 }]}
                      placeholder="VD: 0317896541"
                      placeholderTextColor="#94A3B8"
                      keyboardType="numeric"
                      value={leadTaxId}
                      onChangeText={setLeadTaxId}
                    />
                    <TouchableOpacity
                      style={[styles.fetchTaxBtn, isFetchingTax && styles.fetchTaxBtnDisabled]}
                      onPress={handleFetchTax}
                      disabled={isFetchingTax}
                      activeOpacity={0.8}
                    >
                      {isFetchingTax ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <>
                          <Feather name="search" size={14} color="#FFFFFF" />
                          <Text style={styles.fetchTaxBtnText}>Tra cứu MST</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.inputHelpText}>
                    Nhập 10 hoặc 13 số rồi bấm Tra cứu để tự động lấy Tên và Địa chỉ công ty.
                  </Text>
                </View>

                {/* Tên khách hàng */}
                <View style={styles.formGroup}>
                  <Text style={styles.groupLabel}>
                    Tên khách hàng / Tên doanh nghiệp <Text style={styles.reqStar}>*</Text>
                  </Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="VD: CÔNG TY TNHH GETVINI"
                    placeholderTextColor="#94A3B8"
                    value={leadName}
                    onChangeText={setLeadName}
                  />
                </View>

                {/* SĐT & Email */}
                <View style={styles.inputRowTwoCol}>
                  <View style={[styles.formGroup, { flex: 1, marginRight: 6 }]}>
                    <Text style={styles.groupLabel}>Số điện thoại</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="0901234567"
                      placeholderTextColor="#94A3B8"
                      keyboardType="phone-pad"
                      value={leadPhone}
                      onChangeText={setLeadPhone}
                    />
                  </View>

                  <View style={[styles.formGroup, { flex: 1, marginLeft: 6 }]}>
                    <Text style={styles.groupLabel}>Email liên hệ</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="contact@company.com"
                      placeholderTextColor="#94A3B8"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      value={leadEmail}
                      onChangeText={setLeadEmail}
                    />
                  </View>
                </View>

                {/* Địa chỉ */}
                <View style={styles.formGroup}>
                  <Text style={styles.groupLabel}>Địa chỉ</Text>
                  <TextInput
                    style={[styles.textInput, styles.textAreaInput]}
                    placeholder="Nhập địa chỉ trụ sở hoặc văn phòng..."
                    placeholderTextColor="#94A3B8"
                    multiline
                    numberOfLines={2}
                    textAlignVertical="top"
                    value={leadAddress}
                    onChangeText={setLeadAddress}
                  />
                </View>
              </View>
            )}

            <View style={{ height: 24 }} />
          </KeyboardAwareScrollView>

          {/* Footer Actions */}
          <View style={styles.sheetFooter}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} activeOpacity={0.8}>
              <Text style={styles.cancelBtnText}>Hủy</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.submitBtn, isSubmitting && styles.submitBtnDisabled]}
              onPress={handleSave}
              disabled={isSubmitting}
              activeOpacity={0.85}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Feather name="check" size={17} color="#FFFFFF" />
                  <Text style={styles.submitBtnText}>Lưu thông tin</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
  },
  sheetSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sheetBody: {
    flex: 1,
  },
  sheetBodyContent: {
    padding: 20,
  },
  formGroup: {
    marginBottom: 16,
  },
  groupLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 8,
  },
  reqStar: {
    color: '#EF4444',
  },
  segmentedRow: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  segmentBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  segmentBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  segmentBtnTextActive: {
    color: '#2563EB',
    fontWeight: '700',
  },
  partnerListContainer: {
    gap: 6,
  },
  partnerItemChip: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
  },
  partnerItemChipActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#93C5FD',
  },
  partnerChipText: {
    fontSize: 13,
    color: '#334155',
  },
  partnerChipTextActive: {
    color: '#1D4ED8',
    fontWeight: '600',
  },
  emptyHintText: {
    fontSize: 12,
    color: '#94A3B8',
    fontStyle: 'italic',
  },
  searchBoxWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    height: 42,
    marginBottom: 10,
    gap: 8,
  },
  searchTextInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
  },
  loadingBox: {
    paddingVertical: 20,
    alignItems: 'center',
    gap: 6,
  },
  loadingText: {
    fontSize: 12,
    color: '#64748B',
  },
  customerSelectList: {
    maxHeight: 220,
    gap: 6,
  },
  customerOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 10,
  },
  customerOptionCardSelected: {
    backgroundColor: '#EFF6FF',
    borderColor: '#3B82F6',
  },
  customerRadio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: '#94A3B8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  customerRadioSelected: {
    borderColor: '#2563EB',
  },
  customerRadioDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: '#2563EB',
  },
  customerMetaBox: {
    flex: 1,
  },
  customerOptionName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E293B',
  },
  customerOptionNameSelected: {
    color: '#1D4ED8',
    fontWeight: '700',
  },
  customerOptionSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 3,
  },
  customerOptionBadge: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  customerOptionSubText: {
    fontSize: 11,
    color: '#64748B',
  },
  emptyCustomerBox: {
    paddingVertical: 24,
    alignItems: 'center',
    gap: 6,
  },
  emptyCustomerText: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
  },
  potentialFormContainer: {
    gap: 2,
  },
  taxInputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#0F172A',
  },
  textAreaInput: {
    minHeight: 64,
  },
  fetchTaxBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563EB',
    paddingHorizontal: 14,
    borderRadius: 10,
    gap: 6,
  },
  fetchTaxBtnDisabled: {
    opacity: 0.6,
  },
  fetchTaxBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  inputHelpText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 4,
    lineHeight: 15,
  },
  inputRowTwoCol: {
    flexDirection: 'row',
  },
  sheetFooter: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    gap: 12,
    backgroundColor: '#FFFFFF',
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  submitBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#059669',
    gap: 6,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
