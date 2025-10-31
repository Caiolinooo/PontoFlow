#!/usr/bin/env node

/**
 * Database Setup Standalone Script
 * 
 * Script Node.js para execução via linha de comando
 * Configura banco de dados sem dependência da aplicação web
 * Timesheet Manager - ABZ Group
 * 
 * Usage:
 * node scripts/setup-database.js [options]
 * 
 * Options:
 * --validate-only     Apenas validar, não aplicar correções
 * --auto-fix          Aplicar correções automaticamente
 * --backup            Criar backup antes de mudanças
 * --rollback          Habilitar rollback em caso de erro
 * --quiet             Modo silencioso (menos logs)
 * --help              Mostrar ajuda
 */

import { createRequire } from 'module';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

// Importar classes do sistema
const require = createRequire(import.meta.url);
const DatabaseValidator = require('../src/lib/database-validator.js').DatabaseValidator;
const SqlGenerator = require('../src/lib/sql-generator.js').SqlGenerator;
const DatabaseSetup = require('../src/lib/database-setup.js').DatabaseSetup;

// Configurações
const CONFIG_FILE = process.env.TIMESHEET_CONFIG_FILE || './.env';
const DEFAULT_TIMEOUT = 30000;

// ===============================
// CLI INTERFACE
// ===============================

class DatabaseSetupCLI {
  constructor() {
    this.options = this.parseArguments();
    this.setup = null;
  }

  /**
   * Parse argumentos da linha de comando
   */
  parseArguments() {
    const args = process.argv.slice(2);
    const options = {
      validateOnly: false,
      autoFix: false,
      backup: true,
      rollback: true,
      quiet: false,
      configFile: CONFIG_FILE,
      timeout: DEFAULT_TIMEOUT,
      output: 'console', // console, json, file
      outputFile: null,
    };

    for (let i = 0; i < args.length; i++) {
      const arg = args[i];

      switch (arg) {
        case '--validate-only':
        case '-v':
          options.validateOnly = true;
          break;

        case '--auto-fix':
        case '-f':
          options.autoFix = true;
          break;

        case '--no-backup':
          options.backup = false;
          break;

        case '--no-rollback':
          options.rollback = false;
          break;

        case '--quiet':
        case '-q':
          options.quiet = true;
          break;

        case '--timeout':
          options.timeout = parseInt(args[i + 1]) || DEFAULT_TIMEOUT;
          i++; // Pular próximo argumento
          break;

        case '--output':
          options.output = args[i + 1] || 'console';
          i++; // Pular próximo argumento
          break;

        case '--output-file':
          options.outputFile = args[i + 1] || 'database-setup-report.json';
          i++; // Pular próximo argumento
          break;

        case '--help':
        case '-h':
          this.showHelp();
          process.exit(0);
          break;

        case '--version':
          console.log('Database Setup Script v1.0.0');
          process.exit(0);
          break;
      }
    }

    return options;
  }

  /**
   * Mostra ajuda
   */
  showHelp() {
    console.log(`
Database Setup Script v1.0.0
Timesheet Manager - ABZ Group

Usage: node scripts/setup-database.js [options]

Options:
  --validate-only, -v     Apenas validar estrutura (não aplicar correções)
  --auto-fix, -f          Aplicar correções automaticamente
  --no-backup            Não criar backup antes de mudanças
  --no-rollback          Desabilitar rollback em caso de erro
  --quiet, -q            Modo silencioso (menos logs)
  --timeout <ms>         Timeout para operações (padrão: 30000ms)
  --output <format>      Formato de saída (console, json, file)
  --output-file <file>   Arquivo para saída (quando --output=file)
  --help, -h             Mostrar esta ajuda
  --version              Mostrar versão

Exemplos:
  # Apenas validar banco
  node scripts/setup-database.js --validate-only

  # Validar e corrigir automaticamente
  node scripts/setup-database.js --auto-fix

  # Gerar relatório JSON
  node scripts/setup-database.js --validate-only --output=json --output-file=report.json

Ambiente:
  TIMESHEET_CONFIG_FILE   Arquivo de configuração (.env)

Configuração (.env):
  NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
  NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
  SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
`);
  }

  /**
   * Inicializar configurações
   */
  async initialize() {
    try {
      // Carregar configurações do ambiente
      const config = this.loadConfig();
      
      if (!config.supabaseUrl || !config.supabaseKey) {
        throw new Error('Credenciais do Supabase não encontradas. Configure NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY');
      }

      // Inicializar sistema
      this.setup = new DatabaseSetup(config.supabaseUrl, config.supabaseKey, {
        autoFix: this.options.autoFix,
        createBackup: this.options.backup,
        enableRollback: this.options.rollback,
        onProgress: this.handleProgress.bind(this),
        onStepChange: this.handleStepChange.bind(this),
      });

      return config;

    } catch (error) {
      this.log('error', `Erro na inicialização: ${error.message}`);
      process.exit(1);
    }
  }

  /**
   * Carregar configurações
   */
  loadConfig() {
    // Em um script standalone, tentar carregar de .env ou variáveis de ambiente
    const config = {
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
      supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY,
    };

    return config;
  }

  /**
   * Handler para progresso
   */
  handleProgress(progress) {
    if (!this.options.quiet) {
      const percent = Math.round(progress.percentage);
      const step = progress.currentStep;
      const total = progress.totalSteps;
      
      process.stdout.write(`\r[${step}/${total}] ${progress.currentStepName} ${percent}%`);
      
      if (percent === 100) {
        process.stdout.write('\n');
      }
    }
  }

  /**
   * Handler para mudança de step
   */
  handleStepChange(step) {
    if (!this.options.quiet && step.status === 'completed') {
      console.log(`✅ ${step.name} (${step.duration}ms)`);
    } else if (!this.options.quiet && step.status === 'failed') {
      console.log(`❌ ${step.name} - ${step.error}`);
    }
  }

  /**
   * Log com cores
   */
  log(level, message) {
    if (this.options.quiet && level !== 'error') {
      return;
    }

    const timestamp = new Date().toISOString();
    const colors = {
      info: '\x1b[36m',     // Cyan
      success: '\x1b[32m',  // Green
      warning: '\x1b[33m',  // Yellow
      error: '\x1b[31m',    // Red
      reset: '\x1b[0m',     // Reset
    };

    const color = colors[level] || colors.info;
    console.log(`${color}[${timestamp}] ${message}${colors.reset}`);
  }

  /**
   * Executar validação
   */
  async runValidation() {
    this.log('info', '🔍 Iniciando validação do banco de dados...');

    try {
      const report = await this.setup.validateOnly();
      
      this.log('success', `✅ Validação concluída - Score: ${report.summary.overallScore}%`);
      
      // Mostrar resumo
      this.displayValidationSummary(report);
      
      return report;

    } catch (error) {
      this.log('error', `❌ Falha na validação: ${error.message}`);
      throw error;
    }
  }

  /**
   * Executar setup completo
   */
  async runSetup() {
    this.log('info', '🚀 Iniciando setup completo do banco de dados...');

    try {
      const result = await this.setup.runFullSetup();
      
      if (result.success) {
        this.log('success', `✅ Setup concluído com sucesso em ${DatabaseSetup.formatDuration(result.duration)}`);
        
        // Mostrar resumo
        this.displayExecutionSummary(result);
        
      } else {
        this.log('error', `❌ Setup falhou: ${result.error}`);
        process.exit(1);
      }

      return result;

    } catch (error) {
      this.log('error', `❌ Erro durante setup: ${error.message}`);
      process.exit(1);
    }
  }

  /**
   * Mostrar resumo da validação
   */
  displayValidationSummary(report) {
    const summary = report.summary;
    
    console.log('\n📊 RESUMO DA VALIDAÇÃO');
    console.log('='.repeat(50));
    console.log(`Score Geral: ${summary.overallScore}%`);
    console.log('');
    
    console.log('📋 TABELAS:');
    console.log(`  ✓ Válidas: ${summary.validTables}/${summary.totalTables}`);
    console.log(`  ⚠ Faltantes: ${summary.missingTables}`);
    console.log(`  ⚠ Incompletas: ${summary.incompleteTables}`);
    console.log('');
    
    console.log('🔧 ÍNDICES:');
    console.log(`  ✓ Válidos: ${summary.validIndexes}/${summary.totalIndexes}`);
    console.log(`  ⚠ Faltantes: ${summary.missingIndexes}`);
    console.log('');
    
    console.log('🔒 POLÍTICAS RLS:');
    console.log(`  ✓ Válidas: ${summary.validPolicies}/${summary.totalPolicies}`);
    console.log(`  ⚠ Faltantes: ${summary.missingPolicies}`);
    console.log('');
    
    console.log('⚙️ FUNÇÕES:');
    console.log(`  ✓ Válidas: ${summary.validFunctions}/${summary.totalFunctions}`);
    console.log(`  ⚠ Faltantes: ${summary.missingFunctions}`);
    console.log('');

    if (report.errors.length > 0) {
      console.log('❌ ERROS:');
      report.errors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error}`);
      });
      console.log('');
    }

    if (report.warnings.length > 0) {
      console.log('⚠️ AVISOS:');
      report.warnings.forEach((warning, index) => {
        console.log(`  ${index + 1}. ${warning}`);
      });
      console.log('');
    }

    if (report.recommendations.length > 0) {
      console.log('💡 RECOMENDAÇÕES:');
      report.recommendations.forEach((rec, index) => {
        console.log(`  ${index + 1}. ${rec}`);
      });
      console.log('');
    }
  }

  /**
   * Mostrar resumo da execução
   */
  displayExecutionSummary(result) {
    const { summary } = result;
    
    console.log('\n📊 RESUMO DA EXECUÇÃO');
    console.log('='.repeat(50));
    console.log(`Tempo Total: ${DatabaseSetup.formatDuration(result.duration)}`);
    console.log(`Status: ${result.success ? 'Sucesso' : 'Falha'}`);
    console.log('');
    
    console.log('📋 ETAPAS:');
    console.log(`  ✓ Concluídas: ${summary.completedSteps}`);
    console.log(`  ❌ Falharam: ${summary.failedSteps}`);
    console.log(`  ⏭️ Pulos: ${summary.skippedSteps}`);
    console.log(`  📊 Total: ${summary.totalSteps}`);
    console.log('');

    if (result.rollbackExecuted) {
      console.log('🔄 Rollback executado devido a erro');
      console.log('');
    }
  }

  /**
   * Salvar resultado em arquivo
   */
  saveResult(result, filename) {
    try {
      const fs = require('fs');
      const data = JSON.stringify(result, null, 2);
      fs.writeFileSync(filename, data);
      this.log('success', `Resultado salvo em: ${filename}`);
    } catch (error) {
      this.log('error', `Erro ao salvar arquivo: ${error.message}`);
    }
  }

  /**
   * Formatar saída
   */
  formatOutput(result, format) {
    switch (format) {
      case 'json':
        return JSON.stringify(result, null, 2);
      
      case 'file':
        return JSON.stringify(result, null, 2);
      
      case 'console':
      default:
        return null; // Usar output do console
    }
  }

  /**
   * Executar
   */
  async run() {
    const startTime = Date.now();
    
    try {
      // Inicializar
      await this.initialize();

      let result;

      if (this.options.validateOnly) {
        // Apenas validação
        result = await this.runValidation();
        
        // Verificar se precisa de correções
        const needsFix = this.analysisNeedsFix(result);
        if (needsFix && this.options.autoFix) {
          this.log('warning', 'Correções necessárias detectadas. Executando auto-fix...');
          result = await this.runSetup();
        } else if (needsFix && !this.options.autoFix) {
          this.log('warning', 'Correções necessárias, mas auto-fix não habilitado. Use --auto-fix para aplicar correções.');
          process.exit(1);
        }

      } else {
        // Setup completo
        result = await this.runSetup();
      }

      // Formatar e salvar saída
      const formatted = this.formatOutput(result, this.options.output);
      
      if (formatted && this.options.outputFile) {
        this.saveResult(result, this.options.outputFile);
      } else if (formatted) {
        console.log(formatted);
      }

      const duration = Date.now() - startTime;
      this.log('success', `Processo concluído em ${DatabaseSetup.formatDuration(duration)}`);

      process.exit(0);

    } catch (error) {
      const duration = Date.now() - startTime;
      this.log('error', `Processo falhou após ${DatabaseSetup.formatDuration(duration)}: ${error.message}`);
      process.exit(1);
    }
  }

  /**
   * Analisar se precisa de correções
   */
  analysisNeedsFix(report) {
    return report.summary.missingTables > 0 || 
           report.summary.missingIndexes > 0 || 
           report.summary.missingPolicies > 0 || 
           report.summary.missingFunctions > 0 ||
           report.summary.incompleteTables > 0;
  }
}

// ===============================
// EXECUÇÃO
// ===============================

// Verificar se é execução direta
if (import.meta.url === `file://${process.argv[1]}`) {
  const cli = new DatabaseSetupCLI();
  cli.run().catch(error => {
    console.error('Erro fatal:', error);
    process.exit(1);
  });
}

// Exportar para uso como módulo
export default DatabaseSetupCLI;