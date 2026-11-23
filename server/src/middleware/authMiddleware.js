import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { queryOne } from '../db/database.js';

export async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token de autenticação não fornecido' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    const user = await queryOne('SELECT id, name, email, role, active FROM users WHERE id = ?', [decoded.id]);
    
    if (!user) {
      return res.status(401).json({ error: 'Usuário não encontrado' });
    }

    if (user.active === 0) {
      return res.status(403).json({ 
        error: 'Sua conta foi desativada pelo administrador. Entre em contato para reativá-la.',
        isDeactivated: true 
      });
    }

    req.user = user; // { id, name, email, role, active }
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Sessão expirada ou token inválido' });
  }
}

export function adminMiddleware(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Acesso restrito ao administrador do sistema.' });
  }
  next();
}
