
import ApiService from "./ApiService";

export const ApiBaseUrl =
  import.meta.env.VITE_APP_TYPE === 'dev' ? import.meta.env.VITE_APP_API_URL_DEV : import.meta.env.VITE_APP_API_URL_PROD;

export const apiService = ApiService();

//export const baseUrl = '/admin/'
export const baseUrl = '/admin/'

export const debounce = (func, delay = 300) => {
  let timeoutId;

  return function (...args) {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      func(...args);
    }, delay);
  };
};

