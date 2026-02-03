import { useState, useCallback } from 'react';

export const useFileUploader = (options = {}) => {
  const [file, setFile] = useState(null);
  const [error, setError] = useState(null);

  const handleFileUpload = useCallback((event) => {
    const selectedFile = event.target.files?.[0];

    // Validate file presence
    if(!selectedFile) {
      setError("No file selected");
      return;
    }

    // Validate file type if specified
    if (options.allowedTypes && !options.allowedTypes.includes(selectedFile?.type)) {
      setError("Invalid file type");
      return;
    }

    setFile(selectedFile);
    if (options.onSuccess) options.onSuccess(selectedFile);
  }, [options]);

  return { file, error, handleFileUpload };
};