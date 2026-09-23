import { generateQuestionsFromText } from './src/utils/aiGenerator.js';
import fs from 'fs';

const filePath = 'C:\\Users\\HEPL INTERN\\Documents\\eda.txt';
const dummyText = fs.readFileSync(filePath, 'utf8');

console.log("=== Original Text ===");
console.log(dummyText);
console.log("\n=== Generated Questions (MCQ) ===");
const mcqResult = generateQuestionsFromText(dummyText, 'MCQ', 3);
console.log(JSON.stringify(mcqResult, null, 2));

console.log("\n=== Generated Questions (FIB) ===");
const fibResult = generateQuestionsFromText(dummyText, 'FIB', 2);
console.log(JSON.stringify(fibResult, null, 2));
