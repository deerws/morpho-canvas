import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, Matrix, ProductFunction, Principle, Concept } from '@/types/morpho';

interface MorphoState {
  user: User | null;
  matrices: Matrix[];
  functions: ProductFunction[];
  principles: Principle[];
  concepts: Concept[];
  
  // Auth actions
  setUser: (user: User | null) => void;
  
  // Matrix actions
  addMatrix: (matrix: Matrix) => void;
  updateMatrix: (id: string, matrix: Partial<Matrix>) => void;
  deleteMatrix: (id: string) => void;
  
  // Function actions
  addFunction: (func: ProductFunction) => void;
  updateFunction: (id: string, func: Partial<ProductFunction>) => void;
  deleteFunction: (id: string) => void;
  
  // Principle actions
  addPrinciple: (principle: Principle) => void;
  updatePrinciple: (id: string, principle: Partial<Principle>) => void;
  deletePrinciple: (id: string) => void;
  incrementPrincipleUsage: (id: string) => void;
  
  // Concept actions
  addConcept: (concept: Concept) => void;
  updateConcept: (id: string, concept: Partial<Concept>) => void;
  deleteConcept: (id: string) => void;
}

// Initial demo data
const demoFunctions: ProductFunction[] = [
  { id: 'f1', name: 'Converter energia térmica para cinética', description: 'Transformação de calor em movimento', category: 'Térmica', color: '#10b981', createdBy: 'demo', isPublic: true },
  { id: 'f2', name: 'Transmitir movimento rotativo', description: 'Transferência de rotação entre componentes', category: 'Mecânica', color: '#ef4444', createdBy: 'demo', isPublic: true },
  { id: 'f3', name: 'Armazenar energia elétrica', description: 'Acúmulo de carga elétrica', category: 'Elétrica', color: '#f59e0b', createdBy: 'demo', isPublic: true },
];

const demoPrinciples: Principle[] = [
  { id: 'p1', title: 'Motor Stirling', description: 'Motor de combustão externa que opera através de ciclos de compressão e expansão de um gás.', functionId: 'f1', tags: ['motor', 'térmico', 'eficiente'], complexity: 4, cost: 'Alto', usageCount: 15, createdBy: 'demo', isPublic: true },
  { id: 'p2', title: 'Turbina a vapor', description: 'Converte energia térmica do vapor em energia mecânica rotativa.', functionId: 'f1', tags: ['turbina', 'vapor'], complexity: 3, cost: 'Alto', usageCount: 12, createdBy: 'demo', isPublic: true },
  { id: 'p3', title: 'Engrenagens cilíndricas', description: 'Transmissão de movimento através de dentes cilíndricos.', functionId: 'f2', tags: ['engrenagem', 'transmissão'], complexity: 2, cost: 'Baixo', usageCount: 25, createdBy: 'demo', isPublic: true },
  { id: 'p4', title: 'Correia dentada', description: 'Sistema de transmissão flexível com sincronização precisa.', functionId: 'f2', tags: ['correia', 'transmissão'], complexity: 2, cost: 'Baixo', usageCount: 20, createdBy: 'demo', isPublic: true },
  { id: 'p5', title: 'Bateria de lítio', description: 'Célula eletroquímica recarregável com alta densidade energética.', functionId: 'f3', tags: ['bateria', 'lítio'], complexity: 3, cost: 'Alto', usageCount: 30, createdBy: 'demo', isPublic: true },
  { id: 'p6', title: 'Supercapacitor', description: 'Dispositivo de armazenamento de carga com alta potência.', functionId: 'f3', tags: ['capacitor', 'rápido'], complexity: 3, cost: 'Médio', usageCount: 10, createdBy: 'demo', isPublic: true },
];

const demoMatrices: Matrix[] = [
  { id: 'm1', name: 'Projeto Veículo Elétrico', description: 'Matriz para concepção de veículo elétrico urbano', userId: 'demo', functionIds: ['f1', 'f2', 'f3'], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
];

export const useMorphoStore = create<MorphoState>()(
  persist(
    (set) => ({
      user: null,
      matrices: demoMatrices,
      functions: demoFunctions,
      principles: demoPrinciples,
      concepts: [],
      
      setUser: (user) => set({ user }),
      
      addMatrix: (matrix) => set((state) => ({ matrices: [...state.matrices, matrix] })),
      updateMatrix: (id, matrix) => set((state) => ({
        matrices: state.matrices.map((m) => (m.id === id ? { ...m, ...matrix } : m)),
      })),
      deleteMatrix: (id) => set((state) => ({ matrices: state.matrices.filter((m) => m.id !== id) })),
      
      addFunction: (func) => set((state) => ({ functions: [...state.functions, func] })),
      updateFunction: (id, func) => set((state) => ({
        functions: state.functions.map((f) => (f.id === id ? { ...f, ...func } : f)),
      })),
      deleteFunction: (id) => set((state) => ({ functions: state.functions.filter((f) => f.id !== id) })),
      
      addPrinciple: (principle) => set((state) => ({ principles: [...state.principles, principle] })),
      updatePrinciple: (id, principle) => set((state) => ({
        principles: state.principles.map((p) => (p.id === id ? { ...p, ...principle } : p)),
      })),
      deletePrinciple: (id) => set((state) => ({ principles: state.principles.filter((p) => p.id !== id) })),
      incrementPrincipleUsage: (id) => set((state) => ({
        principles: state.principles.map((p) => (p.id === id ? { ...p, usageCount: p.usageCount + 1 } : p)),
      })),
      
      addConcept: (concept) => set((state) => ({ concepts: [...state.concepts, concept] })),
      updateConcept: (id, concept) => set((state) => ({
        concepts: state.concepts.map((c) => (c.id === id ? { ...c, ...concept } : c)),
      })),
      deleteConcept: (id) => set((state) => ({ concepts: state.concepts.filter((c) => c.id !== id) })),
    }),
    { name: 'morpho-storage' }
  )
);
