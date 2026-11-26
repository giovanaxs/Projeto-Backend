CREATE DATABASE IF NOT EXISTS api_financas
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE api_financas;

-- Tabela de usuários
CREATE TABLE IF NOT EXISTS usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    cpf VARCHAR(11) NOT NULL UNIQUE,
    senha_hash VARCHAR(255) NOT NULL,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Tabela de categorias
CREATE TABLE IF NOT EXISTS categorias (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    nome VARCHAR(100) NOT NULL,
    tipo ENUM('entrada', 'saida') NOT NULL,

    UNIQUE (id, usuario_id),
    UNIQUE (usuario_id, nome, tipo),

    FOREIGN KEY (usuario_id)
        REFERENCES usuarios(id)
        ON DELETE CASCADE
) ENGINE=InnoDB;

-- Tabela de fontes e destinos
CREATE TABLE IF NOT EXISTS fontes_destinos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    nome VARCHAR(100) NOT NULL,
    tipo ENUM('renda', 'conta', 'cartao_credito') NOT NULL,
    dia_fechamento INT,
    dia_vencimento INT,
    limite DECIMAL(12,2),

    UNIQUE (id, usuario_id),
    UNIQUE (usuario_id, nome),

    FOREIGN KEY (usuario_id)
        REFERENCES usuarios(id)
        ON DELETE CASCADE,

    CHECK (dia_fechamento IS NULL OR dia_fechamento BETWEEN 1 AND 31),
    CHECK (dia_vencimento IS NULL OR dia_vencimento BETWEEN 1 AND 31),
    CHECK (limite IS NULL OR limite > 0),

    CHECK (
        tipo != 'cartao_credito'
        OR (
            dia_fechamento IS NOT NULL
            AND dia_vencimento IS NOT NULL
            AND limite IS NOT NULL
        )
    )
) ENGINE=InnoDB;

-- Tabela de lançamentos
CREATE TABLE IF NOT EXISTS lancamentos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    tipo ENUM('entrada', 'saida') NOT NULL,
    descricao VARCHAR(255) NOT NULL,
    valor DECIMAL(12,2) NOT NULL,
    data DATE NOT NULL,
    data_compra DATE NOT NULL,
    categoria_id INT NOT NULL,
    fonte_destino_id INT NOT NULL,
    parcela_atual INT DEFAULT 1,
    total_parcelas INT DEFAULT 1,
    grupo_parcelamento CHAR(36),

    FOREIGN KEY (usuario_id)
        REFERENCES usuarios(id)
        ON DELETE CASCADE,

    FOREIGN KEY (categoria_id, usuario_id)
        REFERENCES categorias(id, usuario_id),

    FOREIGN KEY (fonte_destino_id, usuario_id)
        REFERENCES fontes_destinos(id, usuario_id),

    CHECK (valor > 0),
    CHECK (parcela_atual >= 1),
    CHECK (total_parcelas BETWEEN 1 AND 48),
    CHECK (parcela_atual <= total_parcelas),

    INDEX idx_lancamentos_usuario_data (usuario_id, data),
    INDEX idx_lancamentos_grupo (grupo_parcelamento)
) ENGINE=InnoDB;
