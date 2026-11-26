require('dotenv').config();

const express = require('express');
const pool = require('./database/connection');
const authRoutes = require('./routes/auth');
const { UnauthorizedError } = require('express-jwt');
const categoriaRoutes = require('./routes/categorias');
const fontesDestinosRoutes = require('./routes/fontesDestinos');
const lancamentosRoutes = require('./routes/lancamentos');
const relatorioRoutes = require('./routes/relatorios');

const app = express();

app.use(express.json());
app.use('/auth', authRoutes);
app.use('/categorias', categoriaRoutes);
app.use('/fontes-destinos', fontesDestinosRoutes);
app.use('/lancamentos', lancamentosRoutes);
app.use('/relatorios', relatorioRoutes);

app.use((erro, req, res, next) => {
    if (erro instanceof UnauthorizedError) {
        return res.status(401).json({
            erro: 'Token ausente ou inválido.'
        });
    }

    return res.status(500).json({
        erro: 'Erro interno do servidor.'
    });
});

// Rota inicial
app.get('/', (req, res) => {
    res.status(200).json({
        mensagem: 'API de Controle Financeiro funcionando!'
    });
});

// Inicialização e teste do banco
async function iniciarServidor() {
    try {
        const conexao = await pool.getConnection();

        console.log('Conexão com MySQL realizada com sucesso!');

        conexao.release();

        const PORT = process.env.PORT || 3000;

        app.listen(PORT, () => {
            console.log(`API rodando na porta ${PORT}`);
        });

    } catch (erro) {
        console.error('Erro ao conectar com o MySQL:', erro.message);
    }
}

iniciarServidor();
