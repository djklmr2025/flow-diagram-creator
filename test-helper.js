import { readFileSync } from 'fs';

export function getExposedFunction(filePath, funcName) {
  const source = readFileSync(filePath, 'utf-8');
  let cleanSource = source.replace(/import .*? from '.*?';/g, '');
  cleanSource = cleanSource.replace(/export default async function handler.*?^}/ms, '');

  const extractFunc = new Function('Buffer', cleanSource + `\nreturn ${funcName};`);
  return extractFunc(Buffer);
}
