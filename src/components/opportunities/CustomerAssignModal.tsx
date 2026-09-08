import React, { useState, useEffect, useMemo, useRef } from 'react';
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

  // 1. Loại khách hàng (DIRECT: Trực tiếp | REFERRAL: Liên kết)
  const [customerType, setCustomerType] = useState<'DIRECT' | 'REFERRAL'>('DIRECT');

  // 2. Đối tác giới thiệu
  const [referralPartners, setReferralPartners] = useState<Array<{ id: string; name: string; phone?: string; taxId?: string }>>([]);
  const [selectedReferralPartnerId, setSelectedReferralPartnerId] = useState<string>('');
  const [isLoadingPartnerDetails, setIsLoadingPartnerDetails] = useState(false);

  // 3. Trạng thái khách hàng: Mặc định rỗng '' theo Web ('POTENTIAL' | 'EXISTING')
  const [customerStatus, setCustomerStatus] = useState<'' | 'EXISTING' | 'POTENTIAL'>('');

  // 4. Danh sách khách hàng (Hệ thống vs Khách hàng của đối tác)
  const [allCustomers, setAllCustomers] = useState<CustomerItem[]>([]);
  const [partnerCustomers, setPartnerCustomers] = useState<CustomerItem[]>([]);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');

  // 5. Thông tin khách hàng tiềm năng (Lead)
  const [leadTaxId, setLeadTaxId] = useState('');
  const [leadName, setLeadName] = useState('');
  const [leadPhone, setLeadPhone] = useState('');
  const [leadEmail, setLeadEmail] = useState('');
  const [leadAddress, setLeadAddress] = useState('');
  const [isFetchingTax, setIsFetchingTax] = useState(false);
  const [autoTaxSuccess, setAutoTaxSuccess] = useState(false);

  // Dropdown mở/đóng các picker
  const [openPicker, setOpenPicker] = useState<'TYPE' | 'PARTNER' | 'STATUS' | null>(null);

  // Submitting
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load Catalogs (Đối tác & Tất cả khách hàng)
  useEffect(() => {
    if (!visible) return;

    // Reset picker state
    setOpenPicker(null);
    setAutoTaxSuccess(false);

    // Prefill nếu đã có initialData
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
      setCustomerStatus('');
      setSelectedCustomerId('');
    }

    if (initialData?.referralPartnerId) {
      setSelectedReferralPartnerId(initialData.referralPartnerId);
    } else {
      setSelectedReferralPartnerId('');
    }

    const loadCatalogs = async () => {
      setIsLoadingCustomers(true);
      try {
        const [custRes, partRes] = await Promise.all([
          customerService.getCustomers(),
          opportunityService.getReferralPartners(),
        ]);
        if (custRes.data && Array.isArray(custRes.data)) {
          setAllCustomers(custRes.data);
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

  // Khi chọn Đối tác giới thiệu ➔ Lấy danh sách khách hàng liên kết của đối tác đó
  useEffect(() => {
    if (customerType === 'REFERRAL' && selectedReferralPartnerId) {
      const fetchPartnerCustomers = async () => {
        setIsLoadingPartnerDetails(true);
        try {
          const res = await opportunityService.getReferralPartner(selectedReferralPartnerId);
          if (res.data && Array.isArray(res.data.customers)) {
            setPartnerCustomers(res.data.customers);
          } else {
            setPartnerCustomers([]);
          }
        } catch {
          setPartnerCustomers([]);
        } finally {
          setIsLoadingPartnerDetails(false);
        }
      };

      fetchPartnerCustomers();
    } else {
      setPartnerCustomers([]);
    }
  }, [customerType, selectedReferralPartnerId]);

  // Tự động tra cứu MST khi gõ đủ 10 hoặc 13 số (Debounce 500ms chuẩn Web)
  useEffect(() => {
    const cleanTax = leadTaxId.replace(/[\s-]/g, '');
    if (visible && customerStatus === 'POTENTIAL' && (cleanTax.length === 10 || cleanTax.length === 13)) {
      setIsFetchingTax(true);
      const timer = setTimeout(async () => {
        try {
          const data = await fetchTaxInfo(cleanTax);
          if (data && data.name) {
            setLeadName(data.name);
            if (data.address) setLeadAddress(data.address);
            setAutoTaxSuccess(true);
          }
        } catch {
          // ignore
        } finally {
          setIsFetchingTax(false);
        }
      }, 500);

      return () => clearTimeout(timer);
    } else {
      setAutoTaxSuccess(false);
    }
  }, [leadTaxId, visible, customerStatus]);

  // Danh sách khách hàng hiển thị theo loại
  const displayCustomers = useMemo(() => {
    return customerType === 'REFERRAL' ? partnerCustomers : allCustomers;
  }, [customerType, partnerCustomers, allCustomers]);

  // Lọc theo thanh tìm kiếm
  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return displayCustomers;
    const lower = customerSearch.toLowerCase();
    return displayCustomers.filter(
      (c) =>
        c.name.toLowerCase().includes(lower) ||
        (c.taxId && c.taxId.includes(lower)) ||
        (c.phoneNumber && c.phoneNumber.includes(lower)) ||
        (c.phone && c.phone.includes(lower))
    );
  }, [displayCustomers, customerSearch]);

  // Điều kiện Disabled nút Lưu chuẩn Web
  const isSaveDisabled =
    isSubmitting ||
    !customerStatus ||
    (customerStatus === 'EXISTING' && !selectedCustomerId) ||
    (customerType === 'REFERRAL' && !selectedReferralPartnerId);

  // Submit Handler
  const handleSave = async () => {
    if (customerStatus === 'POTENTIAL') {
      const phoneRegex = /^\+?[0-9]{10,15}$/;
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const taxIdRegex = /^\d{10}(\s?-\s?\d{3})?$/;

      if (!leadName.trim()) {
        Alert.alert('Thiếu thông tin', 'Vui lòng nhập tên khách hàng.');
        return;
      }

      if (leadPhone.trim() && !phoneRegex.test(leadPhone.trim())) {
        Alert.alert('Lỗi', 'Số điện thoại không hợp lệ (10-15 chữ số).');
        return;
      }

      if (leadEmail.trim() && !emailRegex.test(leadEmail.trim())) {
        Alert.alert('Lỗi', 'Địa chỉ email không hợp lệ.');
        return;
      }

      if (leadTaxId.trim() && !taxIdRegex.test(leadTaxId.trim().replace(/-/g, ''))) {
        Alert.alert('Lỗi', 'Mã số thuế không hợp lệ (Phải là 10 số hoặc 13 số).');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      await onSave({
        customerType,
        customerStatus: customerStatus as 'EXISTING' | 'POTENTIAL',
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

  const selectedPartnerObj = referralPartners.find((p) => p.id === selectedReferralPartnerId);
  const selectedCustomerObj = displayCustomers.find((c) => c.id === selectedCustomerId);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.sheetContainer, { height: height * 0.82, maxHeight: height * 0.92 }]}>
          {/* Header */}
          <View style={styles.sheetHeader}>
            <View>
              <Text style={styles.sheetTitle}>Thêm thông tin khách hàng</Text>
              <Text style={styles.sheetSub}>Gắn khách hàng trực tiếp hoặc khách hàng liên kết</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <Feather name="x" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          <KeyboardAwareScrollView
            style={styles.sheetBody}
            contentContainerStyle={[styles.sheetBodyContent, { flexGrow: 1 }]}
            enableOnAndroid={true}
            enableAutomaticScroll={true}
            extraScrollHeight={Platform.OS === 'ios' ? 40 : 80}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={true}
          >
            {/* 1. LOẠI KHÁCH HÀNG: Select Dropdown */}
            <View style={styles.formGroup}>
              <Text style={styles.groupLabel}>Loại khách hàng:</Text>
              <TouchableOpacity
                style={styles.dropdownSelector}
                onPress={() => setOpenPicker(openPicker === 'TYPE' ? null : 'TYPE')}
                activeOpacity={0.8}
              >
                <Text style={styles.dropdownValueText}>
                  {customerType === 'DIRECT' ? 'Khách hàng trực tiếp' : 'Khách hàng liên kết'}
                </Text>
                <Feather
                  name={openPicker === 'TYPE' ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color="#64748B"
                />
              </TouchableOpacity>

              {/* Menu options cho Loại khách hàng */}
              {openPicker === 'TYPE' && (
                <View style={styles.dropdownMenu}>
                  <TouchableOpacity
                    style={[styles.dropdownMenuItem, customerType === 'DIRECT' && styles.dropdownMenuItemActive]}
                    onPress={() => {
                      setCustomerType('DIRECT');
                      setCustomerStatus('');
                      setSelectedReferralPartnerId('');
                      setSelectedCustomerId('');
                      setOpenPicker(null);
                    }}
                  >
                    <Text style={[styles.dropdownMenuItemText, customerType === 'DIRECT' && styles.dropdownMenuItemTextActive]}>
                      Khách hàng trực tiếp
                    </Text>
                    {customerType === 'DIRECT' && <Feather name="check" size={16} color="#2563EB" />}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.dropdownMenuItem, customerType === 'REFERRAL' && styles.dropdownMenuItemActive]}
                    onPress={() => {
                      setCustomerType('REFERRAL');
                      setCustomerStatus('');
                      setSelectedReferralPartnerId('');
                      setSelectedCustomerId('');
                      setOpenPicker(null);
                    }}
                  >
                    <Text style={[styles.dropdownMenuItemText, customerType === 'REFERRAL' && styles.dropdownMenuItemTextActive]}>
                      Khách hàng liên kết
                    </Text>
                    {customerType === 'REFERRAL' && <Feather name="check" size={16} color="#2563EB" />}
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* 2. ĐỐI TÁC GIỚI THIỆU (NẾU CHỌN KHÁCH HÀNG LIÊN KẾT) */}
            {customerType === 'REFERRAL' && (
              <View style={styles.formGroup}>
                <Text style={styles.groupLabel}>
                  Đối tác giới thiệu: <Text style={styles.reqStar}>*</Text>
                </Text>

                <TouchableOpacity
                  style={[
                    styles.dropdownSelector,
                    !selectedReferralPartnerId && styles.dropdownSelectorWarning,
                  ]}
                  onPress={() => setOpenPicker(openPicker === 'PARTNER' ? null : 'PARTNER')}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.dropdownValueText,
                      !selectedReferralPartnerId && styles.dropdownPlaceholderText,
                    ]}
                  >
                    {selectedPartnerObj
                      ? `${selectedPartnerObj.name} ${selectedPartnerObj.taxId ? `- ${selectedPartnerObj.taxId}` : ''}`
                      : 'Chọn đối tác giới thiệu'}
                  </Text>
                  <Feather
                    name={openPicker === 'PARTNER' ? 'chevron-up' : 'chevron-down'}
                    size={18}
                    color="#64748B"
                  />
                </TouchableOpacity>

                {/* Cảnh báo cam nếu chưa chọn đối tác chuẩn Web */}
                {!selectedReferralPartnerId && (
                  <Text style={styles.partnerWarningText}>
                    Vui lòng chọn đối tác giới thiệu trước
                  </Text>
                )}

                {/* Menu chọn đối tác */}
                {openPicker === 'PARTNER' && (
                  <View style={styles.dropdownMenu}>
                    {referralPartners.length > 0 ? (
                      referralPartners.map((p) => {
                        const isSelected = selectedReferralPartnerId === p.id;
                        return (
                          <TouchableOpacity
                            key={p.id}
                            style={[styles.dropdownMenuItem, isSelected && styles.dropdownMenuItemActive]}
                            onPress={() => {
                              setSelectedReferralPartnerId(p.id);
                              setSelectedCustomerId('');
                              setOpenPicker(null);
                            }}
                          >
                            <Text
                              style={[
                                styles.dropdownMenuItemText,
                                isSelected && styles.dropdownMenuItemTextActive,
                              ]}
                            >
                              {p.name} {p.taxId ? `- ${p.taxId}` : ''}
                            </Text>
                            {isSelected && <Feather name="check" size={16} color="#2563EB" />}
                          </TouchableOpacity>
                        );
                      })
                    ) : (
                      <View style={styles.emptyPickerBox}>
                        <Text style={styles.emptyPickerText}>Chưa có đối tác giới thiệu nào trong hệ thống.</Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
            )}

            {/* 3. TRẠNG THÁI KHÁCH HÀNG: Select Dropdown */}
            <View style={styles.formGroup}>
              <Text style={styles.groupLabel}>Trạng thái khách hàng:</Text>
              <TouchableOpacity
                style={[
                  styles.dropdownSelector,
                  customerType === 'REFERRAL' && !selectedReferralPartnerId && styles.dropdownSelectorDisabled,
                ]}
                disabled={customerType === 'REFERRAL' && !selectedReferralPartnerId}
                onPress={() => setOpenPicker(openPicker === 'STATUS' ? null : 'STATUS')}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.dropdownValueText,
                    !customerStatus && styles.dropdownPlaceholderText,
                  ]}
                >
                  {customerStatus === 'POTENTIAL'
                    ? 'Khách hàng tiềm năng'
                    : customerStatus === 'EXISTING'
                    ? 'Khách hàng hiện hữu'
                    : 'Chọn trạng thái'}
                </Text>
                <Feather
                  name={openPicker === 'STATUS' ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color={customerType === 'REFERRAL' && !selectedReferralPartnerId ? '#CBD5E1' : '#64748B'}
                />
              </TouchableOpacity>

              {/* Menu options Trạng thái */}
              {openPicker === 'STATUS' && (
                <View style={styles.dropdownMenu}>
                  <TouchableOpacity
                    style={[styles.dropdownMenuItem, customerStatus === 'POTENTIAL' && styles.dropdownMenuItemActive]}
                    onPress={() => {
                      setCustomerStatus('POTENTIAL');
                      setSelectedCustomerId('');
                      setOpenPicker(null);
                    }}
                  >
                    <Text style={[styles.dropdownMenuItemText, customerStatus === 'POTENTIAL' && styles.dropdownMenuItemTextActive]}>
                      Khách hàng tiềm năng
                    </Text>
                    {customerStatus === 'POTENTIAL' && <Feather name="check" size={16} color="#2563EB" />}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.dropdownMenuItem, customerStatus === 'EXISTING' && styles.dropdownMenuItemActive]}
                    onPress={() => {
                      setCustomerStatus('EXISTING');
                      setOpenPicker(null);
                    }}
                  >
                    <Text style={[styles.dropdownMenuItemText, customerStatus === 'EXISTING' && styles.dropdownMenuItemTextActive]}>
                      Khách hàng hiện hữu
                    </Text>
                    {customerStatus === 'EXISTING' && <Feather name="check" size={16} color="#2563EB" />}
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* --- NHÁNH 1: KHÁCH HÀNG HIỆN HỮU (EXISTING) --- */}
            {customerStatus === 'EXISTING' && (
              <View style={styles.formGroup}>
                <Text style={styles.groupLabel}>
                  Chọn khách hàng hiện hữu: <Text style={styles.reqStar}>*</Text>
                </Text>

                {/* Search input */}
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

                {/* Danh sách chọn khách hàng */}
                {isLoadingCustomers || isLoadingPartnerDetails ? (
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

                    {customerType === 'REFERRAL' && displayCustomers.length === 0 && (
                      <View style={styles.emptyCustomerBox}>
                        <Feather name="info" size={20} color="#94A3B8" />
                        <Text style={styles.emptyCustomerText}>
                          Đối tác này chưa có khách hàng liên kết nào.
                        </Text>
                      </View>
                    )}

                    {displayCustomers.length > 0 && filteredCustomers.length === 0 && (
                      <View style={styles.emptyCustomerBox}>
                        <Feather name="inbox" size={20} color="#CBD5E1" />
                        <Text style={styles.emptyCustomerText}>
                          Không tìm thấy khách hàng nào phù hợp với từ khóa.
                        </Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
            )}

            {/* --- NHÁNH 2: KHÁCH HÀNG TIỀM NĂNG (POTENTIAL) --- */}
            {customerStatus === 'POTENTIAL' && (
              <View style={styles.potentialFormContainer}>
                {/* 1. Mã số thuế */}
                <View style={styles.formGroup}>
                  <View style={styles.labelWithIndicatorRow}>
                    <Text style={styles.groupLabel}>Mã số thuế:</Text>
                    {isFetchingTax && (
                      <View style={styles.fetchingTag}>
                        <ActivityIndicator size="small" color="#2563EB" />
                        <Text style={styles.fetchingTagText}>Đang tra cứu thuế...</Text>
                      </View>
                    )}
                    {autoTaxSuccess && !isFetchingTax && (
                      <View style={styles.successTag}>
                        <Feather name="check" size={12} color="#059669" />
                        <Text style={styles.successTagText}>Đã tự động điền</Text>
                      </View>
                    )}
                  </View>

                  <TextInput
                    style={styles.textInput}
                    placeholder="Nhập mã số thuế (10 hoặc 13 số)"
                    placeholderTextColor="#94A3B8"
                    keyboardType="numeric"
                    value={leadTaxId}
                    onChangeText={setLeadTaxId}
                  />
                  <Text style={styles.inputHelpText}>
                    Hệ thống sẽ tự động tra cứu tên và địa chỉ công ty sau khi gõ đủ MST.
                  </Text>
                </View>

                {/* 2. Tên khách hàng */}
                <View style={styles.formGroup}>
                  <Text style={styles.groupLabel}>
                    Tên khách hàng: <Text style={styles.reqStar}>*</Text>
                  </Text>
                  <TextInput
                    style={[styles.textInput, isFetchingTax && styles.textInputLoading]}
                    placeholder={isFetchingTax ? 'Đang tải tên doanh nghiệp...' : 'Nhập tên khách hàng'}
                    placeholderTextColor="#94A3B8"
                    value={leadName}
                    onChangeText={setLeadName}
                  />
                </View>

                {/* 3. Điện thoại */}
                <View style={styles.formGroup}>
                  <Text style={styles.groupLabel}>Điện thoại:</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Nhập số điện thoại"
                    placeholderTextColor="#94A3B8"
                    keyboardType="phone-pad"
                    value={leadPhone}
                    onChangeText={setLeadPhone}
                  />
                </View>

                {/* 4. Email */}
                <View style={styles.formGroup}>
                  <Text style={styles.groupLabel}>Email:</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Nhập email"
                    placeholderTextColor="#94A3B8"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={leadEmail}
                    onChangeText={setLeadEmail}
                  />
                </View>

                {/* 5. Địa chỉ */}
                <View style={styles.formGroup}>
                  <Text style={styles.groupLabel}>Địa chỉ:</Text>
                  <TextInput
                    style={[styles.textInput, styles.textAreaInput]}
                    placeholder="Nhập địa chỉ"
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

          {/* Footer Actions: Tự động Disabled chuẩn Web */}
          <View style={styles.sheetFooter}>
            <TouchableOpacity
              style={[styles.submitBtn, isSaveDisabled && styles.submitBtnDisabled]}
              onPress={handleSave}
              disabled={isSaveDisabled}
              activeOpacity={0.85}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.submitBtnText}>Lưu</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} activeOpacity={0.8}>
              <Text style={styles.cancelBtnText}>Hủy</Text>
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
  dropdownSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  dropdownSelectorWarning: {
    borderColor: '#FB923C',
    backgroundColor: '#FFF7ED',
  },
  dropdownSelectorDisabled: {
    backgroundColor: '#F1F5F9',
    borderColor: '#E2E8F0',
  },
  dropdownValueText: {
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '500',
    flex: 1,
  },
  dropdownPlaceholderText: {
    color: '#94A3B8',
    fontStyle: 'italic',
  },
  partnerWarningText: {
    fontSize: 12,
    color: '#EA580C',
    marginTop: 5,
    fontStyle: 'italic',
  },
  dropdownMenu: {
    marginTop: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  dropdownMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  dropdownMenuItemActive: {
    backgroundColor: '#EFF6FF',
  },
  dropdownMenuItemText: {
    fontSize: 13,
    color: '#334155',
  },
  dropdownMenuItemTextActive: {
    color: '#1D4ED8',
    fontWeight: '700',
  },
  emptyPickerBox: {
    padding: 16,
    alignItems: 'center',
  },
  emptyPickerText: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
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
    fontStyle: 'italic',
  },
  potentialFormContainer: {
    gap: 2,
  },
  labelWithIndicatorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  fetchingTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  fetchingTagText: {
    fontSize: 11,
    color: '#2563EB',
    fontStyle: 'italic',
  },
  successTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  successTagText: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '600',
  },
  textInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#0F172A',
  },
  textInputLoading: {
    backgroundColor: '#F1F5F9',
  },
  textAreaInput: {
    minHeight: 64,
  },
  inputHelpText: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 4,
    fontStyle: 'italic',
  },
  sheetFooter: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    gap: 10,
    backgroundColor: '#FFFFFF',
  },
  submitBtn: {
    flex: 1,
    backgroundColor: '#2563EB',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnDisabled: {
    backgroundColor: '#93C5FD',
    opacity: 0.6,
  },
  submitBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  cancelBtn: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
});
