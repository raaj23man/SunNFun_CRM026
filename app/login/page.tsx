"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { startAuthentication } from "@simplewebauthn/browser";
import {
  Compass,
  Fingerprint,
  KeyRound,
  Lock,
  Mail,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

const loginSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
  rememberMe: z.boolean().default(false),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = React.useState(false);
  const [isPasskeyLoading, setIsPasskeyLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);

  // 2FA Challenge State
  const [temp2FAToken, setTemp2FAToken] = React.useState<string | null>(null);
  const [totpCode, setTotpCode] = React.useState("");

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "admin@sunnfunholidays.com",
      password: "Password123!",
      rememberMe: true,
    },
  });

  async function handlePasswordLogin(values: LoginFormValues) {
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Login failed.");
      }

      // Check if 2FA code is required
      if (data.requires2FA && data.tempToken) {
        setTemp2FAToken(data.tempToken);
        setSuccessMessage("2FA verification required. Please enter your 6-digit authenticator code.");
        return;
      }

      setSuccessMessage(`Welcome back, ${data.user.first_name}!`);
      setTimeout(() => {
        router.push("/");
        router.refresh();
      }, 800);
    } catch (err: any) {
      setErrorMessage(err.message || "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handle2FAVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!temp2FAToken || totpCode.length !== 6) return;

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/auth/2fa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tempToken: temp2FAToken,
          code: totpCode,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "2FA verification failed.");
      }

      setSuccessMessage(`2FA Verified! Welcome back, ${data.user.first_name}!`);
      setTimeout(() => {
        router.push("/");
        router.refresh();
      }, 800);
    } catch (err: any) {
      setErrorMessage(err.message || "Invalid 2FA code.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handlePasskeyLogin() {
    setIsPasskeyLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      // Step 1: Get authentication options from server
      const optionsRes = await fetch("/api/auth/webauthn/login");
      const options = await optionsRes.json();

      if (!optionsRes.ok) {
        throw new Error(options.error || "Failed to initiate passkey login.");
      }

      // Step 2: Prompt browser/device biometric or hardware key
      const authResp = await startAuthentication(options);

      // Step 3: Verify authentication signature with server
      const verifyRes = await fetch("/api/auth/webauthn/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ authenticationResponse: authResp }),
      });

      const verifyData = await verifyRes.json();

      if (!verifyRes.ok) {
        throw new Error(verifyData.error || "Passkey verification failed.");
      }

      setSuccessMessage(`Biometric verified! Welcome back, ${verifyData.user.first_name}!`);
      setTimeout(() => {
        router.push("/");
        router.refresh();
      }, 800);
    } catch (err: any) {
      console.error("Passkey login error:", err);
      setErrorMessage(
        err.name === "NotAllowedError"
          ? "Passkey prompt was cancelled."
          : err.message || "Passkey login failed."
      );
    } finally {
      setIsPasskeyLoading(false);
    }
  }

  // Helper for quick testing across roles
  function setDemoCredentials(email: string) {
    form.setValue("email", email);
    form.setValue("password", "Password123!");
    setTemp2FAToken(null);
    setErrorMessage(null);
    setSuccessMessage(null);
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8">
      {/* Centered Minimalist Brand Logo */}
      <div className="mb-6 flex flex-col items-center">
        <div className="h-12 w-12 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/25 mb-3">
          <Compass className="h-7 w-7 animate-spin-slow" />
        </div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
          Sun & Fun Holidays
        </h1>
        <p className="text-xs text-slate-500 font-medium mt-0.5">
          Travel CRM & Operations Suite
        </p>
      </div>

      {/* Main Login Card */}
      <Card className="w-full max-w-md shadow-xl shadow-slate-200/50 border-slate-200/80 bg-white">
        <CardHeader className="space-y-1 pb-4">
          <CardTitle className="text-lg font-semibold text-slate-900 flex items-center justify-between">
            {temp2FAToken ? "Two-Factor Verification" : "Sign in to your account"}
            <span className="text-xs font-normal text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
              SaaS v1.0
            </span>
          </CardTitle>
          <CardDescription className="text-xs text-slate-500">
            {temp2FAToken
              ? "Enter the 6-digit authentication code from your authenticator app."
              : "Enter your credentials or use your registered passkey."}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Status Banners */}
          {errorMessage && (
            <div className="rounded-lg bg-red-50 p-3 text-xs text-red-700 border border-red-200 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-600" />
              <div>{errorMessage}</div>
            </div>
          )}

          {successMessage && (
            <div className="rounded-lg bg-emerald-50 p-3 text-xs text-emerald-800 border border-emerald-200 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              <div>{successMessage}</div>
            </div>
          )}

          {temp2FAToken ? (
            /* 2FA Challenge View */
            <form onSubmit={handle2FAVerify} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-700 flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-blue-600" />
                  6-Digit Authenticator Code
                </label>
                <Input
                  type="text"
                  maxLength={6}
                  placeholder="123456"
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ""))}
                  className="text-center tracking-widest text-lg font-mono"
                  autoFocus
                  required
                />
              </div>

              <Button
                type="submit"
                disabled={isLoading || totpCode.length !== 6}
                className="w-full bg-blue-600 hover:bg-blue-700 gap-2"
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                Verify & Sign In
              </Button>

              <button
                type="button"
                onClick={() => setTemp2FAToken(null)}
                className="w-full text-center text-xs text-slate-500 hover:text-slate-800 underline"
              >
                Back to email login
              </button>
            </form>
          ) : (
            /* Password & Passkey Form */
            <>
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(handlePasswordLogin)}
                  className="space-y-3.5"
                >
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs text-slate-700">Work Email</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                            <Input
                              placeholder="name@sunnfunholidays.com"
                              className="pl-9 text-sm"
                              {...field}
                            />
                          </div>
                        </FormControl>
                        <FormMessage className="text-[11px]" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center justify-between">
                          <FormLabel className="text-xs text-slate-700">Password</FormLabel>
                          <a
                            href="#"
                            onClick={(e) => {
                              e.preventDefault();
                              alert("Please contact your organization administrator to reset your password.");
                            }}
                            className="text-[11px] text-blue-600 hover:underline"
                          >
                            Forgot Password?
                          </a>
                        </div>
                        <FormControl>
                          <div className="relative">
                            <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                            <Input
                              type="password"
                              placeholder="••••••••"
                              className="pl-9 text-sm"
                              {...field}
                            />
                          </div>
                        </FormControl>
                        <FormMessage className="text-[11px]" />
                      </FormItem>
                    )}
                  />

                  <div className="flex items-center space-x-2 pt-1">
                    <input
                      type="checkbox"
                      id="rememberMe"
                      className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      defaultChecked
                    />
                    <label
                      htmlFor="rememberMe"
                      className="text-xs text-slate-600 font-normal cursor-pointer select-none"
                    >
                      Remember this device for 7 days
                    </label>
                  </div>

                  <Button
                    type="submit"
                    disabled={isLoading || isPasskeyLoading}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm mt-2 shadow-sm"
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <span className="flex items-center gap-1.5">
                        Sign In with Password
                        <ArrowRight className="h-4 w-4" />
                      </span>
                    )}
                  </Button>
                </form>
              </Form>

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-slate-400 font-medium">Or passwordless</span>
                </div>
              </div>

              {/* WebAuthn Passkey Button */}
              <Button
                type="button"
                variant="outline"
                onClick={handlePasskeyLogin}
                disabled={isLoading || isPasskeyLoading}
                className="w-full border-slate-200 hover:bg-slate-50 text-slate-700 text-xs gap-2 font-medium"
              >
                {isPasskeyLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                ) : (
                  <Fingerprint className="h-4 w-4 text-blue-600" />
                )}
                Sign In with Passkey (Biometrics / Security Key)
              </Button>
            </>
          )}
        </CardContent>

        {/* Demo Fast-Switch Panel */}
        <CardFooter className="flex flex-col border-t border-slate-100 bg-slate-50/60 p-4 rounded-b-xl gap-2">
          <div className="w-full flex items-center justify-between text-[11px] text-slate-500">
            <span className="font-semibold text-slate-700 flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-amber-500" />
              Quick Demo Accounts:
            </span>
            <span className="text-[10px]">Pass: Password123!</span>
          </div>

          <div className="grid grid-cols-3 gap-1.5 w-full">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDemoCredentials("admin@sunnfunholidays.com")}
              className="text-[10px] h-7 px-1.5 bg-white hover:bg-blue-50 hover:text-blue-700 border-slate-200"
            >
              Super Admin
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDemoCredentials("saleshead@sunnfunholidays.com")}
              className="text-[10px] h-7 px-1.5 bg-white hover:bg-blue-50 hover:text-blue-700 border-slate-200"
            >
              Sales Head
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDemoCredentials("agent@sunnfunholidays.com")}
              className="text-[10px] h-7 px-1.5 bg-white hover:bg-blue-50 hover:text-blue-700 border-slate-200"
            >
              Sales Person
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDemoCredentials("ops@sunnfunholidays.com")}
              className="text-[10px] h-7 px-1.5 bg-white hover:bg-blue-50 hover:text-blue-700 border-slate-200"
            >
              Operations
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDemoCredentials("accounts@sunnfunholidays.com")}
              className="text-[10px] h-7 px-1.5 bg-white hover:bg-blue-50 hover:text-blue-700 border-slate-200"
            >
              Accountant
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDemoCredentials("secure@sunnfunholidays.com")}
              className="text-[10px] h-7 px-1.5 bg-white hover:bg-blue-50 hover:text-blue-700 border-slate-200"
            >
              2FA Admin
            </Button>
          </div>
        </CardFooter>
      </Card>

      <p className="mt-6 text-center text-xs text-slate-400">
        SunNFun Travel CRM • Multi-Tenant Isolation • Passkey WebAuthn & 2FA Protected
      </p>
    </div>
  );
}
