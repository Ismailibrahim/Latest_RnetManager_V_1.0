"use client";

import { useState, useEffect, useCallback } from "react";
import { handleApiError } from "@/utils/api-error-handler";
import { invalidateCache } from "@/utils/api-cache";

import { API_BASE_URL } from "@/utils/api-config";

/**
 * Custom hook for managing system settings
 *
 * @returns {object} { settings, loading, error, updateSettings, updateCompany, updateCurrency, updateInvoiceNumbering, updatePaymentTerms, updateSystemPreferences, updateDocuments, refetch }
 */
export function useSystemSettings() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedLandlordId, setSelectedLandlordId] = useState(null);

  const fetchSettings = useCallback(async (landlordId = null) => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem("auth_token");
      if (!token) {
        throw new Error("You must be signed in to view system settings.");
      }

      // Build URL with optional landlord_id for super admins
      let url = `${API_BASE_URL}/settings/system`;
      if (landlordId) {
        url += `?landlord_id=${landlordId}`;
      }
      console.log('Fetching system settings from:', url);
      console.log('API_BASE_URL:', API_BASE_URL);
      console.log('Full URL:', url);
      console.log('Token present:', !!token);
      console.log('Token preview:', token ? `${token.substring(0, 20)}...` : 'none');
      
      let response;
      try {
        // Add timeout to detect if server is not responding
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
          console.error('Request timeout after 10 seconds');
          controller.abort();
        }, 10000); // 10 second timeout
        
        // Log request details for debugging
        console.log('Making request:', {
          url: url,
          method: 'GET',
          hasToken: !!token,
          tokenLength: token?.length,
          timestamp: new Date().toISOString(),
        });
        
        const requestStartTime = Date.now();
        console.log('Fetch call started at:', requestStartTime);
        
        response = await fetch(url, {
          method: 'GET',
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
          credentials: 'include',
          mode: 'cors',
          signal: controller.signal,
        });
        
        const requestDuration = Date.now() - requestStartTime;
        console.log('Request completed:', {
          status: response.status,
          statusText: response.statusText,
          ok: response.ok,
          duration: `${requestDuration}ms`,
          headers: Object.fromEntries(response.headers.entries()),
        });
        
        clearTimeout(timeoutId);
      } catch (fetchError) {
        // Network error - server not reachable
        console.error('Fetch error details:', {
          name: fetchError?.name,
          message: fetchError?.message,
          cause: fetchError?.cause,
          stack: fetchError?.stack,
          url: url,
          errorType: fetchError?.constructor?.name,
        });
        
        // Check if it's a network error or timeout
        if (fetchError instanceof TypeError) {
          if (fetchError.message === 'Failed to fetch' || fetchError.name === 'TypeError') {
            // This usually means CORS blocked or network error
            console.error('TypeError: Failed to fetch - This usually indicates:');
            console.error('1. CORS preflight was blocked');
            console.error('2. Network connection failed');
            console.error('3. Server is not responding');
            console.error('Check browser Network tab for OPTIONS and GET requests');
            
            throw new Error(
              `Cannot connect to backend server at ${API_BASE_URL}. ` +
              `\n\nPossible causes:\n` +
              `1. Backend server is not running - Start it with: cd backend && php artisan serve\n` +
              `2. Server is running on a different port - Check your .env file\n` +
              `3. Firewall or antivirus is blocking the connection\n` +
              `4. Server crashed or failed to start\n` +
              `5. CORS preflight request was blocked\n\n` +
              `Test server: Open http://localhost:8000/api/v1/health in your browser\n` +
              `Check browser console (F12) and Network tab for detailed error information.`
            );
          }
        }
        
        if (fetchError.name === 'AbortError') {
          console.error('AbortError: Request was aborted (timeout)');
          throw new Error(
            `Request timeout: Server at ${API_BASE_URL} did not respond within 10 seconds. ` +
            `The server may be overloaded or not running. ` +
            `Check browser Network tab to see if the request was sent.`
          );
        }
        
        console.error('Unknown fetch error:', fetchError);
        throw fetchError;
      }
      
      console.log('Response status:', response.status, response.statusText);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));

      let data;
      try {
        const responseText = await response.text();
        console.log('📥 Response received:', {
          status: response.status,
          statusText: response.statusText,
          contentType: response.headers.get('Content-Type'),
          body_length: responseText.length,
          body_first_500: responseText.substring(0, 500),
          body_last_200: responseText.substring(Math.max(0, responseText.length - 200)),
        });
        
        if (!responseText) {
          throw new Error('Empty response body');
        }
        
        // CRITICAL: Extract ONLY valid JSON from response
        // This handles cases where extra content is appended after JSON
        let jsonText = responseText.trim();
        
        // Find JSON boundaries - look for first { and last }
        const firstBrace = jsonText.indexOf('{');
        const lastBrace = jsonText.lastIndexOf('}');
        
        console.group('🔍 JSON Extraction Process');
        console.log('Original Response Length:', responseText.length);
        console.log('Trimmed Length:', jsonText.length);
        console.log('First Brace Position:', firstBrace);
        console.log('Last Brace Position:', lastBrace);
        console.log('Has Valid Boundaries:', firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace);
        console.groupEnd();
        
        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
          // Extract only the JSON portion
          const extractedJson = jsonText.substring(firstBrace, lastBrace + 1);
          
          // Log if we had to clean it
          if (extractedJson.length !== jsonText.length) {
            const removedContent = jsonText.substring(lastBrace + 1);
            console.group('⚠️ STRAY OUTPUT AFTER JSON - REMOVED');
            console.error('Original Length:', responseText.length);
            console.error('Trimmed Length:', jsonText.length);
            console.error('Extracted Length:', extractedJson.length);
            console.error('Removed Length:', removedContent.length);
            console.error('Removed Content:', removedContent);
            console.error('Removed Preview (first 200):', removedContent.substring(0, 200));
            console.groupEnd();
          }
          
          jsonText = extractedJson;
          console.log('✅ JSON extracted successfully, length:', jsonText.length);
        } else {
          console.group('❌ Could not find valid JSON boundaries');
          console.error('First Brace:', firstBrace);
          console.error('Last Brace:', lastBrace);
          console.error('Response Preview:', responseText.substring(0, 500));
          console.error('Full Response:', responseText);
          console.groupEnd();
          
          // Try to find JSON using regex as fallback
          const jsonMatch = responseText.match(/(\{[\s\S]*\})/);
          if (jsonMatch) {
            jsonText = jsonMatch[1];
            console.log('✅ Found JSON using regex fallback, length:', jsonText.length);
          } else {
            throw new Error('Could not find valid JSON in response. Response starts with: ' + responseText.substring(0, 100));
          }
        }
        
        // Validate JSON before parsing
        if (!jsonText || (!jsonText.startsWith('{') && !jsonText.startsWith('['))) {
          console.error('❌ Invalid JSON start', {
            jsonText_exists: !!jsonText,
            jsonText_length: jsonText?.length || 0,
            first_chars: jsonText?.substring(0, 50) || 'EMPTY',
            first_10_chars: jsonText?.substring(0, 10) || 'EMPTY',
            full_response_preview: responseText.substring(0, 500),
            full_response_length: responseText.length,
          });
          throw new Error(`Invalid JSON response: Response does not start with { or [. First 100 chars: ${jsonText?.substring(0, 100) || 'EMPTY'}`);
        }
        
        console.log('✅ JSON validation passed, attempting parse...', {
          json_length: jsonText.length,
          starts_with: jsonText.substring(0, 10),
        });
        
        // Parse JSON with detailed error handling
        try {
          data = JSON.parse(jsonText);
          console.log('✅ JSON parsed successfully');
        } catch (parseError) {
          // Extract error position from message (format: "Unexpected token X in JSON at position Y")
          const positionMatch = parseError.message.match(/position (\d+)/);
          const errorPos = positionMatch ? parseInt(positionMatch[1]) : null;
          
          // Build comprehensive error details
          const errorDetails = {
            // Error info
            error_message: parseError.message || 'Unknown error',
            error_name: parseError.name || 'Error',
            error_stack: parseError.stack || 'No stack trace',
            
            // JSON info
            json_length: jsonText.length,
            json_starts_with: jsonText.substring(0, 20),
            json_ends_with: jsonText.substring(Math.max(0, jsonText.length - 20)),
            
            // Position info (if available)
            error_position: errorPos,
            char_at_position: errorPos !== null ? jsonText[errorPos] : 'N/A',
            char_code_at_position: errorPos !== null ? jsonText.charCodeAt(errorPos) : 'N/A',
            
            // Context around error
            surrounding_chars: errorPos !== null ? jsonText.substring(
              Math.max(0, errorPos - 50),
              Math.min(jsonText.length, errorPos + 50)
            ) : 'N/A',
            
            // Response info
            full_response_length: responseText.length,
            full_response_first_500: responseText.substring(0, 500),
            full_response_last_200: responseText.substring(Math.max(0, responseText.length - 200)),
          };
          
          // Log error details - log each piece separately for better visibility
          console.group('❌ JSON PARSE ERROR - DETAILED INFO');
          console.error('Error Message:', parseError?.message || 'No message');
          console.error('Error Name:', parseError?.name || 'No name');
          console.error('Error Type:', typeof parseError);
          console.error('Error Object:', parseError);
          
          console.group('JSON Information');
          console.error('JSON Length:', jsonText?.length || 0);
          console.error('JSON Starts With:', jsonText?.substring(0, 50) || 'EMPTY');
          console.error('JSON Ends With:', jsonText?.substring(Math.max(0, (jsonText?.length || 0) - 50)) || 'EMPTY');
          console.error('Error Position:', errorPos);
          
          if (errorPos !== null && errorPos >= 0 && errorPos < jsonText.length) {
            console.error('Char at Position:', jsonText[errorPos]);
            console.error('Char Code at Position:', jsonText.charCodeAt(errorPos));
            console.error('Surrounding (50 chars before/after):', jsonText.substring(
              Math.max(0, errorPos - 50),
              Math.min(jsonText.length, errorPos + 50)
            ));
          }
          console.groupEnd();
          
          console.group('Response Information');
          console.error('Response Length:', responseText?.length || 0);
          console.error('Response First 1000 chars:', responseText?.substring(0, 1000) || 'EMPTY');
          console.error('Response Last 200 chars:', responseText?.substring(Math.max(0, (responseText?.length || 0) - 200)) || 'EMPTY');
          console.groupEnd();
          
          console.group('Full Text Dumps');
          console.error('=== FULL JSON TEXT ===');
          console.error(jsonText);
          console.error('=== FULL RESPONSE TEXT ===');
          console.error(responseText);
          console.groupEnd();
          
          console.groupEnd();
          
          // Create a more informative error
          const errorMsg = parseError?.message || 'Unknown JSON parse error';
          const userFriendlyError = new Error(`JSON parse error: ${errorMsg}. Position: ${errorPos || 'unknown'}. Check console for full details.`);
          userFriendlyError.originalError = parseError;
          userFriendlyError.jsonText = jsonText;
          userFriendlyError.responseText = responseText;
          throw userFriendlyError;
        }
      } catch (e) {
        // Response is not JSON or parsing failed
        console.error('Failed to parse response:', e);
        if (!response.ok) {
          const errorText = await response.text().catch(() => 'Unknown error');
          throw new Error(`HTTP ${response.status}: ${response.statusText}. Response: ${errorText.substring(0, 200)}`);
        }
        throw new Error("Invalid response from server: " + e.message);
      }

      if (!response.ok) {
        // Response was not successful
        console.error('Error response data:', data);
        console.error('Response status:', response.status, response.statusText);
        
        // Build detailed error message
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        if (data?.message) {
          errorMessage += ` - ${data.message}`;
        }
        if (data?.error) {
          const errorDetail = typeof data.error === 'string' ? data.error : JSON.stringify(data.error);
          errorMessage += ` (${errorDetail})`;
        }
        if (data?.debug_info) {
          errorMessage += ` [${data.debug_info.file}:${data.debug_info.line}]`;
        }
        
        throw new Error(errorMessage);
      }

      // Handle response structure - could be { data: {...} } or direct object
      const settingsData = data?.data || data;
      setSettings(settingsData);
      
      // If super admin and landlords list provided, store it
      if (settingsData?.super_admin && settingsData?.landlords) {
        // Store landlords list in settings for UI
        settingsData._landlords = settingsData.landlords;
      }
      
      // If landlord_id was provided, store it
      if (landlordId) {
        setSelectedLandlordId(landlordId);
      }
      
      setError(null);
    } catch (err) {
      console.error('Error fetching system settings:', err);
      console.error('Error details:', {
        name: err?.name,
        message: err?.message,
        stack: err?.stack,
      });
      
      // If it's already an Error object, use it directly
      if (err instanceof Error) {
        // Check if it's a network/CORS error
        const isNetworkError = err.message.includes('Failed to fetch') || 
                              err.message.includes('CORS') ||
                              err.message.includes('NetworkError') ||
                              err.name === 'TypeError' ||
                              (err.message && err.message.toLowerCase().includes('network'));
        
        if (isNetworkError) {
          const errorMsg = `Network error: Unable to connect to server at ${API_BASE_URL}/settings/system. ` +
            `Please check: 1) Backend server is running (http://localhost:8000), ` +
            `2) API URL is correct, 3) CORS is configured. ` +
            `Check browser console for details.`;
          setError(new Error(errorMsg));
        } else {
          setError(err);
        }
      } else {
        // Otherwise, try to handle it with the error handler
        const handledError = await handleApiError(err);
        setError(handledError);
      }
      setSettings(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings(selectedLandlordId || null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount - fetchSettings is stable

  const updateSettings = useCallback(async (updates) => {
    const token = localStorage.getItem("auth_token");
    if (!token) {
      throw new Error("You must be signed in to update system settings.");
    }

    const response = await fetch(`${API_BASE_URL}/settings/system`, {
      method: "PATCH",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      throw await handleApiError(response);
    }

    const data = await response.json();
    setSettings(data.data || data);
    invalidateCache(`${API_BASE_URL}/settings/system`);
    return data;
  }, []);

  const updateCompany = useCallback(async (companySettings) => {
    const token = localStorage.getItem("auth_token");
    if (!token) {
      throw new Error("You must be signed in to update company settings.");
    }

    const response = await fetch(`${API_BASE_URL}/settings/system/company`, {
      method: "PATCH",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(companySettings),
    });

    if (!response.ok) {
      throw await handleApiError(response);
    }

    const data = await response.json();
    if (settings) {
      setSettings({
        ...settings,
        company: data.company,
      });
    }
    invalidateCache(`${API_BASE_URL}/settings/system`);
    return data;
  }, [settings]);

  const updateCurrency = useCallback(async (currencySettings) => {
    const token = localStorage.getItem("auth_token");
    if (!token) {
      throw new Error("You must be signed in to update currency settings.");
    }

    const response = await fetch(`${API_BASE_URL}/settings/system/currency`, {
      method: "PATCH",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(currencySettings),
    });

    if (!response.ok) {
      throw await handleApiError(response);
    }

    const data = await response.json();
    if (settings) {
      setSettings({
        ...settings,
        currency: data.currency,
      });
    }
    invalidateCache(`${API_BASE_URL}/settings/system`);
    return data;
  }, [settings]);

  const updateInvoiceNumbering = useCallback(async (invoiceNumberingSettings) => {
    const token = localStorage.getItem("auth_token");
    if (!token) {
      throw new Error("You must be signed in to update invoice numbering settings.");
    }

    const response = await fetch(
      `${API_BASE_URL}/settings/system/invoice-numbering`,
      {
        method: "PATCH",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(invoiceNumberingSettings),
      }
    );

    if (!response.ok) {
      throw await handleApiError(response);
    }

    const data = await response.json();
    if (settings) {
      setSettings({
        ...settings,
        invoice_numbering: data.invoice_numbering,
      });
    }
    invalidateCache(`${API_BASE_URL}/settings/system`);
    return data;
  }, [settings]);

  const updatePaymentTerms = useCallback(async (paymentTermsSettings) => {
    const token = localStorage.getItem("auth_token");
    if (!token) {
      throw new Error("You must be signed in to update payment terms settings.");
    }

    const response = await fetch(
      `${API_BASE_URL}/settings/system/payment-terms`,
      {
        method: "PATCH",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(paymentTermsSettings),
      }
    );

    if (!response.ok) {
      throw await handleApiError(response);
    }

    const data = await response.json();
    if (settings) {
      setSettings({
        ...settings,
        payment_terms: data.payment_terms,
      });
    }
    invalidateCache(`${API_BASE_URL}/settings/system`);
    return data;
  }, [settings]);

  const updateSystemPreferences = useCallback(async (systemPreferencesSettings) => {
    const token = localStorage.getItem("auth_token");
    if (!token) {
      throw new Error("You must be signed in to update system preferences settings.");
    }

    const response = await fetch(
      `${API_BASE_URL}/settings/system/system-preferences`,
      {
        method: "PATCH",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(systemPreferencesSettings),
      }
    );

    if (!response.ok) {
      throw await handleApiError(response);
    }

    const data = await response.json();
    if (settings) {
      setSettings({
        ...settings,
        system: data.system,
      });
    }
    invalidateCache(`${API_BASE_URL}/settings/system`);
    return data;
  }, [settings]);

  const updateDocuments = useCallback(async (documentSettings) => {
    const token = localStorage.getItem("auth_token");
    if (!token) {
      throw new Error("You must be signed in to update document settings.");
    }

    const response = await fetch(
      `${API_BASE_URL}/settings/system/documents`,
      {
        method: "PATCH",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(documentSettings),
      }
    );

    if (!response.ok) {
      throw await handleApiError(response);
    }

    const data = await response.json();
    if (settings) {
      setSettings({
        ...settings,
        documents: data.documents,
      });
    }
    invalidateCache(`${API_BASE_URL}/settings/system`);
    return data;
  }, [settings]);

  const updateTax = useCallback(async (taxSettings) => {
    const token = localStorage.getItem("auth_token");
    if (!token) {
      throw new Error("You must be signed in to update tax settings.");
    }

    const response = await fetch(
      `${API_BASE_URL}/settings/system/tax`,
      {
        method: "PATCH",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(taxSettings),
      }
    );

    if (!response.ok) {
      throw await handleApiError(response);
    }

    const data = await response.json();
    if (settings) {
      setSettings({
        ...settings,
        tax: data.tax,
      });
    }
    invalidateCache(`${API_BASE_URL}/settings/system`);
    return data;
  }, [settings]);

  const updateAutoInvoice = useCallback(async (autoInvoiceSettings) => {
    const token = localStorage.getItem("auth_token");
    if (!token) {
      throw new Error("You must be signed in to update auto-invoice settings.");
    }

    const response = await fetch(
      `${API_BASE_URL}/settings/system/auto-invoice`,
      {
        method: "PATCH",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(autoInvoiceSettings),
      }
    );

    if (!response.ok) {
      throw await handleApiError(response);
    }

    const data = await response.json();
    if (settings) {
      setSettings({
        ...settings,
        auto_invoice: data.auto_invoice,
      });
    }
    invalidateCache(`${API_BASE_URL}/settings/system`);
    return data;
  }, [settings]);

  const refetch = useCallback(() => {
    return fetchSettings(selectedLandlordId || null);
  }, [fetchSettings, selectedLandlordId]);

  return {
    settings,
    loading,
    error,
    selectedLandlordId,
    setSelectedLandlordId: (id) => {
      setSelectedLandlordId(id);
      fetchSettings(id);
    },
    updateSettings,
    updateCompany,
    updateCurrency,
    updateInvoiceNumbering,
    updatePaymentTerms,
    updateSystemPreferences,
    updateDocuments,
    updateTax,
    updateAutoInvoice,
    refetch,
  };
}

