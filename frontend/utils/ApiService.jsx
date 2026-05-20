import axios from 'axios';
import { useAppBridge } from "@shopify/app-bridge-react";
import qs from 'qs';

const instance = axios.create();

const ApiService = () => {

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
            let res;
            if (method === 'get') {
                if (data) {
                    config.params = data;
                }
                res = await instance.get(url, config);
            } else {
                res = await instance[method](url, data, config);
            }
            if (res.status === 200) {
                result = { ...res.data, apiStatus: res.status };
            } else {
                result = { ...res.data, apiStatus: res.status };
            }
        } catch (e) {
            result = { ...e?.response?.data, apiStatus: e?.response?.status || 500, message: e.message };
        }

        return result;
    };


    // //----------------------------API-Methods-----------------------------//

    const getData = async (url, params, header) => await fetchData('get', url, params, false, header);

    const postData = async (url, data, isFormData, header) => await fetchData('post', url, data, isFormData, header);

    const putData = async (url, data, isFormData, header) => await fetchData('put', url, data, isFormData, header);

    const deleteData = async (url, header) => await fetchData('delete', url, null, false, header);

    // ── API methods (memoized so reference is stable across renders) ────────────
    return {

        getShopDetails: () => getData(`/api/shop`),
        getInvoices: () => getData(`/api/invoices`),
        getPlans: () => getData(`/api/plans`),
        selectPlan: (payload) => postData(`/api/plans/select-plan`, payload),
        getOrderList: (params) => postData('/api/orders', params),
        getInvoiceByOrder: (params) => getData('/api/invoices/by-order', params),
        createInvoice: (data) => postData('/api/invoices', data),
        sendInvoice: (id, data) => postData(`/api/invoices/${id}/send`, data)

    }

}

export default ApiService;
