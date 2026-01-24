-- Habilita extensões necessárias para o sisCQT
-- Executado automaticamente no primeiro init do volume (docker-entrypoint-initdb.d)

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

