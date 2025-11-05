/**
 * Sistema de Formatação Temporal Padronizada
 * Atende aos requisitos: exibição explícita de sinais, valores negativos em vermelho, precisão configurável
 */

import { TimeCalculationResult } from './time-calculation-engine';

// ================================
// 1. CONFIGURAÇÕES DE FORMATAÇÃO
// ================================

export interface TimeFormattingConfig {
  precision: number;              // Casas decimais (1-4)
  showSign: boolean;              // Mostrar sinal +/-
  showSuffix: boolean;            // Mostrar sufixo 'h'
  negativeColor: string;          // Cor para valores negativos (padrão: 'red')
  positiveColor: string;          // Cor para valores positivos (padrão: 'green')
  zeroColor: string;              // Cor para zero (padrão: 'gray')
  showIcons: boolean;             // Mostrar ícones contextuais
  locale: 'pt-BR' | 'en-US';      // Localização para formatação
}

export interface TimeDisplayOptions {
  context?: 'total' | 'regular' | 'overtime' | 'negative' | 'net';
  customConfig?: Partial<TimeFormattingConfig>;
  showTooltip?: boolean;
  showBreakdown?: boolean;
}

export const defaultTimeFormattingConfig: TimeFormattingConfig = {
  precision: 2,
  showSign: true,
  showSuffix: true,
  negativeColor: '#dc2626',     // Vermelho
  positiveColor: '#16a34a',     // Verde
  zeroColor: '#6b7280',         // Cinza
  showIcons: true,
  locale: 'pt-BR'
};

// ================================
// 2. FORMATADOR PRINCIPAL
// ================================

export class TimeFormatter {
  private config: TimeFormattingConfig;

  constructor(config: Partial<TimeFormattingConfig> = {}) {
    this.config = { ...defaultTimeFormattingConfig, ...config };
  }

  /**
   * Formatação principal de valores temporais
   */
  public formatTime(
    value: number, 
    options: TimeDisplayOptions = {}
  ): {
    display: string;
    color: string;
    icon: string;
    tooltip?: string;
    breakdown?: OvertimeBreakdown[];
  } {
    const { context = 'total', customConfig, showTooltip = false, showBreakdown = false } = options;
    const config = { ...this.config, ...customConfig };

    // Formatação básica do valor
    const formattedValue = this.formatNumericValue(value, config);
    const display = this.buildDisplayString(formattedValue, config);
    
    // Determinar cor baseada no contexto e valor
    const color = this.determineColor(value, context, config);
    
    // Ícone contextual
    const icon = this.getContextIcon(context, value);
    
    // Tooltip se solicitado
    const tooltip = showTooltip ? this.generateTooltip(value, context) : undefined;
    
    // Breakdown se solicitado e aplicável
    const breakdown = showBreakdown && context === 'overtime' ? 
      this.generateOvertimeBreakdown(value) : undefined;

    return {
      display,
      color,
      icon,
      tooltip,
      breakdown
    };
  }

  /**
   * Formatação de valores com precisão configurável
   */
  private formatNumericValue(value: number, config: TimeFormattingConfig): string {
    // Validar e normalizar valor
    const normalizedValue = this.normalizeValue(value);
    
    // Aplicar precisão
    const formatted = normalizedValue.toFixed(config.precision);
    
    // Adicionar sinal se configurado
    if (config.showSign && normalizedValue !== 0) {
      return normalizedValue > 0 ? `+${formatted}` : formatted;
    }
    
    return formatted;
  }

  /**
   * Construir string de exibição final
   */
  private buildDisplayString(formattedValue: string, config: TimeFormattingConfig): string {
    if (config.showSuffix) {
      return `${formattedValue}h`;
    }
    return formattedValue;
  }

  /**
   * Determinar cor baseada no valor e contexto
   */
  private determineColor(value: number, context: string, config: TimeFormattingConfig): string {
    const normalizedValue = this.normalizeValue(value);
    
    switch (context) {
      case 'negative':
        return config.negativeColor;
      case 'overtime':
        return normalizedValue > 0 ? config.positiveColor : config.zeroColor;
      case 'net':
        return normalizedValue > 0 ? config.positiveColor : 
               normalizedValue < 0 ? config.negativeColor : config.zeroColor;
      default:
        return normalizedValue > 0 ? config.positiveColor :
               normalizedValue < 0 ? config.negativeColor : config.zeroColor;
    }
  }

  /**
   * Ícones contextuais para diferentes tipos de tempo
   */
  private getContextIcon(context: string, value: number): string {
    if (!this.config.showIcons) return '';
    
    switch (context) {
      case 'total':
        return value > 0 ? '⏰' : value < 0 ? '⏱️' : '⏸️';
      case 'regular':
        return '📋';
      case 'overtime':
        return value > 0 ? '🚀' : '📉';
      case 'negative':
        return '⛔';
      case 'net':
        return value >= 0 ? '✅' : '❌';
      default:
        return '⏰';
    }
  }

  /**
   * Normalizar e validar valor temporal
   */
  private normalizeValue(value: number): number {
    if (isNaN(value) || !isFinite(value)) {
      return 0;
    }
    return Math.round(value * Math.pow(10, this.config.precision)) / Math.pow(10, this.config.precision);
  }

  /**
   * Gerar tooltip informativo
   */
  private generateTooltip(value: number, context: string): string {
    const normalizedValue = this.normalizeValue(value);
    const formattedValue = normalizedValue.toFixed(this.config.precision);
    
    switch (context) {
      case 'total':
        return `Total de horas: ${formattedValue}h`;
      case 'regular':
        return `Horas regulares: ${formattedValue}h`;
      case 'overtime':
        return normalizedValue > 0 
          ? `Horas extras: +${formattedValue}h`
          : `Horas em falta: ${formattedValue}h`;
      case 'negative':
        return `Compensação negativa: ${formattedValue}h`;
      case 'net':
        return `Saldo líquido: ${normalizedValue >= 0 ? '+' : ''}${formattedValue}h`;
      default:
        return `Horas: ${formattedValue}h`;
    }
  }

  /**
   * Gerar breakdown de horas extras
   */
  private generateOvertimeBreakdown(totalOvertime: number): OvertimeBreakdown[] {
    if (totalOvertime <= 0) return [];
    
    // Exemplo de breakdown - isso viria do cálculo real
    return [
      {
        threshold: 160,
        hours: Math.min(totalOvertime, 40),
        percentage: 50,
        label: '50% adicional'
      },
      {
        threshold: 200,
        hours: Math.max(0, totalOvertime - 40),
        percentage: 100,
        label: '100% adicional'
      }
    ];
  }
}

// ================================
// 3. INTERFACES PARA BREAKDOWN
// ================================

export interface OvertimeBreakdown {
  threshold: number;
  hours: number;
  percentage: number;
  label: string;
}

// ================================
// 4. UTILITÁRIOS DE FORMATAÇÃO
// ================================

export function formatTimeRange(startISO: string, endISO: string): string {
  const start = new Date(startISO);
  const end = new Date(endISO);
  
  const formatter = new TimeFormatter();
  const duration = (end.getTime() - start.getTime()) / (1000 * 60 * 60); // em horas
  
  return formatter.formatTime(duration, { context: 'total' }).display;
}

export function formatDateRange(startDate: string, endDate: string, locale: 'pt-BR' | 'en-US' = 'pt-BR'): string {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  const dateFormatter = new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  
  if (start.getTime() === end.getTime()) {
    return dateFormatter.format(start);
  }
  
  return `${dateFormatter.format(start)} - ${dateFormatter.format(end)}`;
}

// ================================
// 5. CONFIGURAÇÕES PRÉ-DEFINIDAS
// ================================

export const timeFormatConfigs = {
  compact: {
    precision: 1,
    showSign: true,
    showSuffix: true,
    showIcons: false,
    locale: 'pt-BR' as const
  },
  detailed: {
    precision: 2,
    showSign: true,
    showSuffix: true,
    showIcons: true,
    locale: 'pt-BR' as const
  },
  report: {
    precision: 2,
    showSign: false,
    showSuffix: true,
    showIcons: true,
    locale: 'pt-BR' as const
  },
  dashboard: {
    precision: 1,
    showSign: true,
    showSuffix: true,
    showIcons: true,
    locale: 'pt-BR' as const
  }
};

export default TimeFormatter;