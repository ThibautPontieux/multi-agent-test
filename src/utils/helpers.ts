// Utilitaires pour le formatage des dates et du temps
export const formatTimestamp = (timestamp: string | Date): string => {
  const date = new Date(timestamp);
  return date.toLocaleString('fr-FR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
};

export const formatTimeAgo = (timestamp: string | Date): string => {
  const now = new Date();
  const time = new Date(timestamp);
  const diffInMinutes = Math.floor((now.getTime() - time.getTime()) / 60000);
  
  if (diffInMinutes < 1) return 'À l\'instant';
  if (diffInMinutes < 60) return `${diffInMinutes} min`;
  
  const hours = Math.floor(diffInMinutes / 60);
  if (hours < 24) return `${hours}h ${diffInMinutes % 60}min`;
  
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}j ${hours % 24}h`;
  
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} mois`;
  
  const years = Math.floor(months / 12);
  return `${years} an${years > 1 ? 's' : ''}`;
};

export const formatDuration = (startTime: string | Date, endTime?: string | Date): string => {
  const start = new Date(startTime);
  const end = endTime ? new Date(endTime) : new Date();
  const diffInMilliseconds = end.getTime() - start.getTime();
  
  const seconds = Math.floor(diffInMilliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days}j ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}min`;
  if (minutes > 0) return `${minutes}min ${seconds % 60}s`;
  return `${seconds}s`;
};

export const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const formatPercentage = (value: number, total: number): string => {
  if (total === 0) return '0%';
  return `${Math.round((value / total) * 100)}%`;
};

// Utilitaires pour les couleurs et status
export const getStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    online: 'text-success-700 bg-success-100',
    busy: 'text-warning-700 bg-warning-100',
    offline: 'text-gray-700 bg-gray-100',
    error: 'text-danger-700 bg-danger-100',
    active: 'text-primary-700 bg-primary-100',
    completed: 'text-success-700 bg-success-100',
    failed: 'text-danger-700 bg-danger-100',
    paused: 'text-warning-700 bg-warning-100',
    pending: 'text-gray-700 bg-gray-100',
    in_progress: 'text-primary-700 bg-primary-100'
  };
  
  return colors[status] || colors.offline;
};

export const getPriorityColor = (priority: string): string => {
  const colors: Record<string, string> = {
    critical: 'text-danger-600 bg-danger-50 border-danger-200',
    high: 'text-danger-600 bg-danger-50 border-danger-200',
    medium: 'text-warning-600 bg-warning-50 border-warning-200',
    low: 'text-gray-600 bg-gray-50 border-gray-200'
  };
  
  return colors[priority] || colors.low;
};

// Utilitaires de validation
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

// Utilitaires pour les données
export const groupBy = <T>(array: T[], key: keyof T): Record<string, T[]> => {
  return array.reduce((groups, item) => {
    const groupKey = String(item[key]);
    groups[groupKey] = groups[groupKey] || [];
    groups[groupKey].push(item);
    return groups;
  }, {} as Record<string, T[]>);
};

export const sortBy = <T>(array: T[], key: keyof T, direction: 'asc' | 'desc' = 'asc'): T[] => {
  return [...array].sort((a, b) => {
    const aVal = a[key];
    const bVal = b[key];
    
    if (aVal < bVal) return direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return direction === 'asc' ? 1 : -1;
    return 0;
  });
};

export const filterBy = <T>(array: T[], filters: Partial<Record<keyof T, any>>): T[] => {
  return array.filter(item => {
    return Object.entries(filters).every(([key, value]) => {
      if (value === undefined || value === null || value === '') return true;
      return item[key as keyof T] === value;
    });
  });
};

// Utilitaires pour le localStorage (avec fallback)
export const storage = {
  get: (key: string): any => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch {
      return null;
    }
  },
  
  set: (key: string, value: any): void => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Silently fail in environments without localStorage
    }
  },
  
  remove: (key: string): void => {
    try {
      localStorage.removeItem(key);
    } catch {
      // Silently fail in environments without localStorage
    }
  }
};

// Utilitaires pour les notifications
export const requestNotificationPermission = async (): Promise<NotificationPermission> => {
  if (!('Notification' in window)) {
    return 'denied';
  }
  
  if (Notification.permission === 'granted') {
    return 'granted';
  }
  
  if (Notification.permission !== 'denied') {
    return await Notification.requestPermission();
  }
  
  return Notification.permission;
};

export const showNotification = (title: string, options?: NotificationOptions): void => {
  if (Notification.permission === 'granted') {
    new Notification(title, {
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      ...options
    });
  }
};

// Utilitaires pour les erreurs
export const handleApiError = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  
  if (typeof error === 'string') {
    return error;
  }
  
  return 'Une erreur inconnue s\'est produite';
};

// Utilitaires de debounce
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void => {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(null, args), wait);
  };
};

// Utilitaires pour les classes CSS conditionnelles
export const cn = (...classes: (string | undefined | null | false)[]): string => {
  return classes.filter(Boolean).join(' ');
};
