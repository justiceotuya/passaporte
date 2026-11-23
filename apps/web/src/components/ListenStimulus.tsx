"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/kuji";

type Props = {
  /** Printed dialogue / listening text. */
  transcript?: string;
  /** Optional real audio URL (e.g. /audio/pass-u01-….mp3). */
  audioSrc?: string | null;
  /** Fallback text to speak when there is no transcript/audio (often the prompt). */
  speakText?: string;
  /** Auto-open transcript after reveal / wrong answer. */
  forceTranscriptOpen?: boolean;
};

function pickPortugueseVoice(): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices();
  return (
    voices.find((v) => v.lang.toLowerCase().startsWith("pt-pt")) ??
    voices.find((v) => v.lang.toLowerCase().startsWith("pt-br")) ??
    voices.find((v) => v.lang.toLowerCase().startsWith("pt")) ??
    null
  );
}

/**
 * Play / pause glyph — Kuji DS has no media icons (gap).
 * Kept minimal and filled so it sits as a leadingIcon on Kuji Button.
 */
function PlayIcon({ playing }: { playing: boolean }) {
  if (playing) {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden fill="currentColor">
        <rect x="6" y="5" width="4" height="14" rx="1" />
        <rect x="14" y="5" width="4" height="14" rx="1" />
      </svg>
    );
  }
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden fill="currentColor">
      <path d="M8 5.5v13l11-6.5L8 5.5z" />
    </svg>
  );
}

/**
 * Listening stimulus: play button + collapsible transcript (PassaporteItems).
 * Prefers real `audioSrc`; otherwise speaks transcript/speakText via Web Speech (pt).
 */
export function ListenStimulus({
  transcript,
  audioSrc,
  speakText,
  forceTranscriptOpen = false,
}: Props) {
  const [open, setOpen] = useState(forceTranscriptOpen);
  const [playing, setPlaying] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const playingRef = useRef(false);

  const spoken = (transcript ?? speakText ?? "").trim();
  const canPlayFile = Boolean(audioSrc?.trim());
  const canSpeak = Boolean(spoken);
  const canPlay = canPlayFile || canSpeak;

  useEffect(() => {
    if (forceTranscriptOpen) setOpen(true);
  }, [forceTranscriptOpen]);

  useEffect(() => {
    return () => {
      stopAll();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- unmount cleanup only
  }, []);

  function setIsPlaying(next: boolean) {
    playingRef.current = next;
    setPlaying(next);
  }

  function stopAll() {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    utteranceRef.current = null;
    setIsPlaying(false);
  }

  function playFile(src: string) {
    stopAll();
    const audio = new Audio(src);
    audioRef.current = audio;
    audio.onended = () => setIsPlaying(false);
    audio.onerror = () => {
      setIsPlaying(false);
      setUnavailable(true);
    };
    void audio.play().then(
      () => setIsPlaying(true),
      () => {
        setIsPlaying(false);
        setUnavailable(true);
      },
    );
  }

  function playSpeech(text: string) {
    if (!window.speechSynthesis) {
      setUnavailable(true);
      return;
    }
    stopAll();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = "pt-PT";
    utter.rate = 0.9;
    const voice = pickPortugueseVoice();
    if (voice) utter.voice = voice;
    utter.onend = () => setIsPlaying(false);
    utter.onerror = () => {
      setIsPlaying(false);
      setUnavailable(true);
    };
    utteranceRef.current = utter;

    const start = () => {
      if (utteranceRef.current !== utter) return;
      window.speechSynthesis.speak(utter);
      setIsPlaying(true);
    };

    if (window.speechSynthesis.getVoices().length === 0) {
      window.speechSynthesis.addEventListener("voiceschanged", start, {
        once: true,
      });
      window.setTimeout(() => {
        if (!playingRef.current && utteranceRef.current === utter) start();
      }, 250);
    } else {
      start();
    }
  }

  function togglePlay() {
    if (playingRef.current) {
      stopAll();
      return;
    }
    setUnavailable(false);
    if (canPlayFile && audioSrc) {
      playFile(audioSrc);
      return;
    }
    if (spoken) {
      playSpeech(spoken);
      return;
    }
    setUnavailable(true);
  }

  if (!canPlay && !transcript) {
    return (
      <div className="mb-4" data-testid="listen-stimulus">
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="primary"
            size="lg"
            leadingIcon={<PlayIcon playing={false} />}
            data-testid="listen-play"
            aria-label="Play audio"
            disabled
          >
            Play
          </Button>
          <p className="text-sm font-medium text-ink-muted" data-testid="listen-unavailable">
            No audio track for this exercise yet
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-4 space-y-3" data-testid="listen-stimulus">
      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant="primary"
          size="lg"
          leadingIcon={<PlayIcon playing={playing} />}
          data-testid="listen-play"
          aria-label={playing ? "Pause audio" : "Play audio"}
          aria-pressed={playing}
          disabled={!canPlay}
          onClick={togglePlay}
        >
          {playing ? "Pause" : "Play"}
        </Button>
        {unavailable ? (
          <p className="text-sm font-medium text-warning" data-testid="listen-unavailable">
            Audio isn’t available yet. Try the transcript if shown.
          </p>
        ) : (
          <p className="text-sm font-medium text-ink-muted">
            {canPlayFile ? "Tap play to listen" : "Tap play to hear it aloud"}
          </p>
        )}
      </div>

      {transcript ? (
        <div data-testid="listen-transcript">
          <button
            type="button"
            className="flex min-h-[52px] w-full items-center justify-between rounded-2xl border border-warning/30 bg-warning/[0.08] px-4 py-3.5 text-left text-sm font-bold text-warning"
            aria-expanded={open}
            data-testid="listen-transcript-toggle"
            onClick={() => setOpen((value) => !value)}
          >
            <span>Transcript</span>
            <span aria-hidden>{open ? "▴" : "▾"}</span>
          </button>
          {open ? (
            <p
              className="book-text mt-2 rounded-2xl border border-warning/20 bg-warning/[0.06] p-4 text-[15px] leading-relaxed"
              data-testid="listen-transcript-body"
            >
              {transcript}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
