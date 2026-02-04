-- =============================================================================
-- Script Master de Inicialização do Banco de Dados
-- RN Logística - Sistema de Gestão de Fretes
-- =============================================================================
-- Este script inicializa todas as tabelas do sistema na ordem correta,
-- respeitando as dependências de Foreign Keys.
-- =============================================================================

-- Configurações iniciais
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;
SET SQL_MODE = 'NO_AUTO_VALUE_ON_ZERO';
SET time_zone = '+00:00';

-- =============================================================================
-- CRIAÇÃO DO BANCO DE DADOS
-- =============================================================================

CREATE DATABASE IF NOT EXISTS rn_logistica
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE rn_logistica;

-- =============================================================================
-- LIMPEZA (remover tabelas existentes na ordem reversa de dependência)
-- =============================================================================
-- Descomente as linhas abaixo se quiser recriar as tabelas do zero
-- ATENÇÃO: Isso apagará todos os dados!

-- DROP TABLE IF EXISTS notas_fiscais;
-- DROP TABLE IF EXISTS custos;
-- DROP TABLE IF EXISTS pagamentos;
-- DROP TABLE IF EXISTS fretes;
-- DROP TABLE IF EXISTS fazendas;
-- DROP TABLE IF EXISTS Frota;
-- DROP TABLE IF EXISTS motoristas;
-- DROP TABLE IF EXISTS usuarios;

-- =============================================================================
-- ORDEM DE CRIAÇÃO DAS TABELAS
-- =============================================================================
-- 1. usuarios        - Autenticação e autorização (sem dependências)
-- 2. motoristas      - Gestão de motoristas (sem dependências)
-- 3. Frota           - Gestão de caminhões (depende de motoristas)
-- 4. fazendas        - Gestão de fazendas (sem dependências)
-- 5. fretes          - Operações de frete (depende de motoristas, Frota, fazendas)
-- 6. custos          - Custos operacionais (depende de fretes)
-- 7. pagamentos      - Pagamentos aos motoristas (depende de motoristas)
-- 8. notas_fiscais   - Documentação fiscal (depende de fretes, motoristas)

-- =============================================================================
-- 1. TABELA: usuarios
-- =============================================================================
SOURCE create_usuarios.sql;

-- =============================================================================
-- 2. TABELA: motoristas
-- =============================================================================
SOURCE create_motoristas.sql;

-- =============================================================================
-- 3. TABELA: Frota (caminhões)
-- =============================================================================
SOURCE create_frota.sql;

-- =============================================================================
-- 4. TABELA: fazendas
-- =============================================================================
SOURCE create_fazendas.sql;

-- =============================================================================
-- 5. TABELA: fretes
-- =============================================================================
SOURCE create_fretes.sql;

-- =============================================================================
-- 6. TABELA: custos
-- =============================================================================
SOURCE create_custos.sql;

-- =============================================================================
-- 7. TABELA: pagamentos
-- =============================================================================
SOURCE create_pagamentos.sql;

-- =============================================================================
-- 8. TABELA: notas_fiscais
-- =============================================================================
SOURCE create_notas_fiscais.sql;

-- =============================================================================
-- VERIFICAÇÃO
-- =============================================================================

-- Reativar verificação de Foreign Keys
SET FOREIGN_KEY_CHECKS = 1;

-- Exibir todas as tabelas criadas
SHOW TABLES;

-- Verificar estrutura de cada tabela
-- DESCRIBE usuarios;
-- DESCRIBE motoristas;
-- DESCRIBE Frota;
-- DESCRIBE fazendas;
-- DESCRIBE fretes;
-- DESCRIBE custos;
-- DESCRIBE pagamentos;
-- DESCRIBE notas_fiscais;

-- =============================================================================
-- INFORMAÇÕES FINAIS
-- =============================================================================
-- Database: rn_logistica
-- Charset: utf8mb4_unicode_ci
-- Total de Tabelas: 8
-- Status: Banco inicializado com sucesso!
-- 
-- Próximos passos:
-- 1. Verificar se todas as tabelas foram criadas: SHOW TABLES;
-- 2. Verificar dados de exemplo: SELECT COUNT(*) FROM [tabela];
-- 3. Criar usuário da aplicação com permissões adequadas
-- 4. Configurar backup automático
-- 5. Implementar triggers sugeridos (comentados em cada arquivo)
-- 6. Criar views úteis (comentadas em cada arquivo)
-- =============================================================================

SELECT 'Banco de dados RN Logística inicializado com sucesso!' AS Status;
