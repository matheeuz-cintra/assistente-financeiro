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
    const user = await queryOne('SELECT id, name, email, role, active, company_id, company_profile_id FROM users WHERE id = ?', [decoded.id]);
    
    if (!user) {
      return res.status(401).json({ error: 'Usuário não encontrado' });
    }

    if (user.active === 0) {
      return res.status(403).json({ 
        error: 'Sua conta foi desativada pelo administrador. Entre em contato para reativá-la.',
        isDeactivated: true 
      });
    }

    // Company multi-tenancy:
    // If user belongs to a company, the data tenant ID is their company_id.
    // If user is the company owner, companyId is their own user id.
    const companyId = user.company_id || user.id;
    const isCompanyOwner = !user.company_id || user.company_id === user.id;

    req.user = {
      ...user,
      id: companyId,             // Shared company tenant ID (so all services query company data)
      operatorId: user.id,       // Individual employee ID
      companyId: companyId,      // Explicit company ID
      companyProfileId: user.company_profile_id, // Assigned profile
      isCompanyOwner: isCompanyOwner
    };
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
