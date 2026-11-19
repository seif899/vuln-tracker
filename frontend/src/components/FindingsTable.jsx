import React, { useState } from 'react';
import { Search, Filter, Download, ArrowUpDown, ChevronRight, AlertOctagon, CheckSquare, Square } from 'lucide-react';
import SeverityBadge from './SeverityBadge';
import StatusBadge from './StatusBadge';
import { getExportUrl, bulkTriage } from '../api';

export default function FindingsTable({
  findings,
  projects,
  selectedProject,
  setSelectedProject,
  selectedSeverity,
  setSelectedSeverity,
  selectedStatus,
  setSelectedStatus,
  searchTerm,
  setSearchTerm,
  isBreachedOnly,
  setIsBreachedOnly,
  onSelectFinding,
  onFindingsReload
}) {
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkApplying, setBulkApplying] = useState(false);

  const toggleSelectAll = () => {
    if (selectedIds.length === findings.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(findings.map((f) => f.id));
    }
  };

  const toggleSelectOne = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleBulkStatus = async (status) => {
    if (selectedIds.length === 0) return;
    setBulkApplying(true);
    try {
      await bulkTriage({
        finding_ids: selectedIds,
        status,
        triage_notes: `Bulk status update to ${status}`,
        changed_by: 'sec-lead'
      });
      setSelectedIds([]);
      if (onFindingsReload) onFindingsReload();
    } catch (err) {
      alert(`Bulk update failed: ${err.message}`);
    } finally {
      setBulkApplying(false);
    }
  };

  const exportUrl = getExportUrl('csv', {
    project_id: selectedProject,
    severity: selectedSeverity,
    status: selectedStatus
  });

  return (
    <div className="space-y-4">
      {/* Controls & Filters Bar */}
      <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Filter by CVE ID, package, advisory title, or project..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            />
          </div>

          {/* Export Action */}
          <div className="flex items-center gap-2">
            <a
              href={exportUrl}
              download="vulnerability_report.csv"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 hover:text-white rounded-lg transition border border-slate-700/80"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </a>
          </div>
        </div>

        {/* Dropdown Filters */}
        <div className="flex flex-wrap items-center gap-2.5 pt-1 text-xs">
          {/* Project Filter */}
          <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
            <span className="text-slate-400">Project:</span>
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="bg-transparent text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="">All Projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Severity Filter */}
          <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
            <span className="text-slate-400">Severity:</span>
            <select
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value)}
              className="bg-transparent text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="">All Severities</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
            <span className="text-slate-400">Status:</span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-transparent text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="">All Statuses</option>
              <option value="OPEN">Open</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="MITIGATED">Mitigated</option>
              <option value="FALSE_POSITIVE">False Positive</option>
              <option value="ACCEPTED_RISK">Accepted Risk</option>
            </select>
          </div>

          {/* SLA Breached Toggle */}
          <button
            onClick={() => setIsBreachedOnly(!isBreachedOnly)}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg border transition ${
              isBreachedOnly
                ? 'bg-red-950/70 border-red-800 text-red-300'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <AlertOctagon className="w-3.5 h-3.5 text-red-400" />
            <span>SLA Breached Only</span>
          </button>
        </div>
      </div>

      {/* Bulk Action Toolbar */}
      {selectedIds.length > 0 && (
        <div className="flex items-center justify-between p-3 bg-cyan-950/40 border border-cyan-800/80 rounded-xl text-xs text-cyan-200 animate-in fade-in">
          <div className="flex items-center gap-2">
            <span className="font-semibold">{selectedIds.length} findings selected</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-400">Bulk Triage:</span>
            <button
              disabled={bulkApplying}
              onClick={() => handleBulkStatus('IN_PROGRESS')}
              className="px-2.5 py-1 bg-sky-900/60 hover:bg-sky-800 text-sky-200 rounded border border-sky-700 transition"
            >
              In Progress
            </button>
            <button
              disabled={bulkApplying}
              onClick={() => handleBulkStatus('MITIGATED')}
              className="px-2.5 py-1 bg-emerald-900/60 hover:bg-emerald-800 text-emerald-200 rounded border border-emerald-700 transition"
            >
              Mitigated
            </button>
            <button
              disabled={bulkApplying}
              onClick={() => handleBulkStatus('FALSE_POSITIVE')}
              className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded border border-zinc-700 transition"
            >
              False Positive
            </button>
          </div>
        </div>
      )}

      {/* Table Container */}
      <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900/90 shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 font-semibold uppercase tracking-wider text-[11px] border-b border-slate-800">
              <tr>
                <th className="p-3 w-10 text-center">
                  <button onClick={toggleSelectAll} className="text-slate-400 hover:text-white">
                    {findings.length > 0 && selectedIds.length === findings.length ? (
                      <CheckSquare className="w-4 h-4 text-cyan-400" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </th>
                <th className="p-3">Severity / CVE</th>
                <th className="p-3">Package Details</th>
                <th className="p-3">Project</th>
                <th className="p-3">Status</th>
                <th className="p-3">SLA / Assignee</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {findings.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-slate-400">
                    No vulnerability findings matched your search or filter criteria.
                  </td>
                </tr>
              ) : (
                findings.map((f) => {
                  const isSelected = selectedIds.includes(f.id);
                  return (
                    <tr
                      key={f.id}
                      className={`hover:bg-slate-800/50 transition cursor-pointer ${
                        isSelected ? 'bg-cyan-950/20' : ''
                      }`}
                      onClick={() => onSelectFinding(f.id)}
                    >
                      {/* Checkbox */}
                      <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => toggleSelectOne(f.id)}
                          className="text-slate-400 hover:text-white"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-cyan-400" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </td>

                      {/* Severity & CVE */}
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <SeverityBadge severity={f.severity} />
                          <span className="font-mono font-semibold text-white">{f.cve_id}</span>
                          {f.cvss_score && (
                            <span className="text-[10px] text-amber-300 font-bold bg-amber-950/40 border border-amber-800/60 px-1.5 py-0.2 rounded">
                              {f.cvss_score}
                            </span>
                          )}
                        </div>
                        {f.title && (
                          <p className="mt-1 text-[11px] text-slate-400 line-clamp-1 max-w-md">{f.title}</p>
                        )}
                      </td>

                      {/* Package Details */}
                      <td className="p-3">
                        <div className="font-mono text-cyan-300 font-medium">{f.package_name}</div>
                        <div className="text-[11px] text-slate-400">
                          Installed: <span className="text-slate-200">{f.installed_version}</span>
                          {f.fixed_version && (
                            <span className="ml-2 text-emerald-400 font-medium">Fixed: {f.fixed_version}</span>
                          )}
                        </div>
                      </td>

                      {/* Project */}
                      <td className="p-3">
                        <span className="text-slate-300 font-medium">{f.project_name || 'General'}</span>
                      </td>

                      {/* Status */}
                      <td className="p-3">
                        <StatusBadge status={f.status} />
                      </td>

                      {/* SLA & Assignee */}
                      <td className="p-3">
                        <div className="space-y-0.5">
                          {f.is_sla_breached ? (
                            <span className="inline-flex items-center gap-1 font-semibold text-red-400 text-[11px]">
                              <AlertOctagon className="w-3 h-3" /> Breached
                            </span>
                          ) : f.sla_due_date ? (
                            <span className="text-[11px] text-slate-400">
                              Due: {new Date(f.sla_due_date).toLocaleDateString()}
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-500">No SLA</span>
                          )}
                          <div className="text-[10px] text-slate-400">
                            {f.assigned_to ? `@${f.assigned_to}` : 'Unassigned'}
                          </div>
                        </div>
                      </td>

                      {/* Action */}
                      <td className="p-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => onSelectFinding(f.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-cyan-300 bg-cyan-950/60 hover:bg-cyan-900 border border-cyan-800/80 rounded transition"
                        >
                          <span>Triage</span>
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
