import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldAlert,
  Flame,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Layers,
  AlertOctagon,
  Sparkles
} from 'lucide-react';

import Navbar from './components/Navbar';
import MetricCard from './components/MetricCard';
import FindingsTable from './components/FindingsTable';
import ProjectsView from './components/ProjectsView';
import TriageModal from './components/TriageModal';
import UploadScanModal from './components/UploadScanModal';
import { fetchMetrics, fetchFindings, fetchProjects } from './api';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [metrics, setMetrics] = useState(null);
  const [findings, setFindings] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filters
  const [selectedProject, setSelectedProject] = useState('');
  const [selectedSeverity, setSelectedSeverity] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isBreachedOnly, setIsBreachedOnly] = useState(false);

  // Modals
  const [triageFindingId, setTriageFindingId] = useState(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  const loadAllData = useCallback(async () => {
    try {
      const [m, p] = await Promise.all([fetchMetrics(), fetchProjects()]);
      setMetrics(m);
      setProjects(p);
    } catch (err) {
      console.error('Failed to load initial metrics/projects:', err);
    }
  }, []);

  const loadFindings = useCallback(async () => {
    try {
      const data = await fetchFindings({
        project_id: selectedProject || undefined,
        severity: selectedSeverity || undefined,
        status: selectedStatus || undefined,
        search: searchTerm || undefined,
        is_breached: isBreachedOnly ? true : undefined,
      });
      setFindings(data);
    } catch (err) {
      console.error('Failed to load findings:', err);
    }
  }, [selectedProject, selectedSeverity, selectedStatus, searchTerm, isBreachedOnly]);

  useEffect(() => {
    setLoading(true);
    Promise.all([loadAllData(), loadFindings()]).finally(() => setLoading(false));
  }, [loadAllData, loadFindings]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([loadAllData(), loadFindings()]);
    setIsRefreshing(false);
  };

  const handleProjectSelected = (projId) => {
    setSelectedProject(projId);
    setActiveTab('dashboard');
  };

  return (
    <div className="min-h-screen bg-[#0b1120] text-slate-100 flex flex-col font-sans">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenUpload={() => setIsUploadOpen(true)}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* KPI Metric Cards */}
        {metrics && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
            <MetricCard
              title="Total Findings"
              value={metrics.total_findings}
              subtitle={`${metrics.total_scans} scans across ${metrics.total_projects} projects`}
              icon={Layers}
              color="cyan"
            />
            <MetricCard
              title="Critical"
              value={metrics.by_severity?.CRITICAL || 0}
              subtitle="P1 - 7-day SLA"
              icon={Flame}
              color="red"
            />
            <MetricCard
              title="High"
              value={metrics.by_severity?.HIGH || 0}
              subtitle="P2 - 14-day SLA"
              icon={AlertTriangle}
              color="orange"
            />
            <MetricCard
              title="Active / Open"
              value={metrics.open_findings}
              subtitle="Require triage action"
              icon={Clock}
              color="amber"
            />
            <MetricCard
              title="Remediated"
              value={metrics.remediated_findings}
              subtitle="Verified resolved"
              icon={CheckCircle2}
              color="emerald"
            />
            <MetricCard
              title="SLA Breached"
              value={metrics.sla_breached_findings}
              subtitle="Overdue for resolution"
              icon={AlertOctagon}
              color="red"
              alert={metrics.sla_breached_findings > 0}
            />
          </div>
        )}

        {/* Tab Content */}
        {activeTab === 'dashboard' ? (
          <FindingsTable
            findings={findings}
            projects={projects}
            selectedProject={selectedProject}
            setSelectedProject={setSelectedProject}
            selectedSeverity={selectedSeverity}
            setSelectedSeverity={setSelectedSeverity}
            selectedStatus={selectedStatus}
            setSelectedStatus={setSelectedStatus}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            isBreachedOnly={isBreachedOnly}
            setIsBreachedOnly={setIsBreachedOnly}
            onSelectFinding={(id) => setTriageFindingId(id)}
            onFindingsReload={() => {
              loadFindings();
              loadAllData();
            }}
          />
        ) : (
          <ProjectsView
            projects={projects}
            onProjectCreated={() => {
              loadAllData();
            }}
            onSelectProject={handleProjectSelected}
          />
        )}
      </main>

      {/* Triage Detail Modal */}
      {triageFindingId && (
        <TriageModal
          findingId={triageFindingId}
          onClose={() => setTriageFindingId(null)}
          onUpdated={() => {
            loadFindings();
            loadAllData();
          }}
        />
      )}

      {/* Upload Scan Modal */}
      <UploadScanModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        projects={projects}
        onScanUploaded={() => {
          loadAllData();
          loadFindings();
        }}
        onProjectCreated={() => {
          loadAllData();
        }}
      />
    </div>
  );
}
