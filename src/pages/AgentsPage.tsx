import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  Filter, 
  MoreVertical,
  Activity,
  Clock,
  CheckCircle,
  AlertCircle,
  Pause,
  Play,
  RefreshCw
} from 'lucide-react';
import type { Agent } from '@/types';

// Données mockées pour la démonstration
const mockAgents: Agent[] = [
  {
    id: '1',
    name: 'Agent Designer',
    type: 'designer',
    status: 'online',
    lastActivity: '2025-08-30T19:30:00Z',
    currentTasks: 2,
    totalTasksCompleted: 15,
    performance: { 
      successRate: 98, 
      averageTaskTime: 15, 
      workloadCapacity: 85 
    },
    capabilities: [
      'UI/UX Design', 
      'Requirements Analysis', 
      'User Stories', 
      'Wireframing',
      'Design Systems',
      'Prototyping'
    ]
  },
  {
    id: '2',
    name: 'Agent Developer',
    type: 'developer',
    status: 'busy',
    lastActivity: '2025-08-30T19:45:00Z',
    currentTasks: 1,
    totalTasksCompleted: 18,
    performance: { 
      successRate: 95, 
      averageTaskTime: 25, 
      workloadCapacity: 90 
    },
    capabilities: [
      'React/TypeScript', 
      'Git Operations', 
      'API Development',
      'Testing',
      'CI/CD',
      'Code Review'
    ]
  },
  {
    id: '3',
    name: 'Agent QA',
    type: 'qa',
    status: 'online',
    lastActivity: '2025-08-30T19:40:00Z',
    currentTasks: 0,
    totalTasksCompleted: 12,
    performance: { 
      successRate: 100, 
      averageTaskTime: 8, 
      workloadCapacity: 70 
    },
    capabilities: [
      'Manual Testing', 
      'Automated Testing', 
      'Bug Detection',
      'Performance Testing',
      'Security Testing',
      'Regression Testing'
    ]
  },
  {
    id: '4',
    name: 'Orchestrator',
    type: 'orchestrator',
    status: 'online',
    lastActivity: '2025-08-30T19:46:00Z',
    currentTasks: 3,
    totalTasksCompleted: 25,
    performance: { 
      successRate: 96, 
      averageTaskTime: 5, 
      workloadCapacity: 75 
    },
    capabilities: [
      'Workflow Management', 
      'Task Coordination', 
      'Agent Monitoring',
      'Resource Allocation',
      'Error Handling',
      'Process Automation'
    ]
  }
];

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>(mockAgents);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);

  const filteredAgents = agents.filter(agent => {
    const matchesSearch = agent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         agent.type.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || agent.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'text-success-700 bg-success-100';
      case 'busy': return 'text-warning-700 bg-warning-100';
      case 'offline': return 'text-gray-700 bg-gray-100';
      case 'error': return 'text-danger-700 bg-danger-100';
      default: return 'text-gray-700 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online': return CheckCircle;
      case 'busy': return Clock;
      case 'offline': return Pause;
      case 'error': return AlertCircle;
      default: return Activity;
    }
  };

  const getPerformanceColor = (rate: number) => {
    if (rate >= 95) return 'text-success-600';
    if (rate >= 80) return 'text-warning-600';
    return 'text-danger-600';
  };

  const getWorkloadColor = (capacity: number) => {
    if (capacity >= 90) return 'text-danger-600';
    if (capacity >= 70) return 'text-warning-600';
    return 'text-success-600';
  };

  const formatLastActivity = (timestamp: string) => {
    const now = new Date();
    const activity = new Date(timestamp);
    const diffInMinutes = Math.floor((now.getTime() - activity.getTime()) / 60000);
    
    if (diffInMinutes < 1) return 'À l\'instant';
    if (diffInMinutes < 60) return `${diffInMinutes} min`;
    const hours = Math.floor(diffInMinutes / 60);
    if (hours < 24) return `${hours}h ${diffInMinutes % 60}min`;
    return `${Math.floor(hours / 24)}j`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Agents MCP</h2>
          <p className="text-gray-600">
            Gestion et monitoring de vos agents autonomes
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <button className="btn-secondary flex items-center space-x-2">
            <RefreshCw className="w-4 h-4" />
            <span>Actualiser</span>
          </button>
        </div>
      </div>

      {/* Filtres et recherche */}
      <div className="dashboard-card">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Recherche */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher un agent..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          
          {/* Filtre par statut */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 appearance-none bg-white"
            >
              <option value="all">Tous les statuts</option>
              <option value="online">En ligne</option>
              <option value="busy">Occupé</option>
              <option value="offline">Hors ligne</option>
              <option value="error">Erreur</option>
            </select>
          </div>
        </div>
      </div>

      {/* Liste des agents */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredAgents.map((agent) => {
          const StatusIcon = getStatusIcon(agent.status);
          
          return (
            <div 
              key={agent.id} 
              className="dashboard-card hover:shadow-lg transition-shadow duration-200 cursor-pointer"
              onClick={() => setSelectedAgent(agent)}
            >
              {/* Header de l'agent */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <div className={`status-dot status-${agent.status}`}></div>
                    <StatusIcon className="w-8 h-8 text-gray-600 ml-4" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{agent.name}</h3>
                    <p className="text-sm text-gray-500 capitalize">{agent.type}</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full capitalize ${getStatusColor(agent.status)}`}>
                    {agent.status}
                  </span>
                  <button className="p-1 text-gray-400 hover:text-gray-600">
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Métriques principales */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Tâches actives</span>
                    <Clock className="w-4 h-4 text-gray-400" />
                  </div>
                  <p className="text-xl font-bold text-gray-900 mt-1">{agent.currentTasks}</p>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Complétées</span>
                    <CheckCircle className="w-4 h-4 text-gray-400" />
                  </div>
                  <p className="text-xl font-bold text-gray-900 mt-1">{agent.totalTasksCompleted}</p>
                </div>
              </div>

              {/* Performance */}
              <div className="space-y-3 mb-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Taux de réussite</span>
                  <span className={`font-semibold ${getPerformanceColor(agent.performance.successRate)}`}>
                    {agent.performance.successRate}%
                  </span>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Temps moyen/tâche</span>
                  <span className="font-semibold text-gray-900">
                    {agent.performance.averageTaskTime} min
                  </span>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Charge de travail</span>
                  <span className={`font-semibold ${getWorkloadColor(agent.performance.workloadCapacity)}`}>
                    {agent.performance.workloadCapacity}%
                  </span>
                </div>
              </div>

              {/* Barre de charge */}
              <div className="mb-4">
                <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                  <span>Capacité utilisée</span>
                  <span>{agent.performance.workloadCapacity}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-300 ${
                      agent.performance.workloadCapacity >= 90 
                        ? 'bg-danger-500' 
                        : agent.performance.workloadCapacity >= 70 
                        ? 'bg-warning-500' 
                        : 'bg-success-500'
                    }`}
                    style={{ width: `${Math.min(agent.performance.workloadCapacity, 100)}%` }}
                  ></div>
                </div>
              </div>

              {/* Capacités */}
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Capacités</h4>
                <div className="flex flex-wrap gap-1">
                  {agent.capabilities.slice(0, 3).map((capability, idx) => (
                    <span 
                      key={idx} 
                      className="px-2 py-1 text-xs bg-primary-50 text-primary-700 rounded border border-primary-200"
                    >
                      {capability}
                    </span>
                  ))}
                  {agent.capabilities.length > 3 && (
                    <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                      +{agent.capabilities.length - 3} autres
                    </span>
                  )}
                </div>
              </div>

              {/* Dernière activité */}
              <div className="flex items-center justify-between text-xs text-gray-500 pt-3 border-t border-gray-100">
                <span>Dernière activité</span>
                <span>{formatLastActivity(agent.lastActivity)}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal de détails d'agent (optionnel) */}
      {selectedAgent && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-900">
                  Détails de l'agent
                </h3>
                <button 
                  onClick={() => setSelectedAgent(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
              
              {/* Contenu détaillé de l'agent */}
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Nom</label>
                    <p className="text-gray-900">{selectedAgent.name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Type</label>
                    <p className="text-gray-900 capitalize">{selectedAgent.type}</p>
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Toutes les capacités
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {selectedAgent.capabilities.map((capability, idx) => (
                      <span 
                        key={idx}
                        className="px-3 py-1 text-sm bg-primary-50 text-primary-700 rounded-full border border-primary-200"
                      >
                        {capability}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Message si aucun agent trouvé */}
      {filteredAgents.length === 0 && (
        <div className="dashboard-card text-center py-12">
          <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Aucun agent trouvé
          </h3>
          <p className="text-gray-500">
            Essayez de modifier vos critères de recherche ou de filtrage.
          </p>
        </div>
      )}
    </div>
  );
}
