import axios from 'axios';
import { useAppBridge } from "@shopify/app-bridge-react";
import { ApiBaseUrl } from './Constent';
import qs from 'qs';

const instance = axios.create();

const ApiService = () => {
    const baseUrl = ApiBaseUrl;

    const shopify = useAppBridge();

    if (shopify.environment.mobile || shopify.environment.embedded) {
        instance.interceptors.request.use(async function (config) {
            return await shopify.idToken()
                .then((token) => {
                    config.headers["Authorization"] = `Bearer ${token}`;
                    return config;
                });
        });
    } else {
        instance.interceptors.request.use(function (config) {
            const localData = window.location.search;
            let urlParams = new URLSearchParams(localData);
            urlParams.toString();
            const params = Object.fromEntries(urlParams);
            config.headers["Authorization"] = JSON.stringify(params);
            return config;
        })
    }

    const fetchData = async (method, url, data, isFormData, header) => {
        const config = {
            headers: {
                ...(header || {}),
                "content-type": isFormData ? "multipart/form-data" : "application/json",
            }
        };

        let result = '';

        try {

            const res = await instance[method](url, data, config);
            if (res.status === 200) {
                result = { ...res.data, apiStatus: res.status };
            } else {
                result = { ...res.data, apiStatus: res.status };
            }
        } catch (e) {
            result = { ...e?.response?.data, apiStatus: e.status, message: e.message };
        }

        return result;
    };


    // //----------------------------API-Methods-----------------------------//

    const getData = async (url, header) => await fetchData('get', url, null, false, header);

    const postData = async (url, data, isFormData, header) => await fetchData('post', url, data, isFormData, header);

    const putData = async (url, data, isFormData, header) => await fetchData('put', url, data, isFormData, header);

    const deleteData = async (url, header) => await fetchData('delete', url, null, false, header);

    // //---------------------------------------------------------------------//


    //--------------------------------API----------------------------------//
    return {
        getShopDetails: async (payload) => await getData(`${baseUrl}/shop-details?${qs.stringify(payload)}`,),
        getProductList: async (payload) => await postData(`${baseUrl}/products-list`, payload),
        getUniqueData: async () => await getData(`${baseUrl}/products-filters`),
        getSingleProduct: async (id) => await getData(`${baseUrl}/products/${id}`,),
        storeProduct: async (payload) => await postData(`${baseUrl}/products-save`, payload),
        deleteProduct: async (payload) => await postData(`${baseUrl}/products/delete`, payload),
        exportProducts: async () => await getData(`${baseUrl}/export-products`),
        importProducts: async (payload) => await postData(`${baseUrl}/import-products`, payload, true)
    }

}

export default ApiService;
