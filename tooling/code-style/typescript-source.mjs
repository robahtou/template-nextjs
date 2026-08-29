import path from 'node:path';
import ts   from '@typescript/typescript6';


function getScriptKind(filePath) {
  const extension = path.extname(filePath).toLowerCase();

  if (extension === '.tsx') {
    return ts.ScriptKind.TSX;
  }

  if (extension === '.jsx') {
    return ts.ScriptKind.JSX;
  }

  if (extension === '.cjs' || extension === '.js' || extension === '.mjs') {
    return ts.ScriptKind.JS;
  }

  return ts.ScriptKind.TS;
}

function assertSourceFileIsParseable(sourceFile, filePath) {
  const diagnostic = sourceFile.parseDiagnostics[0];

  if (diagnostic === undefined) {
    return;
  }

  const { line, character } = sourceFile.getLineAndCharacterOfPosition(
    diagnostic.start ?? 0
  );
  const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');

  throw new SyntaxError(
    `${filePath}:${line + 1}:${character + 1} is not parseable by the TypeScript 6 compatibility API: ${message}`
  );
}

function createSourceFile(filePath, sourceText) {
  // Parent nodes stay disabled because every AST accessor receives sourceFile explicitly.
  const sourceFile = ts.createSourceFile(
    filePath,
    sourceText,
    ts.ScriptTarget.Latest,
    false,
    getScriptKind(filePath)
  );

  assertSourceFileIsParseable(sourceFile, filePath);
  return sourceFile;
}


export {
  createSourceFile,
  ts
};
