# Biometria real e card Admin

Objetivo: cadastro e verificação facial funcionam de verdade; só ADMIN reseta o template de cada colaborador; o card Admin aparece para o admin atual.

1. [feito] Papel da sessão. JWT antigo pode dizer TENANT_ADMIN enquanto `users_unified` / metadata dizem ADMIN, às vezes em minúsculas. A request lê o banco, normaliza o papel e promove quem está em `super_admins`. O card Admin fica no topo do dashboard e na folha de ponto.
2. [feito] Modelos face-api em `web/public/models` (HTTP 200). Cadastro inicial na folha, com prova de vida (piscar ou virar a cabeça) e descritor 128-d gravado em `employee_face_data`.
3. [feito] Verificação no servidor (distância euclidiana, limiar 0.5) antes da marcação. Sem rede, a marcação offline só segue se o rosto local casar.
4. [feito] Reset só para papel ADMIN, na lista Admin > Funcionários e em DELETE `/api/admin/employees/[id]/biometrics`. USER, MANAGER, MANAGER_TIMESHEET e TENANT_ADMIN recebem 403. O cache local do colaborador cai quando o servidor diz que não há cadastro.
5. [feito no código e no vitest] type-check ok. 18 testes ok. Browser: sessão aberta é `teste@abzgroup.com` papel USER, card some de propósito. Conta admin `caio.correia@groupabz.com` não entrou (sem senha). Câmera não foi exercitada.
