import { memo, useCallback, useMemo, useState } from 'react';

import { CONFIRM_TIMEOUT_MS } from '../../app/constants';
import { APP_THEMES } from '../../app/themes';
import { addExtension, removeExtension } from '../../helpers/extensionHelper';
import { getConfirmClasses } from '../../helpers/styleHelper';
import { useConditionalTimer } from '../../hooks/useConditionalTimer';
import { useExtensionStore } from '../../stores/useExtensionStore';
import { useSettingStore } from '../../stores/useSettingStore';
import { useThemeStore } from '../../stores/useThemeStore';
import { Button, TooltipButton } from '../shared/Button';
import { AlertTriangleIcon, CheckIcon, GitMergeIcon, Loader2Icon, Trash2Icon } from '../shared/Icon';
import { StringInput } from '../shared/input/StringInput';
import { ItemListLayout } from '../shared/layout/ItemListLayout';
import { Modal } from '../shared/Modal';
import { Tooltip } from '../shared/Tooltip';
import { EmptyView } from '../shared/View';

import type { ChangeEvent, JSX, KeyboardEvent, MouseEvent } from 'react';
import type { AppTheme } from '../../app/themes';
import type { Extension } from '../../stores/useExtensionStore';
import type { SettingTab } from '../../stores/useSettingStore';

interface TabButtonProps {
  readonly children: string;
  readonly isActive: boolean;
  readonly onClick: () => void;
}

const TabButton = memo(function TabButton({ children, isActive, onClick }: TabButtonProps) {
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

interface PalettePreviewProps {
  readonly theme: AppTheme;
}

const PalettePreview = memo(function PalettePreview({ theme }: PalettePreviewProps) {
  const swatchColors = [
    { color: theme.surfacePrimary, title: 'Page BG' },
    { color: theme.surfaceSecondary, title: 'Card BG' },
    { color: theme.accentBg, title: 'Accent' },
    { color: theme.contentPrimary, title: 'Text' },
    { color: theme.successFg, title: 'Success' },
    { color: theme.dangerFg, title: 'Error' },
  ];

  return (
    <div className="flex items-center space-x-1.5" aria-label="Theme color palette preview">
      {swatchColors.map(({ color, title }, index) => (
        <div
          key={`${title}-${index}`}
          className={`h-4 w-4 rounded-full border border-${theme.borderPrimary} bg-${color}`}
          title={title}
          aria-label={title}
        />
      ))}
    </div>
  );
});

const AppearanceSettings = memo(function AppearanceSettings() {
  const id = useThemeStore((state) => state.id);
  const theme = useThemeStore((state) => state.theme);
  const setTheme = useThemeStore((state) => state.setTheme);

  const handleSelectTheme = useCallback(
    (themeId: string) => {
      const themeToSet = APP_THEMES.find((theme) => theme.id === themeId);
      if (themeToSet) {
        setTheme(themeToSet.id);
      }
    },
    [setTheme],
  );

  return (
    <div role="radiogroup" aria-labelledby="theme-group-label">
      <p id="theme-group-label" className={`mb-3 text-sm text-${theme.contentTertiary}`}>
        Select a color theme for the application.
      </p>
      <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
        {APP_THEMES.map((item) => {
          const isChecked = id === item.id;
          const leftContent = (
            <div className="flex flex-col justify-center gap-1">
              <span className={`font-medium text-sm ${isChecked ? `text-${theme.infoFg}` : `text-${theme.contentPrimary}`}`}>{item.name}</span>
              <PalettePreview theme={item.theme} />
            </div>
          );

          const rightContent = isChecked ? (
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sky-500/20">
              <CheckIcon aria-hidden="true" className={`text-${theme.infoFg}`} size={16} />
            </div>
          ) : null;

          const itemLayoutClasses = [
            'h-16',
            'rounded-md',
            'p-3',
            'border-2',
            'transition-all',
            'duration-150',
            isChecked
              ? `border-${theme.infoBorder} bg-${theme.surfaceMuted}`
              : `border-${theme.borderPrimary} bg-${theme.surfaceSecondary} hover:bg-${theme.surfaceMuted} hover:border-${theme.borderSecondary}`,
          ]
            .filter(Boolean)
            .join(' ');

          const liClasses = ['list-none', 'cursor-pointer', 'rounded-md', 'outline-none', `focus:ring-2 focus:ring-${theme.ring}`]
            .filter(Boolean)
            .join(' ');

          return (
            <li
              key={item.id}
              role="radio"
              aria-checked={isChecked}
              tabIndex={0}
              className={liClasses}
              onClick={() => handleSelectTheme(item.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleSelectTheme(item.id);
                }
              }}
            >
              <ItemListLayout
                className={itemLayoutClasses}
                leftContent={leftContent}
                leftClass="grow min-w-0"
                rightContent={rightContent}
                rightClass="flex shrink-0 items-center"
              />
            </li>
          );
        })}
      </ul>
    </div>
  );
});

const ExtensionItemStatus = memo(function ExtensionItemStatus({
  status,
  errors,
}: {
  readonly status: Extension['status'];
  readonly errors?: readonly string[];
}) {
  const theme = useThemeStore((state) => state.theme);

  const statusMap = {
    loading: { icon: <Loader2Icon className="animate-spin" size={16} />, text: 'Loading...', color: theme.contentTertiary },
    loaded: { icon: <CheckIcon size={16} />, text: 'Loaded', color: theme.successFg },
    error: { icon: <AlertTriangleIcon size={16} />, text: 'Error', color: theme.dangerFg },
    partial: { icon: <AlertTriangleIcon size={16} />, text: 'Partial', color: theme.warningFg },
  };

  const current = statusMap[status] || statusMap.error;
  const content = (
    <div className={`flex items-center gap-1.5 text-xs font-medium text-${current.color}`}>
      {current.icon}
      <span>{current.text}</span>
    </div>
  );

  const hasErrors = errors && errors.length > 0;
  if (hasErrors) {
    const errorList = errors.join('\n');
    return (
      <Tooltip content={`Errors:\n${errorList}`} position="top" tooltipClassName="max-w-sm whitespace-pre-line">
        {content}
      </Tooltip>
    );
  }

  return content;
});

const ExtensionSettings = memo(function ExtensionSettings() {
  const theme = useThemeStore((state) => state.theme);
  const extensions = useExtensionStore((state) => state.extensions);

  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const resetDeleting = useCallback(() => {
    setDeletingId(null);
  }, []);

  useConditionalTimer({
    state: deletingId ? 'running' : 'stopped',
    callback: resetDeleting,
    duration: CONFIRM_TIMEOUT_MS,
  });

  const handleAdd = useCallback(async () => {
    if (!url.trim() || isLoading) return;
    setIsLoading(true);
    try {
      await addExtension(url);
      setUrl('');
    } finally {
      setIsLoading(false);
    }
  }, [url, isLoading]);

  const handleUrlChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setUrl(event.target.value);
  }, []);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Enter') {
        handleAdd();
      }
    },
    [handleAdd],
  );

  const handleDelete = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      if (!(event.currentTarget instanceof HTMLButtonElement)) return;
      const extensionId = event.currentTarget.dataset.extensionId;
      if (!extensionId) return;

      if (deletingId === extensionId) {
        removeExtension(extensionId);
        setDeletingId(null);
      } else {
        setDeletingId(extensionId);
      }
    },
    [deletingId],
  );

  return (
    <div className="space-y-4">
      <div>
        <p className={`text-sm text-${theme.contentTertiary}`}>
          Add external ingredients by providing a link to a public GitHub repository. The repository must contain a{' '}
          <code className={`rounded-md bg-${theme.surfaceHover} p-1 text-xs text-${theme.contentSecondary}`}>manifest.json</code> file.
        </p>
      </div>

      <div className="flex items-center gap-2">
        <StringInput
          id="extension-url-input"
          ariaLabel="GitHub Repository URL"
          className="flex-grow"
          disabled={isLoading}
          placeholder="https://github.com/user/repository"
          value={url}
          onChange={handleUrlChange}
          onKeyDown={handleKeyDown}
        />
        <Button icon={<GitMergeIcon size={20} />} loading={isLoading} size="md" onClick={handleAdd}>
          Add
        </Button>
      </div>

      <div>
        <h4 className={`mb-2 text-base font-medium text-${theme.contentSecondary}`}>Installed Extensions</h4>
        {extensions.length === 0 ? (
          <EmptyView>No extensions have been installed yet.</EmptyView>
        ) : (
          <ul className="space-y-1.5">
            {extensions.map((extension) => {
              const isDeleting = deletingId === extension.id;
              const deleteButtonTip = isDeleting ? 'Confirm Deletion' : 'Remove Extension';
              const deleteButtonLabel = isDeleting ? `Confirm removal of extension ${extension.name}` : `Remove extension ${extension.name}`;
              const deleteButtonClasses = isDeleting ? getConfirmClasses(theme) : undefined;

              const leftContent = (
                <div className="flex flex-col">
                  <span className={`font-medium text-${theme.contentPrimary}`}>{extension.name}</span>
                  <span className={`text-xs text-${theme.contentTertiary}`}>{extension.id}</span>
                </div>
              );

              const rightContent = (
                <div className="flex items-center gap-4">
                  <ExtensionItemStatus status={extension.status} errors={extension.errors} />
                  <TooltipButton
                    aria-label={deleteButtonLabel}
                    className={deleteButtonClasses}
                    data-extension-id={extension.id}
                    icon={isDeleting ? <AlertTriangleIcon className={`text-${theme.dangerFg}`} size={18} /> : <Trash2Icon size={18} />}
                    size="sm"
                    tooltipContent={deleteButtonTip}
                    variant="danger"
                    onClick={handleDelete}
                  />
                </div>
              );

              return (
                <li key={extension.id} className="list-none">
                  <ItemListLayout
                    className={`h-16 rounded-md bg-${theme.surfaceTertiary} p-3 text-sm transition-colors duration-150 hover:bg-${theme.surfaceMuted}`}
                    leftContent={leftContent}
                    leftClass="grow min-w-0 mr-2"
                    rightContent={rightContent}
                    rightClass="flex shrink-0 items-center"
                  />
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
});

export const SettingPanel = memo(function SettingPanel(): JSX.Element {
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

  const bodyContent = useMemo(() => {
    switch (activeTab) {
      case 'appearance':
        return <AppearanceSettings />;
      case 'extensions':
        return <ExtensionSettings />;
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
