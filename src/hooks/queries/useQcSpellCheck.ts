import { useQuery } from '@tanstack/react-query';
import { qcSpellCheckService, LocalPickedFile } from '@/services/qcSpellCheckService';
import { queryKeys } from '@/services/queryKeys';
import { isSpreadsheetFile } from '@/utils/spellCheckLink';

export function useSpellCheckSheetsFromUrlQuery(fileUrl?: string, fileName?: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.spellingCheck.sheetsFromUrl(fileUrl, fileName),
    queryFn: async () => {
      const res = await qcSpellCheckService.getSheetsFromUrl(fileUrl as string, fileName);
      if (res.error) {
        throw new Error(res.error);
      }
      return res.data || [];
    },
    enabled: Boolean(fileUrl) && isSpreadsheetFile(fileName || '') && enabled,
  });
}

export function useSpellCheckSheetsFromFileQuery(file?: LocalPickedFile, enabled = true) {
  return useQuery({
    queryKey: queryKeys.spellingCheck.sheetsFromFile(file?.uri, file?.name),
    queryFn: async () => {
      const res = await qcSpellCheckService.getSheetsFromFile(file as LocalPickedFile);
      if (res.error) {
        throw new Error(res.error);
      }
      return res.data || [];
    },
    enabled: Boolean(file?.uri) && isSpreadsheetFile(file?.name || '') && enabled,
  });
}

export function useQcProductInfoQuery(projectId?: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.qc.productInfo(projectId || ''),
    queryFn: async () => {
      const res = await qcSpellCheckService.getProductInfo(projectId as string);
      if (res.error) {
        throw new Error(res.error);
      }
      return res.data || [];
    },
    enabled: Boolean(projectId) && enabled,
  });
}
