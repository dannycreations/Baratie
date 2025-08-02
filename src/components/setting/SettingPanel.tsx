import { memo, useCallback, useState } from 'react';

import { useModalStore } from '../../stores/useModalStore';
import { useThemeStore } from '../../stores/useThemeStore';
import { Modal } from '../shared/Modal';
import { AppearanceTab } from './AppearanceTab';
import { ExtensionManager } from './extension/ExtensionManager';
import { ExtensionTab } from './extension/ExtensionTab';
import { GeneralTab } from './GeneralTab';

import type { JSX } from 'react';

const SETTING_TABS = [
  { id: 'general', label: 'General', component: <GeneralTab /> },
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

  const tabClass = `p-2 font-medium text-sm rounded-t-md border-b-2 outline-none transition-colors duration-150 ${isActive ? `border-${theme.infoBorder} text-${theme.infoFg}` : `border-transparent text-${theme.contentTertiary} hover:text-${theme.contentPrimary}`}`;

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

  const [activeTab, setActiveTab] = useState<SettingTab>('general');
  const tabIdPrefix = 'setting-tab';

  const handleTabSelect = useCallback((tab: SettingTab): void => {
    setActiveTab(tab);
  }, []);

  return (
    <>
      <Modal isOpen={isModalOpen} size="xl" title="Settings" contentClasses="flex flex-col max-h-[80vh]" onClose={closeModal}>
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
        <div className="grow min-h-0 pt-3">
          {SETTING_TABS.map((tab) => (
            <div
              key={tab.id}
              id={`${tabIdPrefix}-${tab.id}-panel`}
              role="tabpanel"
              hidden={activeTab !== tab.id}
              aria-labelledby={`${tabIdPrefix}-${tab.id}`}
              className="h-full"
            >
              {tab.component}
            </div>
          ))}
        </div>
      </Modal>
      <ExtensionManager />
    </>
  );
});
