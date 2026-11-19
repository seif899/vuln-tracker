import React, { useState } from 'react';
import { X, Upload, CheckCircle2, AlertTriangle, FileCode } from 'lucide-react';
import { uploadTrivyScan, createProject } from '../api';

export default function UploadScanModal({ isOpen, onClose, projects, onScanUploaded, onProjectCreated }) {
  const [selectedProjectId, setSelectedProjectId] = useState(projects[0]?.id || '');
  const [isNewProject, setIsNewProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a Trivy JSON scan file to upload.');
      return;
    }

    setUploading(true);
    setError(null);
    setResult(null);

    try {
      let targetProjectId = selectedProjectId;

      if (isNewProject) {
        if (!newProjectName.trim()) {
          throw new Error('Please enter a project name.');
        }
        const created = await createProject({
          name: newProjectName.trim(),
          description: newProjectDesc.trim() || undefined
        });
        targetProjectId = created.id;
        if (onProjectCreated) onProjectCreated(created);
      }

      const res = await uploadTrivyScan(targetProjectId, file);
      setResult(res);
      setUploading(false);
      if (onScanUploaded) onScanUploaded(res);
    } catch (err) {
      setError(err.message);
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-cyan-950 text-cyan-400 rounded-lg border border-cyan-800/80">
              <Upload className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Ingest Trivy Vulnerability Scan</h2>
              <p className="text-xs text-slate-400">Upload standard Trivy JSON report output</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {result ? (
            <div className="space-y-4 text-center py-4">
              <div className="w-12 h-12 bg-emerald-950 text-emerald-400 border border-emerald-800 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-semibold text-white">Scan Ingested Successfully!</h3>
              <p className="text-xs text-slate-300 max-w-sm mx-auto">{result.message}</p>

              {result.severity_breakdown && (
                <div className="grid grid-cols-4 gap-2 pt-2 text-xs">
                  <div className="p-2 bg-red-950/40 border border-red-800/60 rounded">
                    <span className="block text-red-400 font-bold">{result.severity_breakdown.CRITICAL || 0}</span>
                    <span className="text-[10px] text-slate-400">Critical</span>
                  </div>
                  <div className="p-2 bg-orange-950/40 border border-orange-800/60 rounded">
                    <span className="block text-orange-400 font-bold">{result.severity_breakdown.HIGH || 0}</span>
                    <span className="text-[10px] text-slate-400">High</span>
                  </div>
                  <div className="p-2 bg-amber-950/40 border border-amber-800/60 rounded">
                    <span className="block text-amber-400 font-bold">{result.severity_breakdown.MEDIUM || 0}</span>
                    <span className="text-[10px] text-slate-400">Medium</span>
                  </div>
                  <div className="p-2 bg-blue-950/40 border border-blue-800/60 rounded">
                    <span className="block text-blue-400 font-bold">{result.severity_breakdown.LOW || 0}</span>
                    <span className="text-[10px] text-slate-400">Low</span>
                  </div>
                </div>
              )}

              <div className="pt-4 flex justify-center gap-3">
                <button
                  onClick={() => {
                    setResult(null);
                    setFile(null);
                  }}
                  className="px-4 py-2 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg transition"
                >
                  Upload Another
                </button>
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-500 rounded-lg transition"
                >
                  View Findings
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleUpload} className="space-y-4 text-xs">
              {error && (
                <div className="p-3 bg-red-950/50 border border-red-800 text-red-300 rounded-lg flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Project Selection */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-medium text-slate-300">Target Project</label>
                  <button
                    type="button"
                    onClick={() => setIsNewProject(!isNewProject)}
                    className="text-cyan-400 hover:underline text-[11px]"
                  >
                    {isNewProject ? 'Choose existing project' : '+ Create new project'}
                  </button>
                </div>

                {isNewProject ? (
                  <div className="space-y-2 mt-1">
                    <input
                      type="text"
                      placeholder="Project Name (e.g. Payments Microservice)"
                      value={newProjectName}
                      onChange={(e) => setNewProjectName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 text-slate-100 rounded-lg px-3 py-2 focus:ring-1 focus:ring-cyan-500 focus:outline-none"
                    />
                    <input
                      type="text"
                      placeholder="Description (optional)"
                      value={newProjectDesc}
                      onChange={(e) => setNewProjectDesc(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 text-slate-100 rounded-lg px-3 py-2 focus:ring-1 focus:ring-cyan-500 focus:outline-none"
                    />
                  </div>
                ) : (
                  <select
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 text-slate-100 rounded-lg px-3 py-2 focus:ring-1 focus:ring-cyan-500 focus:outline-none"
                  >
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* File Input */}
              <div>
                <label className="block font-medium text-slate-300 mb-1">Trivy JSON Report File</label>
                <div className="border-2 border-dashed border-slate-700 hover:border-cyan-500 rounded-xl p-4 text-center cursor-pointer transition bg-slate-950/40">
                  <input
                    type="file"
                    accept=".json,application/json"
                    onChange={handleFileChange}
                    className="hidden"
                    id="trivy-upload-input"
                  />
                  <label htmlFor="trivy-upload-input" className="cursor-pointer block">
                    <FileCode className="w-8 h-8 text-cyan-400 mx-auto mb-2" />
                    {file ? (
                      <span className="font-semibold text-cyan-300">{file.name}</span>
                    ) : (
                      <span className="text-slate-400">
                        Click or drag & drop a <strong className="text-slate-200">.json</strong> file
                      </span>
                    )}
                    <span className="block text-[10px] text-slate-500 mt-1">
                      Generated via: <code className="bg-slate-900 px-1 py-0.5 rounded">trivy image -f json -o scan.json &lt;image&gt;</code>
                    </span>
                  </label>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading || !file}
                  className="px-5 py-2 font-semibold text-white bg-cyan-600 hover:bg-cyan-500 rounded-lg shadow transition disabled:opacity-50"
                >
                  {uploading ? 'Parsing Scan...' : 'Ingest Findings'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
