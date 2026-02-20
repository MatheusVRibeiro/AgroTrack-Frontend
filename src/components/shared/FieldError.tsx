import { cn } from "@/lib/utils";

type FieldErrorProps = {
  message?: string;
  className?: string;
};

export const FieldError = ({ message, className }: FieldErrorProps) => {
  if (!message) return null;
  return <p className={cn("text-xs text-red-600 animate-error-pop", className)}>{message}</p>;
};

export const fieldErrorClass = (hasError?: string | boolean) =>
  hasError ? "border-red-500 focus-visible:ring-red-500" : "";
