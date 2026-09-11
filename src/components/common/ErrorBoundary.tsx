import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, TouchableOpacity, SafeAreaView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary caught exception]:', error, errorInfo);
  }

  private handleRetry = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <SafeAreaView className="flex-1 bg-slate-900 justify-center items-center p-6">
          <View className="w-full max-w-sm bg-slate-800 border border-slate-700 rounded-2xl p-6 items-center shadow-xl">
            <View className="w-14 h-14 rounded-full bg-red-500/10 justify-center items-center mb-4 border border-red-500/20">
              <Feather name="alert-triangle" size={28} color="#EF4444" />
            </View>

            <Text className="text-lg font-bold text-white text-center mb-2">
              Đã xảy ra lỗi không mong muốn
            </Text>

            <Text className="text-xs text-slate-400 text-center mb-6 leading-5">
              Rất tiếc, ứng dụng gặp sự cố hệ thống. Bạn có thể bấm nút bên dưới để thử lại hoặc khởi động lại ứng dụng.
            </Text>

            {__DEV__ && this.state.error && (
              <View className="w-full bg-slate-950 p-3 rounded-lg border border-slate-800 mb-6 max-h-32">
                <Text className="text-[11px] font-mono text-red-400" numberOfLines={4}>
                  {this.state.error.toString()}
                </Text>
              </View>
            )}

            <TouchableOpacity
              className="w-full bg-blue-600 active:bg-blue-700 py-3.5 rounded-xl flex-row items-center justify-center gap-2 shadow-sm"
              onPress={this.handleRetry}
              activeOpacity={0.8}
            >
              <Feather name="refresh-cw" size={16} color="#FFFFFF" />
              <Text className="text-sm font-bold text-white">Thử lại ngay</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      );
    }

    return this.props.children;
  }
}
