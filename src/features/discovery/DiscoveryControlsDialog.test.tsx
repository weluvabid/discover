import { StrictMode } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DiscoveryControlsDialog } from './DiscoveryControlsDialog';
import { DEFAULT_RANKING_CONFIGURATION } from './engine/ranking';

describe('DiscoveryControlsDialog', () => {
  const originalShowModal = Object.getOwnPropertyDescriptor(
    HTMLDialogElement.prototype,
    'showModal',
  );
  const originalClose = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'close');
  const showModal = vi.fn(function (this: HTMLDialogElement) {
    this.setAttribute('open', '');
  });
  const close = vi.fn(function (this: HTMLDialogElement) {
    this.removeAttribute('open');
  });

  beforeEach(() => {
    Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
      configurable: true,
      value: showModal,
    });
    Object.defineProperty(HTMLDialogElement.prototype, 'close', {
      configurable: true,
      value: close,
    });
    showModal.mockClear();
    close.mockClear();
  });

  afterEach(() => {
    cleanup();

    if (originalShowModal) {
      Object.defineProperty(HTMLDialogElement.prototype, 'showModal', originalShowModal);
    } else {
      Reflect.deleteProperty(HTMLDialogElement.prototype, 'showModal');
    }

    if (originalClose) {
      Object.defineProperty(HTMLDialogElement.prototype, 'close', originalClose);
    } else {
      Reflect.deleteProperty(HTMLDialogElement.prototype, 'close');
    }

    vi.restoreAllMocks();
  });

  it('stays open when mounted under React StrictMode', () => {
    const onClose = vi.fn();

    render(
      <StrictMode>
        <DiscoveryControlsDialog
          open
          configuration={DEFAULT_RANKING_CONFIGURATION}
          onClose={onClose}
          onApply={vi.fn()}
        />
      </StrictMode>,
    );

    expect(screen.getByRole('dialog', { name: 'Discovery Controls' })).toHaveAttribute('open');
    expect(showModal).toHaveBeenCalledTimes(1);
    expect(close).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('calls onClose from the dialog close control', () => {
    const onClose = vi.fn();

    render(
      <DiscoveryControlsDialog
        open
        configuration={DEFAULT_RANKING_CONFIGURATION}
        onClose={onClose}
        onApply={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Close discovery controls' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
