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

function getRolesFromSession(user: User): string[] {
  const appMeta = user.app_metadata ?? {};
  const role = appMeta.role;
  if (typeof role === "string" && role) return [role];
  if (Array.isArray(appMeta.roles)) return appMeta.roles;
  return [];
}

async function fetchProfileAndRoles(userId: string) {
  const [profileResult, rolesResult] = await Promise.all([
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
    profile: profileResult.data ?? null,
    roles: rolesResult.data?.map((r: { role: string }) => r.role) ?? [],
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<AuthContextType["profile"]>(null);
  const [roles, setRoles] = useState<string[]>([]);

  useEffect(() => {
    // Safety net: force loading=false after 8s no matter what
    const safetyTimeout = setTimeout(() => setLoading(false), 8000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          const jwtRoles = getRolesFromSession(session.user);
          if (jwtRoles.length > 0) setRoles(jwtRoles);
          try {
            const { profile: p, roles: dbRoles } = await fetchProfileAndRoles(session.user.id);
            setProfile(p);
            setRoles(dbRoles.length > 0 ? dbRoles : jwtRoles);
          } catch (e) {
            console.error("Failed to fetch profile/roles:", e);
          }
        } else {
          setProfile(null);
          setRoles([]);
        }

        clearTimeout(safetyTimeout);
        setLoading(false);
      }
    );

    return () => {
      clearTimeout(safetyTimeout);
      subscription.unsubscribe();
    };
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
