import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiService } from '../services/api';
import { ExcelImportAgent, ExcelImportResponse } from '../types';
import WifiLoaderComponent from '../components/WifiLoaderComponent';
import { 
  Upload, 
  FileSpreadsheet, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Download,
  Clock,
  Loader2
} from 'lucide-react';
import { createXlsxBlob } from '../utils/excelExport';

const ExcelImportPage: React.FC = () => {
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<ExcelImportResponse | null>(null);
  const [importProgress, setImportProgress] = useState<number>(0);
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const timeIntervalRef = useRef<NodeJS.Timeout | null>(null);
  // Fetch agents for import
  const { data: agents, error: agentsError, refetch, isLoading: agentsLoading } = useQuery<ExcelImportAgent[]>({
    queryKey: ['excelImportAgents'],
    queryFn: () => apiService.getExcelImportAgents(),
    refetchInterval: 30000,
  });

  // Import mutation
  const importMutation = useMutation({
    mutationFn: ({ agentId, file }: { agentId: string; file: File }) => 
      apiService.importSubscribersFromExcel(agentId, file),
    onSuccess: (data) => {
      // إيقاف المؤقتات
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      if (timeIntervalRef.current) clearInterval(timeIntervalRef.current);
      setImportProgress(100);
      
      console.log('Import success response:', data);
      
      // Check if there are errors in the response
      if (data.errorCount && data.errorCount > 0 && data.errorDetails) {
        // Check if it's a profile not found error
        if (data.errorDetails.includes('Profile') && data.errorDetails.includes('not found for this agent')) {
          setImportResult({
            success: false,
            message: 'يجب أولاً تعريف الباقات لدى الوكيل',
            errors: [data.errorDetails]
          });
        } else {
          setImportResult({
            success: false,
            message: `فشل في استيراد ${data.errorCount} من ${data.totalRecords} سجل`,
            errors: [data.errorDetails]
          });
        }
      } else {
        setImportResult(data);
        if (data.success) {
          setSelectedFile(null);
          setSelectedAgentId('');
        }
      }
    },
    onError: (error: any) => {
      // إيقاف المؤقتات
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      if (timeIntervalRef.current) clearInterval(timeIntervalRef.current);
      
      console.error('Import mutation error:', error);
      console.error('Error response:', error.response?.data);
      
      // Check if it's a timeout error
      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        setImportResult({
          success: false,
          message: 'انتهت مهلة الطلب. الملف كبير جداً أو الخادم بطيء. يرجى المحاولة مرة أخرى.',
          errors: ['Timeout error']
        });
        return;
      }
      
      // Check if it's a profile not found error
      const errorData = error.response?.data;
      console.log('Error data:', errorData);
      console.log('Error details:', errorData?.errorDetails);
      
      if (errorData?.errorDetails && errorData.errorDetails.includes('Profile') && errorData.errorDetails.includes('not found for this agent')) {
        console.log('Setting profile error message');
        setImportResult({
          success: false,
          message: 'يجب أولاً تعريف الباقات لدى الوكيل',
          errors: [errorData.errorDetails]
        });
      } else {
        console.log('Setting generic error message');
        setImportResult({
          success: false,
          message: error.response?.data?.message || error.message || 'حدث خطأ أثناء الاستيراد',
          errors: error.response?.data?.errors || []
        });
      }
    }
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Check if file is Excel
      const validTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
        'application/vnd.ms-excel' // .xls
      ];
      
      if (!validTypes.includes(file.type)) {
        alert('يرجى اختيار ملف Excel صالح (.xlsx أو .xls)');
        return;
      }
      
      setSelectedFile(file);
      setImportResult(null);
    }
  };

  const handleImport = () => {
    if (!selectedAgentId) {
      alert('يرجى اختيار الوكيل');
      return;
    }
    
    if (!selectedFile) {
      alert('يرجى اختيار ملف Excel');
      return;
    }

    // Reset previous results and progress
    setImportResult(null);
    setImportProgress(0);
    setElapsedTime(0);
    
    // بدء محاكاة التقدم (من 0 إلى 90% خلال ~2.5 دقيقة)
    let currentProgress = 0;
    progressIntervalRef.current = setInterval(() => {
      currentProgress += 0.5; // زيادة 0.5% كل 0.75 ثانية (150 ثانية = 2.5 دقيقة للوصول إلى 90%)
      if (currentProgress < 90) {
        setImportProgress(currentProgress);
      }
    }, 750); // كل 0.75 ثانية
    
    // بدء مؤقت الوقت
    timeIntervalRef.current = setInterval(() => {
      setElapsedTime(prev => prev + 1);
    }, 1000); // كل ثانية
    
    importMutation.mutate({
      agentId: selectedAgentId,
      file: selectedFile
    });
  };

  // تنظيف المؤقتات عند unmount
  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      if (timeIntervalRef.current) clearInterval(timeIntervalRef.current);
    };
  }, []);

  const resetForm = () => {
    // إيقاف المؤقتات إن كانت تعمل
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    if (timeIntervalRef.current) clearInterval(timeIntervalRef.current);
    
    setSelectedAgentId('');
    setSelectedFile(null);
    setImportResult(null);
    setImportProgress(0);
    setElapsedTime(0);
  };

  const downloadTemplate = () => {
    // IMPORTANT: backend reads columns by position, not by header name
    const templateData = [
      ['Username', 'FirstName', 'LastName', 'ActivationDate', 'Expire', 'Profile', 'Password', 'Phone', 'SecruptionId', 'FDT', 'FAT', 'Zone'],
      ['ahmed123', 'أحمد', 'محمد', '2026-02-10', '2026-03-10', 'العادي', 'password123', '07901234567', '1212', '', '', 'المنطقة الأولى']
    ];
    const blob = createXlsxBlob(templateData, 'المشتركين');
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'template_subscribers.xlsx');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };


  if (agentsError) {
    return (
      <div className="p-6">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-md">
          <div className="flex items-center">
            <XCircle className="h-5 w-5 mr-2" />
            <span>خطأ في تحميل البيانات: {agentsError.message}</span>
          </div>
          <button
            onClick={() => refetch()}
            className="mt-2 text-sm underline hover:no-underline"
          >
            إعادة المحاولة
          </button>
        </div>
      </div>
    );
  }

  // دالة لتنسيق الوقت
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (importMutation.isPending) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 dark:from-gray-900 dark:to-gray-800">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 dark:bg-primary-900/30 rounded-full mb-4">
              <Loader2 className="h-8 w-8 text-primary-600 dark:text-primary-400 animate-spin" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              جاري استيراد البيانات
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              يرجى الانتظار، لا تغلق هذه الصفحة
            </p>
          </div>

          {/* Progress Bar */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                التقدم
              </span>
              <span className="text-sm font-bold text-primary-600 dark:text-primary-400">
                {Math.round(importProgress)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-primary-500 to-primary-600 h-3 rounded-full transition-all duration-300 ease-out relative overflow-hidden"
                style={{ width: `${Math.min(importProgress, 100)}%` }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
              </div>
            </div>
          </div>

          {/* Time and Stats */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 text-center">
              <Clock className="h-5 w-5 text-gray-500 dark:text-gray-400 mx-auto mb-2" />
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">الوقت المنقضي</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                {formatTime(elapsedTime)}
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 text-center">
              <FileSpreadsheet className="h-5 w-5 text-gray-500 dark:text-gray-400 mx-auto mb-2" />
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">الملف</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {selectedFile?.name || 'غير محدد'}
              </p>
            </div>
          </div>

          {/* Status Messages */}
          <div className="space-y-2">
            {importProgress < 30 && (
              <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse mr-2"></div>
                جاري قراءة الملف وتحليل البيانات...
              </div>
            )}
            {importProgress >= 30 && importProgress < 60 && (
              <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse mr-2"></div>
                جاري التحقق من صحة البيانات...
              </div>
            )}
            {importProgress >= 60 && importProgress < 90 && (
              <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse mr-2"></div>
                جاري حفظ البيانات في قاعدة البيانات...
              </div>
            )}
            {importProgress >= 90 && (
              <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-2"></div>
                المرحلة النهائية، جاري الانتهاء...
              </div>
            )}
          </div>

          {/* Estimated Time Remaining */}
          {elapsedTime > 10 && (
            <div className="mt-6 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-xs text-blue-700 dark:text-blue-300 text-center">
                <Clock className="h-3 w-3 inline-block ml-1" />
                العملية قد تستغرق عدة دقائق حسب حجم الملف
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (agentsLoading) {
    return (
      <div className="p-6 flex items-center justify-center h-screen">
        <WifiLoaderComponent
          background="transparent"
          desktopSize="150px"
          mobileSize="150px"
          text="تحميل الوكلاء..."
          backColor="#E8F2FC"
          frontColor="#4645F6"
        />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          استيراد المشتركين من Excel
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          اختر الوكيل وارفع ملف Excel يحتوي على بيانات المشتركين
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Import Form */}
        <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <Upload className="h-5 w-5 mr-2" />
            نموذج الاستيراد
          </h2>

          <div className="space-y-4">
            {/* Agent Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                اختر الوكيل *
              </label>
              <select
                value={selectedAgentId}
                onChange={(e) => setSelectedAgentId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                required
              >
                <option value="">اختر الوكيل...</option>
                {agents?.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.fullName} - {agent.companyName}
                  </option>
                ))}
              </select>
            </div>

            {/* File Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                ملف Excel *
              </label>
              <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center hover:border-primary-500 transition-colors">
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <FileSpreadsheet className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {selectedFile ? selectedFile.name : 'اضغط لاختيار ملف Excel'}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                    يدعم ملفات .xlsx و .xls
                  </p>
                </label>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-3 rtl:space-x-reverse">
              <button
                onClick={handleImport}
                disabled={!selectedAgentId || !selectedFile || importMutation.isPending}
                className="flex-1 bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  استيراد البيانات
                </>
              </button>
              
              <button
                onClick={resetForm}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                إعادة تعيين
              </button>
            </div>
          </div>
        </div>


        {/* Instructions and Template */}
        <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <FileSpreadsheet className="h-5 w-5 mr-2" />
            تعليمات الاستيراد
          </h2>

          <div className="space-y-4">
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white mb-2">متطلبات الملف:</h3>
              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                <li>• يجب أن يكون الملف بصيغة Excel (.xlsx أو .xls)</li>
                <li>• يجب أن يحتوي على الأعمدة المطلوبة</li>
                <li>• يجب أن تكون البيانات في الصف الأول</li>
                <li>• تجنب الصفوف الفارغة في المنتصف</li>
                <li className="font-medium text-amber-700 dark:text-amber-300">• مهم: النظام يقرأ الأعمدة بالترتيب وليس حسب اسم العنوان.</li>
              </ul>
            </div>

            <div>
              <h3 className="font-medium text-gray-900 dark:text-white mb-2">ترتيب الأعمدة:</h3>
              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                <li>1) Username (مطلوب)</li>
                <li>2) FirstName</li>
                <li>3) LastName</li>
                <li>4) ActivationDate (اختياري)</li>
                <li>5) Expire (اختياري)</li>
                <li>6) Profile (مطلوب — لازم يطابق اسم الباقة)</li>
                <li>7) Password (مطلوب)</li>
                <li>8) Phone (اختياري)</li>
                <li>9) SecruptionId (اختياري)</li>
                <li>10) FDT (اختياري)</li>
                <li>11) FAT (اختياري)</li>
                <li>12) Zone (اسم المنطقة — مطلوب إذا الوكيل لديه مناطق)</li>
              </ul>
            </div>

            <div>
              <button
                onClick={downloadTemplate}
                className="w-full bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 flex items-center justify-center"
              >
                <Download className="h-4 w-4 mr-2" />
                تحميل نموذج Excel
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Import Results */}
      {importResult && (
        <div className="mt-6">
          <div className={`border rounded-lg p-4 ${
            importResult.success 
              ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-600 dark:text-green-400'
              : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400'
          }`}>
            <div className="flex items-start">
              {importResult.success ? (
                <CheckCircle className="h-5 w-5 mr-2 mt-0.5" />
              ) : (
                <XCircle className="h-5 w-5 mr-2 mt-0.5" />
              )}
              <div className="flex-1">
                <h3 className="font-medium mb-2">{importResult.message}</h3>
                
                {importResult.success && (
                  <div className="text-sm space-y-1">
                    {importResult.importedCount && (
                      <p>تم استيراد {importResult.importedCount} مشترك بنجاح</p>
                    )}
                    {importResult.failedCount && importResult.failedCount > 0 && (
                      <p>فشل في استيراد {importResult.failedCount} مشترك</p>
                    )}
                  </div>
                )}

                {importResult.errors && importResult.errors.length > 0 && (
                  <div className="mt-3">
                    <h4 className="font-medium mb-2">الأخطاء:</h4>
                    <ul className="text-sm space-y-1">
                      {importResult.errors.map((error, index) => (
                        <li key={index} className="flex items-start">
                          <AlertTriangle className="h-3 w-3 mr-1 mt-1" />
                          {error}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExcelImportPage;
