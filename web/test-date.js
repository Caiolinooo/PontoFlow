// Test BRT timezone date calculation
const now = new Date();
console.log('UTC Now:', now.toISOString());

const nowBRT = new Date(now.toLocaleString("en-US", {timeZone: "America/Sao_Paulo"}));
console.log('BRT Now:', nowBRT.toISOString());

const targetMonth = nowBRT.toISOString().slice(0,7);
console.log('Target Month (BRT):', targetMonth);