-- Adicionar colunas de Rua, Casa e CPF para Moradores/Usuários da Chácara
ALTER TABLE chacara_users ADD COLUMN IF NOT EXISTS street TEXT;
ALTER TABLE chacara_users ADD COLUMN IF NOT EXISTS house_number TEXT;
ALTER TABLE chacara_users ADD COLUMN IF NOT EXISTS cpf TEXT;
