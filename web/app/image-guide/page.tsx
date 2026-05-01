"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Sparkles, Scissors, Upload, ExternalLink, Copy, Check } from "lucide-react";

const promptTemplates = [
  "Place this on a plain white background, flat lay, studio lighting, no model",
  "Clean white background, front view, no shadows, no model, e-commerce style",
  "White background, keep the item exactly as is, remove any background or person, flat lay",
];

const bgTools = [
  { name: "remove.bg", url: "https://remove.bg", note: "Upload → auto-removes → download PNG" },
  { name: "PhotoRoom", url: "https://photoroom.com", note: "iOS/Android app — open photo → Background → Remove" },
  { name: "Adobe Express", url: "https://express.adobe.com", note: "Upload → Quick Actions → Remove Background" },
];

function CopyPrompt({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="flex items-start gap-2 bg-background rounded-lg border border-border px-3 py-2 group">
      <p className="text-xs font-mono text-muted-foreground flex-1">{text}</p>
      <button
        onClick={handleCopy}
        className="shrink-0 mt-0.5 text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Copy prompt"
      >
        {copied
          ? <Check className="h-3.5 w-3.5 text-primary" />
          : <Copy className="h-3.5 w-3.5" />
        }
      </button>
    </div>
  );
}

export default function ImageGuidePage() {
  return (
    <div className="p-4 max-w-lg mx-auto pb-24 space-y-6">
      <div className="flex items-center gap-2">
        <Link
          href="/"
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Hangur
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold">Adding your clothes</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Attach a photo to Gemini, clean it up, remove the background, then upload.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="h-1 w-full bg-gradient-to-r from-primary/60 via-primary to-primary/60" />
        <div className="px-4 py-3.5 flex gap-3 items-start">
          <span className="text-lg leading-none mt-0.5">💸</span>
          <div className="space-y-0.5">
            <p className="text-sm font-medium">Why we don&rsquo;t do this automatically</p>
            <p className="text-sm text-muted-foreground">
              AI image processing is expensive to run at scale. Until we find a sustainable way to offer it, we&rsquo;ve left this step in your hands — the tools below are free and take under a minute.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {/* Step 1 */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-xs text-muted-foreground font-mono">01</span>
              <h2 className="font-semibold text-base">Clean up in Gemini</h2>
            </div>
          </div>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Go to{" "}
              <a
                href="https://gemini.google.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline underline-offset-2"
              >
                gemini.google.com
              </a>
              , <strong className="text-foreground">attach a photo of your clothing item</strong>, then add a prompt.
            </p>
            <ul className="space-y-1.5 text-sm text-muted-foreground">
              <li className="flex gap-2"><span className="text-primary mt-0.5">·</span> Attach the photo — no need to describe the item</li>
              <li className="flex gap-2"><span className="text-primary mt-0.5">·</span> Always say <strong className="text-foreground">white background</strong> — makes removal easier</li>
              <li className="flex gap-2"><span className="text-primary mt-0.5">·</span> Add <strong className="text-foreground">flat lay</strong> or <strong className="text-foreground">front view</strong> to control the angle</li>
              <li className="flex gap-2"><span className="text-primary mt-0.5">·</span> If it shows a model, add <strong className="text-foreground">no model, clothing only</strong></li>
            </ul>
            <CopyPrompt text="Place this on a plain white background, flat lay, studio lighting, no model" />
          </div>
        </div>

        {/* Step 2 */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10">
              <Scissors className="h-4 w-4 text-primary" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-xs text-muted-foreground font-mono">02</span>
              <h2 className="font-semibold text-base">Remove the background</h2>
            </div>
          </div>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Pick any free tool — you want a <strong className="text-foreground">.png with a transparent background</strong>.</p>
            <div className="space-y-2">
              {bgTools.map((tool) => (
                <a
                  key={tool.name}
                  href={tool.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start justify-between gap-3 rounded-lg border border-border bg-background px-4 py-3 hover:bg-muted/40 transition-colors group"
                >
                  <div>
                    <p className="text-sm font-medium group-hover:text-primary transition-colors">{tool.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{tool.note}</p>
                  </div>
                  <ExternalLink className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                </a>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              On iPhone or Mac: open the image → long-press the subject → <strong className="text-foreground">Copy</strong> → paste as PNG.
            </p>
          </div>
        </div>

        {/* Step 3 */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10">
              <Upload className="h-4 w-4 text-primary" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-xs text-muted-foreground font-mono">03</span>
              <h2 className="font-semibold text-base">Add to Hangur</h2>
            </div>
          </div>
          <ul className="space-y-1.5 text-sm text-muted-foreground">
            <li className="flex gap-2"><span className="text-primary mt-0.5">1.</span> Tap <strong className="text-foreground">+</strong> in the top right</li>
            <li className="flex gap-2"><span className="text-primary mt-0.5">2.</span> Fill in category, subcategory, and name</li>
            <li className="flex gap-2"><span className="text-primary mt-0.5">3.</span> Upload the PNG you just made</li>
            <li className="flex gap-2"><span className="text-primary mt-0.5">4.</span> Hangur auto-detects the colors</li>
          </ul>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3">
        <h3 className="font-semibold text-sm">Prompt templates</h3>
        <p className="text-xs text-muted-foreground">Attach your photo, then copy one of these:</p>
        <div className="space-y-2">
          {promptTemplates.map((t, i) => (
            <CopyPrompt key={i} text={t} />
          ))}
        </div>
      </div>
    </div>
  );
}
