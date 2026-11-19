import React, { useState, useEffect } from 'react';
import { X, ExternalLink, Calendar, User, FileText, History, Check, AlertOctagon, Shield } from 'lucide-react';
import SeverityBadge from './SeverityBadge';
import StatusBadge from './StatusBadge';
import { fetchFindingDetail, updateTriage } from '../api';

export default function TriageModal({ findingId, onClose, onUpdated }) {
  const [finding, setFinding] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('OPEN');
  const [priority, setPriority] = useState('P2_HIGH');
  const [assignedTo, setAssignedTo] = useState('');
  const [notes, setNotes] = useState('');
  const [changedBy, setChangedBy] = useState('sec-analyst');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!findingId) return;
    setLoading(true);
    fetchFindingDetail(findingId)
      .then((data) => {
        setFinding(data);
        setStatus(data.status);
        setPriority(data.priority);
        setAssignedTo(data.assigned_to || '');
        setNotes(data.triage_notes || '');
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [findingId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const updated = await updateTriage(findingId, {
        status,
        priority,
        assigned_to: assignedTo,
        triage_notes: notes,
        changed_by: changedBy
      });
      setSaving(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
      onUpdated(updated);
      // Refresh local finding details to show latest audit entry
      const refreshed = await fetchFindingDetail(findingId);
      setFinding(refreshed);
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  if (!findingId) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-3xl my-8 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-lg bg-slate-800 text-cyan-400">
              <Shield className="w-5 h-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">
                  {finding ? finding.cve_id : 'Loading finding...'}
                </h2>
                {finding && <SeverityBadge severity={finding.severity} />}
                {finding && <StatusBadge status={finding.status} />}
              </div>
              <p className="text-xs text-slate-400">
                {finding ? `Project: ${finding.project_name} | Finding ID: #${finding.id}` : ''}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-200 text-sm">
          {loading ? (
            <div className="py-12 text-center text-slate-400">Loading finding details...</div>
          ) : error && !finding ? (
            <div className="p-4 bg-red-950/50 border border-red-800 text-red-400 rounded-lg">{error}</div>
          ) : finding ? (
            <>
              {/* Title & Description */}
              <div className="space-y-2">
                <h3 className="font-semibold text-white text-base leading-snug">
                  {finding.title || finding.cve_id}
                </h3>
                {finding.vulnerability?.description && (
                  <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/50 p-3.5 rounded-lg border border-slate-800/80">
                    {finding.vulnerability.description}
                  </p>
                )}
              </div>

              {/* Technical Attributes Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 bg-slate-950/40 rounded-lg border border-slate-800">
                  <span className="text-slate-400 block mb-1">Package</span>
                  <span className="font-mono font-semibold text-cyan-300">{finding.package_name}</span>
                </div>
                <div className="p-3 bg-slate-950/40 rounded-lg border border-slate-800">
                  <span className="text-slate-400 block mb-1">Installed Version</span>
                  <span className="font-mono text-slate-200">{finding.installed_version}</span>
                </div>
                <div className="p-3 bg-slate-950/40 rounded-lg border border-slate-800">
                  <span className="text-slate-400 block mb-1">Fixed Version</span>
                  <span className="font-mono text-emerald-400 font-medium">
                    {finding.fixed_version || 'No fix available yet'}
                  </span>
                </div>
                <div className="p-3 bg-slate-950/40 rounded-lg border border-slate-800">
                  <span className="text-slate-400 block mb-1">CVSS v3 Score</span>
                  <span className="font-mono font-bold text-amber-300">
                    {finding.cvss_score ? `${finding.cvss_score} / 10.0` : 'N/A'}
                  </span>
                </div>
              </div>

              {/* SLA Banner */}
              {finding.sla_due_date && (
                <div
                  className={`flex items-center justify-between p-3 rounded-lg border text-xs ${
                    finding.is_sla_breached
                      ? 'bg-red-950/40 border-red-800/80 text-red-300'
                      : 'bg-slate-950/40 border-slate-800 text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <span>
                      Remediation SLA: <strong>{new Date(finding.sla_due_date).toLocaleDateString()}</strong>
                    </span>
                  </div>
                  {finding.is_sla_breached && (
                    <span className="flex items-center gap-1 font-bold text-red-400">
                      <AlertOctagon className="w-3.5 h-3.5" /> SLA Breached
                    </span>
                  )}
                </div>
              )}

              {/* Advisory Link */}
              {finding.vulnerability?.primary_url && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-400">Security Advisory:</span>
                  <a
                    href={finding.vulnerability.primary_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-cyan-400 hover:text-cyan-300 hover:underline"
                  >
                    <span>{finding.vulnerability.primary_url}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}

              {/* Triage Action Form */}
              <form onSubmit={handleSubmit} className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl space-y-4">
                <h4 className="text-xs uppercase tracking-wider font-semibold text-slate-300 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-cyan-400" />
                  <span>Update Triage & Remediation</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Status</label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-2 focus:ring-1 focus:ring-cyan-500 focus:outline-none"
                    >
                      <option value="OPEN">OPEN</option>
                      <option value="IN_PROGRESS">IN_PROGRESS</option>
                      <option value="MITIGATED">MITIGATED</option>
                      <option value="FALSE_POSITIVE">FALSE_POSITIVE</option>
                      <option value="ACCEPTED_RISK">ACCEPTED_RISK</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Priority</label>
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-2 focus:ring-1 focus:ring-cyan-500 focus:outline-none"
                    >
                      <option value="P1_CRITICAL">P1 - Critical</option>
                      <option value="P2_HIGH">P2 - High</option>
                      <option value="P3_MEDIUM">P3 - Medium</option>
                      <option value="P4_LOW">P4 - Low</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Assignee</label>
                    <div className="relative">
                      <User className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500" />
                      <input
                        type="text"
                        placeholder="e.g. alice@company.com"
                        value={assignedTo}
                        onChange={(e) => setAssignedTo(e.target.value)}
                        className="w-full pl-8 bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-2 focus:ring-1 focus:ring-cyan-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Triage Notes & Remediation Plan
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Document root cause, reason for false positive, ticket reference, or verification details..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg p-2.5 focus:ring-1 focus:ring-cyan-500 focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Analyst Name"
                      value={changedBy}
                      onChange={(e) => setChangedBy(e.target.value)}
                      className="w-36 bg-slate-900 border border-slate-800 text-[11px] text-slate-400 rounded px-2 py-1"
                    />
                    {saveSuccess && (
                      <span className="flex items-center gap-1 text-xs text-emerald-400">
                        <Check className="w-3.5 h-3.5" /> Updated!
                      </span>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={saving}
                    className="px-4 py-2 text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-500 rounded-lg shadow transition disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Apply Triage'}
                  </button>
                </div>
              </form>

              {/* Audit Log Timeline */}
              {finding.audit_logs && finding.audit_logs.length > 0 && (
                <div className="space-y-3 pt-2">
                  <h4 className="text-xs uppercase tracking-wider font-semibold text-slate-400 flex items-center gap-2">
                    <History className="w-4 h-4 text-slate-400" />
                    <span>Triage History & Audit Trail</span>
                  </h4>
                  <div className="space-y-2">
                    {finding.audit_logs.map((log) => (
                      <div
                        key={log.id}
                        className="p-3 bg-slate-950/40 border border-slate-800/80 rounded-lg text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between text-slate-400">
                          <span>
                            Transitioned to <strong className="text-slate-200">{log.new_status}</strong> by{' '}
                            <span className="text-cyan-400">{log.changed_by || 'system'}</span>
                          </span>
                          <span>{new Date(log.created_at).toLocaleString()}</span>
                        </div>
                        {log.notes && <p className="text-slate-300 italic">"{log.notes}"</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
