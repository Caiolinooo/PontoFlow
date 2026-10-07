import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { nightMinutes, rubricLinesFromEntries } from './timesheets';
import { zonedClock } from './punches';

describe('rubricLinesFromEntries', () => {
  it('8h no dia não gera HE; 22h–23h conta noturno', () => {
    const lines = rubricLinesFromEntries(
      [{ data: '2026-10-05', hora_ini: '22:00', hora_fim: '23:00' }],
      { periodStart: '2026-10-01', periodEnd: '2026-10-31', weekly: false },
    );
    const by = Object.fromEntries(lines.map((l) => [l.code, l.quantity]));
    assert.equal(by.DIAS, 1);
    assert.equal(by.HORAS, 1);
    assert.equal(by.HE50, 0);
    assert.equal(by.NOTURNO, 1);
    assert.equal(by.FALTA, undefined);
  });

  it('excesso de 8h vira HE50', () => {
    const lines = rubricLinesFromEntries(
      [{ data: '2026-10-05', hora_ini: '08:00', hora_fim: '18:00' }],
      { periodStart: '2026-10-05', periodEnd: '2026-10-05', weekly: false },
    );
    const he = lines.find((l) => l.code === 'HE50');
    assert.equal(he?.quantity, 2);
  });

  it('escala semanal conta falta em dia útil sem apontamento', () => {
    const lines = rubricLinesFromEntries(
      [{ data: '2026-10-05', hora_ini: '08:00', hora_fim: '17:00' }],
      { periodStart: '2026-10-05', periodEnd: '2026-10-06', weekly: true },
    );
    const falta = lines.find((l) => l.code === 'FALTA');
    assert.equal(falta?.quantity, 1);
  });

  it('noite que vira o dia conta até 05:00', () => {
    assert.equal(nightMinutes('23:00', '01:00'), 120);
  });
});

describe('zonedClock', () => {
  it('rejeita data inválida', () => {
    assert.throws(() => zonedClock('nao-e-data'), /valid datetime/);
  });
});
