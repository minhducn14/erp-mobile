import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Linking,
  Alert,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { OpportunityItem } from '@/services/opportunityService';
import { fetchTaxInfo } from '@/utils/tax';
import { isValidEmail, isValidPhone, isValidTaxId } from '@/utils/validators';

interface CustomerInfoCardProps {
  opportunity: OpportunityItem;
  onAddCustomer: () => void;
  onSaveEdit: (data: {
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
    if (editData.phone && !isValidPhone(editData.phone)) {
      Alert.alert('Lỗi', 'Số điện thoại không hợp lệ (Phải từ 8 - 15 chữ số)');
      return;
    }
    if (editData.email && !isValidEmail(editData.email)) {
      Alert.alert('Lỗi', 'Email không hợp lệ (Ví dụ: example@domain.com)');
      return;
    }
    if (editData.taxId && !isValidTaxId(editData.taxId)) {
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
      <View className="bg-surface rounded-2xl p-4 border border-border">
        <View className="flex-row items-center mb-3">
          <View className="w-7 h-7 rounded-lg bg-blue-50 justify-center items-center mr-1.5">
            <Ionicons name="business-outline" size={18} color="#2563EB" />
          </View>
          <Text className="text-[15px] font-bold text-text-primary">Khách hàng & Người liên hệ</Text>
        </View>

        <View className="border-[1.5px] border-slate-300 border-dashed rounded-xl py-5 px-4 items-center bg-background">
          <View className="w-11 h-11 rounded-full bg-slate-100 justify-center items-center mb-2">
            <Feather name="user-plus" size={24} color="#94A3B8" />
          </View>
          <Text className="text-sm font-bold text-slate-700 mb-1">Chưa có thông tin khách hàng</Text>
          <Text className="text-xs text-text-secondary text-center leading-4 mb-3">
            Gán khách hàng hiện hữu trên hệ thống hoặc tạo mới khách hàng tiềm năng cho cơ hội này.
          </Text>

          {opportunity.status === 'PENDING_OPP_APPROVAL' && (
            <View className="flex-row items-center bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5 gap-1.5 mb-3.5">
              <Feather name="alert-circle" size={14} color="#D97706" />
              <Text className="text-[11px] font-semibold text-amber-700 flex-1 leading-3.5">
                Cần thêm thông tin khách hàng để Ban Giám Đốc phê duyệt cơ hội này.
              </Text>
            </View>
          )}

          <TouchableOpacity
            className="flex-row items-center bg-blue-600 py-2.5 px-4 rounded-xl gap-1.5 shadow-sm"
            onPress={onAddCustomer}
            activeOpacity={0.8}
          >
            <Feather name="plus-circle" size={17} color="#FFFFFF" />
            <Text className="text-xs font-bold text-white">Thêm thông tin khách hàng</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ==================== HAS CUSTOMER STATE ====================
  return (
    <View className="bg-surface rounded-2xl p-4 border border-border shadow-xs">
      <View className="flex-row justify-between items-center mb-3.5">
        <View className="flex-row items-center gap-2 flex-1">
          <View className="w-7 h-7 rounded-lg bg-blue-50 justify-center items-center mr-1.5">
            <Ionicons name={isLead ? 'person-outline' : 'business-outline'} size={18} color="#2563EB" />
          </View>
          <Text className="text-[15px] font-bold text-text-primary">Khách hàng & Người liên hệ</Text>
        </View>

        {isEditing ? (
          <View className="flex-row gap-1.5">
            <TouchableOpacity
              className={`w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-300 justify-center items-center ${isSaving ? 'opacity-50' : ''}`}
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
              className="w-8 h-8 rounded-lg bg-rose-50 border border-rose-200 justify-center items-center"
              onPress={() => setIsEditing(false)}
              disabled={isSaving}
              activeOpacity={0.8}
            >
              <Feather name="x" size={14} color="#EF4444" />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            className="flex-row items-center bg-blue-50 px-2.5 py-[5px] rounded-lg gap-1"
            onPress={() => setIsEditing(true)}
            activeOpacity={0.7}
          >
            <Feather name="edit-2" size={13} color="#2563EB" />
            <Text className="text-xs font-semibold text-blue-600">Chỉnh sửa</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Customer Overview Box */}
      {!isEditing && (
        <View className="flex-row items-center mb-3.5 gap-3">
          <View className={`w-[46px] h-[46px] rounded-full justify-center items-center ${isLead ? 'bg-amber-100' : 'bg-blue-50'}`}>
            <Text className={`text-lg font-extrabold ${isLead ? 'text-amber-600' : 'text-blue-600'}`}>
              {customerName.charAt(0).toUpperCase()}
            </Text>
          </View>

          <View className="flex-1">
            <Text className="text-[15px] font-bold text-text-primary leading-5" numberOfLines={2}>
              {customerName}
            </Text>

            <View className="flex-row flex-wrap gap-1.5 mt-1">
              {isLead ? (
                <View className="bg-amber-100 px-[7px] py-0.5 rounded-md">
                  <Text className="text-[10px] font-bold text-amber-600">Khách tiềm năng (Lead)</Text>
                </View>
              ) : (
                <View className="bg-emerald-100 px-[7px] py-0.5 rounded-md">
                  <Text className="text-[10px] font-bold text-emerald-600">Khách hiện hữu</Text>
                </View>
              )}

              <View className={`px-[7px] py-0.5 rounded-md ${isReferral ? 'bg-purple-100' : 'bg-blue-50'}`}>
                <Text className={`text-[10px] font-bold ${isReferral ? 'text-purple-600' : 'text-blue-600'}`}>
                  {isReferral ? 'Đối tác giới thiệu' : 'Trực tiếp'}
                </Text>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* =============== EDIT MODE =============== */}
      {isEditing && (
        <View className="bg-background rounded-xl p-3.5 border border-border gap-3 mb-1">
          <View className="gap-1">
            <Text className="text-xs font-semibold text-slate-700">
              {isLead ? 'Tên khách hàng tiềm năng' : 'Tên khách hàng'}
            </Text>
            <TextInput
              className={`bg-surface border border-slate-300 rounded-lg px-3 py-2 text-sm text-text-primary font-medium ${!isLead ? 'bg-slate-100 text-text-secondary' : ''}`}
              value={editData.name}
              onChangeText={(v) => setEditData({ ...editData, name: v })}
              placeholder="Nhập tên khách hàng"
              placeholderTextColor="#94A3B8"
              editable={isLead}
            />
            {!isLead && (
              <Text className="text-[11px] text-text-muted italic mt-0.5">Tên khách hàng hiện hữu không thể thay đổi tại đây.</Text>
            )}
          </View>

          <View className="gap-1">
            <View className="flex-row items-center justify-between mb-1">
              <Text className="text-xs font-semibold text-slate-700">Mã số thuế</Text>
              {isFetchingTax && (
                <View className="flex-row items-center gap-1">
                  <ActivityIndicator size="small" color="#2563EB" />
                  <Text className="text-[11px] text-blue-600 italic">Đang tra cứu...</Text>
                </View>
              )}
            </View>
            <TextInput
              className="bg-surface border border-slate-300 rounded-lg px-3 py-2 text-sm text-text-primary font-medium"
              value={editData.taxId}
              onChangeText={(v) => setEditData({ ...editData, taxId: v })}
              placeholder="Nhập mã số thuế"
              placeholderTextColor="#94A3B8"
              keyboardType="numeric"
            />
          </View>

          <View className="gap-1">
            <Text className="text-xs font-semibold text-slate-700">Điện thoại</Text>
            <TextInput
              className="bg-surface border border-slate-300 rounded-lg px-3 py-2 text-sm text-text-primary font-medium"
              value={editData.phone}
              onChangeText={(v) => setEditData({ ...editData, phone: v })}
              placeholder="Nhập số điện thoại"
              placeholderTextColor="#94A3B8"
              keyboardType="phone-pad"
            />
          </View>

          <View className="gap-1">
            <Text className="text-xs font-semibold text-slate-700">Email</Text>
            <TextInput
              className="bg-surface border border-slate-300 rounded-lg px-3 py-2 text-sm text-text-primary font-medium"
              value={editData.email}
              onChangeText={(v) => setEditData({ ...editData, email: v })}
              placeholder="Nhập email"
              placeholderTextColor="#94A3B8"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View className="gap-1">
            <Text className="text-xs font-semibold text-slate-700">Địa chỉ</Text>
            <TextInput
              className="bg-surface border border-slate-300 rounded-lg px-3 py-2 text-sm text-text-primary font-medium h-16"
              value={editData.address}
              onChangeText={(v) => setEditData({ ...editData, address: v })}
              placeholder="Nhập địa chỉ"
              placeholderTextColor="#94A3B8"
              multiline
              numberOfLines={2}
              textAlignVertical="top"
            />
          </View>

          <TouchableOpacity
            className={`flex-row items-center justify-center bg-emerald-600 py-2.5 rounded-xl gap-1.5 mt-1 shadow-sm ${isSaving ? 'opacity-60' : ''}`}
            onPress={handleSave}
            disabled={isSaving}
            activeOpacity={0.85}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Feather name="check" size={15} color="#FFFFFF" />
                <Text className="text-sm font-bold text-white">Lưu thay đổi</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* =============== VIEW MODE =============== */}
      {!isEditing && (
        <>
          <View className="flex-row gap-2 mb-3.5">
            {phoneNumber ? (
              <TouchableOpacity
                className="flex-1 flex-row items-center justify-center bg-emerald-50 border border-emerald-300 py-[9px] px-2.5 rounded-lg gap-1.5"
                onPress={() => handleCall(phoneNumber)}
                activeOpacity={0.8}
              >
                <Feather name="phone-call" size={14} color="#059669" />
                <Text className="text-xs font-bold text-emerald-600" numberOfLines={1}>
                  {phoneNumber}
                </Text>
              </TouchableOpacity>
            ) : (
              <View className="flex-1 flex-row items-center justify-center bg-background border border-border py-[9px] px-2.5 rounded-lg gap-1.5">
                <Feather name="phone-off" size={14} color="#94A3B8" />
                <Text className="text-xs text-text-muted">Chưa có SĐT</Text>
              </View>
            )}

            {emailAddress ? (
              <TouchableOpacity
                className="flex-1 flex-row items-center justify-center bg-blue-50 border border-blue-200 py-[9px] px-2.5 rounded-lg gap-1.5"
                onPress={() => handleEmail(emailAddress)}
                activeOpacity={0.8}
              >
                <Feather name="mail" size={14} color="#2563EB" />
                <Text className="text-xs font-bold text-blue-600" numberOfLines={1}>
                  {emailAddress}
                </Text>
              </TouchableOpacity>
            ) : (
              <View className="flex-1 flex-row items-center justify-center bg-background border border-border py-[9px] px-2.5 rounded-lg gap-1.5">
                <Feather name="mail" size={14} color="#94A3B8" />
                <Text className="text-xs text-text-muted">Chưa có Email</Text>
              </View>
            )}
          </View>

          <View className="border-t border-slate-100 pt-3 gap-2.5">
            {taxId ? (
              <View className="flex-row items-start gap-2.5">
                <View className="w-6 h-6 rounded-md bg-background justify-center items-center mt-0.5">
                  <Feather name="hash" size={14} color="#64748B" />
                </View>
                <View className="flex-1">
                  <Text className="text-[11px] text-text-secondary mb-0.5">Mã số thuế</Text>
                  <Text className="text-xs font-semibold text-slate-800 leading-4.5">{taxId}</Text>
                </View>
              </View>
            ) : null}

            {addressText ? (
              <View className="flex-row items-start gap-2.5">
                <View className="w-6 h-6 rounded-md bg-background justify-center items-center mt-0.5">
                  <Feather name="map-pin" size={14} color="#64748B" />
                </View>
                <View className="flex-1">
                  <Text className="text-[11px] text-text-secondary mb-0.5">Địa chỉ</Text>
                  <Text className="text-xs font-semibold text-slate-800 leading-4.5">{addressText}</Text>
                </View>
              </View>
            ) : null}

            {opportunity.referralPartner ? (
              <View className="flex-row items-center bg-purple-50 rounded-xl p-2.5 border border-purple-200 gap-2.5 mt-0.5">
                <Feather name="users" size={15} color="#7C3AED" />
                <View className="flex-1">
                  <Text className="text-[11px] text-purple-800">Đối tác liên kết giới thiệu:</Text>
                  <Text className="text-xs font-bold text-purple-900 mt-0.5">
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
