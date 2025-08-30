import React, { useState } from 'react';
import { 
  GitBranch, 
  Play, 
  Pause, 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  Search,
  Filter,
  Plus
} from 'lucide-react';
import type { Workflow } from '@/types';

// Données mockées
const mockWorkflows: Workflow[] = [
  {
    id: '1756582632741',
    name: 'Development Cycle - MCP Monitoring Dashboard',
    type: 'development-cycle',
    status: 'active',
    description: 'Développement complet du dashboard de monitoring MCP',
    projectName: 'MCP-Monitoring-Dashboard',
    startTime: '2025-08-30T19:37:12Z',
    currentStep: 2,
    totalSteps: 5,
    progress: 40,
    assignedAgents: ['designer', 'developer', 'qa'],
    tasks: [],
    metadata: {
      repository: 'https://github.com/user/mcp-monitoring',
      branch: 'feature/dashboard',
      priority: 'high'
    }
  },
  {
    id: '1756580365351',
    name: 'Bug Fix - Calculator Clear Button',
    type: 'bug-fix',
    status: 'active',
    description: 'Correction du conflit onclick sur le bouton clear',
    projectName: 'Calculator-App',
    startTime: '2025-08-30T18:30:00Z',
    currentStep: 3,
    totalSteps: 4,
    progress: 75,
    assignedAgents: ['qa', 'developer'],
    tasks: [],
    metadata: {
      repository: 'https://github.com/user/calculator',
      branch: 'bugfix/clear-button',
      priority: 'medium'
    }
  },
  {
    id: '1756575000000',
    name: 'Feature Request - User Authentication',
    type: 'feature-request',
    status: 'completed',
    description: 'Implémentation du système d\'authentification utilisateur',
    projectName: 'WebApp-Auth',
    startTime: '2025-08-29T10:00:00Z',
    endTime: '2025-08-30T16:30:00Z',
    currentStep: 6,
    totalSteps: 6,
    progress: 100,
    assignedAgents: ['designer', 'developer', 'qa'],
    tasks: [],
    metadata: {
      repository: 'https://github.com/user/webapp-auth',
      pullRequestId: '#5',
      priority: 'high'
    }
  }
];

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<Workflow[]>(mockWorkflows);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredWorkflows = workflows.filter(workflow => {
    const matchesSearch = workflow.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         workflow.projectName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || workflow.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-primary-700 bg-primary-100';
      case 'completed': return 'text-success-700 bg-success-100';
      case 'failed': return 'text-danger-700 bg-danger-100';
      case 'paused': return 'text-warning-700 bg-warning-100';
      default: return 'text-gray-700 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return Play;
      case 'completed': return CheckCircle;
      case 'failed': return AlertTriangle;
      case 'paused': return Pause;
      default: return Clock;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-danger-600 bg-danger-50 border-danger-200';
      case 'medium': return 'text-warning-600 bg-warning-50 border-warning-200';
      case 'low': return 'text-gray-600 bg-gray-50 border-gray-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const formatDuration = (start: string, end?: string) => {
    const startDate = new Date(start);
    const endDate = end ? new Date(end) : new Date();
    const diffHours = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60));
    
    if (diffHours < 24) return `${diffHours}h`;
    return `${Math.floor(diffHours / 24)}j ${diffHours % 24}h`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Workflows</h2>
          <p className="text-gray-600">
            Suivi des workflows de développement autonomes
          </p>
        </div>
        
        <button className="btn-primary flex items-center space-x-2">
          <Plus className="w-4 h-4" />
          <span>Nouveau workflow</span>
        </button>
      </div>

      {/* Filtres */}
      <div className="dashboard-card">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher un workflow..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 appearance-none bg-white"
            >
              <option value="all">Tous les statuts</option>
              <option value="active">Actif</option>
              <option value="completed">Terminé</option>
              <option value="paused">En pause</option>
              <option value="failed">Échoué</option>
            </select>
          </div>
        </div>
      </div>

      {/* Liste des workflows */}
      <div className="space-y-4">
        {filteredWorkflows.map((workflow) => {
          const StatusIcon = getStatusIcon(workflow.status);
          
          return (
            <div key={workflow.id} className="dashboard-card hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    <StatusIcon className="w-6 h-6 text-gray-600 mt-1" />
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{workflow.name}</h3>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full capitalize ${getStatusColor(workflow.status)}`}>
                        {workflow.status}
                      </span>
                      {workflow.metadata?.priority && (
                        <span className={`px-2 py-1 text-xs font-medium rounded border ${getPriorityColor(workflow.metadata.priority)}`}>
                          {workflow.metadata.priority}
                        </span>
                      )}
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-3">{workflow.description}</p>
                    
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <span>Projet: <strong className="text-gray-700">{workflow.projectName}</strong></span>
                      <span>•</span>
                      <span>Durée: {formatDuration(workflow.startTime, workflow.endTime)}</span>
                      <span>•</span>
                      <span>Étape {workflow.currentStep}/{workflow.totalSteps}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col items-end space-y-2">
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-900">{workflow.progress}%</div>
                    <div className="w-24 bg-gray-200 rounded-full h-2 mt-1">
                      <div 
                        className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${workflow.progress}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Agents assignés */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-500">Agents:</span>
                  <div className="flex items-center space-x-2">
                    {workflow.assignedAgents.map((agent, idx) => (
                      <span 
                        key={idx}
                        className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded capitalize"
                      >
                        {agent}
                      </span>
                    ))}
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  {workflow.status === 'active' && (
                    <>
                      <button className="btn-secondary text-sm py-1 px-3">
                        Pause
                      </button>
                      <button className="btn-primary text-sm py-1 px-3">
                        Détails
                      </button>
                    </>
                  )}
                  
                  {workflow.status === 'paused' && (
                    <>
                      <button className="btn-success text-sm py-1 px-3">
                        Reprendre
                      </button>
                      <button className="btn-secondary text-sm py-1 px-3">
                        Détails
                      </button>
                    </>
                  )}
                  
                  {workflow.status === 'completed' && (
                    <button className="btn-secondary text-sm py-1 px-3">
                      Voir résultats
                    </button>
                  )}
                </div>
              </div>

              {/* Métadonnées additionnelles */}
              {workflow.metadata && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="flex items-center space-x-4 text-xs text-gray-500">
                    {workflow.metadata.repository && (
                      <span>
                        <GitBranch className="w-3 h-3 inline mr-1" />
                        Repository
                      </span>
                    )}
                    {workflow.metadata.branch && (
                      <span>Branche: {workflow.metadata.branch}</span>
                    )}
                    {workflow.metadata.pullRequestId && (
                      <span>PR: {workflow.metadata.pullRequestId}</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Message si aucun workflow trouvé */}
      {filteredWorkflows.length === 0 && (
        <div className="dashboard-card text-center py-12">
          <GitBranch className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Aucun workflow trouvé
          </h3>
          <p className="text-gray-500">
            Essayez de modifier vos critères de recherche ou créez un nouveau workflow.
          </p>
        </div>
      )}
    </div>
  );
}
