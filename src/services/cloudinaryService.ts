import { apiService } from './api';

export interface CloudinaryFile {
  type: string;
  name: string;
  url: string;
  publicId?: string;
  size?: number;
  format?: string;
  resource_type?: string;
}

export interface PickedFile {
  uri: string;
  name: string;
  mimeType?: string;
  size?: number;
}

/**
 * Upload a file directly to Cloudinary from React Native using a signature from our backend
 */
export const uploadToCloudinary = async (
  file: PickedFile,
  folder: string = 'GETVINI/ERP/others',
  onProgress?: (progressPercent: number) => void
): Promise<CloudinaryFile> => {
  // 1. Get signature from backend
  const res = await apiService.get<{
    signature: string;
    timestamp: number;
    cloud_name: string;
    api_key: string;
    folder: string;
  }>(`/cloudinary/signature?folder=${encodeURIComponent(folder)}`);

  if (res.error || !res.data) {
    throw new Error(res.error || 'Không thể lấy chữ ký xác thực tải lên từ hệ thống');
  }

  const { signature, timestamp, cloud_name, api_key, folder: signedFolder } = res.data;

  // 2. Build FormData for Cloudinary
  const formData = new FormData();
  formData.append('file', {
    uri: file.uri,
    name: file.name,
    type: file.mimeType || 'application/octet-stream',
  } as any);
  formData.append('signature', signature);
  formData.append('timestamp', String(timestamp));
  formData.append('api_key', api_key);
  formData.append('folder', signedFolder || folder);

  // 3. Upload via XMLHttpRequest to capture progress
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${cloud_name}/auto/upload`);

    if (xhr.upload && onProgress) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable && event.total > 0) {
          const percent = Math.round((event.loaded / event.total) * 100);
          onProgress(percent);
        }
      };
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const result = JSON.parse(xhr.responseText);
          if (onProgress) onProgress(100);
          resolve({
            type: 'FILE',
            name: file.name,
            url: result.secure_url,
            publicId: result.public_id,
            size: result.bytes || file.size,
            format: result.format,
            resource_type: result.resource_type,
          });
        } catch {
          reject(new Error('Phản hồi từ máy chủ tải lên không hợp lệ'));
        }
      } else {
        try {
          const errorData = JSON.parse(xhr.responseText);
          reject(new Error(errorData?.error?.message || 'Tải file lên máy chủ thất bại'));
        } catch {
          reject(new Error(`Tải file lên máy chủ thất bại (mã ${xhr.status})`));
        }
      }
    };

    xhr.onerror = () => {
      reject(new Error('Lỗi kết nối mạng khi tải tệp lên Cloudinary'));
    };

    xhr.send(formData);
  });
};
