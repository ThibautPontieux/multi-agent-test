import React, { useState, useEffect } from 'react';
import { 
  Users, 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  Activity, 
  GitBranch,
  RefreshCw,
  Zap
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import type { SystemMetrics, Agent, Workflow } from '@/types';

// Données mockées pour la démonstration
const mockSystemMetrics: SystemMetrics = {
  totalAgents: 4,
  activeAgents: 4,
  totalTasks: 47,
  completedTasks: 42,
  failedTasks: 2,
  activeWorkflows: 3,
  completedWorkflows: 8,
  systemUptime: '7j 14h 23m',
  averageTaskCompletionTime: 12.5,
  systemLoad: 65,
  memoryUsage: 42,
  errorRate: 2.1
};

const mockAgents: Agent[] = [
  {
    id: '1',
    name: 'Agent Designer',
    type: 'designer',
    status: 'online',
    lastActivity: '2025-08-30T19:30:00Z',
    currentTasks: 2,
    totalTasksCompleted: 15,
    performance: { successRate: 98, averageTaskTime: 15, workloadCapacity: 85 },
    capabilities: ['UI Design', 'Requirements Analysis', 'User Stories']
  },
  {
    id: '2',
    name: 'Agent Developer',
    type: 'developer',
    status: 'busy',
    lastActivity: '2025-08-30T19:45:00Z',
    currentTasks: 1,
    totalTasksCompleted: 18,
    performance: { successRate: 95, averageTaskTime: 25, workloadCapacity: 90 },
    capabilities: ['React/TypeScript', 'Git Operations', 'API Development']
  },
  {
    id: '3',
    name: 'Agent QA',
    type: 'qa',
    status: 'online',
    lastActivity: '2025-08-30T19:40:00Z',
    currentTasks: 0,
    totalTasksCompleted: 12,
    performance: { successRate: 100, averageTaskTime: 8, workloadCapacity: 70 },
    capabilities: ['Testing', 'Bug Detection', 'Quality Assurance']
  },
  {
    id: '4',
    name: 'Orchestrator',
    type: 'orchestrator',
    status: 'online',
    lastActivity: '2025-08-30T19:46:00Z',
    currentTasks: 3,
    totalTasksCompleted: 25,
    performance: { successRate: 96, averageTaskTime: 5, workloadCapacity: 75 },
    capabilities: ['Workflow Management', 'Task Coordination', 'Agent Monitoring']
  }
];

const performanceData = [
  { time: '14:00', tasks: 4, workflows: 1 },
  { time: '15:00', tasks: 7, workflows: 2 },
  { time: '16:00', tasks: 12, workflows: 3 },
  { time: '17:00', tasks: 18, workflows: 4 },
  { time: '18:00', tasks: 23, workflows: 3 },
  { time: '19:00', tasks: 35, workflows: 5 },
  { time: '20:00', tasks: 42, workflows: 3 }
];

const agentActivityData = [
  { agent: 'Designer', completed: 15, active: 2 },
  { agent: 'Developer', completed: 18, active: 1 },
  { agent: 'QA', completed: 12, active: 0 },
  { agent: 'Orchestrator', completed: 25, active: 3 }
];

export default function HomePage() {
  const [metrics, setMetrics] = useState<SystemMetrics>(mockSystemMetrics);
  const [agents, setAgents] = useState<Agent[]>(mockAgents);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Simulation d'un appel API
    setTimeout(() => {
      setIsRefreshing(false);
    }, 1000);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'text-success-600 bg-success-100';
      case 'busy': return 'text-warning-600 bg-warning-100';
      case 'offline': return 'text-gray-600 bg-gray-100';
      case 'error': return 'text-danger-600 bg-danger-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header avec actions */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-medium text-gray-900 mb-1">
            Vue d'ensemble du système
          </h2>
          <p className="text-sm text-gray-600">
            Monitoring en temps réel de vos agents MCP autonomes
          </p>
        </div>
        
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="btn-primary flex items-center space-x-2"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span>Actualiser</span>
        </button>
      </div>

      {/* Métriques principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="metric-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Agents actifs</p>
              <p className="text-3xl font-bold text-gray-900">{metrics.activeAgents}/{metrics.totalAgents}</p>
            </div>
            <div className="p-3 bg-primary-100 rounded-full">
              <Users className="w-6 h-6 text-primary-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center">
            <div className="status-dot status-online mr-2"></div>
            <span className="text-sm text-gray-600">Tous opérationnels</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Tâches complétées</p>
              <p className="text-3xl font-bold text-gray-900">{metrics.completedTasks}</p>
            </div>
            <div className="p-3 bg-success-100 rounded-full">
              <CheckCircle className="w-6 h-6 text-success-600" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-sm text-success-600 font-medium">
              +{Math.round((metrics.completedTasks / metrics.totalTasks) * 100)}% taux de réussite
            </span>
          </div>
        </div>

        <div className="metric-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Workflows actifs</p>
              <p className="text-3xl font-bold text-gray-900">{metrics.activeWorkflows}</p>
            </div>
            <div className="p-3 bg-primary-100 rounded-full">
              <GitBranch className="w-6 h-6 text-primary-600" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-sm text-gray-600">
              {metrics.completedWorkflows} terminés aujourd'hui
            </span>
          </div>
        </div>

        <div className="metric-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Temps moyen</p>
              <p className="text-3xl font-bold text-gray-900">{metrics.averageTaskCompletionTime}min</p>
            </div>
            <div className="p-3 bg-warning-100 rounded-full">
              <Clock className="w-6 h-6 text-warning-600" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-sm text-success-600 font-medium">
              -15% vs semaine dernière
            </span>
          </div>
        </div>
      </div>

      {/* Graphiques et données détaillées */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Graphique de performance */}
        <div className="dashboard-card">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Performance aujourd'hui</h3>
            <div className="flex items-center space-x-2">
              <Activity className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-500">Temps réel</span>
            </div>
          </div>
          
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={performanceData}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="time" />
              <YAxis />
              <Tooltip />
              <Line 
                type="monotone" 
                dataKey="tasks" 
                stroke="#3b82f6" 
                strokeWidth={3}
                name="Tâches"
              />
              <Line 
                type="monotone" 
                dataKey="workflows" 
                stroke="#10b981" 
                strokeWidth={3}
                name="Workflows"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Activité des agents */}
        <div className="dashboard-card">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Activité par agent</h3>
          
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={agentActivityData}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="agent" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="completed" fill="#3b82f6" name="Complétées" />
              <Bar dataKey="active" fill="#f59e0b" name="En cours" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* État des agents */}
      <div className="dashboard-card">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">État des agents</h3>
          <div className="flex items-center space-x-2">
            <Zap className="w-4 h-4 text-primary-500" />
            <span className="text-sm text-gray-500">Mise à jour automatique</span>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {agents.map((agent) => (
            <div key={agent.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className={`status-dot status-${agent.status}`}></div>
                  <div>
                    <h4 className="font-medium text-gray-900">{agent.name}</h4>
                    <p className="text-sm text-gray-500 capitalize">{agent.type}</p>
                  </div>
                </div>
                <span className={`px-2 py-1 text-xs font-medium rounded-full capitalize ${getStatusColor(agent.status)}`}>
                  {agent.status}
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Tâches en cours:</span>
                  <span className="ml-2 font-medium">{agent.currentTasks}</span>
                </div>
                <div>
                  <span className="text-gray-500">Complétées:</span>
                  <span className="ml-2 font-medium">{agent.totalTasksCompleted}</span>
                </div>
                <div>
                  <span className="text-gray-500">Taux de réussite:</span>
                  <span className="ml-2 font-medium text-success-600">{agent.performance.successRate}%</span>
                </div>
                <div>
                  <span className="text-gray-500">Charge:</span>
                  <span className="ml-2 font-medium">{agent.performance.workloadCapacity}%</span>
                </div>
              </div>
              
              <div className="mt-3 pt-3 border-t border-gray-100">
                <div className="flex flex-wrap gap-1">
                  {agent.capabilities.slice(0, 2).map((capability, idx) => (
                    <span key={idx} className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                      {capability}
                    </span>
                  ))}
                  {agent.capabilities.length > 2 && (
                    <span className="px-2 py-1 text-xs text-gray-500">
                      +{agent.capabilities.length - 2}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Métriques système */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="dashboard-card text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-primary-100 rounded-full mb-4">
            <Activity className="w-6 h-6 text-primary-600" />
          </div>
          <h4 className="text-lg font-semibold text-gray-900 mb-2">Charge système</h4>
          <p className="text-3xl font-bold text-primary-600 mb-2">{metrics.systemLoad}%</p>
          <p className="text-sm text-gray-500">Optimal (< 80%)</p>
        </div>

        <div className="dashboard-card text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-success-100 rounded-full mb-4">
            <Zap className="w-6 h-6 text-success-600" />
          </div>
          <h4 className="text-lg font-semibold text-gray-900 mb-2">Uptime</h4>
          <p className="text-2xl font-bold text-success-600 mb-2">{metrics.systemUptime}</p>
          <p className="text-sm text-gray-500">Disponibilité 99.9%</p>
        </div>

        <div className="dashboard-card text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-warning-100 rounded-full mb-4">
            <AlertTriangle className="w-6 h-6 text-warning-600" />
          </div>
          <h4 className="text-lg font-semibold text-gray-900 mb-2">Taux d'erreur</h4>
          <p className="text-3xl font-bold text-warning-600 mb-2">{metrics.errorRate}%</p>
          <p className="text-sm text-gray-500">Dans les normes</p>
        </div>
      </div>
    </div>
  );
}
