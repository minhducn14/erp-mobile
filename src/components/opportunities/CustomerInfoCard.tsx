import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Alert,
  TextInput,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { BrandColors } from '@/constants/colors';
import { OpportunityItem } from '@/services/opportunityService';
import { fetchTaxInfo } from '@/utils/tax';

interface CustomerInfoCardProps {
  opportunity: OpportunityItem;
  onAddCustomer: () => void;  // Mở modal chọn loại KH (khi chưa có KH)
  onSaveEdit: (data: {   // Lưu inline edit (khi đã có KH)
    name?: string;
    phone?: string;
    email?: string;
    taxId?: string;
    address?: string;
  }) => Promise<void>;
}

export const CustomerInfoCard: React.FC<CustomerInfoCardProps> = ({
  opportunity,
  onAddCustomer,
  onSaveEdit,
}) => {
  const hasData = !!(opportunity.customer || opportunity.leadName);
  const isLead = !opportunity.customer && !!opportunity.leadName;
  const isReferral = opportunity.customerType === 'REFERRAL' || opportunity.source === 'REFERRAL_PARTNER';

  const customerName = opportunity.customer?.name || opportunity.leadName || 'Chưa xác định';
  const phoneNumber =
    opportunity.customer?.phoneNumber ||
    opportunity.customer?.phone ||
    opportunity.leadPhone;
  const emailAddress = opportunity.customer?.email || opportunity.leadEmail;
  const taxId = opportunity.customer?.taxId || opportunity.leadTaxId;
  const addressText = opportunity.customer?.address || opportunity.leadAddress;

  // --- Inline Edit State ---
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isFetchingTax, setIsFetchingTax] = useState(false);
  const [editData, setEditData] = useState({
    name: '',
    phone: '',
    email: '',
    taxId: '',
    address: '',
  });

  // Khi có data opportunity hoặc bật/tắt edit, đồng bộ editData (chuẩn Web)
  useEffect(() => {
    if (opportunity.customer) {
      setEditData({
        name: opportunity.customer.name || '',
        phone: opportunity.customer.phoneNumber || opportunity.customer.phone || '',
        email: opportunity.customer.email || '',
        taxId: opportunity.customer.taxId || '',
        address: opportunity.customer.address || '',
      });
    } else if (opportunity.leadName) {
      setEditData({
        name: opportunity.leadName || '',
        phone: opportunity.leadPhone || '',
        email: opportunity.leadEmail || '',
        taxId: opportunity.leadTaxId || '',
        address: opportunity.leadAddress || '',
      });
    }
  }, [opportunity, isEditing]);

  // Tax ID auto-fill (chuẩn Web: debounce 500ms)
  useEffect(() => {
    const cleanTaxId = editData.taxId?.replace(/[\s-]/g, '');
    if (isEditing && (cleanTaxId?.length === 10 || cleanTaxId?.length === 13)) {
      setIsFetchingTax(true);
      const timer = setTimeout(async () => {
        try {
          const data = await fetchTaxInfo(cleanTaxId);
          if (data) {
            setEditData((prev) => ({
              ...prev,
              name: data.name || prev.name,
              address: data.address || prev.address,
            }));
          }
        } catch {
          // ignore
        } finally {
          setIsFetchingTax(false);
        }
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setIsFetchingTax(false);
    }
  }, [editData.taxId, isEditing]);

  const handleCall = (phone: string) => {
    Linking.openURL(`tel:${phone}`).catch(() => {
      Alert.alert('Không thể thực hiện cuộc gọi', `Số điện thoại: ${phone}`);
    });
  };

  const handleEmail = (email: string) => {
    Linking.openURL(`mailto:${email}`).catch(() => {
      Alert.alert('Không thể mở ứng dụng gửi mail', `Địa chỉ email: ${email}`);
    });
  };

  const handleSave = async () => {
    const phoneRegex = /^\+?[0-9]{10,15}$/;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const taxIdRegex = /^\d{10}(\s?-\s?\d{3})?$/;

    if (editData.phone && !phoneRegex.test(editData.phone.trim())) {
      Alert.alert('Lỗi', 'Số điện thoại không hợp lệ');
      return;
    }
    if (editData.email && !emailRegex.test(editData.email.trim())) {
      Alert.alert('Lỗi', 'Email không hợp lệ');
      return;
    }
    if (editData.taxId && !taxIdRegex.test(editData.taxId.trim())) {
      Alert.alert('Lỗi', 'Mã số thuế không hợp lệ (Phải là 10 số hoặc 13 số định dạng XXXXXXXXXX-XXX)');
      return;
    }

    setIsSaving(true);
    try {
      await onSaveEdit({
        name: editData.name.trim(),
        phone: editData.phone.trim(),
        email: editData.email.trim(),
        taxId: editData.taxId.trim(),
        address: editData.address.trim(),
      });
      setIsEditing(false);
    } catch (err: any) {
      Alert.alert('Lỗi', err?.message || 'Cập nhật thất bại');
    } finally {
      setIsSaving(false);
    }
  };

  // ==================== EMPTY STATE ====================
  if (!hasData) {
    return (
      <View style={styles.emptyCardContainer}>
        <View style={styles.emptyCardHeader}>
          <View style={styles.headerIconBox}>
            <Ionicons name="business-outline" size={18} color="#2563EB" />
          </View>
          <Text style={styles.cardHeaderTitle}>Khách hàng & Người liên hệ</Text>
        </View>

        <View style={styles.emptyDottedBox}>
          <View style={styles.emptyAvatarPlaceholder}>
            <Feather name="user-plus" size={24} color="#94A3B8" />
          </View>
          <Text style={styles.emptyTitle}>Chưa có thông tin khách hàng</Text>
          <Text style={styles.emptySub}>
            Gán khách hàng hiện hữu trên hệ thống hoặc tạo mới khách hàng tiềm năng cho cơ hội này.
          </Text>

          {opportunity.status === 'PENDING_OPP_APPROVAL' && (
            <View style={styles.warningNoticeBox}>
              <Feather name="alert-circle" size={14} color="#D97706" />
              <Text style={styles.warningNoticeText}>
                Cần thêm thông tin khách hàng để Ban Giám Đốc phê duyệt cơ hội này.
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={styles.addCustomerBtn}
            onPress={onAddCustomer}
            activeOpacity={0.8}
          >
            <Feather name="plus-circle" size={17} color="#FFFFFF" />
            <Text style={styles.addCustomerBtnText}>Thêm thông tin khách hàng</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ==================== HAS CUSTOMER STATE ====================
  return (
    <View style={styles.cardContainer}>
      {/* Header Row with Edit/Save/Cancel Buttons */}
      <View style={styles.cardHeaderRow}>
        <View style={styles.cardHeaderLeft}>
          <View style={styles.headerIconBox}>
            <Ionicons name={isLead ? 'person-outline' : 'business-outline'} size={18} color="#2563EB" />
          </View>
          <Text style={styles.cardHeaderTitle}>Khách hàng & Người liên hệ</Text>
        </View>

        {isEditing ? (
          <View style={styles.editActionRow}>
            <TouchableOpacity
              style={[styles.saveBtn, isSaving && styles.saveBtnDisabled]}
              onPress={handleSave}
              disabled={isSaving}
              activeOpacity={0.8}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#059669" />
              ) : (
                <Feather name="save" size={14} color="#059669" />
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cancelEditBtn}
              onPress={() => setIsEditing(false)}
              disabled={isSaving}
              activeOpacity={0.8}
            >
              <Feather name="x" size={14} color="#EF4444" />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => setIsEditing(true)}
            activeOpacity={0.7}
          >
            <Feather name="edit-2" size={13} color="#2563EB" />
            <Text style={styles.editBtnText}>Chỉnh sửa</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Customer Overview Box */}
      {!isEditing && (
        <View style={styles.customerOverviewRow}>
          <View style={[styles.customerAvatar, { backgroundColor: isLead ? '#FEF3C7' : '#EFF6FF' }]}>
            <Text style={[styles.avatarInitialText, { color: isLead ? '#D97706' : '#2563EB' }]}>
              {customerName.charAt(0).toUpperCase()}
            </Text>
          </View>

          <View style={styles.customerMeta}>
            <Text style={styles.customerNameText} numberOfLines={2}>
              {customerName}
            </Text>

            <View style={styles.badgesRow}>
              {isLead ? (
                <View style={[styles.badge, styles.badgeOrange]}>
                  <Text style={styles.badgeTextOrange}>Khách tiềm năng (Lead)</Text>
                </View>
              ) : (
                <View style={[styles.badge, styles.badgeGreen]}>
                  <Text style={styles.badgeTextGreen}>Khách hiện hữu</Text>
                </View>
              )}

              <View style={[styles.badge, isReferral ? styles.badgePurple : styles.badgeBlue]}>
                <Text style={isReferral ? styles.badgeTextPurple : styles.badgeTextBlue}>
                  {isReferral ? 'Đối tác giới thiệu' : 'Trực tiếp'}
                </Text>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* =============== EDIT MODE =============== */}
      {isEditing && (
        <View style={styles.editFormContainer}>
          {/* Tên */}
          <View style={styles.editFieldGroup}>
            <Text style={styles.editFieldLabel}>
              {isLead ? 'Tên khách hàng tiềm năng' : 'Tên khách hàng'}
            </Text>
            <TextInput
              style={[styles.editTextInput, !isLead && styles.editTextInputDisabled]}
              value={editData.name}
              onChangeText={(v) => setEditData({ ...editData, name: v })}
              placeholder="Nhập tên khách hàng"
              placeholderTextColor="#94A3B8"
              editable={isLead} // Chuẩn Web: KH hiện hữu không sửa được tên
            />
            {!isLead && (
              <Text style={styles.editHintText}>Tên khách hàng hiện hữu không thể thay đổi tại đây.</Text>
            )}
          </View>

          {/* MST + Tax auto-fill */}
          <View style={styles.editFieldGroup}>
            <View style={styles.editLabelRow}>
              <Text style={styles.editFieldLabel}>Mã số thuế</Text>
              {isFetchingTax && (
                <View style={styles.fetchingTag}>
                  <ActivityIndicator size="small" color="#2563EB" />
                  <Text style={styles.fetchingTagText}>Đang tra cứu...</Text>
                </View>
              )}
            </View>
            <TextInput
              style={styles.editTextInput}
              value={editData.taxId}
              onChangeText={(v) => setEditData({ ...editData, taxId: v })}
              placeholder="Nhập mã số thuế"
              placeholderTextColor="#94A3B8"
              keyboardType="numeric"
            />
          </View>

          {/* Điện thoại */}
          <View style={styles.editFieldGroup}>
            <Text style={styles.editFieldLabel}>Điện thoại</Text>
            <TextInput
              style={styles.editTextInput}
              value={editData.phone}
              onChangeText={(v) => setEditData({ ...editData, phone: v })}
              placeholder="Nhập số điện thoại"
              placeholderTextColor="#94A3B8"
              keyboardType="phone-pad"
            />
          </View>

          {/* Email */}
          <View style={styles.editFieldGroup}>
            <Text style={styles.editFieldLabel}>Email</Text>
            <TextInput
              style={styles.editTextInput}
              value={editData.email}
              onChangeText={(v) => setEditData({ ...editData, email: v })}
              placeholder="Nhập email"
              placeholderTextColor="#94A3B8"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          {/* Địa chỉ */}
          <View style={styles.editFieldGroup}>
            <Text style={styles.editFieldLabel}>Địa chỉ</Text>
            <TextInput
              style={[styles.editTextInput, styles.editTextAreaInput]}
              value={editData.address}
              onChangeText={(v) => setEditData({ ...editData, address: v })}
              placeholder="Nhập địa chỉ"
              placeholderTextColor="#94A3B8"
              multiline
              numberOfLines={2}
              textAlignVertical="top"
            />
          </View>

          {/* Save Button */}
          <TouchableOpacity
            style={[styles.saveFullBtn, isSaving && styles.saveFullBtnDisabled]}
            onPress={handleSave}
            disabled={isSaving}
            activeOpacity={0.85}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Feather name="check" size={15} color="#FFFFFF" />
                <Text style={styles.saveFullBtnText}>Lưu thay đổi</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* =============== VIEW MODE =============== */}
      {!isEditing && (
        <>
          {/* Quick Action Buttons (Call / Email) */}
          <View style={styles.actionButtonsRow}>
            {phoneNumber ? (
              <TouchableOpacity
                style={styles.actionBtnCall}
                onPress={() => handleCall(phoneNumber)}
                activeOpacity={0.8}
              >
                <Feather name="phone-call" size={14} color="#059669" />
                <Text style={styles.actionBtnCallText} numberOfLines={1}>
                  {phoneNumber}
                </Text>
              </TouchableOpacity>
            ) : (
              <View style={[styles.actionBtnCall, styles.actionBtnDisabled]}>
                <Feather name="phone-off" size={14} color="#94A3B8" />
                <Text style={styles.actionBtnDisabledText}>Chưa có SĐT</Text>
              </View>
            )}

            {emailAddress ? (
              <TouchableOpacity
                style={styles.actionBtnMail}
                onPress={() => handleEmail(emailAddress)}
                activeOpacity={0.8}
              >
                <Feather name="mail" size={14} color="#2563EB" />
                <Text style={styles.actionBtnMailText} numberOfLines={1}>
                  {emailAddress}
                </Text>
              </TouchableOpacity>
            ) : (
              <View style={[styles.actionBtnMail, styles.actionBtnDisabled]}>
                <Feather name="mail" size={14} color="#94A3B8" />
                <Text style={styles.actionBtnDisabledText}>Chưa có Email</Text>
              </View>
            )}
          </View>

          {/* Detail Fields (MST, Address, Partner) */}
          <View style={styles.detailListContainer}>
            {taxId ? (
              <View style={styles.detailItemRow}>
                <View style={styles.detailIconWrap}>
                  <Feather name="hash" size={14} color="#64748B" />
                </View>
                <View style={styles.detailTextBox}>
                  <Text style={styles.detailLabel}>Mã số thuế</Text>
                  <Text style={styles.detailValue}>{taxId}</Text>
                </View>
              </View>
            ) : null}

            {addressText ? (
              <View style={styles.detailItemRow}>
                <View style={styles.detailIconWrap}>
                  <Feather name="map-pin" size={14} color="#64748B" />
                </View>
                <View style={styles.detailTextBox}>
                  <Text style={styles.detailLabel}>Địa chỉ</Text>
                  <Text style={styles.detailValue}>{addressText}</Text>
                </View>
              </View>
            ) : null}

            {opportunity.referralPartner ? (
              <View style={styles.partnerCalloutBox}>
                <Feather name="users" size={15} color="#7C3AED" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.partnerCalloutTitle}>Đối tác liên kết giới thiệu:</Text>
                  <Text style={styles.partnerCalloutName}>
                    {opportunity.referralPartner.name}
                    {opportunity.referralPartner.taxId ? ` (${opportunity.referralPartner.taxId})` : ''}
                  </Text>
                </View>
              </View>
            ) : null}
          </View>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1.5,
  },
  emptyCardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  emptyCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  headerIconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  cardHeaderTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  editActionRow: {
    flexDirection: 'row',
    gap: 6,
  },
  saveBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveBtnDisabled: {
    opacity: 0.5,
  },
  cancelEditBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#FFF1F2',
    borderWidth: 1,
    borderColor: '#FECDD3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 4,
  },
  editBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2563EB',
  },
  emptyDottedBox: {
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  emptyAvatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 4,
  },
  emptySub: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: 12,
  },
  warningNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    gap: 6,
    marginBottom: 14,
  },
  warningNoticeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#B45309',
    flex: 1,
    lineHeight: 15,
  },
  addCustomerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563EB',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    gap: 6,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  addCustomerBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  customerOverviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 12,
  },
  customerAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitialText: {
    fontSize: 18,
    fontWeight: '800',
  },
  customerMeta: {
    flex: 1,
  },
  customerNameText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    lineHeight: 20,
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  badge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeGreen: { backgroundColor: '#D1FAE5' },
  badgeTextGreen: { fontSize: 10, fontWeight: '700', color: '#059669' },
  badgeOrange: { backgroundColor: '#FEF3C7' },
  badgeTextOrange: { fontSize: 10, fontWeight: '700', color: '#D97706' },
  badgeBlue: { backgroundColor: '#EFF6FF' },
  badgeTextBlue: { fontSize: 10, fontWeight: '700', color: '#2563EB' },
  badgePurple: { backgroundColor: '#F3E8FF' },
  badgeTextPurple: { fontSize: 10, fontWeight: '700', color: '#7C3AED' },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  actionBtnCall: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: 8,
    gap: 6,
  },
  actionBtnCallText: { fontSize: 12, fontWeight: '700', color: '#059669' },
  actionBtnMail: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: 8,
    gap: 6,
  },
  actionBtnMailText: { fontSize: 12, fontWeight: '700', color: '#2563EB' },
  actionBtnDisabled: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
  },
  actionBtnDisabledText: { fontSize: 12, color: '#94A3B8' },
  detailListContainer: {
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 12,
    gap: 10,
  },
  detailItemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  detailIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  detailTextBox: { flex: 1 },
  detailLabel: { fontSize: 11, color: '#64748B', marginBottom: 1 },
  detailValue: { fontSize: 13, fontWeight: '600', color: '#1E293B', lineHeight: 18 },
  partnerCalloutBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF5FF',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E9D5FF',
    gap: 10,
    marginTop: 2,
  },
  partnerCalloutTitle: { fontSize: 11, color: '#6B21A8' },
  partnerCalloutName: { fontSize: 13, fontWeight: '700', color: '#581C87', marginTop: 1 },

  // ---- Edit Form Styles ----
  editFormContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
    marginBottom: 4,
  },
  editFieldGroup: {
    gap: 4,
  },
  editLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  editFieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  editHintText: {
    fontSize: 11,
    color: '#94A3B8',
    fontStyle: 'italic',
    marginTop: 3,
  },
  editTextInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '500',
  },
  editTextInputDisabled: {
    backgroundColor: '#F1F5F9',
    color: '#64748B',
  },
  editTextAreaInput: {
    height: 64,
    textAlignVertical: 'top',
    paddingTop: 9,
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
  saveFullBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
    paddingVertical: 11,
    borderRadius: 10,
    gap: 6,
    marginTop: 4,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  saveFullBtnDisabled: {
    opacity: 0.6,
  },
  saveFullBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
