'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';

interface Client {
  id: string;
  name: string;
  email: string;
  company: string;
}

interface FormData {
  employee: string;
  client: Client | null;
  urgency: string;
  request: string;
}

export default function Home() {
  const [formData, setFormData] = useState<FormData>({
    employee: '',
    client: null,
    urgency: '',
    request: ''
  });
  
  const [clientSearch, setClientSearch] = useState('');
  const [clientResults, setClientResults] = useState<Client[]>([]);
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errors, setErrors] = useState<Partial<FormData>>({});
  
  const clientDropdownRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();

  // Debounced client search
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (clientSearch.length < 2) {
      setClientResults([]);
      setShowClientDropdown(false);
      return;
    }

    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const { data, error } = await supabase
          .from('clients')
          .select('id, name, email, company')
          .or(`name.ilike.%${clientSearch}%,email.ilike.%${clientSearch}%`)
          .limit(10);

        if (error) {
          console.error('Error searching clients:', error);
          return;
        }

        setClientResults(data || []);
        setShowClientDropdown(true);
      } catch (error) {
        console.error('Error searching clients:', error);
      }
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [clientSearch]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (clientDropdownRef.current && !clientDropdownRef.current.contains(event.target as Node)) {
        setShowClientDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleClientSelect = (client: Client) => {
    setFormData(prev => ({ ...prev, client }));
    setClientSearch(`${client.name} (${client.company})`);
    setShowClientDropdown(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    const newErrors: Partial<FormData> = {};
    if (!formData.employee) newErrors.employee = 'Employee is required';
    if (!formData.client) newErrors.client = 'Client is required';
    if (!formData.urgency) newErrors.urgency = 'Urgency is required';
    if (!formData.request.trim()) newErrors.request = 'Request description is required';
    
    setErrors(newErrors);
    
    if (Object.keys(newErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);
    
    try {
      const payload = {
        employee: formData.employee,
        client: formData.client,
        urgency: parseInt(formData.urgency),
        request: formData.request.trim(),
        timestamp: new Date().toISOString()
      };

      const response = await fetch(process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL!, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('Failed to submit request');
      }

      setIsSuccess(true);
      
      // Clear form
      setFormData({
        employee: '',
        client: null,
        urgency: '',
        request: ''
      });
      setClientSearch('');
      setClientResults([]);
      
      // Hide success message after 5 seconds
      setTimeout(() => setIsSuccess(false), 5000);
      
    } catch (error) {
      console.error('Error submitting form:', error);
      alert('Failed to submit request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const urgencyOptions = [
    { value: '1', label: '🔴 Urgent I - Phone Call (24-48 hours)', color: 'text-red-600' },
    { value: '2', label: '🟡 Urgent II - SMS (1-2 weeks)', color: 'text-yellow-600' },
    { value: '3', label: '🟢 Urgent III - Email (2-3 weeks)', color: 'text-green-600' }
  ];

  const employees = [
    { value: 'EMP001', label: 'John (EMP001)' },
    { value: 'EMP002', label: 'Dean (EMP002)' },
    { value: 'EMP003', label: 'Sarah (EMP003)' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-teal-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">DocuQuest</h1>
          <p className="text-lg text-gray-600">Document Request Form</p>
        </div>

        {/* Success Message */}
        {isSuccess && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-green-800">
                {`Request submitted successfully! We will process your document request shortly.`}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Form */}
        <div className="bg-white shadow-xl rounded-2xl p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Employee Dropdown */}
            <div>
              <label htmlFor="employee" className="block text-sm font-semibold text-gray-700 mb-2">
                Employee *
              </label>
              <select
                id="employee"
                value={formData.employee}
                onChange={(e) => setFormData(prev => ({ ...prev, employee: e.target.value }))}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                  errors.employee ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
              >
                <option value="">Select an employee</option>
                {employees.map((emp) => (
                  <option key={emp.value} value={emp.value}>
                    {emp.label}
                  </option>
                ))}
              </select>
              {errors.employee && (
                <p className="mt-1 text-sm text-red-600">{errors.employee}</p>
              )}
            </div>

            {/* Client Search */}
            <div className="relative">
              <label htmlFor="client" className="block text-sm font-semibold text-gray-700 mb-2">
                Client *
              </label>
              <div ref={clientDropdownRef} className="relative">
                <input
                  type="text"
                  id="client"
                  value={clientSearch}
                  onChange={(e) => {
                    setClientSearch(e.target.value);
                    if (e.target.value === '') {
                      setFormData(prev => ({ ...prev, client: null }));
                    }
                  }}
                  placeholder="Search for client by name or email..."
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                    errors.client ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                />
                
                {/* Client Dropdown */}
                {showClientDropdown && clientResults.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto">
                    {clientResults.map((client) => (
                      <div
                        key={client.id}
                        onClick={() => handleClientSelect(client)}
                        className="px-4 py-3 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                      >
                        <div className="font-medium text-gray-900">{client.name}</div>
                        <div className="text-sm text-gray-600">{client.email}</div>
                        <div className="text-sm text-gray-500">{client.company}</div>
                      </div>
                    ))}
                  </div>
                )}
                
                {showClientDropdown && clientResults.length === 0 && clientSearch.length >= 2 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg p-4">
                    <p className="text-gray-500 text-center">No clients found</p>
                  </div>
                )}
              </div>
              {errors.client && (
                <p className="mt-1 text-sm text-red-600">{errors.client}</p>
              )}
            </div>

            {/* Urgency Dropdown */}
            <div>
              <label htmlFor="urgency" className="block text-sm font-semibold text-gray-700 mb-2">
                Urgency *
              </label>
              <select
                id="urgency"
                value={formData.urgency}
                onChange={(e) => setFormData(prev => ({ ...prev, urgency: e.target.value }))}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                  errors.urgency ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
              >
                <option value="">Select urgency level</option>
                {urgencyOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {errors.urgency && (
                <p className="mt-1 text-sm text-red-600">{errors.urgency}</p>
              )}
            </div>

            {/* Request Textarea */}
            <div>
              <label htmlFor="request" className="block text-sm font-semibold text-gray-700 mb-2">
                Document Request *
              </label>
              <textarea
                id="request"
                value={formData.request}
                onChange={(e) => setFormData(prev => ({ ...prev, request: e.target.value }))}
                placeholder="Describe the documents you need in natural language..."
                rows={4}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none ${
                  errors.request ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
              />
              {errors.request && (
                <p className="mt-1 text-sm text-red-600">{errors.request}</p>
              )}
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full py-3 px-6 rounded-lg font-semibold text-white transition-all duration-200 ${
                  isSubmitting
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 hover:shadow-lg transform hover:-translate-y-0.5'
                }`}
              >
                {isSubmitting ? (
                  <div className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Submitting Request...
                  </div>
                ) : (
                  'Submit Document Request'
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-gray-500">
          <p>DocuQuest - Streamlining document requests</p>
        </div>
      </div>
    </div>
  );
}