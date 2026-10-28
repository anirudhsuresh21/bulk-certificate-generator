import { ITemplate, UploadResponse } from '../types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

class ApiError extends Error {
  status: number;
  details?: any;

  constructor(message: string, status: number, details?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const headers = new Headers(options.headers || {});

  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorData: any = {};
    try {
      errorData = await response.json();
    } catch {
      errorData = { error: response.statusText };
    }
    throw new ApiError(
      errorData.error || `Request failed with status ${response.status}`,
      response.status,
      errorData.details
    );
  }

  // Handle binary response for PDF preview
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/pdf')) {
    const blob = await response.blob();
    return blob as unknown as T;
  }

  return response.json();
}

export const api = {
  // File uploads
  async uploadCertificate(file: File): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    return request<UploadResponse>('/templates/upload', {
      method: 'POST',
      body: formData,
    });
  },

  async uploadSignature(file: File): Promise<{
    message: string;
    assetKey: string;
    originalFileName: string;
    assetUrl: string;
  }> {
    const formData = new FormData();
    formData.append('signature', file);
    return request<{
      message: string;
      assetKey: string;
      originalFileName: string;
      assetUrl: string;
    }>('/templates/signatures/upload', {
      method: 'POST',
      body: formData,
    });
  },

  // Templates CRUD
  async getTemplates(): Promise<{ templates: ITemplate[] }> {
    return request<{ templates: ITemplate[] }>('/templates');
  },

  async getTemplate(id: string): Promise<{ template: ITemplate }> {
    return request<{ template: ITemplate }>(`/templates/${id}`);
  },

  async createTemplate(payload: Partial<ITemplate>): Promise<{
    message: string;
    template: ITemplate;
  }> {
    return request<{ message: string; template: ITemplate }>('/templates', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async updateTemplate(
    id: string,
    payload: Partial<ITemplate>
  ): Promise<{ message: string; template: ITemplate }> {
    return request<{ message: string; template: ITemplate }>(`/templates/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  async duplicateTemplate(id: string): Promise<{
    message: string;
    template: ITemplate;
  }> {
    return request<{ message: string; template: ITemplate }>(
      `/templates/${id}/duplicate`,
      {
        method: 'POST',
      }
    );
  },

  async deleteTemplate(id: string): Promise<{ message: string }> {
    return request<{ message: string }>(`/templates/${id}`, {
      method: 'DELETE',
    });
  },

  async detectNameSection(
    templateId: string
  ): Promise<{ detection: import('../types').DetectedNameSection }> {
    return request<{ detection: import('../types').DetectedNameSection }>(
      `/templates/${templateId}/detect-name`,
      {
        method: 'POST',
      }
    );
  },

  // Certificate generation & preview
  async previewCertificate(
    templateId: string,
    values: Record<string, string>
  ): Promise<Blob> {
    return request<Blob>(`/templates/${templateId}/preview`, {
      method: 'POST',
      body: JSON.stringify({ values }),
    });
  },

  async generateCertificate(
    templateId: string,
    values: Record<string, string>,
    outputFileName?: string
  ): Promise<{
    message: string;
    certificateId: string;
    fileName: string;
    downloadUrl: string;
    warnings?: { missingFields: string[] };
  }> {
    return request<{
      message: string;
      certificateId: string;
      fileName: string;
      downloadUrl: string;
      warnings?: { missingFields: string[] };
    }>(`/templates/${templateId}/generate`, {
      method: 'POST',
      body: JSON.stringify({ values, outputFileName }),
    });
  },

  // Bulk Excel / CSV Generation
  async parseBulkSpreadsheet(
    templateId: string,
    file: File
  ): Promise<{
    message: string;
    fileName: string;
    headers: string[];
    totalRows: number;
    previewRows: Array<Record<string, string>>;
    rows: Array<Record<string, string>>;
    suggestedMapping: Record<string, string>;
  }> {
    const formData = new FormData();
    formData.append('spreadsheet', file);
    return request<{
      message: string;
      fileName: string;
      headers: string[];
      totalRows: number;
      previewRows: Array<Record<string, string>>;
      rows: Array<Record<string, string>>;
      suggestedMapping: Record<string, string>;
    }>(`/templates/${templateId}/bulk-parse`, {
      method: 'POST',
      body: formData,
    });
  },

  async bulkGenerate(
    templateId: string,
    payload: {
      rows: Array<Record<string, string>>;
      columnMapping: Record<string, string>;
      mode: 'combined_pdf' | 'zip_archive';
      baseFileName?: string;
    }
  ): Promise<{
    message: string;
    totalGenerated: number;
    fileName: string;
    mode: 'combined_pdf' | 'zip_archive';
    downloadUrl: string;
  }> {
    return request<{
      message: string;
      totalGenerated: number;
      fileName: string;
      mode: 'combined_pdf' | 'zip_archive';
      downloadUrl: string;
    }>(`/templates/${templateId}/bulk-generate`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async testSmtpConnection(smtpConfig?: {
    host?: string;
    port?: number;
    secure?: boolean;
    user?: string;
    pass?: string;
    from?: string;
  }): Promise<{ success: boolean; message: string; isTestAccount?: boolean }> {
    return request<{ success: boolean; message: string; isTestAccount?: boolean }>(
      '/email/test-connection',
      {
        method: 'POST',
        body: JSON.stringify(smtpConfig || {}),
      }
    );
  },

  async bulkEmail(
    templateId: string,
    payload: {
      rows: Array<Record<string, string>>;
      columnMapping: Record<string, string>;
      emailColumn?: string;
      subjectTemplate?: string;
      bodyTemplate?: string;
      smtpConfig?: {
        host?: string;
        port?: number;
        secure?: boolean;
        user?: string;
        pass?: string;
        from?: string;
      };
    }
  ): Promise<{
    message: string;
    total: number;
    sent: number;
    failed: number;
    results: Array<{
      email: string;
      recipientName: string;
      status: 'sent' | 'failed';
      error?: string;
      messageId?: string;
      previewUrl?: string;
    }>;
  }> {
    return request(
      `/templates/${templateId}/bulk-email`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );
  },

  // Asset URLs
  getTemplateFileUrl(fileKey: string): string {
    return `${API_BASE}/templates/files/${fileKey}`;
  },

  getSignatureFileUrl(assetKey: string): string {
    return `${API_BASE}/templates/signatures/${assetKey}`;
  },

  getDownloadUrl(certificateId: string): string {
    return `${API_BASE}/certificates/${certificateId}/download`;
  },
};
