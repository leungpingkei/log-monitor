export const parseFileLines = (fileContent) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target.result;
        const lines = content.split('\n');

        const parsedLogs = [];
        const errorsList = [];
        let errorCount = 0;
        let warningCount = 0;
        let infoCount = 0;

        lines.forEach((line) => {
            const parsed = parseLog4netLine(line.trim());
            if (parsed) {
              // Handle continuation lines (exception stack traces)
              if (parsed.level === 'CONTINUATION' && parsedLogs.length > 0) {
                // Append to previous log's message
                parsedLogs[parsedLogs.length - 1].message += '\n' + parsed.message;
              } else if (parsed.timestamp) {
                parsedLogs.push(parsed);
                
                if (parsed.level === 'ERROR' || parsed.level === 'FATAL') {
                  errorCount++;
                  const context = getContextLogs(parsedLogs, parsedLogs.length - 1);
                  errorsList.push({
                    id: errorsList.length,
                    ...context
                  });
                } else if (parsed.level === 'WARN') {
                  warningCount++;
                } else if (parsed.level === 'INFO') {
                  infoCount++;
                }
              }
            }
        });

        resolve({ parsedLogs, errorsList, stats: { total: parsedLogs.length, errors: errorCount, warnings: warningCount, info: infoCount } });
      } catch (err) {
        reject(err);
      }
    };

    // Handle file read errors
    reader.onerror = (err) => {reject("Failed to read file: " + err.message);};

    // Read the file content asynchronously
    reader.readAsText(fileContent);
  });
};

export const parseLog4netLine = (line) => {
  // Parse log4net format with line number: timestamp - threadId [level] logger(lineNumber) [ context ] - message
  const regexWithLineNumber = /^(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2},\d{3})\s+-\s+(\d+)\s+\[(\w+)\s*\]\s+([^\\(]+)\((\d+)\)\s+\[([^\]]*)\]\s+-\s+(.+)$/;
  const matchWithLineNumber = line.match(regexWithLineNumber);

  if (matchWithLineNumber) {
    return {
      timestamp: new Date(matchWithLineNumber[1].replace(',', '.')),
      threadId: matchWithLineNumber[2],
      level: matchWithLineNumber[3],
      logger: matchWithLineNumber[4].trim(),
      lineNumber: matchWithLineNumber[5],
      context: matchWithLineNumber[6].trim(),
      message: matchWithLineNumber[7],
      raw: line
    };
  }

  // Parse log4net format without line number: timestamp - threadId [level] logger [ context ] - message
  const regexWithoutLineNumber = /^(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2},\d{3})\s+-\s+(\d+)\s+\[(\w+)\s*\]\s+([^\\[]+)\s+\[([^\]]*)\]\s+-\s+(.+)$/;
  const matchWithoutLineNumber = line.match(regexWithoutLineNumber);

  if (matchWithoutLineNumber) {
    return {
      timestamp: new Date(matchWithoutLineNumber[1].replace(',', '.')),
      threadId: matchWithoutLineNumber[2],
      level: matchWithoutLineNumber[3],
      logger: matchWithoutLineNumber[4].trim(),
      lineNumber: null,
      context: matchWithoutLineNumber[5].trim(),
      message: matchWithoutLineNumber[6],
      raw: line
    };
  }

  // If line doesn't match (could be continuation of exception stack trace)
  // Return it as a message continuation
  if (line.trim().length > 0) {
    return {
      timestamp: null,
      threadId: null,
      level: 'CONTINUATION',
      logger: null,
      lineNumber: null,
      context: null,
      message: line.trim(),
      raw: line
    };
  }

  return null;
};

export const getContextLogs = (allLogs, errorIndex) => {
  const errorLog = allLogs[errorIndex];
  const errorTime = errorLog.timestamp;
  const lineWindow = 20; // ±20 lines
  const timeWindowMs = 2 * 60 * 1000; // ±2 minutes
  const severeLevels = ['ERROR', 'FATAL', 'WARN'];

  const contextLogs = {
    before: [],
    error: errorLog,
    after: []
  };

  // Get logs BEFORE error
  const beforeLogs = [];

  // 1. Get immediate ±20 lines
  const immediateBeforeStart = Math.max(0, errorIndex - lineWindow);
  for (let i = immediateBeforeStart; i < errorIndex; i++) {
    if (allLogs[i].threadId === errorLog.threadId) {
      beforeLogs.push({ log: allLogs[i], reason: 'immediate', index: i });
    }
  }

  // 2. Get WARN/ERROR/FATAL within 2 minutes before (but not in the ±20 range)
  for (let i = 0; i < immediateBeforeStart; i++) {
    const log = allLogs[i];
    if (errorTime - log.timestamp <= timeWindowMs && severeLevels.includes(log.level) && log.threadId === errorLog.threadId) {
      beforeLogs.push({ log: log, reason: 'severe', index: i });
    }
  }

  // Sort by index and remove duplicates
  beforeLogs.sort((a, b) => b.index - a.index);

  // Add gap indicators
  for (let i = 0; i < beforeLogs.length; i++) {
    if (i > 0 && beforeLogs[i].index - beforeLogs[i - 1].index > 1) {
      contextLogs.before.push({ isGap: true, count: beforeLogs[i].index - beforeLogs[i - 1].index - 1 });
    }
    contextLogs.before.push(beforeLogs[i].log);
  }

  // Get logs AFTER error
  const afterLogs = [];

  // 1. Get immediate ±20 lines
  const immediateAfterEnd = Math.min(allLogs.length, errorIndex + lineWindow + 1);

  for (let i = errorIndex + 1; i < immediateAfterEnd; i++) {
    // if (allLogs[i].threadId === errorLog.threadId) {
      afterLogs.push({ log: allLogs[i], reason: 'immediate', index: i });
    // }
  }

  // 2. Get WARN/ERROR/FATAL within 2 minutes after (but not in the ±20 range)
  for (let i = immediateAfterEnd; i < allLogs.length; i++) {
    const log = allLogs[i];
    if (log.timestamp - errorTime <= timeWindowMs && severeLevels.includes(log.level) && log.threadId === errorLog.threadId) {
      afterLogs.push({ log: log, reason: 'severe', index: i });
    } else if (log.timestamp - errorTime > timeWindowMs) {
      break;
    }
  }

  // Sort by index and add gap indicators
  afterLogs.sort((a, b) => a.index - b.index);

  for (let i = 0; i < afterLogs.length; i++) {
    if (i > 0 && afterLogs[i].index - afterLogs[i - 1].index > 1) {
      contextLogs.after.push({ isGap: true, count: afterLogs[i].index - afterLogs[i - 1].index - 1 });
    }
    contextLogs.after.push(afterLogs[i].log);
  }

  return contextLogs;
};