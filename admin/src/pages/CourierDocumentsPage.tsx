/**
 * Courier Documents Management
 * 
 * Страница для загрузки и проверки документов курьера:
 * - Удостоверение личности (ID)
 * - Фото
 * - Контактная информация
 * 
 * Защита от пропажи заказов - возможность взыскания
 */

import React, { useState, useEffect, useContext, useCallback } from 'react';
import {
  DocumentIcon,
  PhotoIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import { UserContext } from '@/contexts/UserContext';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { storage, db } from '@/lib/firebase';

interface CourierDocuments {
  idFrontUrl?: string;
  idBackUrl?: string;
  photoUrl?: string;
  fullName: string;
  phone: string;
  address: string;
  emergencyContact: string;
  emergencyPhone: string;
  verified: boolean;
  uploadedAt?: number;
  verifiedAt?: number;
  verifiedBy?: string;
}

const CourierDocumentsPage: React.FC = () => {
  const { user } = useContext(UserContext);
  const [documents, setDocuments] = useState<CourierDocuments>({
    fullName: '',
    phone: '',
    address: '',
    emergencyContact: '',
    emergencyPhone: '',
    verified: false,
  });
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadDocuments = useCallback(async () => {
    try {
      if (!user?.uid) return;
      
      const docRef = doc(db, 'courierDocuments', user.uid);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        setDocuments(docSnap.data() as CourierDocuments);
      }
      setLoading(false);
    } catch (error) {
      console.error('Ошибка загрузки документов:', error);
      setLoading(false);
    }
  }, [user?.uid]);

  useEffect(() => {
    if (user) {
      loadDocuments();
    }
  }, [user, loadDocuments]);

  const handleFileUpload = async (file: File, type: 'idFront' | 'idBack' | 'photo') => {
    if (!user?.uid) return;
    
    setUploading(true);
    try {
      const storageRef = ref(storage, `courierDocuments/${user.uid}/${type}_${Date.now()}.jpg`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      
      const updates: Partial<CourierDocuments> = {
        uploadedAt: Date.now(),
      };
      
      if (type === 'idFront') updates.idFrontUrl = url;
      if (type === 'idBack') updates.idBackUrl = url;
      if (type === 'photo') updates.photoUrl = url;
      
      setDocuments(prev => ({ ...prev, ...updates }));
      
      const docRef = doc(db, 'courierDocuments', user.uid);
      await setDoc(docRef, updates, { merge: true });
      
      alert('Файл успешно загружен!');
    } catch (error) {
      console.error('Ошибка загрузки файла:', error);
      alert('Ошибка загрузки файла');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!user?.uid) return;
    
    setSaving(true);
    try {
      const docRef = doc(db, 'courierDocuments', user.uid);
      await updateDoc(docRef, {
        fullName: documents.fullName,
        phone: documents.phone,
        address: documents.address,
        emergencyContact: documents.emergencyContact,
        emergencyPhone: documents.emergencyPhone,
      });
      
      alert('Данные сохранены!');
    } catch (error) {
      console.error('Ошибка сохранения:', error);
      alert('Ошибка сохранения данных');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-gray-300 border-t-gray-900 rounded-full animate-spin mx-auto mb-4" />
          <div className="text-gray-600">Загрузка...</div>
        </div>
      </div>
    );
  }

  const isComplete = !!(
    documents.idFrontUrl &&
    documents.idBackUrl &&
    documents.photoUrl &&
    documents.fullName &&
    documents.phone &&
    documents.address &&
    documents.emergencyContact &&
    documents.emergencyPhone
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Мои документы</h1>
          <p className="text-gray-600">
            Загрузите ваши документы для верификации. Это обязательно для работы курьером.
          </p>
        </div>

        {/* Status */}
        <div className={`mb-6 p-4 rounded-lg border-2 ${
          documents.verified
            ? 'bg-green-50 border-green-300'
            : isComplete
            ? 'bg-yellow-50 border-yellow-300'
            : 'bg-red-50 border-red-300'
        }`}>
          <div className="flex items-center gap-3">
            {documents.verified ? (
              <CheckCircleIcon className="w-8 h-8 text-green-600" />
            ) : (
              <XCircleIcon className="w-8 h-8 text-yellow-600" />
            )}
            <div>
              <div className="font-semibold text-lg">
                {documents.verified
                  ? '✅ Верифицирован'
                  : isComplete
                  ? '⏳ На проверке'
                  : '❌ Требуется загрузка документов'}
              </div>
              <div className="text-sm text-gray-600">
                {documents.verified
                  ? `Проверено ${documents.verifiedAt ? new Date(documents.verifiedAt).toLocaleDateString('ru-RU') : ''}`
                  : isComplete
                  ? 'Ваши документы отправлены на проверку администратору'
                  : 'Заполните все поля и загрузите документы'}
              </div>
            </div>
          </div>
        </div>

        {/* Documents Upload */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Документы</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* ID Front */}
            <DocumentUpload
              label="Удостоверение (лицевая)"
              imageUrl={documents.idFrontUrl}
              onUpload={(file) => handleFileUpload(file, 'idFront')}
              uploading={uploading}
              icon={<DocumentIcon className="w-12 h-12" />}
            />
            
            {/* ID Back */}
            <DocumentUpload
              label="Удостоверение (обратная)"
              imageUrl={documents.idBackUrl}
              onUpload={(file) => handleFileUpload(file, 'idBack')}
              uploading={uploading}
              icon={<DocumentIcon className="w-12 h-12" />}
            />
            
            {/* Photo */}
            <DocumentUpload
              label="Ваше фото"
              imageUrl={documents.photoUrl}
              onUpload={(file) => handleFileUpload(file, 'photo')}
              uploading={uploading}
              icon={<PhotoIcon className="w-12 h-12" />}
            />
          </div>
        </div>

        {/* Personal Info */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Личная информация</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ФИО *
              </label>
              <input
                type="text"
                value={documents.fullName}
                onChange={(e) => setDocuments(prev => ({ ...prev, fullName: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Иванов Иван Иванович"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Телефон *
              </label>
              <input
                type="tel"
                value={documents.phone}
                onChange={(e) => setDocuments(prev => ({ ...prev, phone: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="+77001234567"
              />
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Адрес проживания *
              </label>
              <input
                type="text"
                value={documents.address}
                onChange={(e) => setDocuments(prev => ({ ...prev, address: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="г. Алматы, ул. Абая, д. 10, кв. 25"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Экстренный контакт (ФИО) *
              </label>
              <input
                type="text"
                value={documents.emergencyContact}
                onChange={(e) => setDocuments(prev => ({ ...prev, emergencyContact: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Петров Петр Петрович"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Телефон экстренного контакта *
              </label>
              <input
                type="tel"
                value={documents.emergencyPhone}
                onChange={(e) => setDocuments(prev => ({ ...prev, emergencyPhone: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="+77009876543"
              />
            </div>
          </div>
          
          <button
            onClick={handleSave}
            disabled={saving}
            className="mt-6 w-full md:w-auto px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold disabled:opacity-50"
          >
            {saving ? 'Сохранение...' : 'Сохранить данные'}
          </button>
        </div>

        {/* Warning */}
        <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4">
          <div className="font-semibold text-yellow-900 mb-2">⚠️ Важная информация</div>
          <ul className="text-sm text-yellow-800 space-y-1 list-disc list-inside">
            <li>Документы проверяются администратором в течение 24 часов</li>
            <li>Убедитесь, что все данные указаны верно</li>
            <li>Фото документов должны быть четкими и читаемыми</li>
            <li>В случае пропажи заказа ответственность несет курьер</li>
            <li>Взыскание производится на основании предоставленных документов</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

// Document Upload Component
const DocumentUpload: React.FC<{
  label: string;
  imageUrl?: string;
  onUpload: (file: File) => void;
  uploading: boolean;
  icon: React.ReactNode;
}> = ({ label, imageUrl, onUpload, uploading, icon }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUpload(file);
    }
  };

  return (
    <div className="flex flex-col items-center">
      <label className="text-sm font-medium text-gray-700 mb-2">{label}</label>
      
      <label className="relative w-full aspect-[4/3] border-2 border-dashed border-gray-300 rounded-lg overflow-hidden cursor-pointer hover:border-blue-500 transition-colors">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={label}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
            {icon}
            <span className="mt-2 text-sm">Нажмите для загрузки</span>
          </div>
        )}
        
        {uploading && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        
        <input
          type="file"
          accept="image/*"
          onChange={handleChange}
          className="hidden"
          disabled={uploading}
        />
      </label>
      
      {imageUrl && (
        <div className="mt-2 text-xs text-green-600 flex items-center gap-1">
          <CheckCircleIcon className="w-4 h-4" />
          Загружено
        </div>
      )}
    </div>
  );
};

export default CourierDocumentsPage;
