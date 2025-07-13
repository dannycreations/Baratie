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
    'focus:outline-none',
    isActive ? `border-b-2 border-${theme.infoBorder} text-${theme.infoFg}` : `border-b-2 border-transparent text-${theme.contentTertiary}`,
    `focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-${theme.surfaceSecondary} focus-visible:ring-${theme.ring}`,
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
    (event: MouseEvent<HTMLDivElement> | KeyboardEvent<HTMLDivElement>) => {
      if (!(event.currentTarget instanceof HTMLDivElement)) return;
      const rawThemeId = event.currentTarget.dataset.themeId;
      const themeToSet = APP_THEMES.find((theme) => theme.id === rawThemeId);
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
      <div className={`overflow-hidden rounded-md border border-${theme.borderPrimary}`}>
        {APP_THEMES.map((item, index) => {
          const isChecked = id === item.id;
          const radioClasses = [
            'flex',
            'cursor-pointer',
            'items-center',
            'justify-between',
            'p-4',
            'outline-none',
            `hover:bg-${theme.surfaceHover}`,
            `focus:ring-2 focus:ring-${theme.ring}`,
            index > 0 && `border-t border-${theme.borderPrimary}`,
          ]
            .filter(Boolean)
            .join(' ');
          const nameClasses = ['font-medium', isChecked ? `text-${theme.infoFg}` : `text-${theme.contentSecondary}`].filter(Boolean).join(' ');

          return (
            <div
              key={item.id}
              role="radio"
              aria-checked={isChecked}
              tabIndex={isChecked ? 0 : -1}
              data-theme-id={item.id}
              className={radioClasses}
              onClick={handleSelectTheme}
            >
              <div className="flex items-center gap-4">
                <span className={nameClasses}>{item.name}</span>
                <PalettePreview theme={item.theme} />
              </div>
              {isChecked && <CheckIcon aria-hidden="true" className={`text-${theme.infoFg}`} size={20} />}
            </div>
          );
        })}
      </div>
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
          <ul className={`space-y-2 rounded-md border border-${theme.borderPrimary} p-2`}>
            {extensions.map((extension) => {
              const isDeleting = deletingId === extension.id;
              const deleteButtonTip = isDeleting ? 'Confirm Deletion' : 'Remove Extension';
              const deleteButtonLabel = isDeleting ? `Confirm removal of extension ${extension.name}` : `Remove extension ${extension.name}`;
              const deleteButtonClasses = isDeleting ? getConfirmClasses(theme) : undefined;

              return (
                <li
                  key={extension.id}
                  className={`flex items-center justify-between rounded-md bg-${theme.surfaceTertiary} p-3 text-sm transition-colors hover:bg-${theme.surfaceMuted}`}
                >
                  <div className="flex flex-col gap-1">
                    <span className={`font-medium text-${theme.contentPrimary}`}>{extension.name}</span>
                    <span className={`text-xs text-${theme.contentTertiary}`}>{extension.id}</span>
                  </div>
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
