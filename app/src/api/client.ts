import { API_URL, APP_TOKEN, SOLVE_TIMEOUT_MS } from '../config';
import type { AttemptInput, AttemptResponse, Profile, Question } from './types';

/** Error whose message is ready to show to the user (Turkish). */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
  }
}

export const authHeaders = { Authorization: `Bearer ${APP_TOKEN}` };

function assertConfigured() {
  if (!API_URL || !APP_TOKEN) {
    throw new ApiError('API ayarları eksik: app/.env içindeki EXPO_PUBLIC_API_URL ve EXPO_PUBLIC_APP_TOKEN değerlerini doldur.');
  }
}

function errorFromBody(status: number, body: unknown): ApiError {
  const message =
    body && typeof body === 'object' && 'error' in body && typeof body.error === 'string'
      ? body.error
      : `Sunucu hatası (${status}).`;
  return new ApiError(message, status);
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  assertConfigured();
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: { ...authHeaders, ...(init.body ? { 'Content-Type': 'application/json' } : {}), ...init.headers },
    });
  } catch {
    throw new ApiError('Sunucuya ulaşılamadı. İnternet bağlantını ve API adresini kontrol et.');
  }
  const body: unknown = await res.json().catch(() => null);
  if (!res.ok) throw errorFromBody(res.status, body);
  return body as T;
}

export function questionImageUrl(id: string): string {
  return `${API_URL}/questions/${id}/image`;
}

export const api = {
  health: () => request<{ ok: boolean }>('/health'),
  profile: () => request<Profile>('/profile'),
  question: (id: string) => request<Question>(`/questions/${encodeURIComponent(id)}`),
  attempt: (id: string, input: AttemptInput) =>
    request<AttemptResponse>(`/questions/${encodeURIComponent(id)}/attempt`, {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  /**
   * Uploads a JPEG and waits for the solution. Uses XMLHttpRequest instead of fetch so
   * we can set a long timeout (iOS otherwise gives up after 60s of silence) and report
   * upload progress.
   */
  solve: (imageUri: string, onUploadProgress?: (fraction: number) => void) =>
    new Promise<Question>((resolve, reject) => {
      try {
        assertConfigured();
      } catch (e) {
        reject(e);
        return;
      }
      const form = new FormData();
      // React Native's FormData accepts a { uri, name, type } file descriptor.
      form.append('image', { uri: imageUri, name: 'question.jpg', type: 'image/jpeg' } as unknown as Blob);

      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${API_URL}/solve`);
      xhr.setRequestHeader('Authorization', authHeaders.Authorization);
      xhr.timeout = SOLVE_TIMEOUT_MS;
      xhr.responseType = 'text';
      if (onUploadProgress) {
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable && e.total > 0) onUploadProgress(e.loaded / e.total);
        };
        xhr.upload.onload = () => onUploadProgress(1);
      }
      xhr.onload = () => {
        let body: unknown = null;
        try {
          body = JSON.parse(xhr.responseText);
        } catch {
          // fall through with null body
        }
        if (xhr.status >= 200 && xhr.status < 300 && body) resolve(body as Question);
        else reject(errorFromBody(xhr.status, body));
      };
      xhr.onerror = () => reject(new ApiError('Sunucuya ulaşılamadı. İnternet bağlantını ve API adresini kontrol et.'));
      xhr.ontimeout = () => reject(new ApiError('Çözüm çok uzun sürdü. Tekrar dene.'));
      xhr.send(form);
    }),
};
