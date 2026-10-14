import axios from "axios";

const API = (import.meta.env.VITE_API_URL || "http://localhost:5001").replace(/\/+$/, "");

export const DEFAULT_HOME_CONTENT = {
  heroTitle: "The Art of Intentional Living",
  philosophyTitle: "Our Philosophy",
  philosophyText: "We believe that true luxury lies in simplicity, honest materials, and designs that create a sense of calm within your home.",
};

export const getToken = () => {
  try {
    return localStorage.getItem("elle_token") || sessionStorage.getItem("elle_token") || "";
  } catch {
    return "";
  }
};

export const setToken = (token, remember = false) => {
  const storage = remember ? localStorage : sessionStorage;
  const otherStorage = remember ? sessionStorage : localStorage;
  otherStorage.removeItem("elle_token");
  storage.setItem("elle_token", token);
};

export const clearToken = () => {
  try {
    localStorage.removeItem("elle_token");
    sessionStorage.removeItem("elle_token");
  } catch {
    return;
  }
};

const http = axios.create({
  baseURL: API,
  headers: { "Content-Type": "application/json" },
  timeout: 30000,
});

http.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

async function request(method, path, body) {
  try {
    const res = await http.request({ method, url: path, data: body });
    return res.data;
  } catch (err) {
    if (err.response) {
      throw new Error(err.response.data?.message || "Something went wrong.", { cause: err });
    }
    throw new Error("Can't reach the server. Is the backend running?", { cause: err });
  }
}

export const registerAccount = (body) => request("POST", "/api/auth/register", body);
export const loginAccount = (body) => request("POST", "/api/auth/login", body);
export const fetchMe = () => request("GET", "/api/auth/me");
export const changePassword = (body) => request("PUT", "/api/account/password", body);
export const uploadPhoto = (photo) => request("PUT", "/api/account/photo", { photo });
export const removePhoto = () => request("DELETE", "/api/account/photo");
export const fetchAddresses = () => request("GET", "/api/addresses");
export const createAddress = (body) => request("POST", "/api/addresses", body);
export const editAddress = (id, body) => request("PUT", `/api/addresses/${id}`, body);
export const makeDefaultAddress = (id) => request("PUT", `/api/addresses/${id}/default`);
export const removeAddress = (id) => request("DELETE", `/api/addresses/${id}`);
export const fetchCart = () => request("GET", "/api/cart");
export const addCartItem = (id, quantity = 1) => request("POST", "/api/cart", { id, quantity });
export const mergeCart = (items) => request("POST", "/api/cart/merge", { items });
export const setCartQuantity = (id, quantity) => request("PUT", `/api/cart/${id}`, { quantity });
export const removeCartItem = (id) => request("DELETE", `/api/cart/${id}`);
export const clearCartItems = () => request("DELETE", "/api/cart");
export const fetchOrders = () => request("GET", "/api/orders");
export const createOrder = (addressId, discountCode = '') =>
  request("POST", "/api/orders", { address_id: addressId, ...(discountCode ? { discountCode } : {}) });
export const fetchProducts = () => request("GET", "/api/products");
export const fetchHomeContent = () => request("GET", "/api/homepage-content");
export const adminFetchHomeContent = () => request("GET", "/api/admin/homepage-content");
export const adminSaveHomeContent = (content) => request("PUT", "/api/admin/homepage-content", content);
export const subscribeToNewsletter = (email) => request("POST", "/api/newsletter", { email });
export const fetchReviews = (productId) => request("GET", `/api/products/${productId}/reviews`);
export const postReview = (productId, body) => request("POST", `/api/products/${productId}/reviews`, body);
export const adminFetchOrders = (params) =>
  request("GET", `/api/admin/orders?${new URLSearchParams(params).toString()}`);
export const adminFetchYears = () => request("GET", "/api/admin/orders/years");
export const adminUpdateOrderStatus = (orderId, action, reason) =>
  request("PATCH", `/api/admin/orders/${orderId}/status`, { action, reason });
export const adminFetchProduct = (id) => request("GET", `/api/admin/products/${id}`);
export const adminFetchProducts = (params) =>
  request("GET", `/api/admin/products?${new URLSearchParams(params).toString()}`);
export const adminFetchTypes = () => request("GET", "/api/admin/product-types");
export const adminCreateProduct = (body) => request("POST", "/api/admin/products", body);
export const adminUpdateProduct = (id, body) => request("PUT", `/api/admin/products/${id}`, body);
export const adminDeleteProduct = (id, reason) => request("DELETE", `/api/admin/products/${id}`, { reason });
export const adminFetchUsers = (params) =>
  request("GET", `/api/admin/users?${new URLSearchParams(params).toString()}`);
export const adminDeactivateUser = (id, body) => request("PATCH", `/api/admin/users/${id}/deactivate`, body);
export const adminActivateUser = (id) => request("PATCH", `/api/admin/users/${id}/activate`);
export const adminDeleteUser = (id, reason) => request("DELETE", `/api/admin/users/${id}`, { reason });
export const adminCreateAdmin = (body) => request("POST", "/api/admin/users", body);
export const adminFetchArchive = (params) =>
  request("GET", `/api/admin/archive?${new URLSearchParams(params).toString()}`);
export const adminFetchArchiveTypes = () => request("GET", "/api/admin/archive-types");
export const adminRestoreProduct = (id) => request("POST", `/api/admin/archive/${id}/restore`);
export const adminPurgeProduct = (id) => request("DELETE", `/api/admin/archive/${id}`);
export const adminFetchLogs = (params) =>
  request("GET", `/api/admin/action-logs?${new URLSearchParams(params).toString()}`);
export const adminAdjustStock = (id, amount, mode) =>
  request("POST", `/api/admin/products/${id}/stock`, { amount, mode });
export const adminFetchAlerts = () => request("GET", "/api/admin/alerts");
export const adminMarkOrdersSeen = () => request("POST", "/api/admin/orders/seen");
export const adminFetchProductsLite = () => request("GET", "/api/admin/products-lite");
export const adminFetchDiscounts = (params) =>
  request("GET", `/api/admin/discounts?${new URLSearchParams(params).toString()}`);
export const adminCreateDiscount = (body) => request("POST", "/api/admin/discounts", body);
export const adminSetDiscountEnabled = (id, enabled) => request("PATCH", `/api/admin/discounts/${id}/enabled`, { enabled });
export const adminDeleteDiscount = (id) => request("DELETE", `/api/admin/discounts/${id}`);
export const adminFetchReports = (month) =>
  request("GET", `/api/admin/reports${month ? `?month=${month}` : ""}`);
export const updateProfile = (body) => request("PUT", "/api/account/profile", body);
export const adminFetchReviews = (params) =>
  request("GET", `/api/admin/reviews?${new URLSearchParams(params).toString()}`);
export const adminSetReviewHidden = (id, hidden) => request("PATCH", `/api/admin/reviews/${id}/hidden`, { hidden });
export const adminReplyReview = (id, reply) => request("POST", `/api/admin/reviews/${id}/reply`, { reply });
export const fetchShippingRates = () => request("GET", "/api/shipping-rates");
export const adminSaveShippingRates = (rates) => request("PUT", "/api/admin/shipping-rates", { rates });
export const fetchShippingPromos = () => request("GET", "/api/shipping-promos");
export const validateDiscountCode = (code) => request("POST", "/api/discount-codes/validate", { code });
export const adminUpdateDiscount = (id, body) => request("PUT", `/api/admin/discounts/${id}`, body);
export const markOrderReceived = (orderId) => request("PATCH", `/api/orders/${orderId}/received`);
export const markOrdersSeen = (status) => request("POST", "/api/orders/seen", { status });
export const mediaUrl = (path) => {
  if (!path) return "";
  try {
    return new URL(path, `${API}/`).toString();
  } catch {
    throw new Error("Invalid review media URL.");
  }
};
export const uploadReviewMedia = async (blob) => {
  try {
    const res = await http.post("/api/review-media", blob, {
      headers: { "Content-Type": blob.type },
      transformRequest: [(data) => data],
      timeout: 120000,
    });
    return res.data;
  } catch (err) {
    if (err.response) {
      throw new Error(err.response.data?.message || "The upload failed.", { cause: err });
    }
    throw new Error("Can't reach the server. Is the backend running?", { cause: err });
  }
};
