# OMEGA — Maximus Project — Mapping v1 (Timesheet → Invoice)

Fonte informada: C:\\Users\\caio.correia\\Downloads\\OMEGA - Maximus Project  -Monthly Charge Rates 09.2025 (1).xlsx
Observação: este arquivo está fora do repositório; para extração automática de cabeçalhos, copie-o para a pasta `docs/export/samples/` ou informe os headers.

## Headers detectados (da planilha no repo)

- Charge Rate: ["Name","Position/Call Off","Charge Rate (GBP)","Days","Brazilian Payroll Additionals (GBP)","Expenses","Monthly Total (GBP)"]
- Brazilian Payroll: ["Name","Position","Social Security INSS","Prior  Notice Indemnified 8.33%","FGTS Fine  3,82%","Social Security INSS on Vacation and 13th Salary 5.6%","Life Insurance","ASO","Hotels","Total BRL","GBP Rate","Total GBP"]

## Mapeamento específico OMEGA (v1)

- Name ⇄ employee_name
- Position/Call Off ⇄ employee_position + call_off
- Charge Rate (GBP) ⇄ rate_value (currency: GBP)
- Days ⇄ work.day_count
- Brazilian Payroll Additionals (GBP) ⇄ payroll_additionals_gbp (somatório de rubricas por cliente)
- Expenses ⇄ expenses_gbp (reembolsos)
- Monthly Total (GBP) ⇄ total_amount

- [Brazilian Payroll sheet]
- Position ⇄ employee_position
- Social Security INSS ⇄ payroll.inss_brl
- Prior Notice Indemnified 8.33% ⇄ payroll.prior_notice_8_33_brl
- FGTS Fine 3,82% ⇄ payroll.fgts_fine_3_82_brl
- Social Security INSS on Vacation and 13th Salary 5.6% ⇄ payroll.inss_vacation_13th_5_6_brl
- Life Insurance ⇄ payroll.life_insurance_brl
- ASO ⇄ payroll.aso_brl
- Hotels ⇄ payroll.hotels_brl
- Total BRL ⇄ payroll.total_brl
- GBP Rate ⇄ fx.gbp_rate
- Total GBP ⇄ payroll.total_gbp

## Alvo (campos mínimos para o gerador)

- tenant_id, environment_slug
- employee_name, employee_id (opcional), employee_position
- vessel_name, cost_center, call_off
- period_start, period_end
- day_count, hours_regular, hours_overtime (se aplicável)
- rate_type (daily/hourly), rate_value, currency
- total_amount
- notes/comments

## CSV (proposto)

header:
```csv
tenant_id,environment_slug,employee_name,employee_position,vessel_name,cost_center,call_off,period_start,period_end,day_count,hours_regular,hours_overtime,rate_type,rate_value,currency,total_amount,notes
```

## JSON (proposto)

```json
{
  "tenant_id": "uuid",
  "environment_slug": "omega",
  "employee": {"name": "...", "position": "...", "id": "..."},
  "vessel": {"name": "..."},
  "period": {"start": "YYYY-MM-DD", "end": "YYYY-MM-DD"},
  "work": {"day_count": 0, "hours_regular": 0, "hours_overtime": 0},
  "rate": {"type": "daily|hourly", "value": 0, "currency": "USD|BRL"},
  "call_off": "...",
  "cost_center": "...",
  "total_amount": 0,
  "notes": "..."
}
```

## Mapeamento Timesheet → Invoice (baseline)

- Colaborador/Timesheet → employee_name/position, period_start/end
- Entradas EMBARQUE/DESEMBARQUE/TRANSLADO → compõem day_count e/ou hours_regular
- Vessel do colaborador → vessel_name
- Centro de custo → cost_center
- Regras de rate → rate_type/rate_value (parametrizável por cliente)
- Aprovação → libera geração; status + auditoria

## Próximos passos

1) Extrair headers reais da planilha e alinhar mapeamento.
2) Implementar export v1 (CSV/JSON) com `tenant_id` e `environment_slug`.

## Script opcional (Node) para extrair headers de um .xlsx

Coloque o arquivo na pasta `docs/export/samples/` e rode o script.
```js
import xlsx from 'xlsx';
import fs from 'node:fs';
const path = 'docs/export/samples/OMEGA.xlsx';
const wb = xlsx.readFile(path);
const ws = wb.Sheets[wb.SheetNames[0]];
const range = xlsx.utils.decode_range(ws['!ref']);
const headers = [];
for (let C = range.s.c; C <= range.e.c; ++C) {
  const cell = ws[xlsx.utils.encode_cell({ r: range.s.r, c: C })];
  headers.push(cell ? String(cell.v).trim() : '');
}
console.log(headers);
```

