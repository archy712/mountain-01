"use client";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Tables } from "@/lib/supabase/database.types";

type Profile = Pick<Tables<"profiles">, "id" | "email" | "username" | "full_name" | "avatar_url">;

export function ProfileForm({
  profile,
  className,
  ...props
}: { profile: Profile } & React.ComponentPropsWithoutRef<"div">) {
  const [username, setUsername] = useState(profile.username ?? "");
  const [fullName, setFullName] = useState(profile.full_name ?? "");
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url ?? "");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          username: username.trim() || null,
          full_name: fullName.trim() || null,
          avatar_url: avatarUrl.trim() || null,
        })
        .eq("id", profile.id);
      if (error) throw error;
      setSuccess(true);
      router.refresh();
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">프로필 수정</CardTitle>
          <CardDescription>회원 프로필 정보를 수정합니다.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <div className="flex flex-col gap-6">
              <div className="grid gap-2">
                <Label htmlFor="email">이메일</Label>
                <Input id="email" type="email" value={profile.email ?? ""} disabled />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="username">사용자 이름</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="3자 이상 입력해주세요"
                  minLength={3}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="full-name">이름</Label>
                <Input
                  id="full-name"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="avatar-url">프로필 이미지 URL</Label>
                <Input
                  id="avatar-url"
                  type="url"
                  placeholder="https://example.com/avatar.png"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                />
              </div>
              {error && (
                <p role="alert" className="text-sm text-destructive">
                  {error}
                </p>
              )}
              {success && (
                <p role="status" className="text-sm text-status-open">
                  프로필이 저장되었습니다.
                </p>
              )}
              <Button type="submit" className="h-11 w-full" disabled={isLoading}>
                {isLoading ? "저장 중..." : "저장"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
