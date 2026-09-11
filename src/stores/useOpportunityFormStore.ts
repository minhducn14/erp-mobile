import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface AttachedFile {
  name: string;
  size?: number;
  uri: string;
  mimeType?: string;
}

export interface SelectedPackage {
  servicePackageId: string;
  name?: string;
  description?: string;
  quantity: number;
  services?: Array<{
    serviceId: string;
    quantity: number;
    sellingPrice?: number;
  }>;
}

export interface SelectedService {
  serviceId: string;
  quantity: number;
}

export interface OpportunityFormData {
  name: string;
  description: string;
  field: string;
  expectedRevenue: number;
  budget: number;
  startDate: string;
  endDate: string;
  durationMonths: number;
  selectedRegions: string[];
  priority: string;
  successChance: number;
  packages: SelectedPackage[];
  services: SelectedService[];
  customerRequirements: string;
  links: string[];
  attachedFiles: AttachedFile[];
}

export const INITIAL_OPPORTUNITY_FORM_DATA: OpportunityFormData = {
  name: '',
  description: '',
  field: '',
  expectedRevenue: 0,
  budget: 0,
  startDate: '',
  endDate: '',
  durationMonths: 1,
  selectedRegions: [], // Mặc định chưa chọn
  priority: 'High',
  successChance: 0, // Mặc định là 0%
  packages: [{ servicePackageId: '', quantity: 1 }],
  services: [{ serviceId: '', quantity: 1 }],
  customerRequirements: '',
  links: ['', '', ''],
  attachedFiles: [],
};

interface OpportunityFormStore {
  formData: OpportunityFormData;
  lastSavedTime: string;
  dateError: string;
  isSubmitting: boolean;

  // Generic Field Updater
  updateField: <K extends keyof OpportunityFormData>(key: K, value: OpportunityFormData[K]) => void;
  updateFormData: (partial: Partial<OpportunityFormData>) => void;
  setDateError: (error: string) => void;
  setIsSubmitting: (submitting: boolean) => void;
  setLastSavedTime: (time: string) => void;

  // Specialized helpers
  toggleRegion: (region: string) => void;
  setRegions: (regions: string[]) => void;
  
  // Packages Actions
  addPackage: () => void;
  removePackage: (index: number) => void;
  selectPackageTemplate: (index: number, template: any) => void;
  setPackageQuantity: (index: number, qty: number) => void;

  // Services Actions
  addService: () => void;
  removeService: (index: number) => void;
  selectServiceItem: (index: number, serviceId: string) => void;
  setServiceQuantity: (index: number, qty: number) => void;

  // Links Actions
  addLink: () => void;
  removeLink: (index: number) => void;
  updateLink: (index: number, value: string) => void;

  // Files Actions
  addAttachedFiles: (files: AttachedFile[]) => void;
  removeAttachedFile: (index: number) => void;

  // Reset / Clear
  resetForm: () => void;
}

export const useOpportunityFormStore = create<OpportunityFormStore>()(
  persist(
    (set) => ({
      formData: { ...INITIAL_OPPORTUNITY_FORM_DATA },
      lastSavedTime: '',
      dateError: '',
      isSubmitting: false,

      updateField: (key, value) =>
        set((state) => ({
          formData: { ...state.formData, [key]: value },
        })),

      updateFormData: (partial) =>
        set((state) => ({
          formData: { ...state.formData, ...partial },
        })),

      setDateError: (dateError) => set({ dateError }),
      setIsSubmitting: (isSubmitting) => set({ isSubmitting }),
      setLastSavedTime: (lastSavedTime) => set({ lastSavedTime }),

      toggleRegion: (region) =>
        set((state) => {
          const current = state.formData.selectedRegions;
          const next = current.includes(region)
            ? current.filter((r) => r !== region)
            : [...current, region];
          return { formData: { ...state.formData, selectedRegions: next } };
        }),

      setRegions: (regions) =>
        set((state) => ({
          formData: { ...state.formData, selectedRegions: regions },
        })),

      addPackage: () =>
        set((state) => ({
          formData: {
            ...state.formData,
            packages: [...state.formData.packages, { servicePackageId: '', quantity: 1 }],
          },
        })),

      removePackage: (index) =>
        set((state) => {
          const filtered = state.formData.packages.filter((_, i) => i !== index);
          return {
            formData: {
              ...state.formData,
              packages: filtered.length > 0 ? filtered : [{ servicePackageId: '', quantity: 1 }],
            },
          };
        }),

      selectPackageTemplate: (index, template) =>
        set((state) => {
          const next = [...state.formData.packages];
          if (!template) {
            next[index] = { servicePackageId: '', quantity: 1 };
          } else {
            const pkgServices = (template.items || []).map((item: any) => ({
              serviceId: item.service?.id || item.serviceId,
              quantity: item.defaultQuantity || 1,
              sellingPrice: item.service?.costPrice || 0,
            }));
            next[index] = {
              servicePackageId: String(template.id),
              name: template.name,
              description: template.description,
              quantity: next[index]?.quantity || 1,
              services: pkgServices,
            };
          }
          return { formData: { ...state.formData, packages: next } };
        }),

      setPackageQuantity: (index, qty) =>
        set((state) => {
          const next = [...state.formData.packages];
          if (next[index]) {
            next[index] = { ...next[index], quantity: qty };
          }
          return { formData: { ...state.formData, packages: next } };
        }),

      addService: () =>
        set((state) => ({
          formData: {
            ...state.formData,
            services: [...state.formData.services, { serviceId: '', quantity: 1 }],
          },
        })),

      removeService: (index) =>
        set((state) => {
          const filtered = state.formData.services.filter((_, i) => i !== index);
          return {
            formData: {
              ...state.formData,
              services: filtered.length > 0 ? filtered : [{ serviceId: '', quantity: 1 }],
            },
          };
        }),

      selectServiceItem: (index, serviceId) =>
        set((state) => {
          const next = [...state.formData.services];
          if (next[index]) {
            next[index] = { ...next[index], serviceId };
          }
          return { formData: { ...state.formData, services: next } };
        }),

      setServiceQuantity: (index, qty) =>
        set((state) => {
          const next = [...state.formData.services];
          if (next[index]) {
            next[index] = { ...next[index], quantity: qty };
          }
          return { formData: { ...state.formData, services: next } };
        }),

      addLink: () =>
        set((state) => ({
          formData: {
            ...state.formData,
            links: [...state.formData.links, ''],
          },
        })),

      removeLink: (index) =>
        set((state) => {
          if (index < 3) return state; // Giữ 3 link mẫu ban đầu
          const filtered = state.formData.links.filter((_, i) => i !== index);
          return {
            formData: {
              ...state.formData,
              links: filtered.length > 0 ? filtered : [''],
            },
          };
        }),

      updateLink: (index, value) =>
        set((state) => {
          const next = [...state.formData.links];
          next[index] = value;
          return { formData: { ...state.formData, links: next } };
        }),

      addAttachedFiles: (files) =>
        set((state) => ({
          formData: {
            ...state.formData,
            attachedFiles: [...state.formData.attachedFiles, ...files],
          },
        })),

      removeAttachedFile: (index) =>
        set((state) => ({
          formData: {
            ...state.formData,
            attachedFiles: state.formData.attachedFiles.filter((_, i) => i !== index),
          },
        })),

      resetForm: () =>
        set({
          formData: { ...INITIAL_OPPORTUNITY_FORM_DATA },
          dateError: '',
          isSubmitting: false,
          lastSavedTime: '',
        }),
    }),
    {
      name: 'erp_opportunity_form_draft',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ formData: state.formData, lastSavedTime: state.lastSavedTime }),
    }
  )
);
