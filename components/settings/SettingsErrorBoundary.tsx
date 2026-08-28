"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children?: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class SettingsErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[SettingsErrorBoundary caught]:", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 my-6 bg-red-50/70 border border-red-200 rounded-xl flex flex-col items-center justify-center text-center space-y-4 max-w-xl mx-auto shadow-sm">
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-red-600">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-slate-900">
              {this.props.fallbackTitle || "Failed to load settings module"}
            </h3>
            <p className="text-sm text-slate-600 max-w-md">
              An unexpected error occurred while rendering this section. Your other CRM tools remain fully functional.
            </p>
          </div>
          {process.env.NODE_ENV !== "production" && this.state.error && (
            <div className="bg-white p-3 rounded text-left text-xs font-mono text-red-700 border border-red-100 max-w-full overflow-auto">
              {this.state.error.message}
            </div>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={this.handleReset}
            className="flex items-center gap-2 border-red-200 hover:bg-red-50 text-red-700"
          >
            <RefreshCw className="w-4 h-4" />
            Try Reloading Module
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
