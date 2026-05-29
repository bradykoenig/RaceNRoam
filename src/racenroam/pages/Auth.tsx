import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/racenroam/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const Auth = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate("/orders");
    });
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/orders` },
        });
        if (error) throw error;
        toast.success("Account created. You can now sign in.");
        setMode("signin");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate("/orders");
      }
    } catch (err: any) {
      toast.error(err.message ?? "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-5">
      <div className="max-w-md w-full bg-grey-dark border border-grey-mid p-8">
        <h1 className="font-display text-4xl tracking-[4px] text-foreground mb-2">ADMIN {mode === "signup" ? "SIGN UP" : "LOGIN"}</h1>
        <p className="font-tech text-[10px] tracking-[3px] text-grey-light uppercase mb-6">For store owners — view orders</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="font-tech text-[10px] tracking-[2px] text-grey-light uppercase block mb-1.5">Email</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-input border border-grey-mid px-3 py-2.5 font-body text-sm text-foreground focus:outline-none focus:border-primary" />
          </div>
          <div>
            <label className="font-tech text-[10px] tracking-[2px] text-grey-light uppercase block mb-1.5">Password</label>
            <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-input border border-grey-mid px-3 py-2.5 font-body text-sm text-foreground focus:outline-none focus:border-primary" />
          </div>
          <button type="submit" disabled={loading} className="btn-race w-full flex items-center justify-center gap-2 disabled:opacity-50">
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {mode === "signup" ? "CREATE ACCOUNT" : "SIGN IN"}
          </button>
        </form>
        <button onClick={() => setMode(mode === "signin" ? "signup" : "signin")} className="font-tech text-[10px] tracking-[2px] text-grey-light uppercase mt-6 hover:text-foreground transition-colors w-full text-center">
          {mode === "signin" ? "Need an account? Sign up →" : "← Back to sign in"}
        </button>
        <p className="font-body text-xs text-grey-light text-center mt-6">
          After signing up, you'll need admin access. The first user is granted automatically — see backend.
        </p>
      </div>
    </div>
  );
};

export default Auth;
