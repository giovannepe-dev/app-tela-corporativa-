import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  profile: { id: string; full_name: string | null; email: string | null; company_id: string | null } | null;
  roles: string[];
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  profile: null,
  roles: [],
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

async function fetchProfileAndRoles(userId: string) {
  const [{ data: profileData }, { data: rolesData }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, email, company_id")
      .eq("user_id", userId)
      .single(),
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId),
  ]);
  return {
    profile: profileData ?? null,
    roles: rolesData?.map((r: { role: string }) => r.role) ?? [],
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<AuthContextType["profile"]>(null);
  const [roles, setRoles] = useState<string[]>([]);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        try {
          const { profile, roles } = await fetchProfileAndRoles(session.user.id);
          setProfile(profile);
          setRoles(roles);
        } catch (e) {
          console.error("Failed to fetch profile/roles:", e);
        }
      }
      setLoading(false);
    }).catch(() => setLoading(false));

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          try {
            const { profile, roles } = await fetchProfileAndRoles(session.user.id);
            setProfile(profile);
            setRoles(roles);
          } catch (e) {
            console.error("Failed to fetch profile/roles:", e);
          }
        } else {
          setProfile(null);
          setRoles([]);
        }
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, profile, roles, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
