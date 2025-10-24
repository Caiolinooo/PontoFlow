const bcrypt = require('bcryptjs');
const hash = bcrypt.hashSync('Caio@2024', 10);
console.log(hash);

