/**
 * SQL File Reader for Setup Wizard
 * 
 * Reads and parses SQL migration files from the setup-wizard directory
 * Provides utilities for loading, validating, and executing SQL scripts
 * Timesheet Manager - ABZ Group
 */

// Only import fs and path on server side
import fs from 'fs';
import path from 'path';
import { headers } from 'next/headers';

const isServer = typeof window === 'undefined';

if (!isServer) {
  throw new Error('SqlFileReader can only be used on the server side');
}

export interface SqlFile {
  id: string;
  name: string;
  filename: string;
  layer: number;
  order: number;
  path: string;
  content: string;
  size: number;
  description: string;
}

export interface SqlFileMetadata {
  totalFiles: number;
  totalLayers: number;
  totalSize: number;
  files: SqlFile[];
}

export class SqlFileReader {
  private readonly migrationsDir: string;
  private readonly wizardDir: string;

  constructor() {
    // Resolve path relative to project root
    this.migrationsDir = path.join(process.cwd(), 'migrations');
    this.wizardDir = path.join(this.migrationsDir, 'setup-wizard');
  }

  /**
   * Get all SQL migration files in order
   */
  async getAllFiles(): Promise<SqlFile[]> {
    try {
      // Check if directory exists
      if (!fs.existsSync(this.wizardDir)) {
        throw new Error(`Setup wizard directory not found: ${this.wizardDir}`);
      }

      // Read all files
      const files = fs.readdirSync(this.wizardDir);
      
      // Filter and parse SQL files (exclude ROLLBACK, EXECUTE-ALL, validation, and markdown files)
      const sqlFiles = files
        .filter(f => f.endsWith('.sql'))
        .filter(f => !f.startsWith('ROLLBACK'))
        .filter(f => !f.startsWith('EXECUTE-ALL'))
        .filter(f => !f.startsWith('99-'))
        .sort();

      // Parse each file
      const parsedFiles: SqlFile[] = [];
      
      for (const filename of sqlFiles) {
        const file = await this.parseFile(filename);
        if (file) {
          parsedFiles.push(file);
        }
      }

      return parsedFiles;

    } catch (error) {
      console.error('Error reading SQL files:', error);
      throw new Error(`Failed to read SQL files: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get a specific file by ID or filename
   */
  async getFile(identifier: string): Promise<SqlFile | null> {
    const files = await this.getAllFiles();
    return files.find(f => f.id === identifier || f.filename === identifier) || null;
  }

  /**
   * Get files by layer number
   */
  async getFilesByLayer(layer: number): Promise<SqlFile[]> {
    const files = await this.getAllFiles();
    return files.filter(f => f.layer === layer);
  }

  /**
   * Get metadata about all files
   */
  async getMetadata(): Promise<SqlFileMetadata> {
    const files = await this.getAllFiles();
    
    const totalSize = files.reduce((sum, f) => sum + f.size, 0);
    const layers = new Set(files.map(f => f.layer));

    return {
      totalFiles: files.length,
      totalLayers: layers.size,
      totalSize,
      files,
    };
  }

  /**
   * Get the rollback script
   */
  async getRollbackScript(): Promise<string> {
    const rollbackPath = path.join(this.wizardDir, 'ROLLBACK.sql');
    
    if (!fs.existsSync(rollbackPath)) {
      throw new Error('Rollback script not found');
    }

    return fs.readFileSync(rollbackPath, 'utf-8');
  }

  /**
   * Get the validation script
   */
  async getValidationScript(): Promise<string> {
    const validationPath = path.join(this.wizardDir, '99-validation.sql');
    
    if (!fs.existsSync(validationPath)) {
      throw new Error('Validation script not found');
    }

    return fs.readFileSync(validationPath, 'utf-8');
  }

  /**
   * Parse a single SQL file
   */
  private async parseFile(filename: string): Promise<SqlFile | null> {
    try {
      const filePath = path.join(this.wizardDir, filename);
      const content = fs.readFileSync(filePath, 'utf-8');
      const stats = fs.statSync(filePath);

      // Parse filename: "01-extensions.sql" or "02-layer-01-root-tables.sql"
      const match = filename.match(/^(\d+)-(.+)\.sql$/);
      if (!match) {
        console.warn(`Skipping file with invalid format: ${filename}`);
        return null;
      }

      const [, orderStr, namePart] = match;
      const order = parseInt(orderStr, 10);
      
      // Extract layer number if present
      const layerMatch = namePart.match(/^layer-(\d+)-/);
      const layer = layerMatch ? parseInt(layerMatch[1], 10) : 0;

      // Generate description from filename
      const description = this.generateDescription(namePart);

      return {
        id: `layer-${order}`,
        name: namePart,
        filename,
        layer,
        order,
        path: filePath,
        content,
        size: stats.size,
        description,
      };

    } catch (error) {
      console.error(`Error parsing file ${filename}:`, error);
      return null;
    }
  }

  /**
   * Generate human-readable description from filename
   */
  private generateDescription(namePart: string): string {
    // Remove "layer-XX-" prefix if present
    const cleaned = namePart.replace(/^layer-\d+-/, '');
    
    // Convert kebab-case to Title Case
    return cleaned
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
}

