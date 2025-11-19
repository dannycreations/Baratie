import { memo, useCallback, useState } from 'react';

import { useModalStore } from '../../stores/useModalStore';
import { useThemeStore } from '../../stores/useThemeStore';
import { cn } from '../../utilities/styleUtil';
import { Modal } from '../shared/Modal';
import { AppearanceTab } from './AppearanceTab';
import { ExtensionManager } from './extension/ExtensionManager';
import { ExtensionTab } from './extension/ExtensionTab';
import { GeneralTab } from './GeneralTab';

import type { JSX, ReactNode } from 'react';
import type { AppTheme } from '../../app/themes';

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
    description: (theme: AppTheme): ReactNode => (
      <>
        Add external ingredients by providing a link to a public GitHub repository. The repository must contain a{' '}
        <code className={cn('p-1 rounded-md text-xs', `bg-${theme.surfaceHover}`, `text-${theme.contentSecondary}`)}>manifest.json</code> file.
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
  const theme = useThemeStore((state) => state.theme);

  const handleClick = useCallback(() => {
    onClick(id);
  }, [id, onClick]);

  const tabClass = cn(
    'p-2 font-medium text-sm rounded-t-md border-b-2 outline-none transition-colors duration-150',
    isActive
      ? `border-${theme.infoBorder} text-${theme.infoFg}`
      : `border-transparent text-${theme.contentTertiary} hover:bg-${theme.surfaceMuted} hover:text-${theme.contentPrimary}`,
  );

  return (
    <button className={tabClass} onClick={handleClick}>
      {children}
    </button>
  );
});

export const SettingPanel = memo((): JSX.Element => {
  const isModalOpen = useModalStore((state) => state.currentModal?.type === 'settings');
  const closeModal = useModalStore((state) => state.closeModal);
  const theme = useThemeStore((state) => state.theme);

  const [activeTab, setActiveTab] = useState<SettingTab>('general');

  const handleTabSelect = useCallback((tab: SettingTab): void => {
    setActiveTab(tab);
  }, []);

  return (
    <>
      <Modal isOpen={isModalOpen} size="xl" title="Settings" onClose={closeModal}>
        <nav className={cn('flex gap-1 border-b', `border-${theme.borderPrimary}`)}>
          {SETTING_TABS.map((tab) => (
            <TabButton key={tab.id} id={tab.id} isActive={activeTab === tab.id} onClick={handleTabSelect}>
              {tab.label}
            </TabButton>
          ))}
        </nav>
        <div className="flex min-h-0 flex-1 flex-col pt-3">
          {SETTING_TABS.map((tab) => (
            <div
              key={tab.id}
              className={cn(
                activeTab === tab.id ? 'flex h-full flex-col gap-3' : 'hidden',
                tab.id === 'extensions' ? 'overflow-hidden' : 'overflow-y-auto',
              )}
            >
              {tab.description && <p className={cn('text-sm', `text-${theme.contentTertiary}`)}>{tab.description(theme)}</p>}
              {tab.component}
            </div>
          ))}
        </div>
      </Modal>
      <ExtensionManager />
    </>
  );
});
