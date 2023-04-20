import { resolve } from "path";
import * as fs from "fs";

const baseDir = resolve(__dirname, "..");

export function writeToFile(value: object) {
  const path = `${baseDir}/deployments`;
  const fileName = `${path}/contract.json`;

  if (!fs.existsSync(path)) {
    fs.mkdirSync(path);
    console.log(`Folder ${path} created successfully.`);
  }

  fs.writeFileSync(fileName, JSON.stringify(value));
}

export function getDeployment() {
  const fileName = "contract.json";
  const path = `${baseDir}/deployments/${fileName}`;
  return fs.existsSync(path) ? JSON.parse(fs.readFileSync(path, "utf8")) : null;
}
