import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UploadCloud, FileImage, X, Loader2, AlertCircle } from 'lucide-react';
import api from '../api/axios';

function Upload() {
  const { user, login } = useAuth();
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [statusText, setStatusText] = useState('');
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (!selectedFile.type.startsWith('image/')) {
        setError('Please upload a valid image file (PNG, JPG).');
        return;
      }
      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));
      setError('');
    }
  };

  const clearFile = () => {
    setFile(null);
    setPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type.startsWith('image/')) {
      setFile(droppedFile);
      setPreview(URL.createObjectURL(droppedFile));
      setError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    setStatusText('Uploading floor plan...');
    setError('');

    const formData = new FormData();
    formData.append('floor_plan', file);

    try {
      // Step 1: Hit the backend API
      setStatusText('Processing with WallMind Engine...');
      let analysisData = null;

      try {
        const response = await api.post('/analysis', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });

        if (response.data.success) {
          // Update user's remaining credits immediately in the navbar
          if (response.data.remainingCredits !== undefined) {
            login({ ...user, credits: response.data.remainingCredits });
          }

          // Navigate to the newly generated database record
          navigate(`/analysis/${response.data.analysisId}`);
          return;
        }
      } catch (backendError) {
        console.warn("Backend parser failed.", backendError);
        throw new Error(backendError.response?.data?.error || 'Backend parser failed.');
      }

    } catch (err) {
      setError(err.message || 'An unexpected error occurred during analysis.');
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-50 py-10">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-8 border-b border-gray-200 bg-gray-50/50">
            <h1 className="text-2xl font-bold text-gray-900">New Floor Plan Analysis</h1>
            <p className="mt-1 text-sm text-gray-500">
              Upload a clear 2D floor plan image (.png, .jpg) to securely extract 3D geometries and structural materials.
            </p>
          </div>

          <div className="p-8">
            {error && (
              <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4 flex">
                <AlertCircle className="h-5 w-5 text-red-500 mr-3 mt-0.5" />
                <span className="text-red-700 text-sm">{error}</span>
              </div>
            )}

            {!file ? (
              <div
                className="mt-2 flex justify-center rounded-xl border-2 border-dashed border-gray-300 px-6 py-16 hover:bg-gray-50 hover:border-blue-400 transition-colors cursor-pointer"
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current.click()}
              >
                <div className="text-center">
                  <UploadCloud className="mx-auto h-12 w-12 text-gray-400" aria-hidden="true" />
                  <div className="mt-4 flex text-sm leading-6 text-gray-600 justify-center">
                    <span className="relative cursor-pointer rounded-md bg-transparent font-semibold text-blue-600 focus-within:outline-none focus-within:ring-2 focus-within:ring-blue-600 focus-within:ring-offset-2 hover:text-blue-500">
                      <span>Upload a file</span>
                      <input
                        name="floor_plan"
                        type="file"
                        className="sr-only"
                        accept="image/png, image/jpeg, image/jpg"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                      />
                    </span>
                    <p className="pl-1">or drag and drop</p>
                  </div>
                  <p className="text-xs leading-5 text-gray-500 mt-2">PNG, JPG, JPEG up to 10MB</p>
                </div>
              </div>
            ) : (
              <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-6 relative">
                <button
                  onClick={clearFile}
                  disabled={loading}
                  className="absolute top-4 right-4 p-1 bg-white rounded-full text-gray-500 hover:text-gray-700 shadow-sm border border-gray-200 disabled:opacity-50"
                  aria-label="Remove image"
                >
                  <X className="h-4 w-4" />
                </button>
                <div className="flex flex-col items-center">
                  <div className="w-full max-w-sm rounded-lg overflow-hidden border border-gray-200 shadow-sm bg-white mb-4">
                    <img src={preview} alt="Plan preview" className="w-full h-auto object-cover max-h-64" />
                  </div>
                  <div className="flex items-center text-sm font-medium text-gray-900">
                    <FileImage className="h-4 w-4 mr-2 text-blue-500" />
                    {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                  </div>
                </div>
              </div>
            )}

            <div className="mt-8 flex justify-end gap-x-4">
              <button
                type="button"
                className="text-sm font-semibold leading-6 text-gray-900 px-4 py-2 hover:bg-gray-100 rounded-md transition-colors"
                onClick={() => navigate('/dashboard')}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!file || loading}
                className="inline-flex justify-center items-center rounded-md bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                    {statusText}
                  </>
                ) : (
                  'Analyze Floor Plan'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Upload;
