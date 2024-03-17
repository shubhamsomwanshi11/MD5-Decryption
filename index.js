const express = require('express');
const crypto = require('crypto');
const admin = require('firebase-admin');

const app = express();
const port = 3000;
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
});
// Initialize Firebase Admin SDK
const serviceAccount = require('./serviceAccountKey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: 'md5-decryption.appspot.com',
});

const storage = admin.storage();
const bucket = storage.bucket();

async function checkPassword(hashedPassword) {
  let passwordList;

  // if (/^\d+$/.test(hashedPassword)) {
  //   passwordList = 'numbers.txt';
  // } else if (/^[a-zA-Z]+$/.test(hashedPassword)) {
  //   passwordList = 'alphabates.txt';
  // } else if (/^[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]+$/.test(hashedPassword)) {
  //   passwordList = 'special.txt';
  // } else {
  passwordList = 'password.txt';
  // }

  // const hashedPassword = crypto.createHash('md5').update(password).digest('hex');
  // console.log(hashedPassword);

  try {
    const fileRef = bucket.file(passwordList);
    const [fileExists] = await fileRef.exists();
    if (fileExists) {
      const data = (await fileRef.download()).toString('utf-8');
      const passwords = data.split('\n');

      for (let pass of passwords) {
        pass = pass.trim();
        const hashed = crypto.createHash('md5').update(pass).digest('hex');
        if (hashed === hashedPassword) {
          return pass;
        }
      }
    }
  } catch (err) {
    console.error(err);
  }

  return "Not found";
}

app.post('/checkPassword', async (req, res) => {
  const { password } = req.query;
  const result = await checkPassword(password);
  res.send(result);
});
app.get('/', (req, res) => {
  res.send("Hello shubhamsomwanshi11 ❤️");
})
app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
