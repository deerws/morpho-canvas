-- First, drop the foreign key constraint on functions.created_by if it exists
ALTER TABLE public.functions DROP CONSTRAINT IF EXISTS functions_created_by_fkey;
ALTER TABLE public.principles DROP CONSTRAINT IF EXISTS principles_created_by_fkey;

-- Insert public example functions
INSERT INTO public.functions (id, name, description, category, color, created_by, is_public)
VALUES 
  ('00000000-0000-0000-0000-000000000001', 'Transmitir Força', 'Transferir força mecânica de um ponto a outro do sistema', 'Mecânica', '#ef4444', '00000000-0000-0000-0000-000000000000', true),
  ('00000000-0000-0000-0000-000000000002', 'Armazenar Energia', 'Guardar energia para uso posterior', 'Elétrica', '#f59e0b', '00000000-0000-0000-0000-000000000000', true),
  ('00000000-0000-0000-0000-000000000003', 'Dissipar Calor', 'Remover calor excessivo do sistema', 'Térmica', '#10b981', '00000000-0000-0000-0000-000000000000', true),
  ('00000000-0000-0000-0000-000000000004', 'Controlar Fluxo', 'Regular a passagem de fluidos no sistema', 'Hidráulica', '#3b82f6', '00000000-0000-0000-0000-000000000000', true),
  ('00000000-0000-0000-0000-000000000005', 'Converter Energia', 'Transformar um tipo de energia em outro', 'Elétrica', '#8b5cf6', '00000000-0000-0000-0000-000000000000', true),
  ('00000000-0000-0000-0000-000000000006', 'Suportar Carga', 'Resistir a forças e cargas aplicadas', 'Mecânica', '#dc2626', '00000000-0000-0000-0000-000000000000', true)
ON CONFLICT (id) DO NOTHING;

-- Insert public example principles for each function
-- Transmitir Força
INSERT INTO public.principles (id, title, description, function_id, created_by, is_public, complexity, cost, tags)
VALUES 
  ('10000000-0000-0000-0000-000000000001', 'Engrenagens', 'Sistema de engrenagens para transmissão de torque e velocidade', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', true, 3, 'Médio', ARRAY['mecânico', 'rotação', 'torque']),
  ('10000000-0000-0000-0000-000000000002', 'Correia e Polias', 'Transmissão por correias flexíveis e polias', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', true, 2, 'Baixo', ARRAY['flexível', 'silencioso', 'manutenção']),
  ('10000000-0000-0000-0000-000000000003', 'Corrente', 'Transmissão por corrente e rodas dentadas', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', true, 2, 'Baixo', ARRAY['robusto', 'alta carga', 'durável']),
  ('10000000-0000-0000-0000-000000000004', 'Eixo Cardã', 'Junta universal para transmissão angular', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', true, 4, 'Alto', ARRAY['angular', 'veículos', 'flexível'])
ON CONFLICT (id) DO NOTHING;

-- Armazenar Energia
INSERT INTO public.principles (id, title, description, function_id, created_by, is_public, complexity, cost, tags)
VALUES 
  ('10000000-0000-0000-0000-000000000005', 'Bateria de Íon-Lítio', 'Células eletroquímicas de alta densidade energética', '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', true, 4, 'Alto', ARRAY['portátil', 'recarregável', 'leve']),
  ('10000000-0000-0000-0000-000000000006', 'Supercapacitor', 'Capacitor de alta capacitância para carga rápida', '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', true, 5, 'Alto', ARRAY['rápido', 'durável', 'potência']),
  ('10000000-0000-0000-0000-000000000007', 'Volante de Inércia', 'Armazenamento de energia cinética rotacional', '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', true, 3, 'Médio', ARRAY['mecânico', 'durável', 'eficiente']),
  ('10000000-0000-0000-0000-000000000008', 'Mola Espiral', 'Armazenamento de energia potencial elástica', '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', true, 1, 'Baixo', ARRAY['simples', 'mecânico', 'confiável'])
ON CONFLICT (id) DO NOTHING;

-- Dissipar Calor
INSERT INTO public.principles (id, title, description, function_id, created_by, is_public, complexity, cost, tags)
VALUES 
  ('10000000-0000-0000-0000-000000000009', 'Dissipador com Aletas', 'Superfície estendida para convecção natural', '00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', true, 2, 'Baixo', ARRAY['passivo', 'silencioso', 'alumínio']),
  ('10000000-0000-0000-0000-000000000010', 'Ventilador Axial', 'Convecção forçada com fluxo de ar', '00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', true, 2, 'Baixo', ARRAY['ativo', 'eficiente', 'compacto']),
  ('10000000-0000-0000-0000-000000000011', 'Heat Pipe', 'Tubo de calor com mudança de fase', '00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', true, 4, 'Médio', ARRAY['passivo', 'alta performance', 'eletrônicos']),
  ('10000000-0000-0000-0000-000000000012', 'Refrigeração Líquida', 'Circuito fechado com bomba e radiador', '00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', true, 5, 'Alto', ARRAY['alta potência', 'gaming', 'industrial'])
ON CONFLICT (id) DO NOTHING;

-- Controlar Fluxo
INSERT INTO public.principles (id, title, description, function_id, created_by, is_public, complexity, cost, tags)
VALUES 
  ('10000000-0000-0000-0000-000000000013', 'Válvula Esfera', 'Válvula de quarto de volta com esfera perfurada', '00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000000', true, 2, 'Médio', ARRAY['on-off', 'rápida', 'vedação']),
  ('10000000-0000-0000-0000-000000000014', 'Válvula Borboleta', 'Disco rotativo para regulagem de fluxo', '00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000000', true, 2, 'Baixo', ARRAY['proporcional', 'leve', 'grandes vazões']),
  ('10000000-0000-0000-0000-000000000015', 'Válvula Solenoide', 'Acionamento eletromagnético automático', '00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000000', true, 3, 'Médio', ARRAY['automação', 'elétrica', 'rápida']),
  ('10000000-0000-0000-0000-000000000016', 'Válvula de Retenção', 'Permite fluxo em apenas uma direção', '00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000000', true, 1, 'Baixo', ARRAY['unidirecional', 'segurança', 'passiva'])
ON CONFLICT (id) DO NOTHING;

-- Converter Energia
INSERT INTO public.principles (id, title, description, function_id, created_by, is_public, complexity, cost, tags)
VALUES 
  ('10000000-0000-0000-0000-000000000017', 'Motor Elétrico DC', 'Converte energia elétrica em mecânica rotativa', '00000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000000', true, 3, 'Médio', ARRAY['rotação', 'controlável', 'eficiente']),
  ('10000000-0000-0000-0000-000000000018', 'Célula Fotovoltaica', 'Converte luz solar em eletricidade', '00000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000000', true, 4, 'Alto', ARRAY['solar', 'renovável', 'silencioso']),
  ('10000000-0000-0000-0000-000000000019', 'Gerador Piezoelétrico', 'Converte vibração/pressão em eletricidade', '00000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000000', true, 4, 'Alto', ARRAY['vibrações', 'sensores', 'compacto']),
  ('10000000-0000-0000-0000-000000000020', 'Motor Stirling', 'Converte diferença de temperatura em movimento', '00000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000000', true, 5, 'Alto', ARRAY['térmico', 'silencioso', 'eficiente'])
ON CONFLICT (id) DO NOTHING;

-- Suportar Carga
INSERT INTO public.principles (id, title, description, function_id, created_by, is_public, complexity, cost, tags)
VALUES 
  ('10000000-0000-0000-0000-000000000021', 'Viga em I', 'Perfil estrutural otimizado para flexão', '00000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000000', true, 2, 'Médio', ARRAY['estrutural', 'aço', 'construção']),
  ('10000000-0000-0000-0000-000000000022', 'Treliça', 'Estrutura triangular para distribuição de cargas', '00000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000000', true, 3, 'Médio', ARRAY['leve', 'eficiente', 'pontes']),
  ('10000000-0000-0000-0000-000000000023', 'Coluna de Concreto', 'Elemento vertical para cargas de compressão', '00000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000000', true, 2, 'Baixo', ARRAY['compressão', 'durável', 'pesado']),
  ('10000000-0000-0000-0000-000000000024', 'Fibra de Carbono', 'Material compósito de alta resistência', '00000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000000', true, 5, 'Alto', ARRAY['leve', 'resistente', 'aeroespacial'])
ON CONFLICT (id) DO NOTHING;