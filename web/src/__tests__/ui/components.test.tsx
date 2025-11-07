import React from 'react';

import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import Skeleton, { SkeletonTable, SkeletonCard } from '@/components/ui/Skeleton';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import Toast from '@/components/ui/Toast';

describe('UI Components', () => {
  describe('LoadingSpinner', () => {
    it('should render loading spinner', () => {
      render(<LoadingSpinner />);
      const spinner = screen.getByRole('status');
      expect(spinner).toBeInTheDocument();
    });

    it('should render with label', () => {
      render(<LoadingSpinner label="Loading data..." />);
      expect(screen.getByText('Loading data...')).toBeInTheDocument();
    });

    it('should render different sizes', () => {
      const { rerender } = render(<LoadingSpinner size="sm" />);
      let spinner = screen.getByRole('status');
      expect(spinner).toHaveClass('w-4', 'h-4');

      rerender(<LoadingSpinner size="lg" />);
      spinner = screen.getByRole('status');
      expect(spinner).toHaveClass('w-12', 'h-12');
    });
  });

  describe('Skeleton', () => {
    it('should render skeleton loader', () => {
      render(<Skeleton />);
      const skeleton = screen.getByRole('status');
      expect(skeleton).toBeInTheDocument();
      expect(skeleton).toHaveClass('animate-pulse');
    });

    it('should render multiple skeletons', () => {
      render(<Skeleton count={3} />);
      const skeletons = screen.getAllByRole('status');
      expect(skeletons).toHaveLength(3);
    });

    it('should render skeleton table', () => {
      render(<SkeletonTable />);
      const skeletons = screen.getAllByRole('status');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('should render skeleton card', () => {
      render(<SkeletonCard />);
      const skeletons = screen.getAllByRole('status');
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });

  describe('ConfirmDialog', () => {
    it('should render dialog when open', () => {
      render(
        <ConfirmDialog
          title="Confirm Action"
          message="Are you sure?"
          isOpen={true}
          onConfirm={vi.fn()}
        />
      );

      expect(screen.getByText('Confirm Action')).toBeInTheDocument();
      expect(screen.getByText('Are you sure?')).toBeInTheDocument();
    });

    it('should not render dialog when closed', () => {
      render(
        <ConfirmDialog
          title="Confirm Action"
          message="Are you sure?"
          isOpen={false}
          onConfirm={vi.fn()}
        />
      );

      expect(screen.queryByText('Confirm Action')).not.toBeInTheDocument();
    });

    it('should call onConfirm when confirm button clicked', async () => {
      const user = userEvent.setup();
      const onConfirm = vi.fn();

      render(
        <ConfirmDialog
          title="Confirm"
          message="Are you sure?"
          confirmText="Yes"
          isOpen={true}
          onConfirm={onConfirm}
        />
      );

      await user.click(screen.getByText('Yes'));
      expect(onConfirm).toHaveBeenCalled();
    });

    it('should call onCancel when cancel button clicked', async () => {
      const user = userEvent.setup();
      const onCancel = vi.fn();

      render(
        <ConfirmDialog
          title="Confirm"
          message="Are you sure?"
          cancelText="No"
          isOpen={true}
          onConfirm={vi.fn()}
          onCancel={onCancel}
        />
      );

      await user.click(screen.getByText('No'));
      expect(onCancel).toHaveBeenCalled();
    });

    it('should show danger styling for dangerous actions', () => {
      render(
        <ConfirmDialog
          title="Delete"
          message="This cannot be undone"
          isOpen={true}
          onConfirm={vi.fn()}
          isDangerous={true}
        />
      );

      const confirmButton = screen.getByText('Confirm');
      expect(confirmButton).toHaveClass('bg-[var(--destructive)]');
    });
  });

  describe('Toast', () => {
    it('should render toast message', () => {
      render(<Toast message="Success!" type="success" />);
      expect(screen.getByText('Success!')).toBeInTheDocument();
    });

    it('should render different toast types', () => {
      const { rerender } = render(<Toast message="Test" type="success" />);
      let toast = screen.getByRole('alert');
      expect(toast).toHaveClass('bg-green-500');

      rerender(<Toast message="Test" type="error" />);
      toast = screen.getByRole('alert');
      expect(toast).toHaveClass('bg-red-500');
    });

    it('should auto-dismiss after duration', async () => {
      const onClose = vi.fn();
      render(
        <Toast
          message="Test"
          type="info"
          duration={100}
          onClose={onClose}
        />
      );

      expect(screen.getByText('Test')).toBeInTheDocument();

      await waitFor(
        () => {
          expect(onClose).toHaveBeenCalled();
        },
        { timeout: 200 }
      );
    });

    it('should have proper accessibility attributes', () => {
      render(<Toast message="Alert message" type="warning" />);
      const alert = screen.getByRole('alert');
      expect(alert).toHaveAttribute('aria-live', 'polite');
    });
  });

  describe('Accessibility', () => {
    it('LoadingSpinner should have proper ARIA attributes', () => {
      render(<LoadingSpinner label="Loading" />);
      const spinner = screen.getByRole('status');
      expect(spinner).toHaveAttribute('aria-label', 'Loading');
    });

    it('ConfirmDialog should have proper ARIA attributes', () => {
      render(
        <ConfirmDialog
          title="Confirm"
          message="Are you sure?"
          isOpen={true}
          onConfirm={vi.fn()}
        />
      );

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog).toHaveAttribute('aria-labelledby', 'dialog-title');
    });

    it('Toast should have proper ARIA attributes', () => {
      render(<Toast message="Test" type="info" />);
      const alert = screen.getByRole('alert');
      expect(alert).toHaveAttribute('aria-live', 'polite');
    });
  });
});

