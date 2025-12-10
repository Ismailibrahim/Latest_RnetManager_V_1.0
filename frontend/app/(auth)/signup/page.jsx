"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  Building2,
  Loader2,
  Lock,
  Mail,
  User,
  Phone,
  CheckCircle2,
  XCircle,
  Sparkles,
  ArrowRight,
  Check,
} from "lucide-react";
import { API_BASE_URL } from "@/utils/api-config";
import { formatCurrency } from "@/lib/currency-formatter";
import { getPrimaryCurrency } from "@/utils/currency-config";

const initialFormState = {
  full_name: "",
  email: "",
  password: "",
  password_confirmation: "",
  subscription_tier: "",
  mobile: "",
  company: "",
};

const subscriptionTiers = [
  {
    value: "basic",
    label: "Basic",
    description: "Perfect for small operations",
    popular: false,
    gradientClasses: "from-blue-500 to-blue-600",
    bgGradientClasses: "from-blue-50 to-blue-50/50",
    borderClasses: "border-blue-500 hover:border-blue-400",
    shadowClasses: "shadow-blue-500/30",
    textColorSelected: "text-blue-700",
    icon: "🌟",
  },
  {
    value: "pro",
    label: "Pro",
    description: "Best for growing businesses",
    popular: true,
    gradientClasses: "from-primary to-primary/90",
    bgGradientClasses: "from-primary/10 to-primary/5",
    borderClasses: "border-primary hover:border-primary/80",
    shadowClasses: "shadow-primary/30",
    textColorSelected: "text-primary",
    icon: "✨",
  },
  {
    value: "enterprise",
    label: "Enterprise",
    description: "For large-scale operations",
    popular: false,
    gradientClasses: "from-purple-500 to-purple-600",
    bgGradientClasses: "from-purple-50 to-purple-50/50",
    borderClasses: "border-purple-500 hover:border-purple-400",
    shadowClasses: "shadow-purple-500/30",
    textColorSelected: "text-purple-700",
    icon: "🚀",
  },
];

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState(initialFormState);
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [apiError, setApiError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [subscriptionLimits, setSubscriptionLimits] = useState(null);
  const [loadingLimits, setLoadingLimits] = useState(true);
  const [passwordStrength, setPasswordStrength] = useState({
    length: false,
    upper: false,
    lower: false,
    number: false,
    special: false,
  });

  // Fetch subscription limits on component mount
  useEffect(() => {
    const fetchLimits = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/auth/subscription-limits`);
        if (response.ok) {
          const data = await response.json();
          setSubscriptionLimits(data.data);
        }
      } catch (error) {
        console.error("Failed to fetch subscription limits:", error);
      } finally {
        setLoadingLimits(false);
      }
    };

    fetchLimits();
  }, []);

  // Check password strength
  useEffect(() => {
    const password = form.password;
    setPasswordStrength({
      length: password.length >= 8,
      upper: /[A-Z]/.test(password),
      lower: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[@$!%*?&#]/.test(password),
    });
  }, [form.password]);

  const handleChange = (event) => {
    const { name, type, value, checked } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({
        ...prev,
        [name]: undefined,
      }));
    }
    setApiError(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setApiError(null);
    setFieldErrors({});

    try {
      const response = await fetch(`${API_BASE_URL}/auth/signup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.errors) {
          setFieldErrors(data.errors);
        }
        throw new Error(data.message || "Signup failed");
      }

      setSuccess(true);
      setTimeout(() => {
        router.push("/login");
      }, 3000);
    } catch (error) {
      setApiError(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const getSelectedTierLimits = () => {
    if (!subscriptionLimits || !form.subscription_tier) return null;
    return subscriptionLimits[form.subscription_tier];
  };

  const selectedLimits = getSelectedTierLimits();
  const passwordStrengthScore = Object.values(passwordStrength).filter(Boolean).length;
  const isPasswordStrong = passwordStrengthScore >= 4;

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-primary/5 p-4">
        <div className="w-full max-w-md space-y-6 rounded-3xl border border-slate-200/80 bg-white/80 backdrop-blur-xl p-8 shadow-2xl shadow-primary/10">
          <div className="text-center space-y-4">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-lg shadow-emerald-500/30">
              <CheckCircle2 size={40} className="text-white" />
            </div>
            <h2 className="text-3xl font-bold text-slate-900">
              Account Created!
            </h2>
            <p className="text-slate-600">
              Your account is pending approval by an administrator.
            </p>
            <div className="rounded-xl bg-blue-50/80 border border-blue-200/80 p-4 text-sm text-blue-700">
              <p className="font-medium">What&apos;s next?</p>
              <p className="mt-1 text-blue-600">
                You&apos;ll receive an email notification once your account is approved.
              </p>
            </div>
            <p className="text-sm text-slate-500 animate-pulse">
              Redirecting to login page...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-primary/5 p-4 py-12">
      <div className="w-full max-w-5xl md:max-w-6xl lg:max-w-7xl xl:max-w-[1400px] 2xl:max-w-[1600px] 3xl:max-w-[2000px]">
        {/* Header Section */}
        <div className="text-center mb-8 space-y-3">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-gradient-to-br from-primary to-primary/80 shadow-lg shadow-primary/30 mb-4">
            <Building2 size={28} className="text-white" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500 font-semibold mb-2">
              RentApplication
            </p>
            <h1 className="text-4xl font-bold tracking-tight text-slate-900 mb-2">
              Create your account
            </h1>
            <p className="text-base text-slate-600 max-w-md mx-auto">
              Start managing your properties and tenants with our powerful platform
            </p>
          </div>
        </div>

        {/* Main Form Card */}
        <div className="rounded-3xl border border-slate-200/80 bg-white/80 backdrop-blur-xl shadow-2xl shadow-slate-900/5 p-8 md:p-12 lg:p-16 xl:p-20">
          <form onSubmit={handleSubmit} className="space-y-6" suppressHydrationWarning>
            {apiError && (
              <div className="flex items-start gap-3 rounded-xl border border-red-200/80 bg-gradient-to-r from-red-50 to-red-50/50 p-4 text-sm text-red-700 backdrop-blur-sm">
                <AlertTriangle
                  size={20}
                  className="mt-0.5 flex-shrink-0 text-red-600"
                />
                <div className="flex-1">
                  <p className="font-semibold">{apiError}</p>
                  {fieldErrors && Object.keys(fieldErrors).length > 0 && (
                    <ul className="mt-2 space-y-1 list-disc list-inside text-xs">
                      {Object.entries(fieldErrors).map(([field, errors]) => (
                        <li key={field}>{Array.isArray(errors) ? errors[0] : errors}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}

            {/* Personal Information Section */}
            <div className="space-y-5">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-200/60">
                <User size={18} className="text-primary" />
                <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">
                  Personal Information
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <Fieldset>
                  <Label htmlFor="full_name">
                    Full Name <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative group">
                    <User
                      className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-primary"
                      size={18}
                    />
                    <Input
                      id="full_name"
                      name="full_name"
                      type="text"
                      placeholder="John Doe"
                      autoComplete="name"
                      value={form.full_name}
                      onChange={handleChange}
                      disabled={submitting}
                      required
                      className="pl-12"
                    />
                  </div>
                  {fieldErrors.full_name && (
                    <FieldError>{fieldErrors.full_name[0]}</FieldError>
                  )}
                </Fieldset>

                <Fieldset>
                  <Label htmlFor="email">
                    Email Address <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative group">
                    <Mail
                      className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-primary"
                      size={18}
                    />
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="you@company.com"
                      autoComplete="email"
                      value={form.email}
                      onChange={handleChange}
                      disabled={submitting}
                      required
                      className="pl-12"
                    />
                  </div>
                  {fieldErrors.email && (
                    <FieldError>{fieldErrors.email[0]}</FieldError>
                  )}
                </Fieldset>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <Fieldset>
                  <Label htmlFor="mobile">
                    Mobile Number <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative group">
                    <Phone
                      className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-primary"
                      size={18}
                    />
                    <Input
                      id="mobile"
                      name="mobile"
                      type="tel"
                      placeholder="+960 123-4567"
                      autoComplete="tel"
                      value={form.mobile}
                      onChange={handleChange}
                      disabled={submitting}
                      required
                      className="pl-12"
                    />
                  </div>
                  {fieldErrors.mobile && (
                    <FieldError>{fieldErrors.mobile[0]}</FieldError>
                  )}
                </Fieldset>

                <Fieldset>
                  <Label htmlFor="company">
                    Company Name <span className="text-slate-400 text-xs font-normal">(Optional)</span>
                  </Label>
                  <div className="relative group">
                    <Building2
                      className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-primary"
                      size={18}
                    />
                    <Input
                      id="company"
                      name="company"
                      type="text"
                      placeholder="Your Company Name"
                      autoComplete="organization"
                      value={form.company}
                      onChange={handleChange}
                      disabled={submitting}
                      className="pl-12"
                    />
                  </div>
                  <p className="mt-1.5 text-xs text-slate-500">
                    If not provided, your full name will be used as the company name.
                  </p>
                  {fieldErrors.company && (
                    <FieldError>{fieldErrors.company[0]}</FieldError>
                  )}
                </Fieldset>
              </div>
            </div>

            {/* Subscription Tier Section */}
            <div className="space-y-5 pt-6 border-t border-slate-200/60">
              <div className="flex items-center gap-2 pb-2">
                <Sparkles size={18} className="text-primary" />
                <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">
                  Choose Your Plan <span className="text-red-500">*</span>
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-5">
                {subscriptionTiers.map((tier) => {
                  const tierLimits = subscriptionLimits?.[tier.value];
                  const isSelected = form.subscription_tier === tier.value;
                  
                  return (
                    <div key={tier.value} className="relative">
                      {/* Popular Badge - Outside the button to avoid clipping */}
                      {tier.popular && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
                          <span className={`inline-flex items-center gap-1 rounded-full bg-gradient-to-r ${tier.gradientClasses} px-3 py-1 text-xs font-bold text-white shadow-lg`}>
                            <Sparkles size={10} />
                            Most Popular
                          </span>
                        </div>
                      )}
                      
                      <button
                        type="button"
                        onClick={() => {
                          setForm((prev) => ({ ...prev, subscription_tier: tier.value }));
                          setFieldErrors((prev) => ({ ...prev, subscription_tier: undefined }));
                        }}
                        disabled={submitting || loadingLimits}
                        className={`group relative w-full rounded-xl border-2 overflow-visible text-left transition-all duration-300 ${
                          isSelected
                            ? `${tier.borderClasses} shadow-lg ${tier.shadowClasses} scale-[1.01]`
                            : `border-slate-200 bg-white ${tier.borderClasses} hover:shadow-md hover:scale-[1.005]`
                        } ${submitting || loadingLimits ? "opacity-60 cursor-not-allowed" : "cursor-pointer"} ${tier.popular ? 'pt-5' : ''}`}
                      >
                        {/* Gradient Background Overlay */}
                        <div className={`absolute inset-0 bg-gradient-to-br ${tier.bgGradientClasses} ${isSelected ? 'opacity-100' : 'opacity-0'} group-hover:opacity-20 transition-opacity duration-300 rounded-xl`} />
                        
                        {/* Content */}
                        <div className="relative p-4 lg:p-5 overflow-hidden rounded-xl">
                          {/* Header Section */}
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-start gap-2.5">
                              <div className={`flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br ${tier.gradientClasses} shadow-md text-lg`}>
                                {tier.icon}
                              </div>
                              <div>
                                <h3 className={`text-lg font-bold ${isSelected ? tier.textColorSelected : 'text-slate-900'} mb-0.5`}>
                                  {tier.label}
                                </h3>
                                <p className="text-xs text-slate-600">
                                  {tier.description}
                                </p>
                              </div>
                            </div>
                            {isSelected && (
                              <div className={`flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br ${tier.gradientClasses} text-white shadow-md ring-2 ring-white`}>
                                <Check size={12} />
                              </div>
                            )}
                          </div>

                          {/* Price Section */}
                          {tierLimits && (
                            <div className="mb-4 pb-4 border-b border-slate-200/60">
                              <div className="flex items-baseline gap-1.5">
                                <span className={`text-2xl font-extrabold ${isSelected ? tier.textColorSelected : 'text-slate-900'}`}>
                                  {parseFloat(tierLimits.monthly_price) === 0
                                    ? "Free"
                                    : formatCurrency(tierLimits.monthly_price, getPrimaryCurrency())}
                                </span>
                                {parseFloat(tierLimits.monthly_price) !== 0 && (
                                  <span className="text-xs font-medium text-slate-600">/mo</span>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Features Section */}
                          {tierLimits && (
                            <div className="space-y-2.5">
                              <div className="flex items-center justify-between py-1">
                                <div className="flex items-center gap-2">
                                  <div className={`h-1 w-1 rounded-full bg-gradient-to-r ${tier.gradientClasses}`} />
                                  <span className="text-xs font-medium text-slate-700">Properties</span>
                                </div>
                                <span className={`text-sm font-bold ${isSelected ? tier.textColorSelected : 'text-slate-900'}`}>
                                  {tierLimits.max_properties}
                                </span>
                              </div>
                              <div className="flex items-center justify-between py-1">
                                <div className="flex items-center gap-2">
                                  <div className={`h-1 w-1 rounded-full bg-gradient-to-r ${tier.gradientClasses}`} />
                                  <span className="text-xs font-medium text-slate-700">Units</span>
                                </div>
                                <span className={`text-sm font-bold ${isSelected ? tier.textColorSelected : 'text-slate-900'}`}>
                                  {tierLimits.max_units}
                                </span>
                              </div>
                              <div className="flex items-center justify-between py-1">
                                <div className="flex items-center gap-2">
                                  <div className={`h-1 w-1 rounded-full bg-gradient-to-r ${tier.gradientClasses}`} />
                                  <span className="text-xs font-medium text-slate-700">Users</span>
                                </div>
                                <span className={`text-sm font-bold ${isSelected ? tier.textColorSelected : 'text-slate-900'}`}>
                                  {tierLimits.max_users}
                                </span>
                              </div>
                            </div>
                          )}

                          {/* Selection Indicator */}
                          {isSelected && (
                            <div className="mt-4 pt-4 border-t border-slate-200/60">
                              <div className={`flex items-center gap-1.5 text-xs font-bold ${tier.textColorSelected}`}>
                                <CheckCircle2 size={14} />
                                Selected
                              </div>
                            </div>
                          )}
                        </div>
                      </button>
                    </div>
                  );
                })}
              </div>
              
              {fieldErrors.subscription_tier && (
                <FieldError>{fieldErrors.subscription_tier[0]}</FieldError>
              )}
            </div>

            {/* Password Section */}
            <div className="space-y-5 pt-6 border-t border-slate-200/60">
              <div className="flex items-center gap-2 pb-2">
                <Lock size={18} className="text-primary" />
                <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">
                  Security
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <Fieldset>
                  <Label htmlFor="password">
                    Password <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative group">
                    <Lock
                      className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-primary"
                      size={18}
                    />
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      placeholder="Create a strong password"
                      autoComplete="new-password"
                      value={form.password}
                      onChange={handleChange}
                      disabled={submitting}
                      required
                      className="pl-12"
                    />
                  </div>
                  
                  {form.password && (
                    <div className="mt-3 space-y-2">
                      <div className="flex items-center justify-between text-xs mb-2">
                        <span className="text-slate-600">Password strength</span>
                        <span className={`font-semibold ${
                          passwordStrengthScore >= 4 ? "text-emerald-600" :
                          passwordStrengthScore >= 2 ? "text-yellow-600" :
                          "text-red-600"
                        }`}>
                          {passwordStrengthScore >= 4 ? "Strong" :
                           passwordStrengthScore >= 2 ? "Medium" : "Weak"}
                        </span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${
                            passwordStrengthScore >= 4 ? "bg-emerald-500" :
                            passwordStrengthScore >= 2 ? "bg-yellow-500" :
                            "bg-red-500"
                          }`}
                          style={{ width: `${(passwordStrengthScore / 5) * 100}%` }}
                        />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
                        <PasswordRequirement
                          met={passwordStrength.length}
                          label="At least 8 characters"
                        />
                        <PasswordRequirement
                          met={passwordStrength.upper && passwordStrength.lower}
                          label="Upper & lowercase"
                        />
                        <PasswordRequirement
                          met={passwordStrength.number}
                          label="At least one number"
                        />
                        <PasswordRequirement
                          met={passwordStrength.special}
                          label="Special character"
                        />
                      </div>
                    </div>
                  )}
                  
                  {fieldErrors.password && (
                    <FieldError>{fieldErrors.password[0]}</FieldError>
                  )}
                </Fieldset>

                <Fieldset>
                  <Label htmlFor="password_confirmation">
                    Confirm Password <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative group">
                    <Lock
                      className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-primary"
                      size={18}
                    />
                    <Input
                      id="password_confirmation"
                      name="password_confirmation"
                      type="password"
                      placeholder="Confirm your password"
                      autoComplete="new-password"
                      value={form.password_confirmation}
                      onChange={handleChange}
                      disabled={submitting}
                      required
                      className="pl-12"
                    />
                  </div>
                  {form.password_confirmation && form.password !== form.password_confirmation && (
                    <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
                      <XCircle size={12} />
                      Passwords do not match
                    </p>
                  )}
                  {form.password_confirmation && form.password === form.password_confirmation && form.password && (
                    <p className="mt-1.5 text-xs text-emerald-600 flex items-center gap-1">
                      <CheckCircle2 size={12} />
                      Passwords match
                    </p>
                  )}
                  {fieldErrors.password_confirmation && (
                    <FieldError>{fieldErrors.password_confirmation[0]}</FieldError>
                  )}
                </Fieldset>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-6 border-t border-slate-200/60">
              <button
                type="submit"
                disabled={submitting || !isPasswordStrong || form.password !== form.password_confirmation}
                className="group relative inline-flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-r from-primary to-primary/90 px-8 py-4 text-base font-semibold text-white shadow-lg shadow-primary/30 transition-all duration-200 hover:shadow-xl hover:shadow-primary/40 hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100"
              >
                <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000" />
                {submitting ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    <span>Creating your account...</span>
                  </>
                ) : (
                  <>
                    <span>Create my account</span>
                    <ArrowRight size={20} className="transition-transform group-hover:translate-x-1" />
                  </>
                )}
              </button>

              <p className="mt-6 text-center text-sm text-slate-600">
                Already have an account?{" "}
                <Link
                  href="/login"
                  className="font-semibold text-primary transition-all hover:text-primary/80 hover:underline inline-flex items-center gap-1"
                >
                  Sign in
                  <ArrowRight size={14} />
                </Link>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function PasswordRequirement({ met, label }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      {met ? (
        <CheckCircle2 size={14} className="text-emerald-600 flex-shrink-0" />
      ) : (
        <XCircle size={14} className="text-slate-400 flex-shrink-0" />
      )}
      <span className={met ? "text-emerald-700 font-medium" : "text-slate-500"}>
        {label}
      </span>
    </div>
  );
}

function Fieldset({ children }) {
  return <div className="space-y-2">{children}</div>;
}

function Label({ children, ...props }) {
  return (
    <label
      {...props}
      className="block text-sm font-semibold text-slate-900 mb-2"
    >
      {children}
    </label>
  );
}

function Input({ className = "", ...props }) {
  return (
    <input
      {...props}
      suppressHydrationWarning
      className={`w-full rounded-xl border border-slate-300 bg-white px-4 py-3.5 text-sm text-slate-900 shadow-sm outline-none transition-all duration-200 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:shadow-md disabled:cursor-not-allowed disabled:opacity-60 disabled:bg-slate-50 ${className}`}
    />
  );
}

function FieldError({ children }) {
  return (
    <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-red-600">
      <AlertTriangle size={12} className="flex-shrink-0" />
      {children}
    </p>
  );
}
