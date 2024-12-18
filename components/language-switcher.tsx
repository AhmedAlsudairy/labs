'use client';

import { useEffect, useState } from 'react';
import { useLanguage } from '@/context/language-context';
import { Button } from './ui/button';
import { Languages } from 'lucide-react';

declare global {
  interface Window {
    google: any;
    googleTranslateElementInit: () => void;
  }
}

export function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();

  useEffect(() => {
    // Initialize Google Translate
    const script = document.createElement('script');
    script.src = '//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
    script.async = true;
    
    window.googleTranslateElementInit = function() {
      new window.google.translate.TranslateElement(
        {
          pageLanguage: 'en',
          includedLanguages: 'en,ar',
          autoDisplay: false
        },
        'google_translate_element'
      );
    };

    document.body.appendChild(script);

    // Add styles
    const style = document.createElement('style');
    style.innerHTML = `
      .goog-te-banner-frame.skiptranslate,
      .goog-te-gadget-icon {
        display: none !important;
      }
      .goog-te-gadget-simple {
        background-color: transparent !important;
        border: none !important;
        padding: 0 !important;
        font-size: 0 !important;
      }
      .goog-te-gadget-simple > span,
      .goog-te-gadget-simple > div {
        display: none !important;
      }
      .goog-te-menu-value {
        display: none !important;
      }
      body {
        top: 0 !important;
      }
      .VIpgJd-ZVi9od-l4eHX-hSRGPd,
      .VIpgJd-ZVi9od-ORHb-OEVmcd {
        display: none !important;
      }
    `;
    document.head.appendChild(style);

    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
      if (style.parentNode) {
        style.parentNode.removeChild(style);
      }
    };
  }, []);

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'ar' : 'en');

    // Update HTML attributes
    const html = document.documentElement;
    html.dir = language === 'ar' ? 'rtl' : 'ltr';
    html.lang = language;

    // Trigger Google Translate
    const translateCombo = document.querySelector('.goog-te-combo') as HTMLSelectElement;
    if (translateCombo) {
      translateCombo.value = language === 'ar' ? 'ar' : 'en';
      translateCombo.dispatchEvent(new Event('change'));
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="ghost"
        size="sm"
        onClick={toggleLanguage}
        className="flex items-center gap-2 text-sm font-medium hover:bg-transparent"
      >
        <Languages className="h-4 w-4" />
        <span>{language === 'ar' ? 'العربية' : 'English'}</span>
      </Button>
      <div 
        id="google_translate_element" 
        className="hidden"
        aria-hidden="true"
      />
    </div>
  );
}
