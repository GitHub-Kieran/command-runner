export interface PlainOutput {
  type: 'plain';
  content: string;
}

export interface ErrorOutput {
  type: 'error';
  title: string;
  message: string;
  suggestions: string[];
  fullDetails: string;
}

export type FormattedOutput = PlainOutput | ErrorOutput;

/**
 * Recognizes a handful of common failure shapes (.NET exceptions, command-not-found,
 * permission, connection, filesystem errors) and turns them into a friendlier summary
 * with actionable suggestions, falling back to plain text otherwise.
 */
export function formatOutput(text: string): FormattedOutput {
  if (!text) return { type: 'plain', content: text };

  const lines = text.split('\n');

  const isDotNetException = lines.some((line) => line.includes('System.') && line.includes('Exception'));
  if (isDotNetException) {
    const mainException = lines.find(
      (line) => line.trim().startsWith('System.') && line.includes('Exception:') && !line.includes('--->'),
    );
    const unhandledException = lines.find(
      (line) => line.includes('Unhandled exception') || line.includes('An unhandled exception'),
    );

    let message = 'An error occurred';
    if (mainException) {
      const colonIndex = mainException.indexOf('Exception:');
      if (colonIndex !== -1) {
        message = mainException.substring(colonIndex + 11).trim();
      }
    } else if (unhandledException) {
      message = unhandledException.trim();
    }

    return {
      type: 'error',
      title: 'Application Error',
      message,
      suggestions: [
        'Check if required services are running',
        'Verify configuration settings',
        'Ensure all dependencies are installed',
        'Check file and network permissions',
      ],
      fullDetails: text,
    };
  }

  if (lines.some((line) => line.includes('command not found') || line.includes('is not recognized') || line.includes('No such file or directory'))) {
    return {
      type: 'error',
      title: 'Command Not Found',
      message: 'The specified command could not be located',
      suggestions: [
        'Install the required software',
        'Use absolute paths to executables',
        'Check if the command is in your PATH',
        'Verify the executable name is correct',
      ],
      fullDetails: text,
    };
  }

  if (lines.some((line) => line.includes('Permission denied') || line.includes('Access is denied') || line.includes('Operation not permitted'))) {
    return {
      type: 'error',
      title: 'Permission Denied',
      message: 'Access to the requested resource was denied',
      suggestions: [
        'Run with elevated privileges (sudo/admin)',
        'Check file ownership and permissions',
        'Verify access to the target directory',
        'Ensure the user has necessary rights',
      ],
      fullDetails: text,
    };
  }

  if (lines.some((line) => line.includes('Connection refused') || line.includes('Network is unreachable') || line.includes('Address already in use'))) {
    return {
      type: 'error',
      title: 'Connection Error',
      message: 'Network or connection-related error occurred',
      suggestions: [
        'Check if the target service is running',
        'Verify network connectivity',
        'Ensure the correct port/address is used',
        'Check firewall settings',
      ],
      fullDetails: text,
    };
  }

  if (lines.some((line) => line.includes('No such file') || line.includes('Directory not found') || line.includes('File exists'))) {
    return {
      type: 'error',
      title: 'File System Error',
      message: 'File or directory operation failed',
      suggestions: [
        'Verify the file/directory path exists',
        'Check file permissions',
        'Use absolute paths instead of relative paths',
        'Ensure the working directory is correct',
      ],
      fullDetails: text,
    };
  }

  return { type: 'plain', content: text };
}
