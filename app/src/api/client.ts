import { API_URL, APP_TOKEN, AI_UPLOAD_TIMEOUT_MS } from '../config';
import type {
  AttemptInput,
  AttemptResponse,
  ChatMessage,
  ChatThread,
  ExamInput,
  ExamResult,
  Facets,
  KarneDraft,
  Overview,
  Profile,
  Question,
  QuestionFilter,
  QuestionPage,
  ReviewResultResponse,
  ReviewsToday,
  WeeklySummary,
} from './types';

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
  const body: unknown = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) throw errorFromBody(res.status, body);
  return body as T;
}

export function questionImageUrl(id: string): string {
  return `${API_URL}/questions/${id}/image`;
}

/**
 * Uploads a JPEG as multipart "image" and waits for the JSON reply. Uses XMLHttpRequest
 * instead of fetch so we can set a long timeout (iOS otherwise gives up after 60s of
 * silence while the model thinks) and report upload progress.
 */
function postImage<T>(path: string, imageUri: string, onUploadProgress?: (fraction: number) => void): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    try {
      assertConfigured();
    } catch (e) {
      reject(e);
      return;
    }
    const form = new FormData();
    // React Native's FormData accepts a { uri, name, type } file descriptor.
    form.append('image', { uri: imageUri, name: 'image.jpg', type: 'image/jpeg' } as unknown as Blob);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_URL}${path}`);
    xhr.setRequestHeader('Authorization', authHeaders.Authorization);
    xhr.timeout = AI_UPLOAD_TIMEOUT_MS;
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
      if (xhr.status >= 200 && xhr.status < 300 && body) resolve(body as T);
      else reject(errorFromBody(xhr.status, body));
    };
    xhr.onerror = () => reject(new ApiError('Sunucuya ulaşılamadı. İnternet bağlantını ve API adresini kontrol et.'));
    xhr.ontimeout = () => reject(new ApiError('İşlem çok uzun sürdü. Tekrar dene.'));
    xhr.send(form);
  });
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
  questions: (filter: QuestionFilter, offset: number) => {
    const params = new URLSearchParams({ offset: String(offset), limit: '30' });
    if (filter.subject) params.set('subject', filter.subject);
    if (filter.topicId) params.set('topicId', filter.topicId);
    return request<QuestionPage>(`/questions?${params.toString()}`);
  },
  facets: () => request<Facets>('/questions/facets'),
  reviewsToday: () => request<ReviewsToday>('/reviews/today'),
  reviewResult: (id: string, input: { result: 'correct' | 'wrong'; viewedSolution: boolean }) =>
    request<ReviewResultResponse>(`/reviews/${encodeURIComponent(id)}/result`, {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  messages: (id: string) => request<ChatThread>(`/questions/${encodeURIComponent(id)}/messages`),
  sendMessage: (id: string, content: string) =>
    request<{ userMessage: ChatMessage; assistantMessage: ChatMessage }>(`/questions/${encodeURIComponent(id)}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    }),

  /** Uploads a question photo and waits for the solution. */
  solve: (imageUri: string, onUploadProgress?: (fraction: number) => void) =>
    postImage<Question>('/solve', imageUri, onUploadProgress),

  exams: () => request<{ items: ExamResult[] }>('/exams'),
  exam: (id: string) => request<ExamResult>(`/exams/${encodeURIComponent(id)}`),
  /** Reads a karne photo into a draft; nothing is saved. */
  parseKarne: (imageUri: string, onUploadProgress?: (fraction: number) => void) =>
    postImage<KarneDraft>('/exams/parse', imageUri, onUploadProgress),
  createExam: (input: ExamInput) =>
    request<{ exam: ExamResult; xpGained: number; profile: Profile }>('/exams', { method: 'POST', body: JSON.stringify(input) }),
  updateExam: (id: string, input: ExamInput) =>
    request<ExamResult>(`/exams/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(input) }),
  deleteExam: (id: string) => request<null>(`/exams/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  overview: () => request<Overview>('/stats/overview'),
  weeklySummary: (refresh = false) => request<WeeklySummary>(`/stats/weekly-summary${refresh ? '?refresh=true' : ''}`),
};
