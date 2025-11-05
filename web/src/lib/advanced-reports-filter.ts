/**
 * Sistema Avançado de Filtros de Relatórios
 * Atende aos requisitos: análise granular, filtros específicos, lógica condicional
 */

import { getServiceSupabase } from '@/lib/supabase/server';

// ================================
// 1. INTERFACES DE FILTROS
// ================================

export interface ReportFilterOptions {
  // Análise temporal granular
  periodType: 'monthly' | 'quarterly' | 'yearly' | 'custom';
  startDate?: string;
  endDate?: string;
  
  // Filtros específicos
  employeeIds?: string[];
  vesselIds?: (string | null)[]; // null = funcionários não embarcados
  approvalStatuses?: ('draft' | 'submitted' | 'approved' | 'rejected')[];
  
  // Lógica condicional
  hideVesselFields?: boolean;
  showOnlyMarineEmployees?: boolean;
  showOnlyLandEmployees?: boolean;
  
  // Configurações de agregação
  groupBy?: 'employee' | 'vessel' | 'date' | 'status' | 'period';
  orderBy?: 'date' | 'hours' | 'employee' | 'vessel';
  orderDirection?: 'asc' | 'desc';
  
  // Configurações de paginação
  limit?: number;
  offset?: number;
}

export interface FilterMetadata {
  availableYears: number[];
  availablePeriods: Array<{
    id: string;
    label: string;
    startDate: string;
    endDate: string;
    type: 'monthly' | 'quarterly' | 'yearly';
    hasData: boolean;
  }>;
  availableEmployees: Array<{
    id: string;
    name: string;
    vesselId?: string;
    vesselName?: string;
    isMarine: boolean;
  }>;
  availableVessels: Array<{
    id: string;
    name: string;
    code?: string;
    employeeCount: number;
  }>;
  availableStatuses: Array<{
    value: string;
    label: string;
    count: number;
  }>;
}

export interface FilteredDataResult {
  data: any[];
  metadata: FilterMetadata;
  validation: {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  };
  pagination?: {
    total: number;
    page: number;
    pages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// ================================
// 2. GERENCIADOR PRINCIPAL DE FILTROS
// ================================

export class AdvancedReportsFilter {
  private supabase = getServiceSupabase();

  /**
   * Obter metadados populados dinamicamente com dados reais
   */
  public async getFilterMetadata(tenantId: string): Promise<FilterMetadata> {
    try {
      const [
        yearsData,
        periodsData,
        employeesData,
        vesselsData,
        statusesData
      ] = await Promise.all([
        this.getAvailableYears(tenantId),
        this.getAvailablePeriods(tenantId),
        this.getAvailableEmployees(tenantId),
        this.getAvailableVessels(tenantId),
        this.getAvailableStatuses(tenantId)
      ]);

      return {
        availableYears: yearsData,
        availablePeriods: periodsData,
        availableEmployees: employeesData,
        availableVessels: vesselsData,
        availableStatuses: statusesData
      };
    } catch (error) {
      console.error('Erro ao obter metadados de filtros:', error);
      throw new Error('Falha ao carregar dados de filtros');
    }
  }

  /**
   * Aplicar filtros avançados com lógica condicional
   */
  public async applyAdvancedFilters(
    tenantId: string,
    options: ReportFilterOptions
  ): Promise<FilteredDataResult> {
    const validation = this.validateFilterOptions(options);
    if (!validation.isValid) {
      return {
        data: [],
        metadata: await this.getFilterMetadata(tenantId),
        validation
      };
    }

    try {
      // Construir query base
      let query = this.buildBaseQuery(tenantId, options);
      
      // Aplicar filtros específicos
      query = this.applyEmployeeFilters(query, options);
      query = this.applyVesselFilters(query, options);
      query = this.applyStatusFilters(query, options);
      query = this.applyDateFilters(query, options);
      
      // Aplicar lógica condicional
      query = this.applyConditionalLogic(query, options);
      
      // Aplicar ordenação e paginação
      query = this.applySortingAndPagination(query, options);

      // Executar query
      const { data, error, count } = await query;

      if (error) {
        throw error;
      }

      // Processar dados com lógica condicional
      const processedData = this.processConditionalData(data, options);

      return {
        data: processedData,
        metadata: await this.getFilterMetadata(tenantId),
        validation: { isValid: true, errors: [], warnings: [] },
        pagination: options.limit ? {
          total: count || 0,
          page: Math.floor((options.offset || 0) / (options.limit || 10)) + 1,
          pages: Math.ceil((count || 0) / (options.limit || 10)),
          hasNext: (options.offset || 0) + (options.limit || 10) < (count || 0),
          hasPrev: (options.offset || 0) > 0
        } : undefined
      };

    } catch (error) {
      console.error('Erro ao aplicar filtros avançados:', error);
      return {
        data: [],
        metadata: await this.getFilterMetadata(tenantId),
        validation: {
          isValid: false,
          errors: [`Erro na aplicação de filtros: ${error instanceof Error ? error.message : 'Erro desconhecido'}`],
          warnings: []
        }
      };
    }
  }

  // ================================
  // 3. MÉTODOS DE OBTENÇÃO DE METADADOS
  // ================================

  private async getAvailableYears(tenantId: string): Promise<number[]> {
    const { data, error } = await this.supabase
      .from('timesheets')
      .select('periodo_ini')
      .eq('tenant_id', tenantId)
      .not('periodo_ini', 'is', null);

    if (error) {
      throw error;
    }

    const years = new Set<number>();
    data?.forEach(timesheet => {
      const year = new Date(timesheet.periodo_ini).getFullYear();
      years.add(year);
    });

    return Array.from(years).sort((a, b) => b - a); // Decrescente (mais recente primeiro)
  }

  private async getAvailablePeriods(tenantId: string): Promise<FilterMetadata['availablePeriods']> {
    const { data, error } = await this.supabase
      .from('timesheets')
      .select('periodo_ini, periodo_fim, status')
      .eq('tenant_id', tenantId)
      .order('periodo_ini', { ascending: false });

    if (error) {
      throw error;
    }

    const periodMap = new Map<string, {
      startDate: string;
      endDate: string;
      type: 'monthly' | 'quarterly' | 'yearly';
      count: number;
      statuses: Set<string>;
    }>();

    data?.forEach(timesheet => {
      const startDate = new Date(timesheet.periodo_ini);
      const year = startDate.getFullYear();
      const month = startDate.getMonth();

      // Identificar tipo de período
      let periodKey: string;
      let type: 'monthly' | 'quarterly' | 'yearly';

      if (month % 3 === 0) { // Trimestres (0, 3, 6, 9)
        const quarter = Math.floor(month / 3) + 1;
        periodKey = `${year}-Q${quarter}`;
        type = 'quarterly';
      } else {
        periodKey = `${year}-${String(month + 1).padStart(2, '0')}`;
        type = 'monthly';
      }

      if (!periodMap.has(periodKey)) {
        periodMap.set(periodKey, {
          startDate: timesheet.periodo_ini,
          endDate: timesheet.periodo_fim,
          type,
          count: 0,
          statuses: new Set()
        });
      }

      const period = periodMap.get(periodKey)!;
      period.count++;
      period.statuses.add(timesheet.status);
    });

    // Converter para array e ordenar
    const periods = Array.from(periodMap.entries()).map(([id, period]) => {
      const startDate = new Date(period.startDate);
      const year = startDate.getFullYear();
      const month = startDate.getMonth();

      let label: string;
      if (period.type === 'quarterly') {
        const quarter = Math.floor(month / 3) + 1;
        label = `${year} - Q${quarter}`;
      } else {
        const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        label = `${monthNames[month]} ${year}`;
      }

      return {
        id,
        label,
        startDate: period.startDate,
        endDate: period.endDate,
        type: period.type,
        hasData: period.count > 0
      };
    });

    return periods.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
  }

  private async getAvailableEmployees(tenantId: string): Promise<FilterMetadata['availableEmployees']> {
    const { data, error } = await this.supabase
      .from('employees')
      .select(`
        id,
        name,
        vessel_id,
        vessels(name),
        profiles(display_name)
      `)
      .eq('tenant_id', tenantId)
      .order('name');

    if (error) {
      throw error;
    }

    return data?.map(employee => ({
      id: employee.id,
      name: employee.name || (employee.profiles as any)?.display_name || 'Desconhecido',
      vesselId: employee.vessel_id || undefined,
      vesselName: (employee.vessels as any)?.name || undefined,
      isMarine: !!employee.vessel_id
    })) || [];
  }

  private async getAvailableVessels(tenantId: string): Promise<FilterMetadata['availableVessels']> {
    const { data, error } = await this.supabase
      .from('vessels')
      .select(`
        id,
        name,
        code,
        employees:employees(id)
      `)
      .eq('tenant_id', tenantId)
      .order('name');

    if (error) {
      throw error;
    }

    return data?.map(vessel => ({
      id: vessel.id,
      name: vessel.name,
      code: vessel.code || undefined,
      employeeCount: vessel.employees?.length || 0
    })) || [];
  }

  private async getAvailableStatuses(tenantId: string): Promise<FilterMetadata['availableStatuses']> {
    const { data, error } = await this.supabase
      .from('timesheets')
      .select('status')
      .eq('tenant_id', tenantId);

    if (error) {
      throw error;
    }

    const statusCounts = new Map<string, number>();
    data?.forEach(timesheet => {
      const status = timesheet.status;
      statusCounts.set(status, (statusCounts.get(status) || 0) + 1);
    });

    const statusLabels: Record<string, string> = {
      'draft': 'Rascunho',
      'submitted': 'Enviado',
      'approved': 'Aprovado',
      'rejected': 'Rejeitado',
      'rascunho': 'Rascunho',
      'enviado': 'Enviado',
      'aprovado': 'Aprovado',
      'recusado': 'Rejeitado'
    };

    return Array.from(statusCounts.entries())
      .map(([value, count]) => ({
        value,
        label: statusLabels[value] || value,
        count
      }))
      .sort((a, b) => b.count - a.count);
  }

  // ================================
  // 4. MÉTODOS DE VALIDAÇÃO E CONSTRUÇÃO DE QUERY
  // ================================

  private validateFilterOptions(options: ReportFilterOptions): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validar datas
    if (options.startDate && !this.isValidISO8601Date(options.startDate)) {
      errors.push('Data de início deve estar no formato ISO 8601 (YYYY-MM-DD)');
    }

    if (options.endDate && !this.isValidISO8601Date(options.endDate)) {
      errors.push('Data de fim deve estar no formato ISO 8601 (YYYY-MM-DD)');
    }

    if (options.startDate && options.endDate) {
      const start = new Date(options.startDate);
      const end = new Date(options.endDate);
      if (start >= end) {
        errors.push('Data de início deve ser anterior à data de fim');
      }
    }

    // Validar IDs
    if (options.employeeIds && options.employeeIds.some(id => !this.isValidUUID(id))) {
      errors.push('IDs de funcionários devem estar no formato UUID válido');
    }

    if (options.vesselIds && options.vesselIds.some(id => id !== null && !this.isValidUUID(id))) {
      errors.push('IDs de embarcações devem estar no formato UUID válido ou null');
    }

    // Validar configurações lógicas
    if (options.showOnlyMarineEmployees && options.showOnlyLandEmployees) {
      warnings.push('Filtros "apenas embarcados" e "apenas terrestres" são mutuamente exclusivos. Usando "apenas embarcados".');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  private buildBaseQuery(tenantId: string, options: ReportFilterOptions) {
    let query = this.supabase
      .from('timesheets')
      .select(`
        *,
        employees(
          id,
          name,
          vessel_id,
          vessels(name, code),
          profiles(display_name)
        ),
        timesheet_entries(
          id,
          data,
          tipo,
          hora_ini,
          hora_fim,
          observacao
        ),
        timesheet_annotations(
          id,
          entry_id,
          field_path,
          message
        )
      `, { count: 'exact' })
      .eq('tenant_id', tenantId);

    return query;
  }

  private applyEmployeeFilters(query: any, options: ReportFilterOptions): any {
    if (options.employeeIds && options.employeeIds.length > 0) {
      query = query.in('employee_id', options.employeeIds);
    }

    return query;
  }

  private applyVesselFilters(query: any, options: ReportFilterOptions): any {
    if (options.vesselIds && options.vesselIds.length > 0) {
      if (options.vesselIds.includes(null)) {
        // Incluir funcionários sem embarcação + específicos
        const vesselIdsOnly = options.vesselIds.filter(id => id !== null);
        if (vesselIdsOnly.length > 0) {
          query = query.or(`employees.vessel_id.is.null,employees.vessel_id.in.(${vesselIdsOnly.join(',')})`);
        }
        // Se só tem null, não aplicar filtro (mostra todos sem embarcação)
      } else {
        query = query.in('employees.vessel_id', options.vesselIds);
      }
    }

    return query;
  }

  private applyStatusFilters(query: any, options: ReportFilterOptions): any {
    if (options.approvalStatuses && options.approvalStatuses.length > 0) {
      query = query.in('status', options.approvalStatuses);
    }

    return query;
  }

  private applyDateFilters(query: any, options: ReportFilterOptions): any {
    if (options.startDate) {
      query = query.gte('periodo_fim', options.startDate);
    }

    if (options.endDate) {
      query = query.lte('periodo_ini', options.endDate);
    }

    return query;
  }

  private applyConditionalLogic(query: any, options: ReportFilterOptions): any {
    if (options.showOnlyMarineEmployees) {
      query = query.not('employees.vessel_id', 'is', null);
    }

    if (options.showOnlyLandEmployees) {
      query = query.is('employees.vessel_id', null);
    }

    return query;
  }

  private applySortingAndPagination(query: any, options: ReportFilterOptions): any {
    // Aplicar ordenação
    if (options.orderBy) {
      const ascending = options.orderDirection !== 'desc';
      query = query.order(options.orderBy, { ascending });
    } else {
      query = query.order('periodo_ini', { ascending: false });
    }

    // Aplicar paginação
    if (options.limit) {
      query = query.limit(options.limit);
    }

    if (options.offset) {
      query = query.range(options.offset, (options.offset + (options.limit || 10)) - 1);
    }

    return query;
  }

  // ================================
  // 5. PROCESSAMENTO CONDICIONAL DE DADOS
  // ================================

  private processConditionalData(data: any[], options: ReportFilterOptions): any[] {
    return data.map(timesheet => {
      // Lógica condicional para ocultar campos não aplicáveis
      if (options.hideVesselFields && !timesheet.employees?.vessel_id) {
        // Remover campos de embarcação para funcionários terrestres
        const { vessels, ...employeeWithoutVessel } = timesheet.employees || {};
        return {
          ...timesheet,
          employees: {
            ...employeeWithoutVessel,
            vessel_name: undefined,
            vessel_code: undefined
          }
        };
      }

      // Enriquecer dados com informações derivadas
      return {
        ...timesheet,
        derived: {
          isMarine: !!timesheet.employees?.vessel_id,
          vesselName: timesheet.employees?.vessels?.name,
          vesselCode: timesheet.employees?.vessels?.code,
          employeeDisplayName: timesheet.employees?.profiles?.display_name || timesheet.employees?.name,
          totalHours: this.calculateTimesheetHours(timesheet.timesheet_entries || []),
          isOverdue: this.isTimesheetOverdue(timesheet)
        }
      };
    });
  }

  private calculateTimesheetHours(entries: any[]): number {
    return entries.reduce((total, entry) => {
      if (!entry.hora_ini || !entry.hora_fim) return total;
      
      const start = new Date(`1970-01-01T${entry.hora_ini}:00`);
      const end = new Date(`1970-01-01T${entry.hora_fim}:00`);
      const duration = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      
      return total + (duration > 0 ? duration : 0);
    }, 0);
  }

  private isTimesheetOverdue(timesheet: any): boolean {
    const deadline = new Date(timesheet.periodo_fim);
    const submissionDeadline = new Date(deadline.getTime() + (5 * 24 * 60 * 60 * 1000)); // 5 dias após o fim do período
    const now = new Date();
    
    return timesheet.status === 'draft' && now > submissionDeadline;
  }

  // ================================
  // 6. UTILITÁRIOS DE VALIDAÇÃO
  // ================================

  private isValidISO8601Date(dateStr: string): boolean {
    const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!isoDateRegex.test(dateStr)) return false;
    
    const date = new Date(dateStr);
    return !isNaN(date.getTime()) && date.toISOString().startsWith(dateStr);
  }

  private isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }
}

export default AdvancedReportsFilter;