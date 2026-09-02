/**
 * Centralized Validation Utilities for PC Alley Management System
 * Enforces strict name, number, phone, email, and input validation.
 */

/**
 * Validates human names (Customer Name, Staff Name, Contact Person, etc.)
 * - Rejects pure numbers and names containing digits.
 * - Enforces minimum 2 characters, maximum 100 characters.
 * - Allows letters, spaces, hyphens, periods, and apostrophes.
 */
export const validatePersonName = (name, fieldName = "Name") => {
  const trimmed = (name || "").trim();
  if (!trimmed) {
    return `${fieldName} is required.`;
  }
  if (/\d/.test(trimmed)) {
    return `${fieldName} cannot contain numbers.`;
  }
  if (!/^[A-Za-z\s.\'-]+$/.test(trimmed)) {
    return `${fieldName} can only contain letters, spaces, hyphens, apostrophes, and dots.`;
  }
  if (trimmed.length < 2) {
    return `${fieldName} must be at least 2 characters long.`;
  }
  if (trimmed.length > 100) {
    return `${fieldName} cannot exceed 100 characters.`;
  }
  return null;
};

/**
 * Validates business / company names (Supplier Company, Corporate Customer)
 * - Must contain at least one letter.
 * - Cannot be pure numbers or symbols.
 */
export const validateCompanyName = (name, fieldName = "Company Name") => {
  const trimmed = (name || "").trim();
  if (!trimmed) {
    return `${fieldName} is required.`;
  }
  if (!/[A-Za-z]/.test(trimmed)) {
    return `${fieldName} must contain at least one letter (cannot be numbers only).`;
  }
  if (trimmed.length < 2) {
    return `${fieldName} must be at least 2 characters long.`;
  }
  if (trimmed.length > 100) {
    return `${fieldName} cannot exceed 100 characters.`;
  }
  return null;
};

/**
 * Validates product / item names (e.g. "RTX 4090", "Gaming Headset")
 * - Must contain at least one letter.
 * - Cannot be pure numeric strings like "45445454".
 */
export const validateProductName = (name, fieldName = "Product Name") => {
  const trimmed = (name || "").trim();
  if (!trimmed) {
    return `${fieldName} is required.`;
  }
  if (!/[A-Za-z]/.test(trimmed)) {
    return `${fieldName} must contain letters or a valid model designation (cannot be pure numbers).`;
  }
  if (trimmed.length < 2) {
    return `${fieldName} must be at least 2 characters long.`;
  }
  if (trimmed.length > 150) {
    return `${fieldName} cannot exceed 150 characters.`;
  }
  return null;
};

/**
 * Validates category / classification names
 * - Cannot contain numbers.
 * - Letters and spaces only.
 */
export const validateCategoryName = (name, fieldName = "Category Name") => {
  const trimmed = (name || "").trim();
  if (!trimmed) {
    return `${fieldName} is required.`;
  }
  if (/\d/.test(trimmed)) {
    return `${fieldName} cannot contain numbers.`;
  }
  if (!/^[A-Za-z\s.\'-]+$/.test(trimmed)) {
    return `${fieldName} can only contain letters, spaces, and hyphens.`;
  }
  if (trimmed.length < 2) {
    return `${fieldName} must be at least 2 characters long.`;
  }
  return null;
};

/**
 * Validates Philippine phone numbers (09xxxxxxxxx, 11 digits)
 */
export const validatePhoneNumber = (phone, required = true) => {
  const trimmed = (phone || "").trim();
  if (!trimmed) {
    return required ? "Phone number is required." : null;
  }
  const digits = trimmed.replace(/[^0-9]/g, "");
  if (digits.length !== 11 || !digits.startsWith("09")) {
    return "Phone number must start with 09 and contain exactly 11 digits.";
  }
  if (/^(.)\1+$/.test(digits)) {
    return "Phone number cannot consist of only repeating identical digits.";
  }
  return null;
};

/**
 * Validates email address format
 */
export const validateEmail = (email, required = true) => {
  const trimmed = (email || "").trim();
  if (!trimmed) {
    return required ? "Email address is required." : null;
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmed)) {
    return "Please enter a valid email address.";
  }
  return null;
};
