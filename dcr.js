const express = require('express');
const crypto = require('crypto');
const admin = require('firebase-admin');

const app = express();
const port = 3000;

// Initialize Firebase Admin SDK
const serviceAccount = require('./serviceAccountKey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: 'md5-decryption.appspot.com',
});

const storage = admin.storage();
const bucket = storage.bucket();

async function createOrAppendFile(filename, data) {
  try {
    const file = bucket.file(filename);
    let existingData = '';

    // Check if the file exists and read its current content
    const [exists] = await file.exists();
    if (exists) {
      const existingFileContent = await file.download();
      existingData = existingFileContent.toString('utf-8');
    }

    // Append new data to the existing content
    const newData = existingData + data;

    // Save the updated content back to the file
    await file.save(newData, { contentType: 'text/plain' });
    console.log(filename);
  } catch (error) {
    console.error(error);
  }
}

async function checkPassword(password) {
  let passwordList;
  let dictionaryFile;

  if (/^\d+$/.test(password)) {
    passwordList = 'numbers.txt';
    dictionaryFile = 'numbersDict.txt';
  } else if (/^[a-zA-Z]+$/.test(password)) {
    passwordList = 'alphabates.txt';
    dictionaryFile = 'alphabatesDict.txt';
  } else if (/^[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]+$/.test(password)) {
    passwordList = 'special.txt';
    dictionaryFile = 'specialDict.txt';
  } else {
    passwordList = 'password.txt';
    dictionaryFile = 'comboDict.txt';
  }

  const hashedPassword = crypto.createHash('md5').update(password).digest('hex');

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

  try {
    const dictFileRef = bucket.file(dictionaryFile);
    const [dictFileExists] = await dictFileRef.exists();
    if (dictFileExists) {
      const dictData = (await dictFileRef.download()).toString('utf-8');
      const entries = dictData.split('\n');

      for (let entry of entries) {
        const [hashed, pass] = entry.split(':');
        if (hashed === hashedPassword) {
          return pass.trim();
        }
      }
    }
  } catch (err) {
    console.error(err);
  }

  // If password not found in both files, append it to the dictionary file
  try {
    const dictFileRef = bucket.file(dictionaryFile);
    const dictData = `${hashedPassword}:${password}\n`;
    await createOrAppendFile(dictionaryFile, dictData);
  } catch (err) {
    console.error(err);
  }

  return "Not found";
}
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
});
app.post('/checkPassword', async (req, res) => {
  const { password } = req.query;
  const result = await checkPassword(password);
  res.send(result);
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
