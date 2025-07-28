import { memo, useCallback, useMemo, useState } from 'react';

import { useModalStore } from '../../stores/useModalStore';
import { useThemeStore } from '../../stores/useThemeStore';
import { Modal } from '../shared/Modal';
import { AppearanceTab } from './AppearanceTab';
import { ExtensionTab } from './ExtensionTab';

import type { JSX } from 'react';

const SETTING_TABS = [
  { id: 'appearance', label: 'Appearance', component: <AppearanceTab /> },
  { id: 'extensions', label: 'Extensions', component: <ExtensionTab /> },
] as const;

type SettingTab = (typeof SETTING_TABS)[number]['id'];

interface TabButtonProps {
  readonly id: string;
  readonly children: string;
  readonly isActive: boolean;
  readonly onClick: () => void;
}

const TabButton = memo<TabButtonProps>(({ children, id, isActive, onClick }): JSX.Element => {
  const theme = useThemeStore((state) => state.theme);

  const tabClass = `
    px-2 py-2 text-sm font-medium rounded-t-md border-b-2
    outline-none transition-colors duration-150
    ${isActive ? `border-${theme.infoBorder} text-${theme.infoFg}` : `border-transparent text-${theme.contentTertiary} hover:text-${theme.contentPrimary}`}
  `;

  return (
    <button id={id} className={tabClass} role="tab" aria-selected={isActive} aria-controls={`${id}-panel`} onClick={onClick}>
      {children}
    </button>
  );
});

export const SettingPanel = memo((): JSX.Element => {
  const isModalOpen = useModalStore((state) => state.activeModal === 'settings');
  const closeModal = useModalStore((state) => state.closeModal);
  const theme = useThemeStore((state) => state.theme);

  const [activeTab, setActiveTab] = useState<SettingTab>('appearance');
  const tabIdPrefix = 'setting-tab';

  const handleTabSelect = useCallback((tab: SettingTab): void => {
    setActiveTab(tab);
  }, []);

  const bodyContent = useMemo<JSX.Element | null>(() => {
    return SETTING_TABS.find((tab) => tab.id === activeTab)?.component ?? null;
  }, [activeTab]);

  return (
    <Modal isOpen={isModalOpen} size="xl" title="Settings" bodyClasses="p-3" contentClasses="flex max-h-[80vh] flex-col" onClose={closeModal}>
      <div role="tablist" aria-label="Settings categories" className={`flex gap-1 border-b border-${theme.borderPrimary}`}>
        {SETTING_TABS.map((tab) => (
          <TabButton
            key={tab.id}
            id={`${tabIdPrefix}-${tab.id}`}
            isActive={activeTab === tab.id}
            onClick={() => {
              handleTabSelect(tab.id);
            }}
          >
            {tab.label}
          </TabButton>
        ))}
      </div>
      <div id={`${tabIdPrefix}-${activeTab}-panel`} className="grow pt-3" role="tabpanel" aria-labelledby={`${tabIdPrefix}-${activeTab}`}>
        {bodyContent}
      </div>
    </Modal>
  );
});
