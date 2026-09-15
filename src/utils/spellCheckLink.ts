const SHEET_EXTENSIONS = ['xlsx', 'xlsm'];

export const getFileExtension = (name: string = ''): string => {
  return name.split('.').pop()?.toLowerCase() || '';
};

export const isSpreadsheetFile = (name: string = ''): boolean => {
  return SHEET_EXTENSIONS.includes(getFileExtension(name));
};

export const getFileNameFromUrl = (url: string): string => {
  try {
    const pathname = new URL(url).pathname;
    const name = pathname.split('/').filter(Boolean).pop();
    return name || 'result-file';
  } catch {
    return 'result-file';
  }
};

export const resolveSpellCheckLinkSource = (rawUrl: string): { url: string; fileName: string } => {
  try {
    const parsed = new URL(rawUrl);
    const sheetsMatch = parsed.pathname.match(/\/spreadsheets\/d\/([^/]+)/);
    if (parsed.hostname.includes('docs.google.com') && sheetsMatch) {
      const fileId = sheetsMatch[1];
      const exportUrl = `https://docs.google.com/spreadsheets/d/${fileId}/export?format=xlsx`;
      return { url: exportUrl, fileName: `google-sheet-${fileId}.xlsx` };
    }
    return { url: rawUrl, fileName: getFileNameFromUrl(rawUrl) };
  } catch {
    return { url: rawUrl, fileName: getFileNameFromUrl(rawUrl) };
  }
};
