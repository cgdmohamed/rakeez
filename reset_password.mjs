import bcrypt from 'bcrypt';

const password = 'admin123';
bcrypt.hash(password, 10).then(hash => {
  console.log('Password: admin123');
  console.log('New hash:', hash);
  console.log('');
  console.log('Run this SQL on production database:');
  console.log(`UPDATE users SET password = '${hash}' WHERE email = 'admin@rakeez.sa';`);
}).catch(err => {
  console.error('Error:', err);
});
