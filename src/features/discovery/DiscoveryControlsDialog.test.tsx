import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { StrictMode } from 'react';
import { DEFAULT_RANKING_CONFIGURATION } from './engine/ranking';
import { DiscoveryControlsDialog } from './DiscoveryControlsDialog';

const originalShowModal = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'showModal');
const originalClose = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'close');
let showModalMock: ReturnType<typeof vi.fn>;
let closeMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  showModalMock = vi.fn(function (this: HTMLDialogElement) { this.setAttribute('open', ''); });
  closeMock = vi.fn(function (this: HTMLDialogElement) { this.removeAttribute('open'); });
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', { configurable: true, value: showModalMock });
  Object.defineProperty(HTMLDialogElement.prototype, 'close', { configurable: true, value: closeMock });
});

afterEach(() => {
  cleanup();
  if (originalShowModal) Object.defineProperty(HTMLDialogElement.prototype, 'showModal', originalShowModal);
  else Reflect.deleteProperty(HTMLDialogElement.prototype, 'showModal');
  if (originalClose) Object.defineProperty(HTMLDialogElement.prototype, 'close', originalClose);
  else Reflect.deleteProperty(HTMLDialogElement.prototype, 'close');
});

describe('DiscoveryControlsDialog', () => {
  it('calls onClose from the dialog close control', () => {
    const onClose = vi.fn();
    render(<StrictMode><DiscoveryControlsDialog open configuration={DEFAULT_RANKING_CONFIGURATION} onClose={onClose} onApply={vi.fn()} /></StrictMode>);
    fireEvent.click(screen.getByRole('button', { name: 'Close discovery controls' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not close itself during the StrictMode effect cleanup cycle', () => {
    const onClose = vi.fn();
    render(<StrictMode><DiscoveryControlsDialog open configuration={DEFAULT_RANKING_CONFIGURATION} onClose={onClose} onApply={vi.fn()} /></StrictMode>);
    expect(showModalMock).toHaveBeenCalledTimes(1);
    expect(closeMock).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });
});
