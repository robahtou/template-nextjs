import { findClassSyntaxInSourceFile }                  from './class-syntax.mjs';
import { formatParsedSourceText as formatConstLayout }  from './typescript-const-layout.mjs';
import { formatParsedSourceText as formatImportLayout } from './typescript-import-layout.mjs';
import { formatParsedSourceText as formatObjectLayout } from './typescript-object-layout.mjs';
import {
  formatParsedSourceText as formatParameterLayout
}                                                       from './typescript-parameter-layout.mjs';
import { createSourceFile }                             from './typescript-source.mjs';


function normalizeSourceText(sourceText) {
  const normalizedText = sourceText.replace(/\r\n/g, '\n');

  return normalizedText.endsWith('\n')
    ? normalizedText
    : `${normalizedText}\n`;
}

function processTypeScriptSource(
  sourceText,
  filePath,
  warnings = [],
  { checkClasses = false } = {}
) {
  let formattedText = normalizeSourceText(sourceText);
  let sourceFile    = createSourceFile(filePath, formattedText);
  const classFindings = checkClasses
    ? findClassSyntaxInSourceFile(sourceFile, filePath)
    : [];

  let nextText = formatImportLayout(
    formattedText,
    filePath,
    warnings,
    sourceFile
  );

  if (nextText !== formattedText) {
    formattedText = nextText;
    sourceFile     = createSourceFile(filePath, formattedText);
  }

  nextText = formatObjectLayout(formattedText, filePath, sourceFile);

  if (nextText !== formattedText) {
    formattedText = nextText;
    sourceFile     = createSourceFile(filePath, formattedText);
  }

  nextText = formatParameterLayout(formattedText, sourceFile);

  if (nextText !== formattedText) {
    formattedText = nextText;
    sourceFile     = createSourceFile(filePath, formattedText);
  }

  formattedText = formatConstLayout(formattedText, filePath, sourceFile);

  return {
    classFindings: classFindings,
    formattedText: formattedText
  };
}

function formatTypeScriptSource(sourceText, filePath, warnings = []) {
  const { formattedText } = processTypeScriptSource(
    sourceText,
    filePath,
    warnings
  );

  return formattedText;
}


export {
  formatTypeScriptSource,
  processTypeScriptSource
};
