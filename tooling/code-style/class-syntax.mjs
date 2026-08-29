import { createSourceFile, ts } from './typescript-source.mjs';


function findClassSyntaxInSourceFile(sourceFile, filePath = sourceFile.fileName) {
  const findings = [];

  function visit(node) {
    if (ts.isClassDeclaration(node) || ts.isClassExpression(node)) {
      const position = sourceFile.getLineAndCharacterOfPosition(
        node.getStart(sourceFile)
      );

      findings.push({
        column    : position.character + 1,
        filePath  : filePath,
        line      : position.line + 1
      });
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return findings;
}

function findClassSyntax(sourceText, filePath = 'source.ts') {
  return findClassSyntaxInSourceFile(
    createSourceFile(filePath, sourceText),
    filePath
  );
}


export {
  findClassSyntax,
  findClassSyntaxInSourceFile
};
