import { useBoardStore } from '../store/useBoardStore.js';

let isRefreshing = false;
let refreshSubscribers = [];

const subscribeTokenRefresh = (cb) => {
  refreshSubscribers.push(cb);
};

const onRefreshed = () => {
  refreshSubscribers.forEach((cb) => cb());
  refreshSubscribers = [];
};

export const apiRequest = async (url, options = {}) => {
  options.credentials = 'include';
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };

  const accessToken = useBoardStore.getState().accessToken;
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  // Inject current Socket.io client ID to suppress duplicate events
  if (window.socketId) {
    headers['X-Socket-ID'] = window.socketId;
  }

  options.headers = headers;

  try {
    let response = await fetch(url, options);

    // If 401 Unauthorized
    if (response.status === 401) {
      // Clone response to parse body safely without breaking downstream reads
      const data = await response.clone().json().catch(() => ({}));
      
      if (data.error && data.error.code === 'TOKEN_EXPIRED') {
        if (!isRefreshing) {
          isRefreshing = true;
          try {
            const refreshResponse = await fetch('/api/auth/refresh', {
              method: 'POST',
              credentials: 'include'
            });

            if (refreshResponse.ok) {
              const refreshData = await refreshResponse.json().catch(() => ({}));
              if (refreshData.success && refreshData.accessToken) {
                useBoardStore.getState().setAccessToken(refreshData.accessToken);
              }
              isRefreshing = false;
              onRefreshed();
              // Retry the original request
              return await apiRequest(url, options);
            } else {
              isRefreshing = false;
              window.dispatchEvent(new Event('force-logout'));
              return response;
            }
          } catch (refreshErr) {
            isRefreshing = false;
            window.dispatchEvent(new Event('force-logout'));
            throw refreshErr;
          }
        } else {
          // Queue request until active rotation resolves
          return new Promise((resolve) => {
            subscribeTokenRefresh(() => {
              resolve(apiRequest(url, options));
            });
          });
        }
      } 
      // If token is invalid (re-auth failed or malformed token)
      else if (data.error && (data.error.code === 'TOKEN_INVALID' || data.error.code === 'SECURITY_BREACH')) {
        window.dispatchEvent(new Event('force-logout'));
      }
    }

    return response;
  } catch (error) {
    console.error('Network API error:', error);
    throw error;
  }
};
