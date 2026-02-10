import { clsx } from 'clsx';
import { memo, useCallback, useState } from 'react';

import { useModalStore } from '../../stores/useModalStore';
import { Modal } from '../shared/Modal';
import { AppearanceTab } from './AppearanceTab';
import { ExtensionManager } from './extension/ExtensionManager';
import { ExtensionTab } from './extension/ExtensionTab';
import { GeneralTab } from './GeneralTab';

import type { JSX, ReactNode } from 'react';

const SETTING_TABS = [
  {
    id: 'general',
    label: 'General',
    description: (): ReactNode => 'Manage general application behavior and user interface preferences.',
    component: <GeneralTab />,
  },
  {
    id: 'appearance',
    label: 'Appearance',
    description: (): ReactNode => 'Select a color theme for the application.',
    component: <AppearanceTab />,
  },
  {
    id: 'extensions',
    label: 'Extensions',
    description: (): ReactNode => (
      <>
        Add external ingredients by providing a link to a public GitHub repository. The repository must contain a{' '}
        <code className="rounded-md bg-surface-hover p-1 text-xs text-content-secondary">manifest.json</code> file.
      </>
    ),
    component: <ExtensionTab />,
  },
] as const;

type SettingTab = (typeof SETTING_TABS)[number]['id'];

interface TabButtonProps {
  readonly id: SettingTab;
  readonly children: string;
  readonly isActive: boolean;
  readonly onClick: (id: SettingTab) => void;
}

const TabButton = memo<TabButtonProps>(({ children, isActive, onClick, id }): JSX.Element => {
  const handleClick = useCallback(() => {
    onClick(id);
  }, [id, onClick]);

  const tabClass = clsx('tab-button', isActive ? 'tab-button-active' : 'tab-button-inactive');

  return (
    <button className={tabClass} onClick={handleClick}>
      {children}
    </button>
  );
});

export const SettingPanel = memo((): JSX.Element => {
  const isModalOpen = useModalStore((state) => state.currentModal?.type === 'settings');
  const closeModal = useModalStore((state) => state.closeModal);

  const [activeTab, setActiveTab] = useState<SettingTab>('general');

  const handleTabSelect = useCallback((tab: SettingTab): void => {
    setActiveTab(tab);
  }, []);

  return (
    <>
      <Modal isOpen={isModalOpen} size="xl" title="Settings" onClose={closeModal}>
        <nav className="tab-nav">
          {SETTING_TABS.map((tab) => (
            <TabButton key={tab.id} id={tab.id} isActive={activeTab === tab.id} onClick={handleTabSelect}>
              {tab.label}
            </TabButton>
          ))}
        </nav>
        <div className="tab-content-wrapper">
          {SETTING_TABS.map((tab) => (
            <div
              key={tab.id}
              className={clsx(
                activeTab === tab.id ? 'tab-panel' : 'tab-panel-hidden',
                tab.id === 'extensions' ? 'overflow-hidden' : 'flex-1-overflow-auto',
              )}
            >
              {tab.description && <p className="text-description-small text-content-tertiary mb-1">{tab.description()}</p>}
              <div className="tab-content-container">{tab.component}</div>
            </div>
          ))}
        </div>
      </Modal>
      <ExtensionManager />
    </>
  );
});
