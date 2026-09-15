import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, ActivityIndicator, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import SpellCheckWhitelist from './SpellCheckWhitelist';
import QcProductInfoPanel from './QcProductInfoPanel';
import { useSpellCheckSheetsFromUrlQuery, useSpellCheckSheetsFromFileQuery } from '@/hooks/queries/useQcSpellCheck';
import { LocalPickedFile } from '@/services/qcSpellCheckService';
import { isSpreadsheetFile } from '@/utils/spellCheckLink';

export type ResultCheckSource =
  | { kind: 'file'; file: LocalPickedFile }
  | { kind: 'url'; fileUrl: string; fileName?: string };

interface ResultSheetSelectorPanelProps {
  source?: ResultCheckSource;
  projectId?: string;
  selectedSheets: string[];
  onSelectedSheetsChange: (sheets: string[]) => void;
  whitelist: string[];
  onWhitelistChange: (whitelist: string[]) => void;
}

export default function ResultSheetSelectorPanel({
  source,
  projectId,
  selectedSheets,
  onSelectedSheetsChange,
  whitelist,
  onWhitelistChange,
}: ResultSheetSelectorPanelProps) {
  const [sheetSearch, setSheetSearch] = useState('');
  const [initializedKey, setInitializedKey] = useState<string | null>(null);

  const displayName = source?.kind === 'file' ? source.file.name : source?.fileName || '';
  const hasSheets = isSpreadsheetFile(displayName);
  const currentKey =
    source?.kind === 'file'
      ? `file:${source.file.uri}`
      : source?.kind === 'url'
      ? `url:${source.fileUrl}:${source.fileName || ''}`
      : null;

  const urlQuery = useSpellCheckSheetsFromUrlQuery(
    source?.kind === 'url' ? source.fileUrl : undefined,
    source?.kind === 'url' ? source.fileName : undefined,
    source?.kind === 'url'
  );

  const fileQuery = useSpellCheckSheetsFromFileQuery(
    source?.kind === 'file' ? source.file : undefined,
    source?.kind === 'file'
  );

  const { data: sheets, isFetching: isLoadingSheets, error: sheetsError } =
    source?.kind === 'file' ? fileQuery : urlQuery;

  useEffect(() => {
    if (!currentKey) {
      setInitializedKey(null);
      return;
    }
    if (sheets && initializedKey !== currentKey) {
      onSelectedSheetsChange(sheets);
      setInitializedKey(currentKey);
    }
  }, [sheets, currentKey]);

  const filteredSheets = useMemo(() => {
    if (!sheets) return [];
    const q = sheetSearch.trim().toLowerCase();
    if (!q) return sheets;
    return sheets.filter((name) => name.toLowerCase().includes(q));
  }, [sheets, sheetSearch]);

  const toggleSheet = (name: string) => {
    onSelectedSheetsChange(
      selectedSheets.includes(name) ? selectedSheets.filter((s) => s !== name) : [...selectedSheets, name]
    );
  };

  const toggleSelectAll = () => {
    if (!sheets) return;
    onSelectedSheetsChange(selectedSheets.length === sheets.length ? [] : [...sheets]);
  };

  if (!currentKey) return null;

  if (!hasSheets) {
    return (
      <View className="p-4 bg-background border border-border rounded-2xl">
        <Text className="text-xs text-slate-500">
          File này không hỗ trợ chọn sheet, sẽ được nộp mà không tự động kiểm tra chính tả/QC.
        </Text>
      </View>
    );
  }

  return (
    <View className="p-4 bg-background border border-border rounded-2xl gap-3">
      <View className="flex-row items-center gap-2">
        <Feather name="check-square" size={15} color="#334155" />
        <Text className="text-sm font-bold text-text-primary">Chọn sheet</Text>
      </View>

      <SpellCheckWhitelist whitelist={whitelist} onChange={onWhitelistChange} />
      <QcProductInfoPanel projectId={projectId} />

      {isLoadingSheets && (
        <View className="flex-row items-center gap-2">
          <ActivityIndicator size="small" color="#94A3B8" />
          <Text className="text-xs text-slate-400">Đang đọc danh sách sheet...</Text>
        </View>
      )}

      {!isLoadingSheets && sheetsError && (
        <Text className="text-xs text-danger">Không thể đọc danh sách sheet</Text>
      )}

      {!isLoadingSheets && sheets && sheets.length > 0 && (
        <View className="gap-1.5">
          <View className="flex-row items-center bg-surface border border-border rounded-xl px-3">
            <Feather name="search" size={13} color="#94A3B8" style={{ marginRight: 8 }} />
            <TextInput
              className="flex-1 py-2 text-xs text-text-primary"
              value={sheetSearch}
              onChangeText={setSheetSearch}
              placeholder="Tìm sheet..."
              placeholderTextColor="#94A3B8"
            />
          </View>

          <View className="border border-border rounded-xl bg-surface p-2">
            <TouchableOpacity
              className="flex-row items-center gap-2 pb-1.5 border-b border-slate-100"
              onPress={toggleSelectAll}
              activeOpacity={0.7}
            >
              <View
                className={`w-4 h-4 rounded border items-center justify-center ${
                  selectedSheets.length === sheets.length ? 'bg-primary border-primary' : 'border-slate-300'
                }`}
              >
                {selectedSheets.length === sheets.length && <Feather name="check" size={11} color="#FFFFFF" />}
              </View>
              <Text className="text-xs font-bold text-slate-600">Chọn tất cả ({sheets.length} sheet)</Text>
            </TouchableOpacity>

            {filteredSheets.length === 0 && (
              <Text className="text-xs text-slate-400 py-1">Không tìm thấy sheet phù hợp</Text>
            )}

            <ScrollView style={{ maxHeight: 160 }} nestedScrollEnabled showsVerticalScrollIndicator={false}>
              {filteredSheets.map((name) => {
                const isChecked = selectedSheets.includes(name);
                return (
                  <TouchableOpacity
                    key={name}
                    className="flex-row items-center gap-2 py-1"
                    onPress={() => toggleSheet(name)}
                    activeOpacity={0.7}
                  >
                    <View
                      className={`w-4 h-4 rounded border items-center justify-center ${
                        isChecked ? 'bg-primary border-primary' : 'border-slate-300'
                      }`}
                    >
                      {isChecked && <Feather name="check" size={11} color="#FFFFFF" />}
                    </View>
                    <Text className="text-xs text-text-primary">{name}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      )}

      {!isLoadingSheets && sheets && sheets.length === 0 && (
        <Text className="text-xs text-slate-400">File này không có sheet nào</Text>
      )}
    </View>
  );
}
