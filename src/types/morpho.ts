export interface User {
  id: string;
  name: string;
  email: string;
  role: 'teacher' | 'student';
  avatar?: string;
}

export interface Matrix {
  id: string;
  name: string;
  description?: string;
  userId: string;
  functionIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ProductFunction {
  id: string;
  name: string;
  description?: string;
  category: 'Mecânica' | 'Elétrica' | 'Térmica' | 'Hidráulica' | 'Química' | 'Outra';
  color: string;
  createdBy: string;
  isPublic: boolean;
}

export interface Principle {
  id: string;
  title: string;
  description: string;
  functionId: string;
  imageUrl?: string;
  tags: string[];
  complexity: number;
  cost: 'Baixo' | 'Médio' | 'Alto';
  usageCount: number;
  createdBy: string;
  isPublic: boolean;
}

export interface Concept {
  id: string;
  name: string;
  matrixId: string;
  selections: Record<string, string>;
  description: string;
  createdAt: string;
  generatedBy: 'manual' | 'ia';
}

export type CategoryColors = {
  [key in ProductFunction['category']]: string;
};

export const CATEGORY_COLORS: CategoryColors = {
  'Mecânica': '#ef4444',
  'Elétrica': '#f59e0b',
  'Térmica': '#10b981',
  'Hidráulica': '#3b82f6',
  'Química': '#8b5cf6',
  'Outra': '#6b7280',
};
