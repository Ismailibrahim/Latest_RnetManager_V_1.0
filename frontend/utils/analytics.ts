/**
 * Analytics Utility Functions
 * 
 * This file provides easy-to-use functions for tracking events in Google Analytics.
 * Import these functions in any component to track user interactions.
 * 
 * @example
 * import { trackButtonClick, trackFormSubmit, trackPurchase } from '@/utils/analytics';
 * 
 * // Track button click
 * trackButtonClick('signup_button', '/signup');
 * 
 * // Track form submission
 * trackFormSubmit('contact_form');
 * 
 * // Track purchase
 * trackPurchase('subscription_pro', 999);
 */

import { trackEvent, trackPageView } from "@/components/GoogleAnalytics";

/**
 * Track a button click event
 * 
 * @param {string} buttonName - Name of the button clicked
 * @param {string} [destination] - Optional destination URL to track
 */
export const trackButtonClick = (buttonName, destination) => {
  trackEvent("click", "button", buttonName);
  if (destination) {
    trackPageView(destination);
  }
};

/**
 * Track a form submission
 * 
 * @param {string} formName - Name of the form submitted
 * @param {boolean} [success=true] - Whether submission was successful
 */
export const trackFormSubmit = (formName, success = true) => {
  trackEvent("submit", "form", formName, success ? 1 : 0);
};

/**
 * Track a purchase/transaction
 * 
 * @param {string} itemName - Name of the purchased item
 * @param {number} value - Purchase value
 */
export const trackPurchase = (itemName, value) => {
  trackEvent("purchase", "ecommerce", itemName, value);
};

/**
 * Track user signup
 * 
 * @param {string} [method="email"] - Signup method used
 */
export const trackSignup = (method = "email") => {
  trackEvent("sign_up", "engagement", method);
};

/**
 * Track user login
 * 
 * @param {string} [method="email"] - Login method used
 */
export const trackLogin = (method = "email") => {
  trackEvent("login", "engagement", method);
};

/**
 * Track file download
 * 
 * @param {string} fileName - Name of the file
 * @param {string} fileType - Type/extension of the file
 */
export const trackDownload = (fileName, fileType) => {
  trackEvent("file_download", "engagement", `${fileName}.${fileType}`);
};

/**
 * Track video play
 * 
 * @param {string} videoName - Name of the video
 */
export const trackVideoPlay = (videoName) => {
  trackEvent("video_play", "engagement", videoName);
};

/**
 * Track external link click
 * 
 * @param {string} url - External URL clicked
 */
export const trackExternalLink = (url) => {
  trackEvent("click", "external_link", url);
};

/**
 * Track search query
 * 
 * @param {string} searchTerm - Search term entered
 * @param {number} [resultsCount] - Optional number of results
 */
export const trackSearch = (searchTerm, resultsCount) => {
  trackEvent("search", "engagement", searchTerm, resultsCount);
};

