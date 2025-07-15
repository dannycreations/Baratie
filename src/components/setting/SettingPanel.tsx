import { memo, useCallback, useMemo } from 'react';

import { useSettingStore } from '../../stores/useSettingStore';
import { useThemeStore } from '../../stores/useThemeStore';
import { Modal } from '../shared/Modal';
import { AppearanceTab } from './AppearanceTab';
import { ExtensionTab } from './ExtensionTab';

import type { JSX } from 'react';
import type { SettingTab } from '../../stores/useSettingStore';

interface TabButtonProps {
  readonly children: string;
  readonly isActive: boolean;
  readonly onClick: () => void;
}

const TabButton = memo<TabButtonProps>(({ children, isActive, onClick }): JSX.Element => {
  const theme = useThemeStore((state) => state.theme);
  const classes = [
    'px-4',
    'py-2',
    'text-sm',
    'font-medium',
    'rounded-t-md',
    'transition-colors',
    'duration-150',
    'outline-none',
    'border-b-2',
    isActive ? `border-${theme.infoBorder} text-${theme.infoFg}` : `border-transparent text-${theme.contentTertiary}`,
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <button role="tab" aria-selected={isActive} className={classes} onClick={onClick}>
      {children}
    </button>
  );
});

export const SettingPanel = memo((): JSX.Element => {
  const isModalOpen = useSettingStore((state) => state.isModalOpen);
  const activeTab = useSettingStore((state) => state.activeTab);
  const closeModal = useSettingStore((state) => state.closeModal);
  const setActiveTab = useSettingStore((state) => state.setActiveTab);
  const theme = useThemeStore((state) => state.theme);

  const handleTabSelect = useCallback(
    (tab: SettingTab) => {
      setActiveTab(tab);
    },
    [setActiveTab],
  );

  const bodyContent = useMemo<JSX.Element | null>(() => {
    switch (activeTab) {
      case 'appearance':
        return <AppearanceTab />;
      case 'extensions':
        return <ExtensionTab />;
      default:
        return null;
    }
  }, [activeTab]);

  return (
    <Modal isOpen={isModalOpen} onClose={closeModal} size="xl" title="Settings" contentClassName="flex max-h-[80vh] flex-col" bodyClassName="p-0">
      <div role="tablist" aria-label="Settings categories" className={`flex border-b border-${theme.borderPrimary} px-3`}>
        <TabButton isActive={activeTab === 'appearance'} onClick={() => handleTabSelect('appearance')}>
          Appearance
        </TabButton>
        <TabButton isActive={activeTab === 'extensions'} onClick={() => handleTabSelect('extensions')}>
          Extensions
        </TabButton>
      </div>
      <div className="overflow-y-auto p-3">{bodyContent}</div>
    </Modal>
  );
});
