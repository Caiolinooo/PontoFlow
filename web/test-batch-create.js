// Test script to verify the batch create fix
// This simulates the API call that was failing

const testData = {
  entries: [
    {
      data: '2025-10-30',
      environment_id: '6c608fd1-77b2-4adb-9dfa-4c0382240df1', // Almoço Start environment
      hora_ini: '12:00',
      hora_fim: null,
      observacao: 'Test entry'
    }
  ]
};

console.log('🔍 Testing batch create fix...');
console.log('📝 Test data:', JSON.stringify(testData, null, 2));

// Simulate the mapping logic that was fixed
const environments = [
  { id: '6c608fd1-77b2-4adb-9dfa-4c0382240df1', slug: 'Almoço Start' }
];

const envMap = new Map(environments.map(e => [e.id, e.slug]));

const mapEnvironmentSlugToTipo = (slug) => {
  const slugMap = {
    'embarque': 'embarque',
    'desembarque': 'desembarque',
    'offshore': 'trabalho',
    'regime-offshore': 'trabalho',
    'folga': 'folga',
    'pausa': 'pausa',
    'refeicao': 'refeicao',
    'almoco-start': 'trabalho', // Map "Almoço Start" to valid tipo
    'inicio': 'inicio',
    'fim': 'fim',
    'espera': 'espera',
    'trabalho': 'trabalho',
    'ferias': 'ferias',
    'licenca': 'licenca',
    'doenca': 'doenca',
    'treinamento': 'treinamento',
    'manutencao': 'manutencao',
    'viagem': 'viagem',
    'administrativo': 'administrativo'
  };

  return slugMap[slug.toLowerCase()] || 'trabalho';
};

// Test the mapping
const entry = testData.entries[0];
const mappedTipo = mapEnvironmentSlugToTipo(envMap.get(entry.environment_id));

console.log('🔄 Environment slug:', envMap.get(entry.environment_id));
console.log('✅ Mapped to tipo:', mappedTipo);
console.log('🎯 Expected tipo values: inicio, pausa, fim, embarque, desembarque, espera, refeicao, trabalho, ferias, licenca, doenca, treinamento, manutencao, viagem, administrativo');

if (['inicio', 'pausa', 'fim', 'embarque', 'desembarque', 'espera', 'refeicao', 'trabalho', 'ferias', 'licenca', 'doenca', 'treinamento', 'manutencao', 'viagem', 'administrativo'].includes(mappedTipo)) {
  console.log('✅ SUCCESS: Mapping produces valid tipo value!');
} else {
  console.log('❌ FAILED: Mapping produces invalid tipo value:', mappedTipo);
}

console.log('📋 Final insert data would be:');
console.log(JSON.stringify({
  tenant_id: 'test-tenant',
  timesheet_id: 'test-timesheet',
  data: entry.data,
  tipo: mappedTipo,
  environment_id: entry.environment_id,
  hora_ini: entry.hora_ini,
  hora_fim: entry.hora_fim,
  observacao: entry.observacao
}, null, 2));