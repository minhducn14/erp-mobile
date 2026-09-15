import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput } from 'react-native';
import { Feather } from '@expo/vector-icons';

interface SpellCheckWhitelistProps {
  whitelist: string[];
  onChange: (whitelist: string[]) => void;
  disabled?: boolean;
}

export default function SpellCheckWhitelist({ whitelist, onChange, disabled }: SpellCheckWhitelistProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');

  const addWord = () => {
    const value = input.trim();
    if (!value) return;
    if (!whitelist.includes(value)) onChange([...whitelist, value]);
    setInput('');
  };

  const removeWord = (word: string) => {
    onChange(whitelist.filter((w) => w !== word));
  };

  return (
    <View className="gap-1.5">
      <TouchableOpacity
        className="flex-row items-center gap-1.5"
        disabled={disabled}
        onPress={() => setIsOpen((prev) => !prev)}
        activeOpacity={0.7}
      >
        <Feather name="list" size={13} color="#475569" />
        <Text className="text-xs font-bold text-slate-600">
          Whitelist{whitelist.length > 0 ? ` (${whitelist.length})` : ''}
        </Text>
        <Feather name={isOpen ? 'chevron-up' : 'chevron-down'} size={13} color="#475569" />
      </TouchableOpacity>

      {isOpen && (
        <View className="p-2 border border-border rounded-xl bg-surface gap-2">
          <View className="flex-row flex-wrap gap-1.5">
            {whitelist.map((word) => (
              <View
                key={word}
                className="flex-row items-center gap-1 pl-2 pr-1 py-1 bg-slate-100 rounded-full"
              >
                <Text className="text-xs font-medium text-slate-700">{word}</Text>
                <TouchableOpacity
                  disabled={disabled}
                  onPress={() => removeWord(word)}
                  className="w-4 h-4 items-center justify-center rounded-full bg-slate-200"
                >
                  <Feather name="x" size={9} color="#475569" />
                </TouchableOpacity>
              </View>
            ))}
            {whitelist.length === 0 && (
              <Text className="text-xs text-slate-400">Chưa có từ nào trong whitelist</Text>
            )}
          </View>

          <TextInput
            className="px-2 py-2 text-xs border border-border rounded-lg text-text-primary"
            value={input}
            onChangeText={setInput}
            onSubmitEditing={addWord}
            editable={!disabled}
            placeholder="Nhập từ rồi nhấn Enter..."
            placeholderTextColor="#94A3B8"
            returnKeyType="done"
          />
        </View>
      )}
    </View>
  );
}
