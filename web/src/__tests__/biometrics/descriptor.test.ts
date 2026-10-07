import { describe, expect, it } from 'vitest';
import { canResetBiometrics } from '@/lib/biometrics/access';
import {
  FACE_DESCRIPTOR_LENGTH,
  livenessPassed,
  matchFaceDescriptors,
  parseFaceDescriptor,
} from '@/lib/biometrics/descriptor';

describe('biometria', () => {
  it('aceita descritor 128-d e rejeita lixo', () => {
    const raw = Array.from({ length: FACE_DESCRIPTOR_LENGTH }, (_, i) => i / 100);
    expect(parseFaceDescriptor(JSON.stringify(raw))).toHaveLength(FACE_DESCRIPTOR_LENGTH);
    expect(parseFaceDescriptor('[1,2,3]')).toBeNull();
    expect(parseFaceDescriptor('not-json')).toBeNull();
  });

  it('mesmo rosto casa e outro rosto não', () => {
    const enrolled = Array.from({ length: FACE_DESCRIPTOR_LENGTH }, () => 0.1);
    const same = enrolled.map((n) => n + 0.001);
    const other = Array.from({ length: FACE_DESCRIPTOR_LENGTH }, (_, i) => (i % 2 === 0 ? 1 : -1));
    expect(matchFaceDescriptors(enrolled, same).isMatch).toBe(true);
    expect(matchFaceDescriptors(enrolled, other).isMatch).toBe(false);
  });

  it('foto parada falha prova de vida; piscada e virada passam', () => {
    const still = Array.from({ length: 6 }, () => ({ ear: 0.31, noseX: 0.5 }));
    expect(livenessPassed(still)).toBe(false);
    expect(livenessPassed([
      { ear: 0.32, noseX: 0.5 },
      { ear: 0.31, noseX: 0.5 },
      { ear: 0.18, noseX: 0.5 },
      { ear: 0.33, noseX: 0.5 },
    ])).toBe(true);
    expect(livenessPassed([
      { ear: 0.3, noseX: 0.4 },
      { ear: 0.3, noseX: 0.45 },
      { ear: 0.3, noseX: 0.5 },
      { ear: 0.3, noseX: 0.55 },
    ])).toBe(true);
  });

  it('só ADMIN reseta biometria', () => {
    expect(canResetBiometrics('ADMIN')).toBe(true);
    expect(canResetBiometrics('admin')).toBe(true);
    expect(canResetBiometrics('ADMIN_GLOBAL')).toBe(true);
    expect(canResetBiometrics('TENANT_ADMIN')).toBe(false);
    expect(canResetBiometrics('MANAGER')).toBe(false);
    expect(canResetBiometrics('MANAGER_TIMESHEET')).toBe(false);
    expect(canResetBiometrics('USER')).toBe(false);
    expect(canResetBiometrics('COLAB')).toBe(false);
  });
});
