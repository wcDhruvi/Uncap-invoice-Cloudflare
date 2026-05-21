import axios from "axios";

// ─────────────────────────────────────────────
// Axios Instance
// ─────────────────────────────────────────────
const instance = axios.create({
    baseURL: import.meta.env.VITE_API_URL || "",
    headers: {
        "Content-Type": "application/json"
    }
});

// ─────────────────────────────────────────────
// Get Shopify Auth Token
// ─────────────────────────────────────────────
const getAuthHeader = async () => {
    try {
        const shopify =
            typeof window !== "undefined" ? window.shopify : null;

        // Embedded Shopify App
        if (
            shopify &&
            (shopify.environment?.embedded ||
                shopify.environment?.mobile)
        ) {
            const token = await shopify.idToken();

            if (token) {
                return `Bearer ${token}`;
            }
        }
    } catch (error) {
        console.error("Error getting Shopify token:", error);
    }

    return null;
};

// ─────────────────────────────────────────────
// Get Shop Param
// ─────────────────────────────────────────────
const getShop = () => {
    if (typeof window === "undefined") return null;

    const params = new URLSearchParams(window.location.search);

    return params.get("shop");
};

// ─────────────────────────────────────────────
// Common API Handler
// ─────────────────────────────────────────────
const fetchData = async (
    method,
    url,
    data = null,
    isFormData = false,
    customHeaders = {}
) => {
    try {
        const authHeader = await getAuthHeader();

        const headers = {
            ...customHeaders
        };

        // Set Content Type
        if (!isFormData) {
            headers["Content-Type"] = "application/json";
        }

        // Add Authorization Token
        if (authHeader) {
            headers["Authorization"] = authHeader;
        }

        // Add Shop Header
        const shop = getShop();

        if (shop) {
            headers["x-shopify-shop-domain"] = shop;
        }

        const config = {
            headers
        };

        console.log("━━━━━━━━━━━━━━━━━━━━━━");
        console.log("API CALL");
        console.log("METHOD:", method.toUpperCase());
        console.log("URL:", url);
        console.log("DATA:", data);
        console.log("HEADERS:", headers);
        console.log("━━━━━━━━━━━━━━━━━━━━━━");

        let response;

        switch (method) {
            case "get":
                if (data) {
                    config.params = data;
                }

                response = await instance.get(url, config);
                break;

            case "post":
                response = await instance.post(
                    url,
                    data,
                    config
                );
                break;

            case "put":
                response = await instance.put(
                    url,
                    data,
                    config
                );
                break;

            case "delete":
                response = await instance.delete(url, config);
                break;

            default:
                throw new Error("Invalid API Method");
        }

        return {
            ...response.data,
            apiStatus: response.status
        };
    } catch (error) {
        console.error("API ERROR:", error);

        return {
            apiStatus:
                error?.response?.status || 500,
            message:
                error?.response?.data?.message ||
                error.message ||
                "Something went wrong",
            error: true
        };
    }
};

// ─────────────────────────────────────────────
// API Methods
// ─────────────────────────────────────────────
const getData = async (
    url,
    params,
    headers
) => {
    return await fetchData(
        "get",
        url,
        params,
        false,
        headers
    );
};

const postData = async (
    url,
    data,
    isFormData = false,
    headers
) => {
    return await fetchData(
        "post",
        url,
        data,
        isFormData,
        headers
    );
};

const putData = async (
    url,
    data,
    isFormData = false,
    headers
) => {
    return await fetchData(
        "put",
        url,
        data,
        isFormData,
        headers
    );
};

const deleteData = async (
    url,
    headers
) => {
    return await fetchData(
        "delete",
        url,
        null,
        false,
        headers
    );
};

// ─────────────────────────────────────────────
// API Services
// ─────────────────────────────────────────────
export const apiService = {
    // Shop
    getShopDetails: () =>
        getData("/api/shop"),

    // Plans
    getPlans: () =>
        getData("/api/plans"),

    selectPlan: (payload) =>
        postData(
            "/api/plans/select-plan",
            payload
        ),

    // Orders
    getOrderList: (params) =>
        postData("/api/orders", params),

    // Invoices
    getInvoices: (params) =>
        getData("/api/invoices", params),

    getInvoiceByOrder: (params) =>
        getData(
            "/api/invoices/by-order",
            params
        ),

    createInvoice: (data) =>
        postData("/api/invoices", data),

    sendInvoice: (id, data) =>
        postData(
            `/api/invoices/${id}/send`,
            data
        ),

    // Invoice Settings
    getInvoiceSettings: () =>
        getData("/api/invoiceSettings"),

    updateInvoiceSettings: (payload) =>
        postData(
            "/api/invoiceSettings",
            payload
        ),

    // Languages
    getInvoiceLanguage: () =>
        getData("/api/invoiceLanguages"),

    updateInvoiceLanguage: (payload) =>
        postData(
            "/api/invoiceLanguages",
            payload
        ),

    // Uploads
    uploadLogo: (payload) =>
        postData(
            "/api/invoiceSettings/upload-logo",
            payload,
            true
        ),

    deleteLogo: (payload) =>
        postData(
            "/api/invoiceSettings/delete-logo",
            payload
        )
};

// Default Export
const ApiService = () => apiService;

export default ApiService;