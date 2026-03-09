import path from 'path';
import Module from 'module';
import winston from 'winston';

const getModuleLoggingLabel = (callingModule: Module): string => {
  const filePathParts = callingModule.filename.split(path.sep);
  if (filePathParts.length < 2) return '';

  const folderName = filePathParts[filePathParts.length - 2];
  const fileName = filePathParts[filePathParts.length - 1];
  return path.join(folderName, fileName);
};

export const createLogger = (callingModule: Module) => {
  const label = getModuleLoggingLabel(callingModule);
  return winston.createLogger({
    format: winston.format.combine(
      winston.format.label({ label }),
      winston.format.timestamp(),
      winston.format.simple()
    ),
    transports: [new winston.transports.Console()],
  });
};
