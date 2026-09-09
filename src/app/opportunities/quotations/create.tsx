import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import {
  quotationService,
  QuotationDetailResponse,
} from '@/services/quotationService';
import { opportunityService, OpportunityItem } from '@/services/opportunityService';
import {
  formatNumber,
  formatNumberInput,
  parseNumberInput,
} from '@/utils/formatters';

interface QuotationFormItem {
  serviceId: string;
  serviceName: string;
  quantity: number;
  costPrice: number;
  minPrice: number;
  recommendedPrice: number;
  customPrice: number;
  selectedPrice: number;
  profitMargin: number;
  packageName: string;
  packageQuantity?: number;
  norm?: number;
  servicePackageId?: string;
  unit?: string;
}

export default function QuotationCreateEditScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ opportunityId: string; quotationId?: string }>();
  const opportunityId = params.opportunityId;
  const quotationId = params.quotationId;
  const isEditMode = !!quotationId;

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [opportunity, setOpportunity] = useState<OpportunityItem | null>(null);
  const [editQuotation, setEditQuotation] = useState<QuotationDetailResponse | null>(null);

  const [items, setItems] = useState<QuotationFormItem[]>([]);
  const [priceType, setPriceType] = useState<'minimum' | 'recommended' | 'custom'>('recommended');
  const [notes, setNotes] = useState('');

  // Expand/collapse state for packages
  const [expandedPackages, setExpandedPackages] = useState<Record<string, boolean>>({});

  // Add Service modal
  const [showAddServiceModal, setShowAddServiceModal] = useState(false);
  const [availableServices, setAvailableServices] = useState<any[]>([]);
  const [serviceSearch, setServiceSearch] = useState('');

  // Add Package modal
  const [showAddPackageModal, setShowAddPackageModal] = useState(false);
  const [packageTemplates, setPackageTemplates] = useState<any[]>([]);
  const [packageSearch, setPackageSearch] = useState('');

  const roundToTenThousands = (value: number) => {
    return Math.ceil(value / 10000) * 10000;
  };

  const calculateProfitMargin = (sellingPrice: number, costPrice: number) => {
    if (!sellingPrice || sellingPrice === 0) return 0;
    return ((sellingPrice - costPrice) / sellingPrice) * 100;
  };

  // Load Initial Data
  const loadData = useCallback(async () => {
    if (!opportunityId) return;
    try {
      setIsLoading(true);
      const [oppRes, allServicesRes, pkgTemplatesRes] = await Promise.all([
        opportunityService.getOpportunity(opportunityId),
        quotationService.getAvailableServices(),
        quotationService.getServicePackages(),
      ]);

      const oppData = (oppRes as any)?.data || oppRes;
      setOpportunity(oppData);

      const rawServices = (allServicesRes as any)?.data || allServicesRes;
      const srvList = Array.isArray(rawServices)
        ? rawServices
        : rawServices?.data || [];
      setAvailableServices(srvList);

      const rawPackages = (pkgTemplatesRes as any)?.data || pkgTemplatesRes;
      setPackageTemplates(Array.isArray(rawPackages) ? rawPackages : rawPackages?.data || []);

      if (isEditMode && quotationId) {
        // Load Edit Quotation
        const quoteRes = await quotationService.getQuotation(quotationId);
        const quoteData: QuotationDetailResponse = (quoteRes as any)?.data || quoteRes;
        setEditQuotation(quoteData);
        setNotes(quoteData.note || '');

        const loadedItems: QuotationFormItem[] = (quoteData.details || []).map((detail) => {
          const costPrice = parseFloat(String(detail.costAtSale || 0));
          const sellingPrice = parseFloat(String(detail.sellingPrice || 0));
          const minPrice = roundToTenThousands(costPrice / 0.8);
          const recommendedPrice = roundToTenThousands(costPrice / 0.6);

          return {
            serviceId: detail.service?.id || detail.serviceId,
            serviceName: detail.service?.name || detail.name || 'Dịch vụ',
            quantity: detail.quantity || 1,
            costPrice,
            minPrice,
            recommendedPrice,
            customPrice: sellingPrice,
            selectedPrice: sellingPrice,
            profitMargin: calculateProfitMargin(sellingPrice, costPrice),
            packageName: detail.packageName || 'STANDALONE',
            packageQuantity: detail.packageQuantity || 1,
            norm: detail.packageQuantity ? (detail.quantity || 1) / detail.packageQuantity : 1,
            servicePackageId: detail.servicePackageId,
            unit: detail.service?.unit || '',
          };
        });

        setItems(loadedItems);
        const expandedMap: Record<string, boolean> = {};
        loadedItems.forEach((item) => {
          if (item.packageName && item.packageName !== 'STANDALONE') {
            expandedMap[item.packageName] = true;
          }
        });
        setExpandedPackages(expandedMap);
        setPriceType('custom'); // Web default for edit mode
      } else {
        // Create Mode: fetch opportunity services
        const servicesRes = await quotationService.getOpportunityServices(opportunityId);
        const servicesData = (servicesRes as any)?.data || (Array.isArray(servicesRes) ? servicesRes : []);

        // Standalone items
        const standaloneItems: QuotationFormItem[] = (servicesData || [])
          .filter((service: any) => !service.opportunityPackageId)
          .map((service: any) => {
            const costPrice = parseFloat(service.service?.costPrice || service.costPrice) || 0;
            const minPrice = roundToTenThousands(costPrice / 0.8);
            const recommendedPrice = roundToTenThousands(costPrice / 0.6);

            return {
              serviceId: service.service?.id || service.serviceId || service.id,
              serviceName: service.service?.name || service.serviceName || service.name || 'Dịch vụ',
              quantity: service.quantity || 1,
              costPrice,
              minPrice,
              recommendedPrice,
              customPrice: recommendedPrice,
              selectedPrice: recommendedPrice,
              profitMargin: calculateProfitMargin(recommendedPrice, costPrice),
              packageName: 'STANDALONE',
              unit: service.service?.unit || service.unit || '',
            };
          });

        // Package items from opportunity packages
        const packageItems: QuotationFormItem[] = (oppData?.packages || []).flatMap((pkg: any) =>
          (pkg.services || []).map((ps: any) => {
            const costPrice = parseFloat(ps.service?.costPrice || ps.sellingPrice) || 0;
            const minPrice = roundToTenThousands(costPrice / 0.8);
            const recommendedPrice = roundToTenThousands(costPrice / 0.6);

            return {
              serviceId: ps.serviceId || ps.id,
              serviceName: ps.service?.name || ps.name || 'Dịch vụ trong gói',
              quantity: ps.quantity || 1,
              costPrice,
              minPrice,
              recommendedPrice,
              customPrice: recommendedPrice,
              selectedPrice: recommendedPrice,
              profitMargin: calculateProfitMargin(recommendedPrice, costPrice),
              packageName: pkg.name || 'Gói dịch vụ',
              packageQuantity: pkg.quantity || 1,
              norm: pkg.quantity ? (ps.quantity || 1) / pkg.quantity : 1,
              servicePackageId: pkg.servicePackageId,
              unit: ps.service?.unit || ps.unit || '',
            };
          })
        );

        setItems([...standaloneItems, ...packageItems]);
        setPriceType('recommended');
      }
    } catch (err: any) {
      console.error('Error loading quotation form data:', err);
      Alert.alert('Lỗi', err?.message || 'Không thể tải dữ liệu tạo báo giá');
    } finally {
      setIsLoading(false);
    }
  }, [opportunityId, quotationId, isEditMode]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle switching price type
  const handlePriceTypeChange = (type: 'minimum' | 'recommended' | 'custom') => {
    setPriceType(type);
    if (type === 'custom') {
      const expandedMap: Record<string, boolean> = {};
      items.forEach((item) => {
        if (item.packageName && item.packageName !== 'STANDALONE') {
          expandedMap[item.packageName] = true;
        }
      });
      setExpandedPackages((prev) => ({ ...prev, ...expandedMap }));
    }
    setItems((prev) =>
      prev.map((item) => {
        let selectedPrice = item.selectedPrice;
        if (type === 'minimum') {
          selectedPrice = item.minPrice;
        } else if (type === 'recommended') {
          selectedPrice = item.recommendedPrice;
        } else {
          selectedPrice = item.customPrice;
        }
        return {
          ...item,
          selectedPrice,
          profitMargin: calculateProfitMargin(selectedPrice, item.costPrice),
        };
      })
    );
  };

  // Handle custom price change for a standalone item
  const handleStandaloneCustomPriceChange = (index: number, valStr: string) => {
    const numValue = parseNumberInput(valStr);
    setItems((prev) =>
      prev.map((item, i) => {
        if (i === index) {
          return {
            ...item,
            customPrice: numValue,
            selectedPrice: priceType === 'custom' ? numValue : item.selectedPrice,
            profitMargin:
              priceType === 'custom'
                ? calculateProfitMargin(numValue, item.costPrice)
                : item.profitMargin,
          };
        }
        return item;
      })
    );
  };

  // Handle custom price change for a PACKAGE (proportional redistribution)
  const handlePackageCustomPriceChange = (packageName: string, valStr: string) => {
    const newTotalCustomPrice = parseNumberInput(valStr);
    const packageItems = items.filter((item) => item.packageName === packageName);
    const currentTotalCustomPrice = packageItems.reduce(
      (sum, item) => sum + item.customPrice * (item.norm || 1),
      0
    );

    if (currentTotalCustomPrice === 0) {
      const share = newTotalCustomPrice / (packageItems.length || 1);
      setItems((prev) =>
        prev.map((item) => {
          if (item.packageName === packageName) {
            const unitShare = share / (item.norm || 1);
            return {
              ...item,
              customPrice: unitShare,
              selectedPrice: priceType === 'custom' ? unitShare : item.selectedPrice,
              profitMargin:
                priceType === 'custom'
                  ? calculateProfitMargin(unitShare, item.costPrice)
                  : item.profitMargin,
            };
          }
          return item;
        })
      );
      return;
    }

    const ratio = newTotalCustomPrice / currentTotalCustomPrice;
    setItems((prev) =>
      prev.map((item) => {
        if (item.packageName === packageName) {
          const newCustomPrice = item.customPrice * ratio;
          return {
            ...item,
            customPrice: newCustomPrice,
            selectedPrice: priceType === 'custom' ? newCustomPrice : item.selectedPrice,
            profitMargin:
              priceType === 'custom'
                ? calculateProfitMargin(newCustomPrice, item.costPrice)
                : item.profitMargin,
          };
        }
        return item;
      })
    );
  };

  // Handle quantity change for package
  const handlePackageQuantityChange = (packageName: string, delta: number) => {
    setItems((prev) => {
      const currentPkg = prev.find((item) => item.packageName === packageName);
      const currentQty = currentPkg?.packageQuantity || 1;
      const newQty = Math.max(1, currentQty + delta);

      return prev.map((item) => {
        if (item.packageName === packageName) {
          return {
            ...item,
            packageQuantity: newQty,
            quantity: (item.norm || 1) * newQty,
          };
        }
        return item;
      });
    });
  };

  // Handle quantity change for standalone item
  const handleStandaloneQuantityChange = (index: number, delta: number) => {
    setItems((prev) =>
      prev.map((item, i) => {
        if (i === index) {
          const newQty = Math.max(1, (item.quantity || 1) + delta);
          return { ...item, quantity: newQty };
        }
        return item;
      })
    );
  };

  // Delete standalone item
  const handleDeleteStandaloneItem = (index: number) => {
    Alert.alert('Xác nhận xóa', 'Bạn có chắc chắn muốn xóa dịch vụ này khỏi báo giá?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: () => {
          setItems((prev) => prev.filter((_, i) => i !== index));
        },
      },
    ]);
  };

  // Delete entire package
  const handleDeletePackage = (packageName: string) => {
    Alert.alert('Xác nhận xóa', `Bạn có chắc chắn muốn xóa toàn bộ gói "${packageName}"?`, [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: () => {
          setItems((prev) => prev.filter((item) => item.packageName !== packageName));
        },
      },
    ]);
  };

  // Add a standalone service from available list
  const handleSelectServiceToAdd = (service: any) => {
    const costPrice = parseFloat(service.costPrice) || 0;
    const minPrice = roundToTenThousands(costPrice / 0.8);
    const recommendedPrice = roundToTenThousands(costPrice / 0.6);
    const initialPrice = priceType === 'minimum' ? minPrice : recommendedPrice;

    const newItem: QuotationFormItem = {
      serviceId: service.id,
      serviceName: service.name,
      quantity: 1,
      costPrice,
      minPrice,
      recommendedPrice,
      customPrice: recommendedPrice,
      selectedPrice: initialPrice,
      profitMargin: calculateProfitMargin(initialPrice, costPrice),
      packageName: 'STANDALONE',
      unit: service.unit || '',
    };

    setItems((prev) => [...prev, newItem]);
    setShowAddServiceModal(false);
  };

  // Add a package template
  const handleSelectPackageToAdd = (template: any) => {
    if (items.some((item) => item.packageName === template.name)) {
      Alert.alert('Thông báo', `Gói "${template.name}" đã có trong báo giá.`);
      return;
    }

    const packageItems: QuotationFormItem[] = (template.items || []).map((ps: any) => {
      const costPrice = parseFloat(ps.service?.costPrice || ps.sellingPrice) || 0;
      const minPrice = roundToTenThousands(costPrice / 0.8);
      const recommendedPrice = roundToTenThousands(costPrice / 0.6);
      const initialPrice = priceType === 'minimum' ? minPrice : recommendedPrice;

      return {
        serviceId: ps.service?.id || ps.serviceId,
        serviceName: ps.service?.name || ps.name || 'Dịch vụ trong gói',
        quantity: ps.defaultQuantity || 1,
        costPrice,
        minPrice,
        recommendedPrice,
        customPrice: recommendedPrice,
        selectedPrice: initialPrice,
        profitMargin: calculateProfitMargin(initialPrice, costPrice),
        packageName: template.name,
        packageQuantity: 1,
        norm: ps.defaultQuantity || 1,
        servicePackageId: template.id,
        unit: ps.service?.unit || ps.unit || '',
      };
    });

    setItems((prev) => [...prev, ...packageItems]);
    setShowAddPackageModal(false);
  };

  // Group items for display
  const displayGroups = useMemo(() => {
    const packages: Record<string, any> = {};
    const standalone: Array<QuotationFormItem & { originalIndex: number }> = [];

    items.forEach((item, index) => {
      const key = item.packageName || 'STANDALONE';
      if (key === 'STANDALONE') {
        standalone.push({ ...item, originalIndex: index });
      } else {
        if (!packages[key]) {
          packages[key] = {
            name: key,
            quantity: item.packageQuantity || 1,
            costPrice: 0,
            minPrice: 0,
            recommendedPrice: 0,
            customPrice: 0,
            selectedPrice: 0,
            items: [],
          };
        }

        const norm = item.norm || 1;
        packages[key].costPrice += (item.costPrice || 0) * norm;
        packages[key].minPrice += (item.minPrice || 0) * norm;
        packages[key].recommendedPrice += (item.recommendedPrice || 0) * norm;
        packages[key].customPrice += (item.customPrice || 0) * norm;
        packages[key].selectedPrice += (item.selectedPrice || 0) * norm;
        packages[key].items.push({ ...item, originalIndex: index });
      }
    });

    return {
      packages: Object.values(packages).map((pkg) => ({
        ...pkg,
        profitMargin: calculateProfitMargin(pkg.selectedPrice, pkg.costPrice),
      })),
      standalone,
    };
  }, [items]);

  // Financial totals calculation
  const totals = useMemo(() => {
    const res = items.reduce(
      (acc, item) => {
        const revenue = (item.selectedPrice || 0) * (item.quantity || 0);
        const cost = (item.costPrice || 0) * (item.quantity || 0);
        const vat = revenue * 0.08;
        return {
          revenue: acc.revenue + revenue,
          cost: acc.cost + cost,
          vat: acc.vat + vat,
          totalWithVat: acc.totalWithVat + revenue + vat,
        };
      },
      { revenue: 0, cost: 0, vat: 0, totalWithVat: 0 }
    );

    const margin = res.revenue > 0 ? ((res.revenue - res.cost) / res.revenue) * 100 : 0;
    return { ...res, margin };
  }, [items]);

  const handleSubmit = async () => {
    if (items.length === 0) {
      Alert.alert('Lỗi', 'Báo giá phải có ít nhất một dịch vụ');
      return;
    }

    try {
      setIsSubmitting(true);
      const submitData: any = {
        opportunityId,
        note: notes,
        details: items.map((item) => ({
          serviceId: item.serviceId,
          quantity: item.quantity,
          sellingPrice: item.selectedPrice,
          costAtSale: item.costPrice,
          name: item.serviceName,
          packageQuantity: item.packageQuantity || 1,
          packageName: item.packageName !== 'STANDALONE' ? item.packageName : undefined,
          servicePackageId: item.servicePackageId,
          isPackageService: item.packageName !== 'STANDALONE',
        })),
      };

      let res: any;
      if (isEditMode && quotationId) {
        if (editQuotation?.status === 'REJECTED') {
          submitData.status = 'DRAFT';
          submitData.description = '';
        }
        res = await quotationService.updateQuotation(quotationId, submitData);
      } else {
        res = await quotationService.createQuotation(submitData);
      }

      if (res?.error) {
        Alert.alert('Lỗi', res.error);
        return;
      }

      Alert.alert(
        'Thành công',
        isEditMode ? 'Cập nhật báo giá thành công' : 'Tạo báo giá thành công',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (err: any) {
      console.error('Error submitting quotation:', err);
      Alert.alert('Lỗi', err?.message || 'Có lỗi xảy ra khi lưu báo giá');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredAvailableServices = useMemo(() => {
    const currentStandaloneIds = new Set(
      items
        .filter((i) => i.packageName === 'STANDALONE')
        .map((i) => String(i.serviceId))
    );
    return availableServices.filter(
      (s) =>
        !currentStandaloneIds.has(String(s.id)) &&
        (serviceSearch.trim() === '' ||
          s.name?.toLowerCase().includes(serviceSearch.toLowerCase()))
    );
  }, [availableServices, items, serviceSearch]);

  const filteredPackageTemplates = useMemo(() => {
    const currentPkgNames = new Set(items.map((i) => i.packageName));
    return packageTemplates.filter(
      (p) =>
        !currentPkgNames.has(p.name) &&
        (packageSearch.trim() === '' ||
          p.name?.toLowerCase().includes(packageSearch.toLowerCase()))
    );
  }, [packageTemplates, items, packageSearch]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Feather name="arrow-left" size={22} color="#1E293B" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {isEditMode ? 'Chỉnh sửa báo giá' : 'Tạo mới báo giá'}
          </Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#059669" />
          <Text style={styles.loadingText}>Đang tải dữ liệu báo giá...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Feather name="arrow-left" size={22} color="#1E293B" />
          </TouchableOpacity>

          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>
              {isEditMode ? 'Chỉnh sửa báo giá' : 'Tạo mới báo giá'}
            </Text>
            <Text style={styles.headerSubtitle} numberOfLines={1}>
              {opportunity?.name || 'Cơ hội kinh doanh'}
            </Text>
          </View>

          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          keyboardShouldPersistTaps="handled"
        >
          {/* Segmented Pricing Mode Selector */}
          <View style={styles.pricingModeSection}>
            <Text style={styles.sectionLabel}>Lựa chọn mức giá áp dụng:</Text>
            <View style={styles.segmentedControl}>
              <TouchableOpacity
                style={[
                  styles.segmentBtn,
                  priceType === 'minimum' && styles.segmentBtnActive,
                ]}
                onPress={() => handlePriceTypeChange('minimum')}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.segmentText,
                    priceType === 'minimum' && styles.segmentTextActive,
                  ]}
                >
                  Giá tối thiểu
                </Text>
                <Text style={styles.segmentSubText}>Cost / 0.8</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.segmentBtn,
                  priceType === 'recommended' && styles.segmentBtnActive,
                ]}
                onPress={() => handlePriceTypeChange('recommended')}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.segmentText,
                    priceType === 'recommended' && styles.segmentTextActive,
                  ]}
                >
                  Giá đề xuất
                </Text>
                <Text style={styles.segmentSubText}>Cost / 0.6</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.segmentBtn,
                  priceType === 'custom' && styles.segmentBtnActive,
                ]}
                onPress={() => handlePriceTypeChange('custom')}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.segmentText,
                    priceType === 'custom' && styles.segmentTextActive,
                  ]}
                >
                  Tùy chỉnh
                </Text>
                <Text style={styles.segmentSubText}>Nhập tay</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Package Services Section */}
          {displayGroups.packages.map((pkg) => {
            const isExpanded = !!expandedPackages[pkg.name];
            return (
              <View key={pkg.name} style={styles.card}>
                <View style={styles.packageCardHeader}>
                  <View style={{ flex: 1 }}>
                    <View style={styles.packageTagRow}>
                      <View style={styles.packageBadge}>
                        <Feather name="package" size={12} color="#2563EB" />
                        <Text style={styles.packageBadgeText}>GÓI DỊCH VỤ</Text>
                      </View>
                      <Text style={styles.packageNameTitle}>{pkg.name}</Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    onPress={() => handleDeletePackage(pkg.name)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Feather name="trash-2" size={18} color="#DC2626" />
                  </TouchableOpacity>
                </View>

                {/* Package Quantity Stepper */}
                <View style={styles.rowItem}>
                  <Text style={styles.itemLabel}>Số lượng gói:</Text>
                  <View style={styles.stepperContainer}>
                    <TouchableOpacity
                      style={styles.stepperBtn}
                      onPress={() => handlePackageQuantityChange(pkg.name, -1)}
                      activeOpacity={0.7}
                    >
                      <Feather name="minus" size={16} color="#334155" />
                    </TouchableOpacity>
                    <Text style={styles.stepperValue}>{formatNumber(pkg.quantity)}</Text>
                    <TouchableOpacity
                      style={styles.stepperBtn}
                      onPress={() => handlePackageQuantityChange(pkg.name, 1)}
                      activeOpacity={0.7}
                    >
                      <Feather name="plus" size={16} color="#334155" />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Package Unit Price */}
                <View style={styles.rowItem}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={styles.itemLabel}>Đơn giá gói (VNĐ):</Text>
                    {priceType === 'custom' && (
                      <View style={styles.lockedTag}>
                        <Feather name="lock" size={11} color="#64748B" />
                        <Text style={styles.lockedTagText}>Khóa</Text>
                      </View>
                    )}
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.fixedPriceText}>
                      {formatNumber(pkg.selectedPrice)} ₫
                    </Text>
                    {priceType === 'custom' && (
                      <Text style={styles.autoSumHintText}>Tự cộng từ dịch vụ con</Text>
                    )}
                  </View>
                </View>

                {/* Total and Margin row */}
                <View style={styles.packageSummaryRow}>
                  <Text style={styles.packageTotalText}>
                    Thành tiền: {formatNumber(pkg.selectedPrice * pkg.quantity)} ₫
                  </Text>
                  <Text
                    style={[
                      styles.marginBadgeSmall,
                      pkg.profitMargin >= 20 ? styles.marginGood : styles.marginWarning,
                    ]}
                  >
                    Margin: {pkg.profitMargin.toFixed(0)}%
                  </Text>
                </View>

                {/* Toggle Accordion Sub-items */}
                <TouchableOpacity
                  style={styles.toggleSubItemsBtn}
                  onPress={() =>
                    setExpandedPackages((prev) => ({
                      ...prev,
                      [pkg.name]: !prev[pkg.name],
                    }))
                  }
                  activeOpacity={0.7}
                >
                  <Text style={styles.toggleSubItemsText}>
                    {isExpanded ? 'Thu gọn dịch vụ con' : `Xem ${pkg.items.length} dịch vụ con`}
                  </Text>
                  <Feather
                    name={isExpanded ? 'chevron-up' : 'chevron-down'}
                    size={16}
                    color="#059669"
                  />
                </TouchableOpacity>

                {isExpanded && (
                  <View style={styles.subItemsContainer}>
                    {pkg.items.map((sub: any, sIdx: number) => (
                      <View key={sub.serviceId || sIdx} style={styles.subItemBox}>
                        <View style={styles.subItemHeaderRow}>
                          <Text style={styles.subItemTitle}>{sub.serviceName}</Text>
                          <Text
                            style={[
                              styles.marginBadgeSmall,
                              sub.profitMargin >= 20 ? styles.marginGood : styles.marginWarning,
                            ]}
                          >
                            Margin: {sub.profitMargin.toFixed(0)}%
                          </Text>
                        </View>
                        <Text style={styles.subItemDesc}>
                          Định mức: {formatNumber(sub.norm)} {sub.unit || 'lần'} / gói | Số lượng tổng: {formatNumber(sub.quantity)}
                        </Text>
                        {priceType === 'custom' ? (
                          <View style={styles.subItemInputRow}>
                            <Text style={styles.subItemCostText}>
                              Giá vốn: {formatNumber(sub.costPrice)} ₫
                            </Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              <Text style={styles.subItemInputLabel}>Đơn giá con:</Text>
                              <TextInput
                                style={styles.subItemPriceInput}
                                keyboardType="numeric"
                                value={formatNumberInput(sub.customPrice)}
                                onChangeText={(val) =>
                                  handleStandaloneCustomPriceChange(sub.originalIndex, val)
                                }
                                placeholder="0"
                                placeholderTextColor="#94A3B8"
                              />
                            </View>
                          </View>
                        ) : (
                          <View style={styles.subItemPriceRow}>
                            <Text style={styles.subItemCostText}>
                              Giá vốn: {formatNumber(sub.costPrice)} ₫
                            </Text>
                            <Text style={styles.subItemPriceText}>
                              Đơn giá con: {formatNumber(sub.selectedPrice)} ₫
                            </Text>
                          </View>
                        )}
                      </View>
                    ))}
                  </View>
                )}
              </View>
            );
          })}

          {/* Standalone Services Section */}
          {displayGroups.standalone.map((item) => (
            <View key={item.originalIndex} style={styles.card}>
              <View style={styles.standaloneCardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.standaloneNameTitle}>{item.serviceName}</Text>
                  <Text style={styles.unitText}>Đơn vị: {item.unit || 'gói'}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => handleDeleteStandaloneItem(item.originalIndex)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Feather name="trash-2" size={18} color="#DC2626" />
                </TouchableOpacity>
              </View>

              {/* Quantity Stepper */}
              <View style={styles.rowItem}>
                <Text style={styles.itemLabel}>Số lượng:</Text>
                <View style={styles.stepperContainer}>
                  <TouchableOpacity
                    style={styles.stepperBtn}
                    onPress={() => handleStandaloneQuantityChange(item.originalIndex, -1)}
                    activeOpacity={0.7}
                  >
                    <Feather name="minus" size={16} color="#334155" />
                  </TouchableOpacity>
                  <Text style={styles.stepperValue}>{formatNumber(item.quantity)}</Text>
                  <TouchableOpacity
                    style={styles.stepperBtn}
                    onPress={() => handleStandaloneQuantityChange(item.originalIndex, 1)}
                    activeOpacity={0.7}
                  >
                    <Feather name="plus" size={16} color="#334155" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Price input */}
              <View style={styles.rowItem}>
                <Text style={styles.itemLabel}>Đơn giá (VNĐ):</Text>
                {priceType === 'custom' ? (
                  <TextInput
                    style={styles.priceInput}
                    keyboardType="numeric"
                    value={formatNumberInput(item.customPrice)}
                    onChangeText={(val) =>
                      handleStandaloneCustomPriceChange(item.originalIndex, val)
                    }
                  />
                ) : (
                  <Text style={styles.fixedPriceText}>
                    {formatNumber(item.selectedPrice)} ₫
                  </Text>
                )}
              </View>

              {/* Standalone Financial info */}
              <View style={styles.standaloneSummaryRow}>
                <Text style={styles.costNoteText}>
                  Giá vốn: {formatNumber(item.costPrice)} ₫
                </Text>
                <Text style={styles.packageTotalText}>
                  Thành tiền: {formatNumber(item.selectedPrice * item.quantity)} ₫
                </Text>
                <Text
                  style={[
                    styles.marginBadgeSmall,
                    item.profitMargin >= 20 ? styles.marginGood : styles.marginWarning,
                  ]}
                >
                  Margin: {item.profitMargin.toFixed(0)}%
                </Text>
              </View>
            </View>
          ))}

          {/* Action Buttons to Add Service / Package */}
          <View style={styles.addButtonsRow}>
            <TouchableOpacity
              style={styles.addServiceBtn}
              onPress={() => setShowAddServiceModal(true)}
              activeOpacity={0.8}
            >
              <Feather name="plus-circle" size={16} color="#059669" />
              <Text style={styles.addServiceText}>Thêm dịch vụ lẻ</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.addPackageBtn}
              onPress={() => setShowAddPackageModal(true)}
              activeOpacity={0.8}
            >
              <Feather name="package" size={16} color="#2563EB" />
              <Text style={styles.addPackageText}>Thêm gói dịch vụ</Text>
            </TouchableOpacity>
          </View>

          {/* Notes Section */}
          <View style={styles.card}>
            <Text style={styles.notesSectionTitle}>Ghi chú báo giá:</Text>
            <TextInput
              style={styles.notesInput}
              placeholder="Nhập ghi chú cho bản báo giá này (điều kiện thanh toán, bảo hành...)..."
              placeholderTextColor="#94A3B8"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              value={notes}
              onChangeText={setNotes}
            />
          </View>

          <View style={{ height: 120 }} />
        </ScrollView>

        {/* Sticky Bottom Financial Summary Bar */}
        <View style={styles.bottomSummaryBar}>
          <View style={styles.summaryTopRow}>
            <View>
              <Text style={styles.summarySubLabel}>
                Tổng trước thuế: <Text style={{ fontWeight: '700' }}>{formatNumber(totals.revenue)} ₫</Text>
              </Text>
              <Text style={styles.summarySubLabel}>
                Thuế VAT (8%): <Text style={{ fontWeight: '700' }}>{formatNumber(totals.vat)} ₫</Text>
              </Text>
            </View>

            <View style={styles.marginTag}>
              <Text style={styles.marginTagText}>
                Margin: {totals.margin.toFixed(0)}%
              </Text>
            </View>
          </View>

          <View style={styles.summaryBottomRow}>
            <View>
              <Text style={styles.summaryTotalLabel}>Tổng thanh toán:</Text>
              <Text style={styles.summaryTotalValue}>
                {formatNumber(totals.totalWithVat)} ₫
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.submitBtn, isSubmitting && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={isSubmitting}
              activeOpacity={0.85}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Feather name="check" size={18} color="#FFFFFF" />
                  <Text style={styles.submitBtnText}>
                    {isEditMode ? 'Cập nhật báo giá' : 'Lưu báo giá'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* Modal: Add Standalone Service */}
      <Modal
        visible={showAddServiceModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowAddServiceModal(false)}
      >
        <View style={styles.pickerModalBackdrop}>
          <View style={styles.pickerModalContent}>
            <View style={styles.pickerModalHeader}>
              <Text style={styles.pickerModalTitle}>Chọn dịch vụ lẻ thêm vào</Text>
              <TouchableOpacity
                onPress={() => setShowAddServiceModal(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Feather name="x" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Search Box */}
            <View style={styles.searchBox}>
              <Feather name="search" size={16} color="#94A3B8" />
              <TextInput
                style={styles.searchInput}
                placeholder="Tìm kiếm dịch vụ..."
                placeholderTextColor="#94A3B8"
                value={serviceSearch}
                onChangeText={setServiceSearch}
              />
            </View>

            <FlatList
              data={filteredAvailableServices}
              keyExtractor={(item) => String(item.id)}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.pickerItemRow}
                  onPress={() => handleSelectServiceToAdd(item)}
                  activeOpacity={0.7}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.pickerItemName}>{item.name}</Text>
                    <Text style={styles.pickerItemSub}>
                      Đơn vị: {item.unit || 'gói'} | Giá vốn:{' '}
                      {formatNumber(item.costPrice || 0)} ₫
                    </Text>
                  </View>
                  <Feather name="plus" size={18} color="#059669" />
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={styles.pickerEmpty}>
                  <Text style={styles.pickerEmptyText}>Không có dịch vụ phù hợp</Text>
                </View>
              }
            />
          </View>
        </View>
      </Modal>

      {/* Modal: Add Service Package Template */}
      <Modal
        visible={showAddPackageModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowAddPackageModal(false)}
      >
        <View style={styles.pickerModalBackdrop}>
          <View style={styles.pickerModalContent}>
            <View style={styles.pickerModalHeader}>
              <Text style={styles.pickerModalTitle}>Chọn gói mẫu thêm vào</Text>
              <TouchableOpacity
                onPress={() => setShowAddPackageModal(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Feather name="x" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Search Box */}
            <View style={styles.searchBox}>
              <Feather name="search" size={16} color="#94A3B8" />
              <TextInput
                style={styles.searchInput}
                placeholder="Tìm kiếm gói dịch vụ..."
                placeholderTextColor="#94A3B8"
                value={packageSearch}
                onChangeText={setPackageSearch}
              />
            </View>

            <FlatList
              data={filteredPackageTemplates}
              keyExtractor={(item) => String(item.id)}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.pickerItemRow}
                  onPress={() => handleSelectPackageToAdd(item)}
                  activeOpacity={0.7}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.pickerItemName}>{item.name}</Text>
                    <Text style={styles.pickerItemSub}>
                      Gồm {(item.items || []).length} dịch vụ con
                    </Text>
                  </View>
                  <Feather name="plus" size={18} color="#2563EB" />
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={styles.pickerEmpty}>
                  <Text style={styles.pickerEmptyText}>Không có gói dịch vụ phù hợp</Text>
                </View>
              }
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  headerTitleContainer: {
    flex: 1,
    marginHorizontal: 12,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#64748B',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  pricingModeSection: {
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 8,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  segmentBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  segmentTextActive: {
    fontWeight: '700',
    color: '#059669',
  },
  segmentSubText: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 2,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  packageCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  packageTagRow: {
    gap: 4,
  },
  packageBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  packageBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#2563EB',
  },
  packageNameTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  standaloneCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  standaloneNameTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  unitText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  rowItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  itemLabel: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '600',
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
  },
  stepperBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  stepperValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    minWidth: 28,
    textAlign: 'center',
  },
  priceInput: {
    borderWidth: 1,
    borderColor: '#059669',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    backgroundColor: '#F0FDF4',
    minWidth: 130,
    textAlign: 'right',
  },
  fixedPriceText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  packageSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  packageTotalText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2563EB',
  },
  marginBadgeSmall: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    fontSize: 11,
    fontWeight: '700',
  },
  marginGood: {
    backgroundColor: '#DCFCE7',
    color: '#15803D',
  },
  marginWarning: {
    backgroundColor: '#FEF3C7',
    color: '#B45309',
  },
  toggleSubItemsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    marginTop: 6,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
  },
  toggleSubItemsText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#059669',
  },
  subItemsContainer: {
    marginTop: 8,
    padding: 8,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    gap: 6,
  },
  subItemBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    padding: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  subItemTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E293B',
  },
  subItemDesc: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  subItemPriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  subItemCostText: {
    fontSize: 11,
    color: '#94A3B8',
  },
  subItemPriceText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0F172A',
  },
  lockedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  lockedTagText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
  },
  autoSumHintText: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '500',
    marginTop: 2,
  },
  subItemHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  subItemInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  subItemInputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  subItemPriceInput: {
    width: 140,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#059669',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'right',
  },
  standaloneSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  costNoteText: {
    fontSize: 11,
    color: '#94A3B8',
  },
  addButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  addServiceBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  addServiceText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#059669',
  },
  addPackageBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  addPackageText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2563EB',
  },
  notesSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 8,
  },
  notesInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    padding: 10,
    fontSize: 13,
    color: '#0F172A',
    minHeight: 70,
  },
  bottomSummaryBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  summaryTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summarySubLabel: {
    fontSize: 11,
    color: '#64748B',
  },
  marginTag: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  marginTagText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#065F46',
  },
  summaryBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryTotalLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  summaryTotalValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#059669',
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#059669',
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 10,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  pickerModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  pickerModalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    maxHeight: '80%',
  },
  pickerModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  pickerModalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
    padding: 0,
  },
  pickerItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  pickerItemName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
  pickerItemSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  pickerEmpty: {
    paddingVertical: 30,
    alignItems: 'center',
  },
  pickerEmptyText: {
    fontSize: 14,
    color: '#94A3B8',
  },
});
