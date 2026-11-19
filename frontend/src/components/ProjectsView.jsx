import React, { useState } from 'react';
import { FolderGit2, Plus, ExternalLink, ShieldAlert, Layers, Flame, AlertTriangle } from 'lucide-react';
import { createProject } from '../api';

export default function ProjectsView({ projects, onProjectCreated, onSelectProject }) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [repoUrl, setRepoUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const created = await createProject({
        name: name.trim(),
        description: desc.trim() || undefined,
        repository_url: repoUrl.trim() || undefined
      });
      setName('');
      setDesc('');
      setRepoUrl('');
      setShowCreateModal(false);
      if (onProjectCreated) onProjectCreated(created);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight">Monitored Projects & Workloads</h2>
          <p className="text-xs text-slate-400">Repositories, container images, and microservices tracked by Trivy</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-500 rounded-lg transition"
        >
          <Plus className="w-4 h-4" />
          <span>New Project</span>
        </button>
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects.map((proj) => (
          <div
            key={proj.id}
            className="p-5 bg-slate-900 border border-slate-800 rounded-xl hover:border-slate-700 transition flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-slate-800 rounded-lg text-cyan-400">
                    <FolderGit2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-sm">{proj.name}</h3>
                    <span className="text-[10px] text-slate-400">
                      Added {new Date(proj.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                {proj.repository_url && (
                  <a
                    href={proj.repository_url}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1 text-slate-400 hover:text-white"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </div>

              {proj.description && (
                <p className="mt-3 text-xs text-slate-300 line-clamp-2 leading-relaxed">
                  {proj.description}
                </p>
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3 text-xs">
                <div className="flex items-center gap-1 text-red-400 font-semibold" title="Critical Findings">
                  <Flame className="w-3.5 h-3.5" />
                  <span>{proj.critical_findings || 0}</span>
                </div>
                <div className="flex items-center gap-1 text-orange-400 font-semibold" title="High Findings">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>{proj.high_findings || 0}</span>
                </div>
                <div className="text-slate-400 text-[11px]">
                  Total: <strong className="text-slate-200">{proj.total_findings || 0}</strong>
                </div>
              </div>

              <button
                onClick={() => onSelectProject(proj.id)}
                className="text-xs font-medium text-cyan-400 hover:text-cyan-300"
              >
                View Findings &rarr;
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl">
            <h3 className="font-bold text-white text-base mb-4">Register New Project</h3>
            {error && <div className="p-3 mb-3 bg-red-950/50 border border-red-800 text-red-300 text-xs rounded">{error}</div>}
            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 mb-1 font-medium">Project Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Identity Service"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 text-slate-100 rounded-lg px-3 py-2 focus:ring-1 focus:ring-cyan-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-slate-300 mb-1 font-medium">Description</label>
                <textarea
                  rows={2}
                  placeholder="Service purpose or container context..."
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 text-slate-100 rounded-lg p-2.5 focus:ring-1 focus:ring-cyan-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-slate-300 mb-1 font-medium">Repository / Image URL</label>
                <input
                  type="text"
                  placeholder="https://github.com/my-org/repo"
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 text-slate-100 rounded-lg px-3 py-2 focus:ring-1 focus:ring-cyan-500 focus:outline-none"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold rounded-lg shadow"
                >
                  {loading ? 'Creating...' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
