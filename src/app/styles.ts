export const APP_STYLES = `
html {
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
}

body {
  width: 100%;
  min-height: 100%;
  margin: 0;
  padding: 0;
  font-family: 'Inter', sans-serif;
  overflow-x: hidden;
  line-height: 1.6;
  user-select: none;
}

::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: transparent;
  border-right: inset -4px 0 0 0 transparent;
}

::-webkit-scrollbar-thumb {
  background: var(--scrollbar-thumb);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: var(--scrollbar-thumb-hover);
}

::-webkit-scrollbar-button {
  display: none;
  width: 0;
  height: 0;
}

.allow-text-selection {
  -webkit-user-select: text;
  -ms-user-select: text;
  user-select: text;
}

textarea.allow-text-selection::placeholder {
  -webkit-user-select: none;
  -ms-user-select: none;
  user-select: none;
}

body.grabbing,
body.grabbing * {
  cursor: grabbing !important;
}

[draggable='true']:hover {
  cursor: grab;
}

[draggable='true']:active {
  cursor: grabbing;
}

@keyframes slideInUp {
  from {
    opacity: 0;
    transform: translateY(30px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes fadeOut {
  from {
    opacity: 1;
  }
  to {
    opacity: 0;
  }
}

.notification-enter-active {
  animation: slideInUp 0.35s cubic-bezier(0.215, 0.61, 0.355, 1) forwards;
}

.notification-exit-active {
  animation: fadeOut 0.4s ease-out forwards;
}

@keyframes progressBarDecrease {
  from {
    width: 100%;
  }
  to {
    width: 0%;
  }
}

.progress-bar-fill {
  animation-name: progressBarDecrease;
  animation-timing-function: linear;
  animation-fill-mode: forwards;
}

.notification-paused .progress-bar-fill {
  animation-play-state: paused;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes fadeOutModal {
  from {
    opacity: 1;
  }
  to {
    opacity: 0;
  }
}

@keyframes scaleUp {
  from {
    opacity: 0;
    transform: scale(0.97) translateY(8px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

@keyframes scaleDown {
  from {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
  to {
    opacity: 0;
    transform: scale(0.97) translateY(8px);
  }
}

@keyframes fadeInText {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.fade-in-text {
  animation: fadeInText 0.4s ease-out forwards;
}

.modal-backdrop-enter-active {
  animation: fadeIn 0.15s ease-out forwards;
}

.modal-backdrop-exit-active {
  animation: fadeOutModal 0.2s ease-in forwards;
}

.modal-content-enter-active {
  animation: scaleUp 0.2s ease-out forwards;
}

.modal-content-exit-active {
  animation: scaleDown 0.2s ease-in forwards;
}

@keyframes recipeSpicesEnter {
  from {
    opacity: 0;
    transform: translateY(-10px) scale(0.98);
    max-height: 0;
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
    max-height: 500px;
  }
}

.recipe-item-spices-enter-active {
  animation: recipeSpicesEnter 0.3s ease-out forwards;
  overflow: hidden;
}
`;
