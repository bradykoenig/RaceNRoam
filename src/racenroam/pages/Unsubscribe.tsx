import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

type State = "loading" | "valid" | "invalid" | "already" | "submitting" | "success" | "error";

const Unsubscribe = () => {
  const [params] = useSearchParams();
  const token = params.get("token");
  const [state, setState] = useState<State>("loading");

  useEffect(() => {
    if (!token) {
      setState("invalid");
      return;
    }
    (async () => {
      try {
        const res = await fetch(
          `${SUPABASE_URL}/functions/v1/handle-email-unsubscribe?token=${encodeURIComponent(token)}`,
          { headers: { apikey: SUPABASE_ANON_KEY } }
        );
        const data = await res.json();
        if (data.valid) setState("valid");
        else if (data.reason === "already_unsubscribed") setState("already");
        else setState("invalid");
      } catch {
        setState("error");
      }
    })();
  }, [token]);

  const confirm = async () => {
    if (!token) return;
    setState("submitting");
    try {
      const res = await fetch(
        `${SUPABASE_URL}/functions/v1/handle-email-unsubscribe`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY },
          body: JSON.stringify({ token }),
        }
      );
      const data = await res.json();
      if (data.success || data.reason === "already_unsubscribed") setState("success");
      else setState("error");
    } catch {
      setState("error");
    }
  };

  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-md w-full border border-grey-mid bg-grey-dark p-8 text-center">
        <h1 className="font-display text-3xl tracking-[4px] text-foreground mb-6">UNSUBSCRIBE</h1>
        {state === "loading" && <Loader2 className="w-8 h-8 animate-spin text-primary-bright mx-auto" />}
        {state === "valid" && (
          <>
            <p className="font-body text-sm text-grey-text mb-6">Click below to stop receiving emails from Race N Roam.</p>
            <button onClick={confirm} className="btn-race w-full">CONFIRM UNSUBSCRIBE</button>
          </>
        )}
        {state === "submitting" && <Loader2 className="w-8 h-8 animate-spin text-primary-bright mx-auto" />}
        {state === "success" && (
          <>
            <CheckCircle2 className="w-12 h-12 text-primary-bright mx-auto mb-3" />
            <p className="font-body text-sm text-grey-text">You've been unsubscribed.</p>
          </>
        )}
        {state === "already" && (
          <>
            <CheckCircle2 className="w-12 h-12 text-primary-bright mx-auto mb-3" />
            <p className="font-body text-sm text-grey-text">You're already unsubscribed.</p>
          </>
        )}
        {state === "invalid" && (
          <>
            <XCircle className="w-12 h-12 text-grey-light mx-auto mb-3" />
            <p className="font-body text-sm text-grey-text">This unsubscribe link is invalid or expired.</p>
          </>
        )}
        {state === "error" && (
          <>
            <XCircle className="w-12 h-12 text-grey-light mx-auto mb-3" />
            <p className="font-body text-sm text-grey-text">Something went wrong. Please try again later.</p>
          </>
        )}
      </div>
    </main>
  );
};

export default Unsubscribe;
