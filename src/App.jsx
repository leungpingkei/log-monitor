import React, { useState, useRef } from 'react';
import { parseFileLines } from './components/parser';
import { useFileUploader } from './hooks/useFileUploader';
import { AlertCircle, CheckCircle, Upload, Play, FolderOpen, ChevronDown, ChevronUp, Clock, FileText } from 'lucide-react';

export default function Log4netMonitor() {
  const [sourcePath, setSourcePath] = useState('');
  const [targetPath, setTargetPath] = useState('');
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [logs, setLogs] = useState([]);
  const [errors, setErrors] = useState([]);
  const [expandedError, setExpandedError] = useState(null);
  const [stats, setStats] = useState({ total: 0, errors: 0, warnings: 0, info: 0 });
  const [isParsing, setIsParsing] = useState(false);

  const fileInputRef = useRef(null);
  
  // Use custom file uploader hook
  const { handleFileUpload, error: uploadError } = useFileUploader({
    allowedTypes: ['text/plain', ''], // .log files often have empty MIME types
    onSuccess: async (file) => {
      setIsParsing(true);
      try {
        const result = await parseFileLines(file);
        setLogs(result.parsedLogs);
        setErrors(result.errorsList);
        setStats(result.stats);
      } catch (err) {
        console.log("Error parsing log file: " + err);        
      } finally {
        setIsParsing(false);
      }
    },
    onError: (error) => {
      console.log("Error uploading file: " + error);
    }    
  });

  const startMonitoring = () => {
    if (!sourcePath || !targetPath) {
      alert('Please specify both source and target folder paths');
      return;
    }
    setIsMonitoring(true);
  };

  const getLevelColor = (level) => {
    switch (level) {
      case 'ERROR':
      case 'FATAL':
        return 'text-red-600 bg-red-50';
      case 'WARN':
        return 'text-yellow-600 bg-yellow-50';
      case 'INFO':
        return 'text-blue-600 bg-blue-50';
      case 'DEBUG':
        return 'text-gray-600 bg-gray-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const formatTimestamp = (timestamp) => {
    return timestamp.toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <FileText className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-800">Log4net Error Monitor</h1>
          </div>
          <p className="text-gray-600">Monitor and analyze log4net files with contextual error detection</p>
        </div>

        {/* Configuration Panel */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Configuration</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Source Folder Path
              </label>
              <input
                type="text"
                value={sourcePath}
                onChange={(e) => setSourcePath(e.target.value)}
                placeholder="C:\Logs\Application"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Target Analysis Folder
              </label>
              <input
                type="text"
                value={targetPath}
                onChange={(e) => setTargetPath(e.target.value)}
                placeholder="C:\Logs\Analysis"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex gap-4">
            <button
              onClick={startMonitoring}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              <Play className="w-5 h-5" />
              Start Monitoring
            </button>

            <label className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium cursor-pointer">
              <Upload className="w-5 h-5" />
              {isParsing ? 'Parsing...' : 'Upload Log File'}
              <input
                type="file"
                // accept=".log,.txt"
                ref={fileInputRef}
                onChange={handleFileUpload}
                disabled={isParsing}
                //onChange={handleFileUploadBackup}
                className="hidden"
              />
            </label>
          </div>

          {uploadError > 0 && (<div className="mt-4 text-red-600 font-medium">{uploadError}</div>)}

          {isMonitoring && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-blue-800 font-medium">Monitoring active - Upload a log file to analyze</p>
            </div>
          )}
        </div>

        {/* Statistics Dashboard */}
        {logs.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Logs</p>
                  <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
                </div>
                <FileText className="w-10 h-10 text-gray-400" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Errors</p>
                  <p className="text-2xl font-bold text-red-600">{stats.errors}</p>
                </div>
                <AlertCircle className="w-10 h-10 text-red-400" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Warnings</p>
                  <p className="text-2xl font-bold text-yellow-600">{stats.warnings}</p>
                </div>
                <AlertCircle className="w-10 h-10 text-yellow-400" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Info</p>
                  <p className="text-2xl font-bold text-blue-600">{stats.info}</p>
                </div>
                <CheckCircle className="w-10 h-10 text-blue-400" />
              </div>
            </div>
          </div>
        )}

        {/* Error List with Context */}
        {errors.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <AlertCircle className="w-6 h-6 text-red-600" />
              Detected Errors with Context (±20 lines + WARN/ERROR/FATAL ±2 min)
            </h2>

            <div className="space-y-4">
              {errors.map((errorContext) => (
                <div key={errorContext.id} className="border border-gray-200 rounded-lg overflow-hidden">
                  {/* Error Header */}
                  <div
                    className="bg-red-50 border-l-4 border-red-500 p-4 cursor-pointer hover:bg-red-100 transition-colors"
                    onClick={() => setExpandedError(expandedError === errorContext.id ? null : errorContext.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="px-2 py-1 bg-red-600 text-white text-xs font-bold rounded">
                            {errorContext.error.level}
                          </span>
                          <span className="text-sm text-gray-600">
                            {formatTimestamp(errorContext.error.timestamp)}
                          </span>
                        </div>
                        <p className="font-mono text-sm text-red-800">{errorContext.error.message}</p>
                        <p className="text-xs text-gray-600 mt-1">
                          Logger: {errorContext.error.logger} (Line: {errorContext.error.lineNumber}) | Thread: {errorContext.error.threadId}
                        </p>
                      </div>
                      {expandedError === errorContext.id ? (
                        <ChevronUp className="w-5 h-5 text-gray-500" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-500" />
                      )}
                    </div>
                  </div>

                  {/* Context Logs */}
                  {expandedError === errorContext.id && (
                    <div className="p-4 bg-gray-50">
                      {/* Before Context */}
                      {errorContext.before.length > 0 && (
                        <div className="mb-4">
                          <div className="flex items-center gap-2 mb-2">
                            <Clock className="w-4 h-4 text-blue-600" />
                            <h4 className="text-sm font-semibold text-gray-700">
                              Before Error ({errorContext.before.filter(l => !l.isGap).length} logs shown)
                            </h4>
                          </div>
                          <div className="space-y-1 pl-4 border-l-2 border-blue-300">
                            {errorContext.before.map((item, idx) => 
                              item.isGap ? (
                                <div key={`gap-before-${idx}`} className="py-2 text-center">
                                  <div className="inline-flex items-center gap-2 px-4 py-1 bg-gray-200 text-gray-600 rounded-full text-xs font-medium">
                                    <span className="text-gray-400">···</span>
                                    {item.count} log line{item.count !== 1 ? 's' : ''} skipped
                                    <span className="text-gray-400">···</span>
                                  </div>
                                </div>
                              ) : (
                                <div key={idx} className={`p-2 rounded text-xs font-mono ${getLevelColor(item.level)}`}>
                                  <div className="flex gap-2">
                                    <span className="text-gray-500">{formatTimestamp(item.timestamp)}</span>
                                    <span className="font-semibold">[{item.level}]</span>
                                    <span className="flex-1 whitespace-pre-wrap">{item.message}</span>
                                  </div>
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      )}

                      {/* After Context */}
                      {errorContext.after.length > 0 && (
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <Clock className="w-4 h-4 text-green-600" />
                            <h4 className="text-sm font-semibold text-gray-700">
                              After Error ({errorContext.after.filter(l => !l.isGap).length} logs shown)
                            </h4>
                          </div>
                          <div className="space-y-1 pl-4 border-l-2 border-green-300">
                            {errorContext.after.map((item, idx) =>
                              item.isGap ? (
                                <div key={`gap-after-${idx}`} className="py-2 text-center">
                                  <div className="inline-flex items-center gap-2 px-4 py-1 bg-gray-200 text-gray-600 rounded-full text-xs font-medium">
                                    <span className="text-gray-400">···</span>
                                    {item.count} log line{item.count !== 1 ? 's' : ''} skipped
                                    <span className="text-gray-400">···</span>
                                  </div>
                                </div>
                              ) : (
                                <div key={idx} className={`p-2 rounded text-xs font-mono ${getLevelColor(item.level)}`}>
                                  <div className="flex gap-2">
                                    <span className="text-gray-500">{formatTimestamp(item.timestamp)}</span>
                                    <span className="font-semibold">[{item.level}]</span>
                                    <span className="flex-1 whitespace-pre-wrap">{item.message}</span>
                                  </div>
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {logs.length === 0 && (
          <div className="bg-white rounded-lg shadow-lg p-12 text-center">
            <FolderOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No Logs Loaded</h3>
            <p className="text-gray-600">Upload a log4net formatted log file to begin analysis</p>
          </div>
        )}
      </div>
    </div>
  );
}