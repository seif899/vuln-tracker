const BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

export async function fetchMetrics() {
  const res = await fetch(`${BASE_URL}/metrics/summary`);
  if (!res.ok) throw new Error('Failed to fetch security metrics');
  return res.json();
}

export async function fetchTrends() {
  const res = await fetch(`${BASE_URL}/metrics/trends`);
  if (!res.ok) throw new Error('Failed to fetch security trends');
  return res.json();
}

export async function fetchProjects() {
  const res = await fetch(`${BASE_URL}/projects`);
  if (!res.ok) throw new Error('Failed to fetch projects');
  return res.json();
}

export async function createProject(projectData) {
  const res = await fetch(`${BASE_URL}/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(projectData),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.detail || 'Failed to create project');
  }
  return res.json();
}

export async function fetchFindings(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== '') {
      query.append(key, val);
    }
  });

  const res = await fetch(`${BASE_URL}/findings?${query.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch findings');
  return res.json();
}

export async function fetchFindingDetail(findingId) {
  const res = await fetch(`${BASE_URL}/findings/${findingId}`);
  if (!res.ok) throw new Error(`Failed to fetch finding #${findingId}`);
  return res.json();
}

export async function updateTriage(findingId, triageData) {
  const res = await fetch(`${BASE_URL}/findings/${findingId}/triage`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(triageData),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.detail || 'Failed to update triage status');
  }
  return res.json();
}

export async function bulkTriage(bulkData) {
  const res = await fetch(`${BASE_URL}/findings/bulk-triage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(bulkData),
  });
  if (!res.ok) throw new Error('Failed to apply bulk triage');
  return res.json();
}

export async function uploadTrivyScan(projectId, file) {
  const formData = new FormData();
  formData.append('project_id', projectId);
  formData.append('file', file);

  const res = await fetch(`${BASE_URL}/scans/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.detail || 'Failed to upload and parse Trivy scan');
  }
  return res.json();
}

export function getExportUrl(format = 'csv', filters = {}) {
  const query = new URLSearchParams({ format });
  if (filters.project_id) query.append('project_id', filters.project_id);
  if (filters.status) query.append('status', filters.status);
  if (filters.severity) query.append('severity', filters.severity);
  return `${BASE_URL}/reports/export?${query.toString()}`;
}
