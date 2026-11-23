import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { apiClient } from '../api/client.js';
import { useAuth } from './AuthContext.jsx';

const ProfileContext = createContext(null);

export function ProfileProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [profiles, setProfiles] = useState([]);
  const [activeProfileId, setActiveProfileId] = useState(() => {
    return typeof window !== 'undefined' ? localStorage.getItem('finai_active_profile_id') : null;
  });
  const [loading, setLoading] = useState(false);
  const [isSwitcherOpen, setIsSwitcherOpen] = useState(false);

  const loadProfiles = async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    try {
      const list = await apiClient.getCompanyProfiles();
      setProfiles(list);

      // Verify if activeProfileId still exists
      const savedId = localStorage.getItem('finai_active_profile_id');
      const found = list.find((p) => p.id === savedId);

      if (found) {
        setActiveProfileId(found.id);
      } else {
        // Fallback to default (admin)
        const def = list.find((p) => p.is_default) || list[0];
        if (def) {
          setActiveProfileId(def.id);
          localStorage.setItem('finai_active_profile_id', def.id);
        }
      }
    } catch (err) {
      console.error('Error loading company profiles:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadProfiles();
    } else {
      setProfiles([]);
    }
  }, [isAuthenticated]);

  const activeProfile = useMemo(() => {
    if (profiles.length === 0) return null;
    return profiles.find((p) => p.id === activeProfileId) || profiles.find((p) => p.is_default) || profiles[0];
  }, [profiles, activeProfileId]);

  // Granular permissions map
  const permissions = useMemo(() => {
    if (!activeProfile) {
      // Default open if loading
      return {
        canViewBalances: true,
        canViewReports: true,
        canAddTransactions: true,
        canEditDeleteTransactions: true,
        canImportStatements: true,
        canViewScheduledPayments: true,
        canConfirmScheduledPayments: true,
        canViewCards: true,
        canManageBudgets: true,
        canUseAiAssistant: true,
        canManageProfiles: true,
        isAdmin: true
      };
    }

    const isAdmin = activeProfile.role_type === 'admin' || activeProfile.is_default;

    return {
      canViewBalances: isAdmin || Boolean(activeProfile.can_view_balances),
      canViewReports: isAdmin || Boolean(activeProfile.can_view_reports),
      canAddTransactions: isAdmin || Boolean(activeProfile.can_add_transactions),
      canEditDeleteTransactions: isAdmin || Boolean(activeProfile.can_edit_delete_transactions),
      canImportStatements: isAdmin || Boolean(activeProfile.can_import_statements),
      canViewScheduledPayments: isAdmin || Boolean(activeProfile.can_view_scheduled_payments),
      canConfirmScheduledPayments: isAdmin || Boolean(activeProfile.can_confirm_scheduled_payments),
      canViewCards: isAdmin || Boolean(activeProfile.can_view_cards),
      canManageBudgets: isAdmin || Boolean(activeProfile.can_manage_budgets),
      canUseAiAssistant: isAdmin || Boolean(activeProfile.can_use_ai_assistant),
      canManageProfiles: isAdmin || Boolean(activeProfile.can_manage_profiles),
      isAdmin
    };
  }, [activeProfile]);

  const switchProfile = async (profileId, pin = null) => {
    const target = profiles.find((p) => p.id === profileId);
    if (!target) {
      throw new Error('Perfil não encontrado.');
    }

    if (target.has_pin) {
      const res = await apiClient.verifyCompanyProfilePin(profileId, pin);
      if (!res.valid) {
        throw new Error(res.error || 'PIN incorreto.');
      }
    }

    setActiveProfileId(target.id);
    localStorage.setItem('finai_active_profile_id', target.id);
    setIsSwitcherOpen(false);
    return target;
  };

  return (
    <ProfileContext.Provider
      value={{
        profiles,
        activeProfile,
        permissions,
        loading,
        switchProfile,
        refreshProfiles: loadProfiles,
        isSwitcherOpen,
        openSwitcher: () => setIsSwitcherOpen(true),
        closeSwitcher: () => setIsSwitcherOpen(false)
      }}
    >
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const context = useContext(ProfileContext);
  if (!context) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }
  return context;
}
