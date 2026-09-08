import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ImageBackground,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import { STORAGE_REMEMBER_KEY } from '@/services/api';
import { privateStorage } from '@/services/secureStorage';

const bg = require('@/assets/images/bg.jpg');

const PRIMARY_COLOR = '#F38820';

export default function LoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const router = useRouter();
  const { login, isAuthenticated } = useAuth();

  // Load saved username and remember status on mount (matching LoginPage.jsx in erp-UI)
  useEffect(() => {
    const loadRememberedUsername = async () => {
      try {
        const savedUsername = await privateStorage.getItem(STORAGE_REMEMBER_KEY);
        if (savedUsername) {
          setUsername(savedUsername);
          setRememberMe(true);
        }
      } catch {}
    };
    loadRememberedUsername();
  }, []);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/');
    }
  }, [isAuthenticated]);

  const handleSubmit = async () => {
    setError('');

    if (!username.trim()) {
      setError('Vui lòng nhập tên tài khoản.');
      return;
    }
    if (!password) {
      setError('Vui lòng nhập mật khẩu.');
      return;
    }

    setIsLoading(true);

    try {
      const result = await login({
        username: username.trim(),
        password,
        rememberMe,
      });

      if (result.error) {
        setError(result.error);
      } else {
        router.replace('/');
      }
    } catch (err: any) {
      setError(err?.message || 'Đăng nhập thất bại. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* Top Brand Banner with original crisp bg.jpg */}
          <View style={styles.bannerContainer}>
            <ImageBackground source={bg} style={styles.bannerBg} resizeMode="cover" />
          </View>

          {/* Clean Edge-to-Edge Sheet */}
          <View style={styles.formContainer}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Đăng nhập hệ thống</Text>
              <Text style={styles.subtitle}>
                Nhập thông tin tài khoản doanh nghiệp của bạn
              </Text>
            </View>

            {/* Error Message */}
            {!!error && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Form */}
            <View style={styles.form}>
              {/* Username Field */}
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Tên tài khoản</Text>
                <View style={styles.inputWrapper}>
                  <View style={styles.iconContainer}>
                    <Feather name="user" size={20} color="#94A3B8" />
                  </View>
                  <TextInput
                    style={styles.input}
                    placeholder="Nhập tên tài khoản"
                    placeholderTextColor="#94A3B8"
                    value={username}
                    onChangeText={(text) => {
                      setUsername(text);
                      if (error) setError('');
                    }}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
              </View>

              {/* Password Field */}
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Mật khẩu</Text>
                <View style={styles.inputWrapper}>
                  <View style={styles.iconContainer}>
                    <Feather name="lock" size={20} color="#94A3B8" />
                  </View>
                  <TextInput
                    style={styles.input}
                    placeholder="••••••••"
                    placeholderTextColor="#94A3B8"
                    value={password}
                    onChangeText={(text) => {
                      setPassword(text);
                      if (error) setError('');
                    }}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity
                    style={styles.eyeBtn}
                    onPress={() => setShowPassword(!showPassword)}
                    activeOpacity={0.7}
                  >
                    <Feather
                      name={showPassword ? 'eye-off' : 'eye'}
                      size={20}
                      color="#94A3B8"
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Checkbox: Remember me */}
              <View style={styles.rememberRow}>
                <TouchableOpacity
                  style={styles.checkboxTouch}
                  onPress={() => setRememberMe(!rememberMe)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                    {rememberMe && <Feather name="check" size={12} color="#FFFFFF" />}
                  </View>
                  <Text style={styles.rememberText}>Ghi nhớ đăng nhập</Text>
                </TouchableOpacity>
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                style={[styles.submitBtn, isLoading && styles.submitBtnDisabled]}
                onPress={handleSubmit}
                disabled={isLoading}
                activeOpacity={0.9}
              >
                {isLoading ? (
                  <View style={styles.btnRow}>
                    <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 8 }} />
                    <Text style={styles.submitBtnText}>Đang đăng nhập...</Text>
                  </View>
                ) : (
                  <Text style={styles.submitBtnText}>Đăng nhập</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* IT Support & Enterprise Trust Section */}
            <View style={styles.bottomSection}>
              {/* IT Support Card */}
              <View style={styles.itSupportCard}>
                <View style={styles.itIconBox}>
                  <Feather name="headphones" size={18} color={PRIMARY_COLOR} />
                </View>
                <View style={styles.itTextBox}>
                  <Text style={styles.itTitle}>Cần hỗ trợ đăng nhập?</Text>
                  <Text style={styles.itDesc}>
                    Quên mật khẩu hoặc sự cố tài khoản? Vui lòng liên hệ Quản trị viên IT nội bộ
                  </Text>
                </View>
              </View>

              {/* Security & Version Footnotes */}
              <View style={styles.trustRow}>
                <Feather name="shield" size={13} color="#10B981" />
                <Text style={styles.trustText}>Bảo mật SSL 256-bit</Text>
                <Text style={styles.trustDivider}>•</Text>
                <Text style={styles.trustText}>Getvini ERP v1.0.0</Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  keyboardView: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    flexGrow: 1,
    backgroundColor: '#FFFFFF',
  },
  bannerContainer: {
    height: 220,
    width: '100%',
  },
  bannerBg: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  formContainer: {
    flex: 1,
    width: '100%',
    marginTop: -28,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 22,
    paddingTop: 26,
    paddingBottom: 36,
  },
  header: {
    alignItems: 'center',
    marginBottom: 22,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.4,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 6,
    textAlign: 'center',
  },
  errorBox: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#B91C1C',
    fontSize: 14,
    lineHeight: 20,
  },
  form: {
    gap: 16,
  },
  fieldGroup: {
    gap: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.2,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    height: 50,
    overflow: 'hidden',
  },
  iconContainer: {
    paddingLeft: 16,
    paddingRight: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    height: '100%',
    paddingHorizontal: 12,
    fontSize: 15,
    color: '#0F172A',
  },
  eyeBtn: {
    paddingHorizontal: 16,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  checkboxTouch: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  checkboxChecked: {
    backgroundColor: PRIMARY_COLOR,
    borderColor: PRIMARY_COLOR,
  },
  rememberText: {
    fontSize: 14,
    color: '#334155',
  },
  submitBtn: {
    backgroundColor: PRIMARY_COLOR,
    height: 50,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    shadowColor: PRIMARY_COLOR,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },

  // Bottom Enterprise & IT Support Section
  bottomSection: {
    marginTop: 24,
  },
  itSupportCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
  },
  itIconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#FFF4EA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itTextBox: {
    flex: 1,
  },
  itTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  itDesc: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
    lineHeight: 16,
  },
  trustRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    gap: 8,
  },
  trustText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  trustDivider: {
    fontSize: 11,
    color: '#CBD5E1',
  },
});
