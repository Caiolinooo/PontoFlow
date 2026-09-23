import { describe, expect, it } from 'vitest';
import { buildDpStoragePath, sanitizePathSegment } from '@/lib/dp/delivery';

describe('DP delivery - vinculo centro de custo -> arquivo', () => {
  it('monta dp/{cc}/{AAAA-MM}/{colaborador}.pdf', () => {
    expect(
      buildDpStoragePath({
        centroCusto: 'CC-001',
        periodoIni: '2026-09-01',
        employeeId: 'emp-1',
        employeeName: 'João Silva',
      })
    ).toBe('dp/CC-001/2026-09/emp-1-Joao-Silva.pdf');
  });

  it('remove caracteres inseguros do segmento', () => {
    expect(sanitizePathSegment('  CC 01/Offshore áé ')).toBe('CC-01Offshore-ae');
  });

  it('segmento vazio cai em sem-nome', () => {
    expect(sanitizePathSegment('///')).toBe('sem-nome');
  });

  it('mesma entrada produz o mesmo caminho (idempotencia do upload)', () => {
    const input = { centroCusto: 'CC 02', periodoIni: '2026-09-16', employeeId: 'e2', employeeName: 'Maria' };
    expect(buildDpStoragePath(input)).toBe(buildDpStoragePath({ ...input }));
  });
});
