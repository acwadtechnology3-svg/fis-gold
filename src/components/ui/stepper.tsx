import * as React from "react";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface StepperProps {
  steps: string[];
  currentStep: number;
  className?: string;
}

export const Stepper = ({ steps, currentStep, className }: StepperProps) => {
  return (
    <div className={cn("w-full py-6", className)}>
      <div className="flex items-center justify-between relative">
        {steps.map((step, index) => {
          const stepNumber = index + 1;
          const isCompleted = stepNumber < currentStep;
          const isCurrent = stepNumber === currentStep;
          const isUpcoming = stepNumber > currentStep;

          return (
            <React.Fragment key={index}>
              <div className="flex flex-col items-center relative z-10" style={{ flex: 1 }}>
                {/* Step Circle */}
                <div
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all relative z-10",
                    isCompleted &&
                      "bg-green-500 text-white border-2 border-green-500",
                    isCurrent &&
                      "bg-gold-gradient text-primary-foreground border-2 border-primary shadow-gold",
                    isUpcoming &&
                      "bg-secondary text-muted-foreground border-2 border-muted"
                  )}
                >
                  {isCompleted ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <span>{stepNumber}</span>
                  )}
                </div>
                {/* Step Label */}
                <span
                  className={cn(
                    "mt-2 text-sm text-center px-1",
                    isCurrent && "font-semibold text-primary",
                    isCompleted && "text-muted-foreground",
                    isUpcoming && "text-muted-foreground"
                  )}
                >
                  {step}
                </span>
              </div>
              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    "h-0.5 flex-1 mx-2 transition-all relative -top-5 z-0",
                    index + 1 < currentStep
                      ? "bg-green-500"
                      : "bg-muted"
                  )}
                  style={{ minWidth: "20px" }}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
