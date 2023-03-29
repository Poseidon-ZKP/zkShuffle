/* This file is used to convert markdown document to adoc for 
our documentation site https://github.com/Poseidon-ZKP/docs.pdn.xyz 
which is using adoc*/
const nodePandoc = require('node-pandoc');
const fs = require('fs');
const path = require('path');

const srcDir = './docs';
const destDir = './adocs';

// Make sure the destination directory exists
if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir);
}

// Read all files in the source directory
fs.readdir(srcDir, (err, files) => {
  if (err) {
    console.error(err);
    return;
  }

  // Convert each file to the .adoc format
  files.forEach((file) => {
    // Construct the source and destination file paths
    const src = path.join(srcDir, file);
    const dest = path.join(destDir, file.replace(/\.\w+$/, '.adoc'));

    // Arguments can be either a single String or in an Array
    const args = `-f markdown -t asciidoc -o ${dest}`;

    // Set your callback function
    const callback = (err, result) => {
      if (err) {
        console.error(`Oh Nos: ${err}`);
      } else {
        console.log(result);
      }
    };

    // Call pandoc
    nodePandoc(src, args, callback);
  });
});
