import { errorHandler } from '../app/container';
import { AppError } from '../core/ErrorHandler';
import { base64ToUint8Array } from './appUtil';

function readFile<T>(
  file: Readonly<File>,
  readMethod: 'readAsText' | 'readAsDataURL' | 'readAsArrayBuffer',
  processOnLoad: (readerResult: string | ArrayBuffer | null) => T,
  context: string,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      try {
        resolve(processOnLoad(reader.result));
      } catch (error) {
        reject(
          new AppError(
            `Error processing file content after reading: ${String(error)}`,
            context,
            `Could not process the content of '${file.name}'.`,
            error,
          ),
        );
      }
    };

    reader.onerror = () => {
      const error = reader.error || new Error('Unknown error during file reading operation.');
      reject(new AppError(`FileReader error: ${error.message}`, context, `Failed to read the file '${file.name}'.`, error));
    };

    reader.onabort = () => {
      reject(new AppError('File reading was aborted.', context, `Reading of the file '${file.name}' was cancelled.`));
    };

    try {
      reader[readMethod](file);
    } catch (error) {
      reject(new AppError(`Exception during ${readMethod} call: ${String(error)}`, context, `Could not read '${file.name}'.`, error));
    }
  });
}

export function readAsBase64(file: Readonly<File>): Promise<string> {
  return readFile(
    file,
    'readAsDataURL',
    (result) => {
      if (typeof result !== 'string') {
        throw new AppError('FileReader result was not a string.', 'File to Base64', 'Could not read file content.');
      }
      const base64Data = result.split(',')[1];
      if (base64Data === undefined) {
        throw new AppError('Could not extract Base64 content from the file data URL.', 'File to Base64', 'Could not process file content.');
      }
      return base64Data;
    },
    'File to Base64',
  );
}

export function readAsText(file: Readonly<File>): Promise<string> {
  return readFile(
    file,
    'readAsText',
    (result) => {
      if (typeof result === 'string') {
        return result;
      }
      throw new AppError(
        'FileReader result was not a string after readAsText.',
        'File Read As Text',
        `The file '${file.name}' could not be read as text.`,
      );
    },
    'File Read As Text',
  );
}

export function sanitizeFileName(name: string, fallbackName = 'file'): string {
  const MAX_BASENAME_LENGTH = 200;
  const trimmedName = name.trim();

  if (!trimmedName) {
    return `${fallbackName}.dat`;
  }

  let sanitized = trimmedName.replace(/[^a-z0-9_.-]/gi, '_').replace(/_{2,}/g, '_');

  if (sanitized === '.' || sanitized === '..') {
    sanitized = `${fallbackName}.dat`;
  }

  const extensionIndex = sanitized.lastIndexOf('.');
  let baseName: string;
  let extension: string;

  if (extensionIndex <= 0) {
    baseName = sanitized;
    extension = '';
  } else {
    baseName = sanitized.substring(0, extensionIndex);
    extension = sanitized.substring(extensionIndex);
  }

  if (!baseName) {
    baseName = fallbackName;
  }

  if (baseName.length > MAX_BASENAME_LENGTH) {
    baseName = baseName.substring(0, MAX_BASENAME_LENGTH).replace(/_$/, '');
  }

  return `${baseName.toLowerCase()}${extension.toLowerCase()}`;
}

export function triggerDownload(data: string, fileName: string, mimeType = 'text/plain', isBase64 = false): void {
  errorHandler.attempt(
    () => {
      let blob: Blob;

      if (isBase64) {
        const byteArray = base64ToUint8Array(data);
        blob = new Blob([new Uint8Array(byteArray)], { type: mimeType });
      } else {
        blob = new Blob([data], { type: mimeType });
      }

      const url = URL.createObjectURL(blob);
      const downloadLink = document.createElement('a');
      downloadLink.href = url;
      downloadLink.download = fileName;

      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);

      URL.revokeObjectURL(url);
    },
    'File Download Trigger',
    {
      genericMessage: `Failed to initiate the download for '${fileName}'. Please check your browser settings.`,
    },
  );
}
