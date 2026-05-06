"use client";

import { useState } from "react";
import Link from "next/link";
import { Shirt, Sparkles, CalendarDays, ArrowRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const STEPS = [
  {
    icon: Shirt,
    title: "Add your first item",
    body: "Snap a photo of any piece of clothing — a jacket, a pair of sneakers, anything. The AI strips the background so it looks clean.",
    cta: "Add Item",
    href: "/items/new",
  },
  {
    icon: Sparkles,
    title: "Build an outfit",
    body: "Combine your items into outfits. Drag and drop to arrange them on the canvas. Name them, pin favorites, hide the rest.",
    cta: "Create Outfit",
    href: "/outfits/new",
  },
  {
    icon: CalendarDays,
    title: "Log your wear",
    body: "Tap \"Wear Today\" on any outfit. The calendar fills up. Over time you'll see what you actually wear and what just sits there.",
    cta: "Got it",
    href: null,
  },
];

export function OnboardingWizard({ onDismiss }: { onDismiss: () => void }) {
  const [step, setStep] = useState(0);
  const current = STEPS[step];
  const Icon = current.icon;

  return (
    <Card className="relative overflow-hidden border-2 border-dashed">
      {/* Dismiss */}
      <button
        onClick={onDismiss}
        className="absolute top-3 right-3 p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors z-10"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="p-6 sm:p-8 text-center space-y-5">
        {/* Progress dots */}
        <div className="flex justify-center gap-1.5">
          {STEPS.map((_, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === step ? "w-6 bg-foreground" : "w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/50"
              }`}
              aria-label={`Step ${i + 1}`}
            />
          ))}
        </div>

        {/* Icon */}
        <div className="mx-auto w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
          <Icon className="h-8 w-8 text-foreground" />
        </div>

        {/* Content */}
        <div className="space-y-2">
          <h2 className="text-xl font-bold">
            <span className="text-muted-foreground font-normal text-sm block mb-1">
              Step {step + 1} of {STEPS.length}
            </span>
            {current.title}
          </h2>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
            {current.body}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-center gap-3 pt-2">
          {step > 0 && (
            <Button variant="ghost" size="sm" onClick={() => setStep(step - 1)}>
              Back
            </Button>
          )}
          {current.href ? (
            <Link href={current.href}>
              <Button size="sm" className="gap-1.5">
                {current.cta}
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          ) : (
            <Button size="sm" className="gap-1.5" onClick={onDismiss}>
              {current.cta}
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          )}
          {step < STEPS.length - 1 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setStep(step + 1)}
              className="gap-1"
            >
              Next
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
