import { useEffect, useRef, useState } from "preact/hooks";
import { lastTranscription, responseError, responseText } from "../signals.ts";
import styles from "./Response.module.css";

export function Response() {
  return (
    <ResponseView
      user={lastTranscription.value}
      text={responseText.value}
      error={responseError.value}
    />
  );
}

export function ResponseView(
  { user, text, error }: {
    user: string;
    text: string | null;
    error: string | null;
  },
) {
  return (
    <div class={styles.response}>
      {user && <div class={styles.user}>{user}</div>}
      {text && <Typewriter text={text} />}
      {error && <div class={styles.error}>{error}</div>}
    </div>
  );
}

function Typewriter({ text }: { text: string }) {
  const { displayed, done } = useTypewriter(text);

  return (
    <div class={`${styles.text}${done ? "" : ` ${styles.typing}`}`}>
      {displayed}
    </div>
  );
}

interface TypewriterState {
  displayed: string;
  done: boolean;
}

function useTypewriter(text: string): TypewriterState {
  const [charIndex, setCharIndex] = useState(0);
  const timerRef = useRef<number | null>(null);
  const prevTextRef = useRef(text);

  useEffect(() => {
    if (text !== prevTextRef.current) {
      setCharIndex(0);
      prevTextRef.current = text;
    }

    timerRef.current = setInterval(() => {
      setCharIndex((prev) => {
        if (prev >= text.length) {
          clearInterval(timerRef.current!);
          timerRef.current = null;
          return prev;
        }
        return prev + 1;
      });
    }, 30);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [text]);

  return {
    displayed: text.slice(0, charIndex),
    done: charIndex >= text.length,
  };
}
