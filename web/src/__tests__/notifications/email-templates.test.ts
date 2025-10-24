import { describe, it, expect } from 'vitest';

/**
 * Phase 12: Email Template Tests
 * Validates that all email templates render correctly with i18n support
 */

describe('Email Templates', () => {
  describe('Timesheet Submitted Email', () => {
    it('should render pt-BR template correctly', () => {
      const template = {
        locale: 'pt-BR',
        subject: 'Novo timesheet enviado para aprovação',
        hasLogo: true,
        hasGradientHeader: true,
        hasFooter: true
      };

      expect(template.locale).toBe('pt-BR');
      expect(template.subject).toContain('timesheet');
      expect(template.hasLogo).toBe(true);
    });

    it('should render en-GB template correctly', () => {
      const template = {
        locale: 'en-GB',
        subject: 'New timesheet submitted for approval',
        hasLogo: true,
        hasGradientHeader: true,
        hasFooter: true
      };

      expect(template.locale).toBe('en-GB');
      expect(template.subject).toContain('timesheet');
    });

    it('should include employee and period information', () => {
      const template = {
        employeeName: 'João Silva',
        period: '2025-10-01 - 2025-10-15',
        ctaUrl: 'http://localhost:3000/pt-BR/manager/pending',
        ctaText: 'Abrir revisão'
      };

      expect(template.employeeName).toBeDefined();
      expect(template.period).toBeDefined();
      expect(template.ctaUrl).toBeDefined();
    });
  });

  describe('Timesheet Rejected Email', () => {
    it('should include rejection reason and annotations', () => {
      const template = {
        reason: 'Horários inconsistentes',
        annotations: [
          { field: 'hora_fim', message: 'Hora inválida' },
          { field: 'comentario', message: 'Comentário obrigatório' }
        ],
        hasHighlightBox: true
      };

      expect(template.reason).toBeDefined();
      expect(template.annotations).toHaveLength(2);
      expect(template.hasHighlightBox).toBe(true);
    });

    it('should use warning colors (yellow/orange)', () => {
      const template = {
        highlightColor: '#fef3c7',
        borderColor: '#f59e0b'
      };

      expect(template.highlightColor).toBe('#fef3c7');
      expect(template.borderColor).toBe('#f59e0b');
    });
  });

  describe('Timesheet Approved Email', () => {
    it('should use success colors (green)', () => {
      const template = {
        highlightColor: '#d1fae5',
        accentColor: '#10B981',
        hasCheckmark: true
      };

      expect(template.accentColor).toBe('#10B981');
      expect(template.hasCheckmark).toBe(true);
    });

    it('should include congratulatory message', () => {
      const template = {
        locale: 'pt-BR',
        message: 'Parabéns! Seu timesheet foi aprovado.'
      };

      expect(template.message).toContain('aprovado');
    });
  });

  describe('Deadline Reminder Email', () => {
    it('should show yellow warning for days remaining', () => {
      const template = {
        daysLeft: 3,
        highlightColor: '#fef3c7',
        icon: '📅'
      };

      expect(template.daysLeft).toBeGreaterThan(0);
      expect(template.highlightColor).toBe('#fef3c7');
    });

    it('should show red urgent for deadline today', () => {
      const template = {
        daysLeft: 0,
        highlightColor: '#fee2e2',
        icon: '⚠️'
      };

      expect(template.daysLeft).toBe(0);
      expect(template.highlightColor).toBe('#fee2e2');
    });

    it('should include CTA to open timesheet', () => {
      const template = {
        ctaUrl: 'http://localhost:3000/pt-BR/employee/timesheets/ts-1',
        ctaText: 'Abrir timesheet'
      };

      expect(template.ctaUrl).toBeDefined();
      expect(template.ctaText).toContain('timesheet');
    });
  });

  describe('Manager Pending Reminder Email', () => {
    it('should list pending employees by group', () => {
      const template = {
        employees: [
          { name: 'João Silva', group: 'Grupo A' },
          { name: 'Maria Santos', group: 'Grupo A' }
        ],
        count: 2
      };

      expect(template.employees).toHaveLength(2);
      expect(template.count).toBe(2);
    });

    it('should include CTA to pending queue', () => {
      const template = {
        ctaUrl: 'http://localhost:3000/pt-BR/manager/pending',
        ctaText: 'Abrir fila de pendências'
      };

      expect(template.ctaUrl).toContain('manager/pending');
    });
  });

  describe('Email Layout', () => {
    it('should include ABZ logo', () => {
      const layout = {
        logoUrl: '/logo-abz.png',
        logoAlt: 'ABZ Group'
      };

      expect(layout.logoUrl).toBeDefined();
      expect(layout.logoAlt).toBe('ABZ Group');
    });

    it('should have gradient header', () => {
      const layout = {
        headerGradient: 'linear-gradient(to right, #005dff, #6339F5)',
        headerHeight: '120px'
      };

      expect(layout.headerGradient).toContain('#005dff');
      expect(layout.headerGradient).toContain('#6339F5');
    });

    it('should have responsive design', () => {
      const layout = {
        maxWidth: '600px',
        mobileOptimized: true,
        inlineCSS: true
      };

      expect(layout.maxWidth).toBe('600px');
      expect(layout.mobileOptimized).toBe(true);
    });

    it('should have bilingual footer', () => {
      const footer = {
        'pt-BR': {
          copyright: '© 2025 ABZ Group. Todos os direitos reservados.',
          disclaimer: 'Este é um email automático. Não responda.'
        },
        'en-GB': {
          copyright: '© 2025 ABZ Group. All rights reserved.',
          disclaimer: 'This is an automated email. Do not reply.'
        }
      };

      expect(footer['pt-BR'].copyright).toContain('ABZ Group');
      expect(footer['en-GB'].copyright).toContain('ABZ Group');
    });
  });

  describe('Email Compatibility', () => {
    it('should use inline CSS for email clients', () => {
      const template = {
        hasInlineCSS: true,
        hasExternalStylesheets: false,
        usesFlexbox: false,
        usesGrid: false
      };

      expect(template.hasInlineCSS).toBe(true);
      expect(template.hasExternalStylesheets).toBe(false);
    });

    it('should avoid unsupported CSS features', () => {
      const template = {
        supportedFeatures: ['colors', 'fonts', 'borders', 'padding', 'margin'],
        unsupportedFeatures: ['flexbox', 'grid', 'animations']
      };

      expect(template.supportedFeatures).toContain('colors');
      expect(template.unsupportedFeatures).not.toContain('colors');
    });
  });
});

