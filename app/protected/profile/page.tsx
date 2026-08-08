import { redirect } from "next/navigation";
import { Suspense } from "react";

import { createClient } from "@/lib/supabase/server";
import { ProfileForm } from "@/components/profile-form";

async function ProfileContent() {
  const supabase = await createClient();
  const { data, error: claimsError } = await supabase.auth.getClaims();

  if (claimsError || !data?.claims) {
    redirect("/auth/login");
  }

  const userId = data.claims.sub;

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, email, username, full_name, avatar_url")
    .eq("id", userId)
    .maybeSingle();

  if (profileError) {
    throw profileError;
  }

  return (
    <ProfileForm
      profile={
        profile ?? {
          id: userId,
          email: data.claims.email ?? null,
          username: null,
          full_name: null,
          avatar_url: null,
        }
      }
    />
  );
}

export default function ProfilePage() {
  return (
    <div className="flex w-full flex-1 flex-col gap-12">
      <Suspense>
        <ProfileContent />
      </Suspense>
    </div>
  );
}
