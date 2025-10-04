import bcrypt from 'bcrypt';

const password = 'admin123';
const hash = '$2b$10$gSVRcgVn.fz0qbo.cY/ZzuC45BbiwAJYtT87okm5Pwo2Fe2ysc.Ca';

console.log('Password:', password);
console.log('Hash:', hash);

bcrypt.compare(password, hash).then(result => {
  console.log('Match result:', result);
}).catch(err => {
  console.error('Error:', err);
});
