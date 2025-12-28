'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations, Language, TranslationKey } from '../i18n/translations';
import { useAuth } from './AuthContext';
import { FirestoreService } from '@/lib/firebase/firestore';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: TranslationKey;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('th');
  const { user } = useAuth();

  // Load from LocalStorage on mount
  useEffect(() => {
    const savedLang = localStorage.getItem('language') as Language;
    if (savedLang && (savedLang === 'en' || savedLang === 'th')) {
      setLanguageState(savedLang);
    }
  }, []);

  // Sync with User Profile when user logs in
  useEffect(() => {
    const syncUserLanguage = async () => {
      if (user) {
        // Fetch user profile to get saved language
        try {
          const userProfile = await FirestoreService.getUser(user.uid);
          if (userProfile && userProfile.language && (userProfile.language === 'en' || userProfile.language === 'th')) {
            // Apply user preference from DB
            setLanguageState(userProfile.language as Language);
            localStorage.setItem('language', userProfile.language);
          } else {
            // If no language in DB, save current local language to DB
            await FirestoreService.updateUserLanguage(user.uid, language);
          }
        } catch (error) {
          console.error("Failed to sync language", error);
        }
      }
    };

    syncUserLanguage();
  }, [user]);

  const setLanguage = async (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('language', lang);

    // If user is logged in, save to Firestore
    if (user) {
      await FirestoreService.updateUserLanguage(user.uid, lang);
    }
  };

  const value = {
    language,
    setLanguage,
    t: translations[language],
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
