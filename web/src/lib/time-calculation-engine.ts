/**
 * Sistema Avançado de Cálculo de Horas
 * Atende rigorosamente aos requisitos funcionais especificados
 * Suporte completo para Node.js/TypeScript com Next.js
 */

// ================================
// 1. INTERFACES E TIPOS BASE
// ================================

export interface TimeInterval {
  id: string;
  startTime: string; // ISO 8601 format
  endTime: string;   // ISO 8601 format
  date: string;      // ISO 8601 date format
  type: 'regular' | 'overtime' | 'break' | 'travel' | 'training' | 'negative';
  description?: string;
  employeeId: string;
  vesselId?: string; // Optional for non-vessel employees
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  createdAt: string;
  updatedAt: string;
}

export interface OvertimeThreshold {
  hours: number;     // Limiar em horas (ex: 160, 200)
  percentage: number; // Percentual adicional (ex: 50, 100)
  label: string;     // Label para identificação
}

export interface TimeCalculationConfig {
  regularHoursPerMonth: number;  // Horas regulares mensais (padrão: 160)
  overtimeThresholds: OvertimeThreshold[]; // Limiares progressivos
  timezone: string;             // Fuso horário (padrão: 'UTC')
  precision: number;            // Casas decimais (padrão: 2)
  negativeAllowed: boolean;     // Permitir valores negativos
  allowPartialIntervals: boolean; // Permitir intervalos incompletos
  customShiftPatterns?: ShiftPattern[];
}

export interface ShiftPattern {
  id: string;
  name: string;
  regularHours: number;
  workDays: number[]; // Array de dias da semana (0-6, 0=domingo)
  restDays: number[]; // Dias de descanso
  description: string;
}

export interface TimeCalculationResult {
  totalHours: number;
  regularHours: number;
  overtimeHours: {
    threshold: number;
    percentage: number;
    hours: number;
    amount: number;
  }[];
  negativeHours: number; // Para compensação negativa
  netHours: number;      // totalHours + negativeHours
  shifts: {
    pattern: ShiftPattern | null;
    hoursWorked: number;
    targetHours: number;
    variance: number; // positive = overtime, negative = undertime
  }[];
  validation: {
    isValid: boolean;
    errors: ValidationError[];
    warnings: ValidationWarning[];
  };
}

export interface ValidationError {
  type: 'INVALID_DATE' | 'OVERLAPPING_INTERVAL' | 'MALFORMED_INTERVAL' | 'INVALID_TIME_RANGE';
  message: string;
  field?: string;
  timestamp?: string;
  suggestion?: string;
}

export interface ValidationWarning {
  type: 'UNUSUAL_HOURS' | 'MISSING_BREAK' | 'LATE_SUBMISSION';
  message: string;
  field?: string;
  timestamp?: string;
  impact: 'low' | 'medium' | 'high';
}

// ================================
// 2. SISTEMA DE VALIDAÇÃO ROBUSTA
// ================================

export class TimeValidationEngine {
  private intervals: TimeInterval[];
  private config: TimeCalculationConfig;

  constructor(intervals: TimeInterval[], config: TimeCalculationConfig) {
    this.intervals = intervals;
    this.config = config;
  }

  /**
   * Validação completa com detecção de sobreposições e correção automática
   */
  public validateAndCorrect(): {
    validatedIntervals: TimeInterval[];
    errors: ValidationError[];
    warnings: ValidationWarning[];
    autoCorrected: {
      fixed: number;
      description: string;
    }[];
  } {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const autoCorrected: { fixed: number; description: string }[] = [];
    
    let validatedIntervals = [...this.intervals];

    // 1. Validação de formato de data/hora
    validatedIntervals = this.validateDateTimeFormats(validatedIntervals, errors);

    // 2. Detecção e correção de sobreposições
    const overlapResult = this.detectAndFixOverlaps(validatedIntervals, errors);
    validatedIntervals = overlapResult.fixedIntervals;
    if (overlapResult.fixed > 0) {
      autoCorrected.push({
        fixed: overlapResult.fixed,
        description: `Corrigidas ${overlapResult.fixed} sobreposições de intervalos`
      });
    }

    // 3. Validação de intervalos malformados
    validatedIntervals = this.validateMalformedIntervals(validatedIntervals, errors, autoCorrected);

    // 4. Validação de consistência de dados
    this.validateDataConsistency(validatedIntervals, errors, warnings);

    // 5. Detecção de padrões incomuns
    this.detectUnusualPatterns(validatedIntervals, warnings);

    return {
      validatedIntervals,
      errors,
      warnings,
      autoCorrected
    };
  }

  /**
   * Validação estrita de formato ISO 8601
   */
  private validateDateTimeFormats(intervals: TimeInterval[], errors: ValidationError[]): TimeInterval[] {
    const iso8601Regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/;
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

    return intervals.map(interval => {
      // Validar data
      if (!dateRegex.test(interval.date)) {
        errors.push({
          type: 'INVALID_DATE',
          message: `Data inválida para o intervalo ${interval.id}: ${interval.date}`,
          field: 'date',
          suggestion: 'Use o formato ISO 8601: YYYY-MM-DD'
        });
        // Auto-corrigir se possível
        interval.date = this.autoCorrectDate(interval.date);
      }

      // Validar startTime
      if (!iso8601Regex.test(interval.startTime)) {
        errors.push({
          type: 'MALFORMED_INTERVAL',
          message: `Horário inicial inválido para o intervalo ${interval.id}: ${interval.startTime}`,
          field: 'startTime',
          suggestion: 'Use o formato ISO 8601: YYYY-MM-DDTHH:mm:ss.sssZ'
        });
        interval.startTime = this.autoCorrectDateTime(`${interval.date}T08:00:00.000Z`);
      }

      // Validar endTime
      if (!iso8601Regex.test(interval.endTime)) {
        errors.push({
          type: 'MALFORMED_INTERVAL',
          message: `Horário final inválido para o intervalo ${interval.id}: ${interval.endTime}`,
          field: 'endTime',
          suggestion: 'Use o formato ISO 8601: YYYY-MM-DDTHH:mm:ss.sssZ'
        });
        interval.endTime = this.autoCorrectDateTime(`${interval.date}T17:00:00.000Z`);
      }

      return interval;
    });
  }

  /**
   * Detecção e correção automática de sobreposições
   */
  private detectAndFixOverlaps(intervals: TimeInterval[], errors: ValidationError[]): {
    fixed: number;
    fixedIntervals: TimeInterval[];
  } {
    const sortedIntervals = intervals.sort((a, b) => 
      new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );

    let fixedCount = 0;
    const fixedIntervals: TimeInterval[] = [];

    for (let i = 0; i < sortedIntervals.length; i++) {
      const current = sortedIntervals[i];
      let nextOverlap = fixedIntervals.find(existing => 
        this.timeRangesOverlap(current, existing)
      );

      if (nextOverlap) {
        // Encontrou sobreposição - ajustar automaticamente
        errors.push({
          type: 'OVERLAPPING_INTERVAL',
          message: `Intervalo ${current.id} sobrepõe com ${nextOverlap.id}`,
          field: 'timeRange',
          timestamp: current.startTime,
          suggestion: 'Intervalos ajustados automaticamente para evitar sobreposição'
        });

        // Ajustar horário final do intervalo atual para antes do próximo
        const nextStart = new Date(nextOverlap.startTime);
        current.endTime = new Date(nextStart.getTime() - 1).toISOString();
        fixedCount++;
      }

      fixedIntervals.push(current);
    }

    return { fixed: fixedCount, fixedIntervals };
  }

  /**
   * Validação de intervalos malformados
   */
  private validateMalformedIntervals(
    intervals: TimeInterval[], 
    errors: ValidationError[], 
    autoCorrected: { fixed: number; description: string }[]
  ): TimeInterval[] {
    return intervals.map(interval => {
      const startTime = new Date(interval.startTime);
      const endTime = new Date(interval.endTime);

      // Verificar se startTime < endTime
      if (startTime >= endTime) {
        errors.push({
          type: 'INVALID_TIME_RANGE',
          message: `Intervalo ${interval.id} tem horário final antes ou igual ao inicial`,
          field: 'timeRange',
          timestamp: interval.startTime,
          suggestion: 'Automatically swapping start and end times'
        });

        // Auto-corrigir: inverter horários
        const temp = interval.startTime;
        interval.startTime = interval.endTime;
        interval.endTime = temp;
        autoCorrected.push({
          fixed: 1,
          description: `Intervalo ${interval.id}: horários inicial/final invertidos`
        });
      }

      // Verificar duração mínima (5 minutos)
      const duration = endTime.getTime() - startTime.getTime();
      if (duration < 5 * 60 * 1000) { // 5 minutos em millisegundos
        errors.push({
          type: 'INVALID_TIME_RANGE',
          message: `Intervalo ${interval.id} muito curto (${duration / 60000} minutos)`,
          field: 'duration',
          timestamp: interval.startTime,
          suggestion: 'Duração mínima é de 5 minutos'
        });
      }

      return interval;
    });
  }

  /**
   * Validação de consistência de dados
   */
  private validateDataConsistency(
    intervals: TimeInterval[], 
    errors: ValidationError[], 
    warnings: ValidationWarning[]
  ): void {
    // Verificar se data do intervalo corresponde à data do intervalo
    intervals.forEach(interval => {
      const intervalDate = new Date(interval.date);
      const startDate = new Date(interval.startTime);
      
      if (intervalDate.toDateString() !== startDate.toDateString()) {
        errors.push({
          type: 'INVALID_DATE',
          message: `Data do intervalo ${interval.id} não corresponde à data do horário`,
          field: 'date',
          timestamp: interval.startTime,
          suggestion: 'A data deve corresponder ao dia do intervalo'
        });
      }
    });

    // Verificar Employee/Vessel consistency
    const employeeVesselMap = new Map<string, string | null>();
    
    intervals.forEach(interval => {
      if (interval.vesselId && employeeVesselMap.has(interval.employeeId)) {
        const existingVessel = employeeVesselMap.get(interval.employeeId);
        if (existingVessel && existingVessel !== interval.vesselId) {
          warnings.push({
            type: 'UNUSUAL_HOURS',
            message: `Funcionário ${interval.employeeId} com múltiplas embarcações`,
            field: 'vesselId',
            timestamp: interval.startTime,
            impact: 'medium'
          });
        }
      }
      employeeVesselMap.set(interval.employeeId, interval.vesselId || null);
    });
  }

  /**
   * Detecção de padrões incomuns
   */
  private detectUnusualPatterns(intervals: TimeInterval[], warnings: ValidationWarning[]): void {
    // Detectar jornadas muito longas (>12h)
    intervals.forEach(interval => {
      const duration = (new Date(interval.endTime).getTime() - new Date(interval.startTime).getTime()) / (1000 * 60 * 60);
      if (duration > 12) {
        warnings.push({
          type: 'UNUSUAL_HOURS',
          message: `Jornada muito longa detectada: ${duration.toFixed(1)}h`,
          field: 'duration',
          timestamp: interval.startTime,
          impact: 'high'
        });
      }
    });

    // Detectar falta de pausa para jornadas >6h
    const dailyWorkMap = new Map<string, number>();
    
    intervals.forEach(interval => {
      const date = interval.date;
      const duration = (new Date(interval.endTime).getTime() - new Date(interval.startTime).getTime()) / (1000 * 60 * 60);
      dailyWorkMap.set(date, (dailyWorkMap.get(date) || 0) + duration);
    });

    dailyWorkMap.forEach((hours, date) => {
      if (hours > 6 && !intervals.some(i => i.date === date && i.type === 'break')) {
        warnings.push({
          type: 'MISSING_BREAK',
          message: `Jornada de ${hours.toFixed(1)}h sem registro de pausa em ${date}`,
          field: 'break',
          impact: 'medium'
        });
      }
    });
  }

  // ================================
  // 3. UTILITÁRIOS DE CORREÇÃO AUTOMÁTICA
  // ================================

  private autoCorrectDate(date: string): string {
    // Tentar corrigir formatos comuns de data
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(date)) {
      const [day, month, year] = date.split('/');
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    
    if (/^\d{2}-\d{2}-\d{4}$/.test(date)) {
      const [day, month, year] = date.split('-');
      return `${year}-${month}-${day}`;
    }

    // Retornar data atual como fallback
    return new Date().toISOString().split('T')[0];
  }

  private autoCorrectDateTime(dateTime: string): string {
    // Se não tem timezone, adicionar Z (UTC)
    if (!dateTime.endsWith('Z') && !dateTime.includes('+') && !dateTime.includes('-')) {
      return dateTime + 'Z';
    }
    return dateTime;
  }

  private timeRangesOverlap(interval1: TimeInterval, interval2: TimeInterval): boolean {
    const start1 = new Date(interval1.startTime).getTime();
    const end1 = new Date(interval1.endTime).getTime();
    const start2 = new Date(interval2.startTime).getTime();
    const end2 = new Date(interval2.endTime).getTime();

    return (start1 < end2) && (start2 < end1);
  }
}

// ================================
// 4. CALCULADORA PRINCIPAL DE HORAS
// ================================

export class AdvancedTimeCalculator {
  private config: TimeCalculationConfig;

  constructor(config: TimeCalculationConfig) {
    this.config = config;
  }

  /**
   * Cálculo principal de horas com processamento preciso de intervalos variáveis
   */
  public calculateTime(
    intervals: TimeInterval[],
    employeeId?: string,
    vesselId?: string,
    dateRange?: { start: string; end: string }
  ): TimeCalculationResult {
    // Filtrar intervalos conforme critérios
    let filteredIntervals = this.filterIntervals(intervals, employeeId, vesselId, dateRange);

    // Validar e corrigir dados
    const validationEngine = new TimeValidationEngine(filteredIntervals, this.config);
    const validationResult = validationEngine.validateAndCorrect();
    filteredIntervals = validationResult.validatedIntervals;

    // Cálculos principais
    const totalHours = this.calculateTotalHours(filteredIntervals);
    const regularHours = this.calculateRegularHours(filteredIntervals);
    const overtimeHours = this.calculateProgressiveOvertime(totalHours);
    const negativeHours = this.calculateNegativeHours(filteredIntervals);
    const netHours = totalHours + negativeHours;

    // Análise de escalas personalizadas
    const shifts = this.analyzeShiftPatterns(filteredIntervals);

    return {
      totalHours,
      regularHours,
      overtimeHours,
      negativeHours,
      netHours,
      shifts,
      validation: {
        isValid: validationResult.errors.length === 0,
        errors: validationResult.errors,
        warnings: validationResult.warnings
      }
    };
  }

  /**
   * Filtragem de intervalos com lógica condicional
   */
  private filterIntervals(
    intervals: TimeInterval[],
    employeeId?: string,
    vesselId?: string,
    dateRange?: { start: string; end: string }
  ): TimeInterval[] {
    let filtered = [...intervals];

    // Filtro por funcionário
    if (employeeId) {
      filtered = filtered.filter(interval => interval.employeeId === employeeId);
    }

    // Filtro por embarcação (com lógica condicional)
    if (vesselId !== undefined) {
      if (vesselId === null) {
        // Filtrar apenas funcionários não embarcados
        filtered = filtered.filter(interval => !interval.vesselId);
      } else {
        filtered = filtered.filter(interval => interval.vesselId === vesselId);
      }
    }

    // Filtro por período
    if (dateRange) {
      filtered = filtered.filter(interval => {
        const intervalDate = new Date(interval.date);
        const startDate = new Date(dateRange.start);
        const endDate = new Date(dateRange.end);
        return intervalDate >= startDate && intervalDate <= endDate;
      });
    }

    return filtered;
  }

  /**
   * Cálculo de horas totais com suporte a valores negativos
   */
  private calculateTotalHours(intervals: TimeInterval[]): number {
    return intervals.reduce((total, interval) => {
      const start = new Date(interval.startTime);
      const end = new Date(interval.endTime);
      const duration = (end.getTime() - start.getTime()) / (1000 * 60 * 60); // Convert to hours
      
      // Aplicar multiplicador baseado no tipo
      let multiplier = 1;
      switch (interval.type) {
        case 'overtime':
          multiplier = 1; // Horas extras contam integralmente
          break;
        case 'break':
          multiplier = 0; // Pausas não contam
          break;
        case 'travel':
          multiplier = 0.5; // Viagens contam 50%
          break;
        case 'training':
          multiplier = 0.5; // Treinamentos contam 50%
          break;
        default:
          multiplier = 1; // Horas regulares
      }

      return total + (duration * multiplier);
    }, 0);
  }

  /**
   * Cálculo de horas regulares (até o limite configurado)
   */
  private calculateRegularHours(intervals: TimeInterval[]): number {
    const totalHours = this.calculateTotalHours(intervals);
    return Math.min(totalHours, this.config.regularHoursPerMonth);
  }

  /**
   * Cálculo progressivo de horas extras baseado em limiares configuráveis
   */
  private calculateProgressiveOvertime(totalHours: number) {
    const regularHours = this.config.regularHoursPerMonth;
    const remainingHours = totalHours - regularHours;

    if (remainingHours <= 0) {
      return [];
    }

    const overtimeBreakdown = [];
    let hoursAboveThreshold = remainingHours;

    // Processar cada limiar progressivamente
    for (let i = 0; i < this.config.overtimeThresholds.length; i++) {
      const threshold = this.config.overtimeThresholds[i];
      const previousThreshold = i > 0 ? this.config.overtimeThresholds[i - 1] : regularHours;
      
      // Calcular horas neste limiar
      const thresholdLimit = threshold.hours;
      const previousThresholdHours = i > 0 ? this.config.overtimeThresholds[i - 1].hours : regularHours;
      const hoursInThisThreshold = Math.min(
        hoursAboveThreshold,
        thresholdLimit - previousThresholdHours
      );

      if (hoursInThisThreshold > 0) {
        overtimeBreakdown.push({
          threshold: threshold.hours,
          percentage: threshold.percentage,
          hours: hoursInThisThreshold,
          amount: hoursInThisThreshold * (threshold.percentage / 100)
        });

        hoursAboveThreshold -= hoursInThisThreshold;
      }
    }

    return overtimeBreakdown;
  }

  /**
   * Cálculo de horas negativas para compensação
   */
  private calculateNegativeHours(intervals: TimeInterval[]): number {
    if (!this.config.negativeAllowed) {
      return 0;
    }

    // Calcular baseado em intervalos do tipo 'negative' ou 'compensation'
    const negativeIntervals = intervals.filter(interval => 
      interval.type === 'negative' || 
      interval.description?.toLowerCase().includes('compensação')
    );

    return negativeIntervals.reduce((total, interval) => {
      const start = new Date(interval.startTime);
      const end = new Date(interval.endTime);
      const duration = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      return total - duration; // Subtrair para representar compensação negativa
    }, 0);
  }

  /**
   * Análise de padrões de escala personalizados
   */
  private analyzeShiftPatterns(intervals: TimeInterval[]) {
    if (!this.config.customShiftPatterns) {
      return [];
    }

    const shifts: Array<{
      pattern: ShiftPattern;
      hoursWorked: number;
      targetHours: number;
      variance: number;
    }> = [];
    const dailyWorkMap = new Map<string, number>();

    // Agrupar horas por dia
    intervals.forEach(interval => {
      const date = interval.date;
      const duration = (new Date(interval.endTime).getTime() - new Date(interval.startTime).getTime()) / (1000 * 60 * 60);
      dailyWorkMap.set(date, (dailyWorkMap.get(date) || 0) + duration);
    });

    // Analisar cada dia contra padrões de escala
    dailyWorkMap.forEach((hoursWorked, date) => {
      const dayOfWeek = new Date(date).getDay();
      
      if (this.config.customShiftPatterns) {
        for (const pattern of this.config.customShiftPatterns) {
          if (pattern.workDays.includes(dayOfWeek)) {
            const variance = hoursWorked - pattern.regularHours;
            shifts.push({
              pattern,
              hoursWorked,
              targetHours: pattern.regularHours,
              variance
            });
            break; // Encontrou o padrão, parar de procurar
          }
        }
      }
    });

    return shifts;
  }
}

// ================================
// 5. CONFIGURAÇÃO PADRÃO DO SISTEMA
// ================================

export const defaultTimeCalculationConfig: TimeCalculationConfig = {
  regularHoursPerMonth: 160,
  overtimeThresholds: [
    { hours: 160, percentage: 50, label: '50% adicional' },
    { hours: 200, percentage: 100, label: '100% adicional' }
  ],
  timezone: 'UTC',
  precision: 2,
  negativeAllowed: true,
  allowPartialIntervals: true,
  customShiftPatterns: [
    {
      id: 'standard',
      name: 'Padrão',
      regularHours: 8,
      workDays: [1, 2, 3, 4, 5], // Segunda a sexta
      restDays: [0, 6], // Domingo e sábado
      description: 'Jornada padrão de 8 horas'
    },
    {
      id: '12x36',
      name: '12x36',
      regularHours: 12,
      workDays: [1, 3, 5], // Dias alternados
      restDays: [0, 2, 4, 6],
      description: 'Escala 12x36 horas'
    }
  ]
};

export default AdvancedTimeCalculator;