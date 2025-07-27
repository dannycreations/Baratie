import { memo, useCallback, useMemo } from 'react';

import { useModalStore } from '../../stores/useModalStore';
import { useSettingStore } from '../../stores/useSettingStore';
import { useThemeStore } from '../../stores/useThemeStore';
import { Modal } from '../shared/Modal';
import { AppearanceTab } from './AppearanceTab';
import { ExtensionTab } from './ExtensionTab';

import type { JSX } from 'react';
import type { SettingTab } from '../../stores/useSettingStore';

interface TabButtonProps {
  readonly id: string;
  readonly children: string;
  readonly isActive: boolean;
  readonly onClick: () => void;
}

const TABS: ReadonlyArray<{
  readonly id: SettingTab;
  readonly label: string;
  readonly component: JSX.Element;
}> = [
  { id: 'appearance', label: 'Appearance', component: <AppearanceTab /> },
  { id: 'extensions', label: 'Extensions', component: <ExtensionTab /> },
];

const TabButton = memo<TabButtonProps>(({ children, id, isActive, onClick }): JSX.Element => {
  const theme = useThemeStore((state) => state.theme);

  const tabClass = `
    px-4 py-2 text-sm font-medium rounded-t-md border-b-2
    outline-none transition-colors duration-150
    ${isActive ? `border-${theme.infoBorder} text-${theme.infoFg}` : `border-transparent text-${theme.contentTertiary} hover:text-${theme.contentPrimary}`}
  `;

  return (
    <button id={id} role="tab" aria-controls={`${id}-panel`} aria-selected={isActive} className={tabClass} onClick={onClick}>
      {children}
    </button>
  );
});

export const SettingPanel = memo((): JSX.Element => {
  const isModalOpen = useModalStore((state) => state.activeModal === 'settings');
  const closeModal = useModalStore((state) => state.closeModal);
  const activeTab = useSettingStore((state) => state.activeTab);
  const setActiveTab = useSettingStore((state) => state.setActiveTab);
  const theme = useThemeStore((state) => state.theme);
  const tabIdPrefix = 'setting-tab';

  const handleTabSelect = useCallback(
    (tab: SettingTab) => {
      setActiveTab(tab);
    },
    [setActiveTab],
  );

  const bodyContent = useMemo<JSX.Element | null>(() => {
    return TABS.find((tab) => tab.id === activeTab)?.component ?? null;
  }, [activeTab]);

  return (
    <Modal bodyClasses="p-0" contentClasses="flex max-h-[80vh] flex-col" isOpen={isModalOpen} size="xl" title="Settings" onClose={closeModal}>
      <div role="tablist" aria-label="Settings categories" className={`flex border-b border-${theme.borderPrimary} px-3`}>
        {TABS.map((tab) => (
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
      <div id={`${tabIdPrefix}-${activeTab}-panel`} role="tabpanel" aria-labelledby={`${tabIdPrefix}-${activeTab}`} className="overflow-y-auto p-3">
        {bodyContent}
      </div>
    </Modal>
  );
});
