import React, { useState, useEffect } from 'react';
import { XMarkIcon, CheckCircleIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import { Button } from './ui/Button';
import { Modal } from './ui/Modal';
import { validaCF, reverseCF } from '../lib/codiceFiscale';
import { studentsApi, companiesApi, registrationsApi, coursesApi } from '../lib/api';
import type { Student, Company, Course } from '../types';

interface QuickEnrollmentWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

type WizardStep = 'fiscal-code' | 'student-info' | 'company' | 'course' | 'confirmation' | 'success';

interface EnrollmentData {
  // Student data
  fiscalCode: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  birthPlace: string;
  gender: string;
  email: string;
  phone: string;
  jobRole: string;
  riskLevel: string;
  
  // Enrollment data
  companyId: number | null;
  courseEditionId: number | null;
  
  // Flags
  isNewStudent: boolean;
  studentId?: number;
}

export function QuickEnrollmentWizard({ isOpen, onClose, onSuccess }: QuickEnrollmentWizardProps) {
  const [currentStep, setCurrentStep] = useState<WizardStep>('fiscal-code');
  const [enrollmentData, setEnrollmentData] = useState<EnrollmentData>({
    fiscalCode: '',
    firstName: '',
    lastName: '',
    birthDate: '',
    birthPlace: '',
    gender: '',
    email: '',
    phone: '',
    jobRole: '',
    riskLevel: '',
    companyId: null,
    courseEditionId: null,
    isNewStudent: true,
  });

  const [companies, setCompanies] = useState<Company[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [existingStudent, setExistingStudent] = useState<Student | null>(null);
  const [cfValidation, setCfValidation] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch companies and courses on mount
  useEffect(() => {
    if (isOpen) {
      fetchCompaniesAndCourses();
    }
  }, [isOpen]);

  const fetchCompaniesAndCourses = async () => {
    try {
      const [companiesRes, coursesRes] = await Promise.all([
        companiesApi.getAll(1, 100),
        coursesApi.getAll(1, 100),
      ]);
      setCompanies(companiesRes.data || []);
      setCourses(coursesRes.data || []);
    } catch (err) {
      console.error('Error fetching data:', err);
    }
  };

  const handleFiscalCodeChange = async (cf: string) => {
    const upperCf = cf.toUpperCase();
    setEnrollmentData(prev => ({ ...prev, fiscalCode: upperCf }));

    if (upperCf.length < 16) {
      setCfValidation(null);
      setExistingStudent(null);
      return;
    }

    // Validate CF
    const validation = validaCF(upperCf);
    setCfValidation(validation);

    // Reverse engineering
    if (validation.isValid) {
      const reversed = reverseCF(upperCf);
      setEnrollmentData(prev => ({
        ...prev,
        birthDate: reversed.dataNascita || '',
        birthPlace: reversed.luogoNascita || '',
        gender: reversed.genere || '',
      }));
    }

    // Check for existing student
    try {
      const response = await fetch(
        `/api/students/check-duplicate?fiscalCode=${encodeURIComponent(upperCf)}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
          }
        }
      );
      const data = await response.json();
      if (data.isDuplicate && data.existingStudent) {
        setExistingStudent(data.existingStudent);
        setEnrollmentData(prev => ({
          ...prev,
          isNewStudent: false,
          studentId: data.existingStudent.id,
          firstName: data.existingStudent.firstName,
          lastName: data.existingStudent.lastName,
          email: data.existingStudent.email || '',
          phone: data.existingStudent.phone || '',
          jobRole: data.existingStudent.jobRole || '',
          riskLevel: data.existingStudent.riskLevel || '',
        }));
      } else {
        setExistingStudent(null);
        setEnrollmentData(prev => ({ ...prev, isNewStudent: true }));
      }
    } catch (err) {
      console.error('Error checking duplicate:', err);
    }
  };

  const handleNextStep = async () => {
    setError(null);

    switch (currentStep) {
      case 'fiscal-code':
        if (!enrollmentData.fiscalCode || !cfValidation?.isValid) {
          setError('Codice fiscale non valido');
          return;
        }
        if (enrollmentData.isNewStudent && (!enrollmentData.firstName || !enrollmentData.lastName)) {
          setError('Nome e cognome sono obbligatori');
          return;
        }
        setCurrentStep('student-info');
        break;

      case 'student-info':
        if (!enrollmentData.firstName || !enrollmentData.lastName) {
          setError('Nome e cognome sono obbligatori');
          return;
        }
        if (!enrollmentData.jobRole || !enrollmentData.riskLevel) {
          setError('Mansione e livello rischio sono obbligatori');
          return;
        }
        setCurrentStep('company');
        break;

      case 'company':
        if (!enrollmentData.companyId) {
          setError('Seleziona un\'azienda');
          return;
        }
        setCurrentStep('course');
        break;

      case 'course':
        if (!enrollmentData.courseEditionId) {
          setError('Seleziona un corso');
          return;
        }
        setCurrentStep('confirmation');
        break;

      case 'confirmation':
        await handleEnroll();
        break;
    }
  };

  const handleEnroll = async () => {
    setIsLoading(true);
    try {
      let studentId = enrollmentData.studentId;

      // Create student if new
      if (enrollmentData.isNewStudent) {
        const studentRes = await studentsApi.create({
          firstName: enrollmentData.firstName,
          lastName: enrollmentData.lastName,
          fiscalCode: enrollmentData.fiscalCode,
          birthDate: enrollmentData.birthDate,
          birthPlace: enrollmentData.birthPlace,
          email: enrollmentData.email,
          phone: enrollmentData.phone,
          jobRole: enrollmentData.jobRole,
          riskLevel: enrollmentData.riskLevel,
          companyId: enrollmentData.companyId,
        });
        studentId = studentRes.id;
      }

      // Create registration
      await registrationsApi.create({
        studentId,
        courseEditionId: enrollmentData.courseEditionId!,
        companyId: enrollmentData.companyId,
      });

      setCurrentStep('success');
    } catch (err: any) {
      console.error('Error enrolling:', err);
      setError(err.response?.data?.error || 'Errore nell\'iscrizione');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setCurrentStep('fiscal-code');
    setEnrollmentData({
      fiscalCode: '',
      firstName: '',
      lastName: '',
      birthDate: '',
      birthPlace: '',
      gender: '',
      email: '',
      phone: '',
      jobRole: '',
      riskLevel: '',
      companyId: null,
      courseEditionId: null,
      isNewStudent: true,
    });
    setError(null);
    onClose();
  };

  const handleSuccess = () => {
    handleClose();
    onSuccess?.();
  };

  const getStepNumber = (step: WizardStep): number => {
    const steps: WizardStep[] = ['fiscal-code', 'student-info', 'company', 'course', 'confirmation', 'success'];
    return steps.indexOf(step) + 1;
  };

  const getStepTitle = (step: WizardStep): string => {
    switch (step) {
      case 'fiscal-code': return 'Codice Fiscale';
      case 'student-info': return 'Dati Studente';
      case 'company': return 'Seleziona Azienda';
      case 'course': return 'Seleziona Corso';
      case 'confirmation': return 'Conferma Iscrizione';
      case 'success': return 'Iscrizione Completata';
      default: return '';
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Iscrizione Rapida" size="lg">
      <div className="space-y-6">
        {/* Progress Bar */}
        {currentStep !== 'success' && (
          <div className="flex items-center justify-between">
            {['fiscal-code', 'student-info', 'company', 'course', 'confirmation'].map((step, index) => (
              <React.Fragment key={step}>
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm ${
                    currentStep === step
                      ? 'bg-blue-600 text-white'
                      : ['fiscal-code', 'student-info', 'company', 'course', 'confirmation'].indexOf(currentStep) > index
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {['fiscal-code', 'student-info', 'company', 'course', 'confirmation'].indexOf(currentStep) > index ? (
                    <CheckCircleIcon className="w-6 h-6" />
                  ) : (
                    index + 1
                  )}
                </div>
                {index < 4 && (
                  <div
                    className={`flex-1 h-1 mx-2 ${
                      ['fiscal-code', 'student-info', 'company', 'course', 'confirmation'].indexOf(currentStep) > index
                        ? 'bg-green-600'
                        : 'bg-gray-200'
                    }`}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
        )}

        {/* Step Title */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{getStepTitle(currentStep)}</h3>
          <p className="text-sm text-gray-500 mt-1">
            {currentStep === 'fiscal-code' && 'Inserisci il codice fiscale dello studente'}
            {currentStep === 'student-info' && 'Completa i dati dello studente'}
            {currentStep === 'company' && 'Seleziona l\'azienda di appartenenza'}
            {currentStep === 'course' && 'Seleziona il corso desiderato'}
            {currentStep === 'confirmation' && 'Verifica i dati e conferma l\'iscrizione'}
            {currentStep === 'success' && 'Iscrizione completata con successo!'}
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Step Content */}
        <div className="space-y-4">
          {currentStep === 'fiscal-code' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Codice Fiscale *
                </label>
                <input
                  type="text"
                  maxLength={16}
                  value={enrollmentData.fiscalCode}
                  onChange={(e) => handleFiscalCodeChange(e.target.value)}
                  placeholder="Es: RSSMRA80A01H501U"
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono uppercase ${
                    cfValidation?.isValid ? 'border-green-500' : cfValidation ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {cfValidation?.isValid && (
                  <p className="text-sm text-green-600 mt-1">✓ Codice fiscale valido</p>
                )}
                {existingStudent && (
                  <p className="text-sm text-blue-600 mt-1">
                    ℹ️ Studente già registrato: <strong>{existingStudent.firstName} {existingStudent.lastName}</strong>
                  </p>
                )}
              </div>
            </>
          )}

          {currentStep === 'student-info' && (
            <>
              {enrollmentData.isNewStudent ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
                      <input
                        type="text"
                        value={enrollmentData.firstName}
                        onChange={(e) => setEnrollmentData(prev => ({ ...prev, firstName: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Cognome *</label>
                      <input
                        type="text"
                        value={enrollmentData.lastName}
                        onChange={(e) => setEnrollmentData(prev => ({ ...prev, lastName: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                      <input
                        type="email"
                        value={enrollmentData.email}
                        onChange={(e) => setEnrollmentData(prev => ({ ...prev, email: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Telefono</label>
                      <input
                        type="tel"
                        value={enrollmentData.phone}
                        onChange={(e) => setEnrollmentData(prev => ({ ...prev, phone: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-4">
                    <h4 className="font-semibold text-blue-900 text-sm">Dati di Sicurezza (D.Lgs. 81/08)</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Mansione *</label>
                        <input
                          type="text"
                          value={enrollmentData.jobRole}
                          onChange={(e) => setEnrollmentData(prev => ({ ...prev, jobRole: e.target.value }))}
                          placeholder="Es: Operaio, Impiegato"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Livello Rischio *</label>
                        <select
                          value={enrollmentData.riskLevel}
                          onChange={(e) => setEnrollmentData(prev => ({ ...prev, riskLevel: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Seleziona</option>
                          <option value="low">Basso</option>
                          <option value="medium">Medio</option>
                          <option value="high">Alto</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-sm text-green-700">
                    ✓ Studente già registrato: <strong>{enrollmentData.firstName} {enrollmentData.lastName}</strong>
                  </p>
                  <p className="text-xs text-green-600 mt-2">Procedi con l\'iscrizione al corso</p>
                </div>
              )}
            </>
          )}

          {currentStep === 'company' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Azienda *</label>
              <select
                value={enrollmentData.companyId || ''}
                onChange={(e) => setEnrollmentData(prev => ({ ...prev, companyId: e.target.value ? Number(e.target.value) : null }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Seleziona azienda</option>
                {companies.map(company => (
                  <option key={company.id} value={company.id}>{company.name}</option>
                ))}
              </select>
            </div>
          )}

          {currentStep === 'course' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Corso *</label>
              <select
                value={enrollmentData.courseEditionId || ''}
                onChange={(e) => setEnrollmentData(prev => ({ ...prev, courseEditionId: e.target.value ? Number(e.target.value) : null }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Seleziona corso</option>
                {courses.map(course => (
                  <option key={course.id} value={course.id}>{course.title}</option>
                ))}
              </select>
            </div>
          )}

          {currentStep === 'confirmation' && (
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div>
                <p className="text-xs text-gray-500">Studente</p>
                <p className="font-medium">{enrollmentData.firstName} {enrollmentData.lastName}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Azienda</p>
                <p className="font-medium">{companies.find(c => c.id === enrollmentData.companyId)?.name}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Corso</p>
                <p className="font-medium">{courses.find(c => c.id === enrollmentData.courseEditionId)?.title}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Mansione / Livello Rischio</p>
                <p className="font-medium">{enrollmentData.jobRole} / {enrollmentData.riskLevel}</p>
              </div>
            </div>
          )}

          {currentStep === 'success' && (
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <CheckCircleIcon className="w-16 h-16 text-green-600" />
              </div>
              <p className="text-lg font-semibold text-gray-900">Iscrizione Completata!</p>
              <p className="text-sm text-gray-600">
                Lo studente <strong>{enrollmentData.firstName} {enrollmentData.lastName}</strong> è stato iscritto con successo al corso.
              </p>
            </div>
          )}
        </div>

        {/* Buttons */}
        <div className="flex justify-between gap-3 pt-4 border-t">
          <Button
            type="button"
            variant="secondary"
            onClick={handleClose}
            disabled={isLoading}
          >
            {currentStep === 'success' ? 'Chiudi' : 'Annulla'}
          </Button>

          {currentStep !== 'success' && (
            <Button
              type="button"
              onClick={handleNextStep}
              isLoading={isLoading}
              disabled={isLoading}
            >
              {currentStep === 'confirmation' ? 'Conferma Iscrizione' : 'Avanti'}
              <ArrowRightIcon className="w-4 h-4 ml-2" />
            </Button>
          )}

          {currentStep === 'success' && (
            <Button
              type="button"
              onClick={handleSuccess}
            >
              Nuova Iscrizione
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
